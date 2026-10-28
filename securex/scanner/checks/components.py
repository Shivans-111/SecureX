"""
COMPONENTS category: detect obviously outdated front-end libraries by
scanning script tags/src URLs in the homepage HTML for version numbers,
checked against small known-old thresholds. Passive only (no active probing).
Never labels an indicator as a confirmed exploitable vulnerability without sufficient evidence.
"""
import re

from scanner.models import Finding

# library_name -> (regex to find "name@version" or "name-version" or "name/version" in src,
#                   (major, minor) below which we flag as outdated, note)
LIBRARY_PATTERNS = {
    "jquery": (re.compile(r"jquery[.\-/]([\d]+)\.([\d]+)\.?([\d]+)?", re.I), (3, 5),
               "Older jQuery versions have historical XSS CVEs (e.g. in $.html()/.htmlPrefilter)."),
    "bootstrap": (re.compile(r"bootstrap[.\-/]([\d]+)\.([\d]+)\.?([\d]+)?", re.I), (4, 0),
                  "Bootstrap <4 had historical XSS issues in tooltip/popover data attributes."),
    "angular": (re.compile(r"angular[.\-/]([\d]+)\.([\d]+)\.?([\d]+)?", re.I), (1, 8),
                "Old AngularJS 1.x releases have historical template-injection CVEs."),
    "lodash": (re.compile(r"lodash[.\-/]([\d]+)\.([\d]+)\.?([\d]+)?", re.I), (4, 17),
               "Older lodash versions have historical prototype-pollution CVEs."),
}


def check_components(html: str) -> list[Finding]:
    findings = []

    for lib, (pattern, (min_major, min_minor), note) in LIBRARY_PATTERNS.items():
        match = pattern.search(html)
        if not match:
            continue
        major = int(match.group(1))
        minor = int(match.group(2) or 0)

        if (major, minor) < (min_major, min_minor):
            findings.append(
                Finding(
                    id=f"COMPONENTS-{lib}",
                    category="COMPONENTS",
                    title=f"Outdated library indicator: {lib} {major}.{minor} (unverified)",
                    severity="MEDIUM",
                    risk=(
                        f"A script tag matching {lib} version {major}.{minor} was observed in the page HTML. "
                        f"{note} Passive library version sniffing identifies a structural indicator only; "
                        "it does not confirm that vulnerable APIs are exposed, called, or exploitable in this specific application."
                    ),
                    fix=f"Audit whether vulnerable features of {lib} {major}.{minor} are utilized, upgrade to a currently maintained release, and verify in a staging environment.",
                    evidence=f"Script reference: {match.group(0)}",
                    confidence="heuristic",
                    status="Review",
                )
            )

    return findings
