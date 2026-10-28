export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO'

export type Confidence = 'confirmed' | 'heuristic'

export interface Finding {
  id: string
  category: string
  category_label: string
  title: string
  severity: Severity
  risk: string
  fix: string
  evidence: string | null
  status: string
  confidence: Confidence
  confidence_label?: string
}

export interface CheckRecord {
  id: string
  category: string
  category_label: string
  name: string
  status: 'passed' | 'finding' | 'inconclusive' | 'could_not_run'
  details: string
}

export interface ChecksSummary {
  total_performed: number
  passed: number
  findings: number
  inconclusive: number
  could_not_run: number
  details: CheckRecord[]
}

export interface ScanSummary {
  total_findings: number
  high_priority: number
  by_severity: {
    CRITICAL: number
    HIGH: number
    MEDIUM: number
    LOW: number
    INFO: number
  }
}

export interface ScanScore {
  status: 'available' | 'preliminary' | 'insufficient_evidence' | 'unavailable'
  safety_score: number | null
  risk_score: number | null
  score_label: string
  risk_label?: string
  rating: string
  confidence_indicator?: string
  deduplicated_findings_count: number
  raw_risk_score: number
  heuristic_count: number
  confirmed_count: number
  checks_performed?: number
  could_not_run?: number
  limitation_statement?: string
  explanation: string
  methodology: string
}

export interface ScanReport {
  target: string
  started_at: string
  finished_at: string | null
  scan_complete: boolean
  summary: ScanSummary
  checks_summary?: ChecksSummary
  score?: ScanScore
  findings: Finding[]
  errors: string[]
  scan_id?: number
}

export interface ScanHistoryItem {
  scan_id: number
  target: string
  started_at: string | null
  finished_at: string | null
  summary: ScanSummary
  checks_summary?: ChecksSummary
  score?: ScanScore
}

