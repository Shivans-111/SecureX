export interface SecurityCategory {
  id: number
  code: string
  name: string
  shortLabel: string
  icon: string
  description: string
  focusArea: string
}

export const SECURITY_CATEGORIES: SecurityCategory[] = [
  {
    id: 1,
    code: 'A01',
    name: 'Broken Access Control',
    shortLabel: 'Access Control',
    icon: 'shield-lock',
    description: 'Enforcing permissions so unauthorized users cannot access privileged endpoints or private data.',
    focusArea: 'Authorization & RBAC',
  },
  {
    id: 2,
    code: 'A02',
    name: 'Security Misconfiguration',
    shortLabel: 'Misconfiguration',
    icon: 'sliders',
    description: 'Ensuring default accounts, unnecessary ports, debug services, and cloud permissions are hardened.',
    focusArea: 'Server & Cloud Hardening',
  },
  {
    id: 3,
    code: 'A03',
    name: 'Cryptographic Failures',
    shortLabel: 'Cryptography',
    icon: 'key',
    description: 'Protecting data in transit and at rest using modern encryption, secure ciphers, and valid certificates.',
    focusArea: 'TLS / Storage Encryption',
  },
  {
    id: 4,
    code: 'A04',
    name: 'Vulnerable or Outdated Components',
    shortLabel: 'Dependencies',
    icon: 'package',
    description: 'Auditing third-party libraries, frameworks, and client-side dependencies for known CVE exposures.',
    focusArea: 'Supply Chain & Libraries',
  },
  {
    id: 5,
    code: 'A05',
    name: 'Injection',
    shortLabel: 'Injection Flaws',
    icon: 'terminal',
    description: 'Validating and sanitizing user inputs to prevent SQL, command, or parameter evaluation bypasses.',
    focusArea: 'Input Sanitization',
  },
  {
    id: 6,
    code: 'A06',
    name: 'Identification and Authentication Failures',
    shortLabel: 'Authentication',
    icon: 'user-check',
    description: 'Strengthening credential security, multi-factor defenses, and secure session management.',
    focusArea: 'Session & Identity',
  },
  {
    id: 7,
    code: 'A07',
    name: 'Insecure Design',
    shortLabel: 'Insecure Design',
    icon: 'layout',
    description: 'Identifying structural architectural risks, unauthenticated workflows, and flawed business logic.',
    focusArea: 'Threat Modeling & Logic',
  },
  {
    id: 8,
    code: 'A08',
    name: 'Software and Data Integrity Failures',
    shortLabel: 'Data Integrity',
    icon: 'git-commit',
    description: 'Verifying code signatures, update pipelines, and CI/CD assets against unauthorized tampering.',
    focusArea: 'CI/CD & Code Signatures',
  },
  {
    id: 9,
    code: 'A09',
    name: 'Logging and Monitoring Failures',
    shortLabel: 'Monitoring',
    icon: 'activity',
    description: 'Ensuring security events and intrusion attempts are logged for real-time alerting and auditability.',
    focusArea: 'Audit Logs & Telemetry',
  },
  {
    id: 10,
    code: 'A10',
    name: 'Server-Side Request Forgery (SSRF)',
    shortLabel: 'SSRF',
    icon: 'server',
    description: 'Preventing remote servers from making unauthorized requests to internal cloud metadata or services.',
    focusArea: 'Internal Network Isolation',
  },
  {
    id: 11,
    code: 'A11',
    name: 'Cross-Site Scripting (XSS)',
    shortLabel: 'XSS',
    icon: 'code',
    description: 'Guarding browser execution contexts against reflected, stored, or DOM-based script execution.',
    focusArea: 'Contextual Encoding & CSP',
  },
  {
    id: 12,
    code: 'A12',
    name: 'Security Headers and Cookie Settings',
    shortLabel: 'Headers & Cookies',
    icon: 'file-text',
    description: 'Configuring HSTS, CSP, Permissions-Policy, SameSite, and HttpOnly attributes to harden user sessions.',
    focusArea: 'Browser Directives',
  },
]
