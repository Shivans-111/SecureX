import type { Finding, ScanScore } from '../types/scanner'

export const SEVERITY_WEIGHTS: Record<string, number> = {
  CRITICAL: 25.0,
  HIGH: 15.0,
  MEDIUM: 6.0,
  LOW: 2.0,
  INFO: 0.0,
}

export const HEURISTIC_WEIGHT_FACTOR = 0.4

export const LIMITATION_STATEMENT =
  'Scores are estimates based on the checks performed. They do not guarantee that a website is secure or establish the probability that it will be hacked.'

/**
 * Computes deterministic safety and risk scores matching backend algorithm.
 */
export function calculateScanScoreClient(
  findings: Finding[],
  scanComplete: boolean = true,
  errors: string[] = [],
  checksPerformed: number = 10,
  couldNotRun: number = 0
): ScanScore {
  if (!scanComplete || (errors.length > 0 && findings.length === 0)) {
    return {
      status: 'unavailable',
      safety_score: null,
      risk_score: null,
      score_label: 'Score unavailable',
      risk_label: 'Risk unavailable',
      rating: 'Unavailable',
      confidence_indicator: 'Scan Incomplete / Stopped',
      deduplicated_findings_count: 0,
      raw_risk_score: 0.0,
      heuristic_count: 0,
      confirmed_count: 0,
      checks_performed: checksPerformed,
      could_not_run: couldNotRun,
      limitation_statement: LIMITATION_STATEMENT,
      explanation: `Score is unavailable because the scan did not complete or was stopped by scope safety boundaries. ${LIMITATION_STATEMENT}`,
      methodology:
        'Severity weights: Critical = 25 pts, High = 15 pts, Medium = 6 pts, Low = 2 pts, Info = 0 pts. Potential / heuristic observations receive a 0.4x factor. Equivalent findings across crawled pages are deduplicated. Safety = 100 - Risk.',
    }
  }

  // Deduplicate findings by finding ID
  const seenIds = new Set<string>()
  const dedupedFindings: Finding[] = []

  for (const f of findings) {
    const id = f.id || `${f.category}:${f.title}`
    if (!seenIds.has(id)) {
      seenIds.add(id)
      dedupedFindings.push(f)
    }
  }

  let rawRisk = 0.0
  let heuristicCount = 0
  let confirmedCount = 0

  for (const f of dedupedFindings) {
    const sev = (f.severity || 'LOW').toUpperCase()
    const isHeuristic = f.confidence === 'heuristic'
    const baseWeight = SEVERITY_WEIGHTS[sev] ?? 2.0

    if (isHeuristic) {
      rawRisk += baseWeight * HEURISTIC_WEIGHT_FACTOR
      heuristicCount++
    } else {
      rawRisk += baseWeight
      confirmedCount++
    }
  }

  const riskScore = Math.min(100, Math.max(0, Math.round(rawRisk)))
  const safetyScore = Math.max(0, Math.min(100, 100 - riskScore))

  let rating = 'Low Risk'
  if (safetyScore >= 85) {
    rating = 'Strong Posture (Low Risk)'
  } else if (safetyScore >= 65) {
    rating = 'Moderate Posture (Medium Risk)'
  } else if (safetyScore >= 40) {
    rating = 'Elevated Risk Posture'
  } else {
    rating = 'High Risk Posture'
  }

  const isInsufficient = checksPerformed < 5 || couldNotRun >= 4

  return {
    status: isInsufficient ? 'insufficient_evidence' : 'available',
    safety_score: safetyScore,
    risk_score: riskScore,
    score_label: 'Estimated score based on checks performed',
    risk_label: 'Assessed Security Risk',
    rating,
    confidence_indicator: isInsufficient
      ? 'Insufficient evidence — too few checks completed'
      : 'Evaluated against passive diagnostic checks',
    deduplicated_findings_count: dedupedFindings.length,
    raw_risk_score: Math.round(rawRisk * 10) / 10,
    heuristic_count: heuristicCount,
    confirmed_count: confirmedCount,
    checks_performed: checksPerformed,
    could_not_run: couldNotRun,
    limitation_statement: LIMITATION_STATEMENT,
    explanation: `${LIMITATION_STATEMENT} This deterministic score models passive posture from the observed security indicators and does not replace authenticated application security testing.`,
    methodology:
      'Deterministic severity formula: Raw Risk = Sum(Severity Base Weight * Confidence Factor). Severity weights: Critical = 25 pts, High = 15 pts, Medium = 6 pts, Low = 2 pts, Info = 0 pts. Confirmed findings receive 1.0x factor; Potential / heuristic observations receive 0.4x factor because passive cues require developer verification. Equivalent findings across crawled pages are deduplicated. Assessed Security Risk = min(100, max(0, round(raw_risk))). Estimated Website Safety = 100 - Assessed Security Risk.',
  }
}

