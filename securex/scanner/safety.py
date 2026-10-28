"""
Step 01-02 of the SecureX flow: Submit URL -> Check scope.
Validates the target URL and blocks anything that would make this an
unauthorized / dangerous scan (SSRF guard against internal infra).
"""
import ipaddress
import socket
from urllib.parse import urlparse

BLOCKED_HOST_SUFFIXES = (
    "localhost",
)

# RFC1918 / loopback / link-local / metadata endpoint ranges.
BLOCKED_NETWORKS = [
    ipaddress.ip_network(net)
    for net in (
        "0.0.0.0/8",
        "10.0.0.0/8",
        "100.64.0.0/10",
        "127.0.0.0/8",
        "169.254.0.0/16",   # link-local, includes cloud metadata 169.254.169.254
        "172.16.0.0/12",
        "192.0.0.0/24",
        "192.0.2.0/24",
        "192.168.0.0/16",
        "198.18.0.0/15",
        "198.51.100.0/24",
        "203.0.113.0/24",
        "224.0.0.0/4",
        "240.0.0.0/4",
        "255.255.255.255/32",
        "::/128",
        "::1/128",
        "fc00::/7",
        "fe80::/10",
    )
]


class ScopeError(Exception):
    """Raised when a submitted target fails the safety gate."""


NAT64_PREFIX = ipaddress.ip_network("64:ff9b::/96")


def _is_blocked_ip(ip_str: str) -> bool:
    try:
        ip = ipaddress.ip_address(ip_str)
    except ValueError:
        return True  # can't parse it -> treat as unsafe

    # Built-in RFC safety checks
    if (
        ip.is_private
        or ip.is_loopback
        or ip.is_link_local
        or ip.is_reserved
        or ip.is_multicast
        or ip.is_unspecified
    ):
        return True

    # RFC 6052: On networks with NAT64/DNS64, public IPv4 addresses are synthesized into 64:ff9b::/96.
    # Extract embedded IPv4 to strictly verify it is not targeting internal/loopback/private infra.
    if ip in NAT64_PREFIX:
        embedded_v4 = ipaddress.IPv4Address(ip.packed[-4:])
        return (
            any(embedded_v4 in net for net in BLOCKED_NETWORKS)
            or embedded_v4.is_private
            or embedded_v4.is_loopback
            or embedded_v4.is_link_local
            or embedded_v4.is_reserved
            or embedded_v4.is_multicast
            or embedded_v4.is_unspecified
        )

    return any(ip in net for net in BLOCKED_NETWORKS)


def validate_target(raw_url: str) -> str:
    """
    Normalizes and validates a submitted URL.
    Returns the normalized URL (scheme + host/port, forced to https if no scheme given).
    Raises ScopeError if the target is out of safe scope.
    """
    url = raw_url.strip()
    if not url:
        raise ScopeError("URL is empty.")

    if "://" not in url:
        url = "https://" + url

    parsed = urlparse(url)

    if parsed.scheme not in ("http", "https"):
        raise ScopeError(f"Unsupported scheme '{parsed.scheme}'. Only http/https are allowed.")

    host = parsed.hostname
    if not host:
        raise ScopeError("Could not parse a hostname from the URL.")

    host_lower = host.lower()
    if any(host_lower == s or host_lower.endswith("." + s) for s in BLOCKED_HOST_SUFFIXES):
        raise ScopeError("Scanning localhost/internal hostnames is not permitted.")

    # Resolve DNS and block private/internal IP ranges (SSRF guard).
    try:
        infos = socket.getaddrinfo(host, None)
    except socket.gaierror as e:
        raise ScopeError(f"Could not resolve host '{host}': {e}")

    resolved_ips = {info[4][0] for info in infos}
    if not resolved_ips:
        raise ScopeError(f"No IP addresses resolved for '{host}'.")

    for ip in resolved_ips:
        if _is_blocked_ip(ip):
            raise ScopeError(
                f"Target resolves to a private/internal address ({ip}). "
                "Scanning internal infrastructure is blocked for safety."
            )

    normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path or ''}"
    return normalized.rstrip("/") or f"{parsed.scheme}://{parsed.netloc}"


def verify_socket_address(response: httpx.Response) -> None:
    """
    Mitigates DNS rebinding by inspecting the actual connected remote IP address
    from the underlying network stream. If connected to a private/loopback IP,
    immediately raises ScopeError.
    """
    stream = response.extensions.get("network_stream")
    if stream is not None:
        server_addr = stream.get_extra_info("server_addr")
        if server_addr and isinstance(server_addr, tuple) and len(server_addr) >= 1:
            connected_ip = str(server_addr[0])
            if _is_blocked_ip(connected_ip):
                raise ScopeError(
                    f"DNS rebinding / private IP connection intercepted ({connected_ip}). Scan stopped for safety."
                )


async def safe_get(
    client: httpx.AsyncClient,
    url: str,
    max_redirects: int = 3,
    timeout: float = 6.0,
) -> httpx.Response:
    """
    Performs a safe HTTP GET request that strictly validates redirect targets against
    private IP ranges / loopbacks (SSRF prevention) and checks connected socket addresses
    against DNS rebinding attacks.
    """
    from urllib.parse import urljoin, urlparse

    current_url = url
    redirects_followed = 0

    while True:
        response = await client.get(current_url, follow_redirects=False, timeout=timeout)
        verify_socket_address(response)

        if response.is_redirect and redirects_followed < max_redirects:
            location = response.headers.get("location")
            if not location:
                return response
            next_url = urljoin(current_url, location)
            next_host = urlparse(next_url).hostname
            if next_host:
                host_lower = next_host.lower()
                if any(host_lower == s or host_lower.endswith("." + s) for s in BLOCKED_HOST_SUFFIXES):
                    raise ScopeError(f"Redirect to blocked host '{next_host}' is forbidden.")
                try:
                    infos = socket.getaddrinfo(next_host, None)
                    for info in infos:
                        if _is_blocked_ip(info[4][0]):
                            raise ScopeError(f"Redirect resolves to blocked IP ({info[4][0]}).")
                except socket.gaierror:
                    pass
            current_url = next_url
            redirects_followed += 1
            continue

        return response
