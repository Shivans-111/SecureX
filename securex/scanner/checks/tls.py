"""
CRYPTO category: TLS/certificate checks (passive — no handshake fuzzing).
"""
import socket
import ssl
from datetime import datetime, timezone

from scanner.models import Finding

WEAK_PROTOCOLS = {"SSLv2", "SSLv3", "TLSv1", "TLSv1.1"}


def check_tls(host: str, port: int = 443) -> list[Finding]:
    findings = []
    if not host:
        return findings

    target_port = int(port) if port and int(port) > 0 else 443

    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, target_port), timeout=8) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                protocol = ssock.version()

        if protocol in WEAK_PROTOCOLS:
            findings.append(
                Finding(
                    id="CRYPTO-weak-protocol",
                    category="CRYPTO",
                    title=f"Weak TLS protocol negotiated: {protocol}",
                    severity="HIGH",
                    risk=f"{protocol} has known cryptographic weaknesses and should not be used in production.",
                    fix="Disable legacy TLS/SSL protocols on the server; require TLS 1.2 or higher.",
                    evidence=f"Negotiated protocol: {protocol}",
                )
            )

        not_after = cert.get("notAfter")
        if not_after:
            expiry = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
            days_left = (expiry - datetime.now(timezone.utc)).days
            if days_left < 0:
                findings.append(
                    Finding(
                        id="CRYPTO-cert-expired",
                        category="CRYPTO",
                        title="TLS certificate has expired",
                        severity="CRITICAL",
                        risk="An expired certificate breaks trust and browsers will warn or block visitors; "
                             "it can also indicate an unmaintained security posture.",
                        fix="Renew the TLS certificate immediately and set up expiry monitoring/auto-renewal.",
                        evidence=f"notAfter: {not_after}",
                    )
                )
            elif days_left < 14:
                findings.append(
                    Finding(
                        id="CRYPTO-cert-expiring-soon",
                        category="CRYPTO",
                        title=f"TLS certificate expires in {days_left} day(s)",
                        severity="MEDIUM",
                        risk="An imminent certificate expiry will break HTTPS for visitors if not renewed in time.",
                        fix="Renew the certificate and set up automated renewal (e.g. Let's Encrypt/ACME).",
                        evidence=f"notAfter: {not_after}",
                    )
                )

    except ssl.SSLCertVerificationError as e:
        findings.append(
            Finding(
                id="CRYPTO-cert-invalid",
                category="CRYPTO",
                title="TLS certificate validation failed",
                severity="HIGH",
                risk="Visitors' browsers will show security warnings, and connections may be vulnerable "
                     "to interception.",
                fix="Install a valid certificate from a trusted CA covering the exact hostname used.",
                evidence=str(e),
            )
        )
    except (socket.timeout, socket.gaierror, ConnectionRefusedError, OSError) as e:
        findings.append(
            Finding(
                id="CRYPTO-tls-unreachable",
                category="CRYPTO",
                title="Could not establish a TLS connection on port 443",
                severity="INFO",
                risk="Either the site doesn't serve HTTPS on this host/port, or it's unreachable from the "
                     "scanner — this needs manual confirmation.",
                fix="Confirm the site serves HTTPS correctly; if it doesn't, enabling HTTPS is strongly recommended.",
                evidence=str(e),
                confidence="heuristic",
            )
        )

    return findings
