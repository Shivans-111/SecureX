import { jsPDF } from 'jspdf'
import type { ScanReport } from '../types/scanner'
import { calculateScanScoreClient } from './scoreCalculator'

/**
 * Sanitizes input strings for standard PDF WinAnsi / Latin-1 fonts, replacing exotic unicode
 * characters, em-dashes, curved quotes, and emojis with compatible, clean representations.
 */
function sanitizePdfText(input: unknown): string {
  if (typeof input !== 'string') {
    if (input === null || input === undefined) return ''
    return String(input)
  }

  return input
    .replace(/[\u2014\u2015]/g, ' - ') // em-dash, horizontal bar
    .replace(/[\u2012\u2013]/g, '-')   // figure dash, en-dash
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'") // curly single quotes
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"') // curly double quotes
    .replace(/[\u2026]/g, '...') // ellipsis
    .replace(/[\u2022\u2023\u25E6\u2043\u2219]/g, '*') // bullets
    .replace(/[\u2190-\u21FF]/g, '->') // arrows
    .replace(/[\u2600-\u26FF\u2700-\u27BF\uD83C-\uDBFF\uDC00-\uDFFF]/g, '') // emojis
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, ' ') // fallback to space for unsupported chars
    .trim()
}

/**
 * Generates an executive, professional PDF security assessment report from the real backend scan report.
 * Strictly adheres to backend findings without fabricating or exaggerating results.
 * Returns the generated Blob and triggers browser download.
 */
export function generateScanReportPdf(report: ScanReport): Blob {
  if (!report) {
    throw new Error('Cannot generate PDF: Scan report data is missing or empty.')
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const contentWidth = pageWidth - margin * 2
  let y = 45

  // Safe report data extraction
  const targetUrl = sanitizePdfText(report.target || 'Unknown Target')
  const scanId = report.scan_id ? String(report.scan_id) : 'LIVE'
  const summary = report.summary || {
    total_findings: Array.isArray(report.findings) ? report.findings.length : 0,
    high_priority: 0,
    by_severity: { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 },
  }
  const bySev = summary.by_severity || { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 }
  const findings = Array.isArray(report.findings) ? report.findings : []

  // Helper to add new page and reset cursor
  const checkPageBreak = (neededSpace: number) => {
    if (y + neededSpace > pageHeight - 55) {
      doc.addPage()
      y = 45
      renderPageHeader()
    }
  }

  // Running header for subsequent pages
  const renderPageHeader = () => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(100, 116, 139) // Slate-500
    doc.text('SECURE X - PASSIVE SECURITY ASSESSMENT REPORT', margin, y)
    const reportRef = `TARGET: ${targetUrl.slice(0, 45)} | SCAN #${scanId}`
    doc.text(reportRef, pageWidth - margin, y, { align: 'right' })
    y += 12
    doc.setDrawColor(203, 213, 225)
    doc.setLineWidth(0.5)
    doc.line(margin, y, pageWidth - margin, y)
    y += 20
  }

  // --- 1. COVER / MAIN HEADER BLOCK ---
  doc.setFillColor(15, 23, 42) // Slate-900
  doc.roundedRect(margin, y, contentWidth, 80, 4, 4, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(255, 255, 255)
  doc.text('SECURE X', margin + 18, y + 32)

  doc.setFontSize(9)
  doc.setTextColor(255, 106, 43) // SecureX Orange
  doc.text('PASSIVE VULNERABILITY & RISK ASSESSMENT ENGINE', margin + 18, y + 48)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text('NON-DESTRUCTIVE STATIC & PROTOCOL ANALYSIS', margin + 18, y + 64)

  const scanDate = report.finished_at
    ? new Date(report.finished_at).toLocaleString()
    : report.started_at
    ? new Date(report.started_at).toLocaleString()
    : 'N/A'

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(255, 255, 255)
  doc.text(`REPORT #${scanId}`, pageWidth - margin - 18, y + 32, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(148, 163, 184)
  doc.text(sanitizePdfText(scanDate), pageWidth - margin - 18, y + 48, { align: 'right' })
  doc.text(report.scan_complete ? 'STATUS: COMPLETED' : 'STATUS: INCOMPLETE', pageWidth - margin - 18, y + 64, { align: 'right' })

  y += 98

  // --- 2. TARGET SCOPE & METADATA SECTION ---
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(226, 232, 240)
  doc.roundedRect(margin, y, contentWidth, 68, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.setTextColor(30, 41, 59)
  doc.text('ASSESSMENT TARGET SPECIFICATION', margin + 12, y + 18)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Target URL:', margin + 12, y + 34)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(15, 23, 42)
  doc.text(targetUrl.slice(0, 75), margin + 75, y + 34)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(71, 85, 105)
  doc.text('Started At:', margin + 12, y + 50)
  doc.text(report.started_at ? sanitizePdfText(new Date(report.started_at).toLocaleString()) : 'N/A', margin + 75, y + 50)

  doc.text('Completed At:', margin + 280, y + 50)
  doc.text(report.finished_at ? sanitizePdfText(new Date(report.finished_at).toLocaleString()) : 'N/A', margin + 355, y + 50)

  y += 82

  // --- 2.5 ASSESSED SECURITY POSTURE & SCORES ---
  const score =
    report.score ||
    calculateScanScoreClient(
      findings,
      report.scan_complete,
      report.errors,
      report.checks_summary?.total_performed,
      report.checks_summary?.could_not_run
    )
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('ASSESSED SECURITY POSTURE & SCORES', margin, y)
  y += 12

  const scoreCardWidth = (contentWidth - 10) / 2
  const scoreCardHeight = 50

  if (score.status === 'unavailable' || score.safety_score === null || score.risk_score === null) {
    doc.setFillColor(241, 245, 249)
    doc.roundedRect(margin, y, contentWidth, 36, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(100, 116, 139)
    doc.text('Score Unavailable: Assessment incomplete or stopped by scope safety checks.', margin + 14, y + 22)
    y += 46
  } else {
    // Safety Card (Left)
    doc.setFillColor(240, 253, 244) // Emerald-50
    doc.setDrawColor(187, 247, 208)
    doc.roundedRect(margin, y, scoreCardWidth, scoreCardHeight, 3, 3, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(21, 128, 61)
    doc.text('ESTIMATED WEBSITE SAFETY', margin + 12, y + 15)

    doc.setFontSize(16)
    doc.setTextColor(22, 101, 52)
    doc.text(`${score.safety_score}%`, margin + 12, y + 33)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(22, 101, 52)
    doc.text(sanitizePdfText(score.rating), margin + 65, y + 32)

    // Safety Progress Bar
    const barWidth = scoreCardWidth - 24
    const barY = y + 38
    doc.setFillColor(220, 252, 231)
    doc.roundedRect(margin + 12, barY, barWidth, 4, 1, 1, 'F')
    doc.setFillColor(34, 197, 94)
    doc.roundedRect(margin + 12, barY, Math.max(2, (barWidth * (score.safety_score / 100))), 4, 1, 1, 'F')

    // Risk Card (Right)
    const card2X = margin + scoreCardWidth + 10
    doc.setFillColor(254, 242, 242) // Rose-50
    doc.setDrawColor(254, 202, 202)
    doc.roundedRect(card2X, y, scoreCardWidth, scoreCardHeight, 3, 3, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(185, 28, 28)
    doc.text('ASSESSED SECURITY RISK', card2X + 12, y + 15)

    doc.setFontSize(16)
    doc.setTextColor(153, 27, 27)
    doc.text(`${score.risk_score}%`, card2X + 12, y + 33)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(153, 27, 27)
    doc.text(`Raw Risk: ${score.raw_risk_score} pts`, card2X + 65, y + 32)

    // Risk Progress Bar
    doc.setFillColor(254, 226, 226)
    doc.roundedRect(card2X + 12, barY, barWidth, 4, 1, 1, 'F')
    doc.setFillColor(239, 68, 68)
    doc.roundedRect(card2X + 12, barY, Math.max(2, (barWidth * (score.risk_score / 100))), 4, 1, 1, 'F')

    y += scoreCardHeight + 10

    // Advisory and methodology notes
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100, 116, 139)
    doc.text(
      'Limitation: Scores are estimates based on the checks performed. They do not guarantee that a website is secure or establish the probability that it will be hacked.',
      margin,
      y
    )
    y += 9
    doc.text(
      'Methodology: Severity weights: Critical=25, High=15, Medium=6, Low=2, Info=0. Heuristic observations receive a 0.4x factor. Unique findings deduplicated. Safety = 100 - Risk.',
      margin,
      y
    )
    y += 14
  }

  // --- 3. EXECUTIVE SUMMARY & METRICS GRID ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text('EXECUTIVE RISK SUMMARY', margin, y)
  y += 12

  const cardWidth = (contentWidth - 18) / 4
  const cardHeight = 48

  // Card 1: Total
  doc.setFillColor(241, 245, 249)
  doc.roundedRect(margin, y, cardWidth, cardHeight, 3, 3, 'F')
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42)
  doc.text(String(summary.total_findings ?? 0), margin + cardWidth / 2, y + 24, { align: 'center' })
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  doc.text('TOTAL FINDINGS', margin + cardWidth / 2, y + 38, { align: 'center' })

  // Card 2: High Priority
  const card2X = margin + cardWidth + 6
  doc.setFillColor(254, 242, 242)
  doc.roundedRect(card2X, y, cardWidth, cardHeight, 3, 3, 'F')
  doc.setFontSize(16)
  doc.setTextColor(220, 38, 38)
  doc.text(String(summary.high_priority ?? 0), card2X + cardWidth / 2, y + 24, { align: 'center' })
  doc.setFontSize(7.5)
  doc.setTextColor(185, 28, 28)
  doc.text('HIGH PRIORITY', card2X + cardWidth / 2, y + 38, { align: 'center' })

  // Card 3: Medium
  const card3X = card2X + cardWidth + 6
  doc.setFillColor(254, 252, 232)
  doc.roundedRect(card3X, y, cardWidth, cardHeight, 3, 3, 'F')
  doc.setFontSize(16)
  doc.setTextColor(202, 138, 4)
  doc.text(String(bySev.MEDIUM || 0), card3X + cardWidth / 2, y + 24, { align: 'center' })
  doc.setFontSize(7.5)
  doc.setTextColor(161, 98, 7)
  doc.text('MEDIUM SEVERITY', card3X + cardWidth / 2, y + 38, { align: 'center' })

  // Card 4: Low & Info
  const card4X = card3X + cardWidth + 6
  const lowCount = (bySev.LOW || 0) + (bySev.INFO || 0)
  doc.setFillColor(240, 253, 244)
  doc.roundedRect(card4X, y, cardWidth, cardHeight, 3, 3, 'F')
  doc.setFontSize(16)
  doc.setTextColor(22, 163, 74)
  doc.text(String(lowCount), card4X + cardWidth / 2, y + 24, { align: 'center' })
  doc.setFontSize(7.5)
  doc.setTextColor(21, 128, 61)
  doc.text('LOW & INFO', card4X + cardWidth / 2, y + 38, { align: 'center' })

  y += cardHeight + 20

  // Severity Breakdown Row
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(71, 85, 105)
  const breakdownText = `Detailed Breakdown: Critical: ${bySev.CRITICAL || 0}  |  High: ${bySev.HIGH || 0}  |  Medium: ${bySev.MEDIUM || 0}  |  Low: ${bySev.LOW || 0}  |  Informational: ${bySev.INFO || 0}`
  doc.text(breakdownText, margin, y)
  y += 16

  // Diagnostic Checks Execution Row
  if (report.checks_summary) {
    const chk = report.checks_summary
    doc.setFillColor(248, 250, 252)
    doc.setDrawColor(226, 232, 240)
    doc.roundedRect(margin, y, contentWidth, 22, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    doc.setTextColor(30, 41, 59)
    doc.text(`DIAGNOSTIC CHECKS (${chk.total_performed} EXECUTED):`, margin + 10, y + 14)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(71, 85, 105)
    const chkText = `Passed: ${chk.passed}  |  Findings: ${chk.findings}  |  Inconclusive (Potential): ${chk.inconclusive}  |  Could Not Run: ${chk.could_not_run}`
    doc.text(chkText, margin + 185, y + 14)
    y += 28
  } else {
    y += 4
  }

  // --- 4. DETAILED FINDINGS SECTION ---
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.text(`IDENTIFIED SECURITY FINDINGS (${findings.length})`, margin, y)
  y += 14

  if (findings.length === 0) {
    checkPageBreak(50)
    doc.setFillColor(240, 253, 244)
    doc.roundedRect(margin, y, contentWidth, 40, 3, 3, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(22, 101, 52)
    doc.text('No passive issues or security gaps detected by the inspection suite.', margin + 14, y + 24)
    y += 50
  } else {
    findings.forEach((f, idx) => {
      const cleanTitle = sanitizePdfText(f.title || `Finding #${idx + 1}`)
      const cleanRisk = sanitizePdfText(f.risk || 'No risk details provided.')
      const cleanFix = sanitizePdfText(f.fix || 'No remediation instructions provided.')
      const cleanEvidence = f.evidence ? sanitizePdfText(f.evidence) : ''
      const cleanCategory = sanitizePdfText(f.category_label || f.category || 'Security Finding')
      const cleanStatus = sanitizePdfText(f.status || 'Needs fix')
      const cleanSeverity = sanitizePdfText(f.severity || 'LOW').toUpperCase()

      // Calculate heights of text blocks to prevent awkward page splits
      const titleLines = doc.splitTextToSize(`${idx + 1}. ${cleanTitle}`, contentWidth - 110)
      const riskLines = doc.splitTextToSize(cleanRisk, contentWidth - 24)
      const fixLines = doc.splitTextToSize(cleanFix, contentWidth - 24)
      const evidenceLines = cleanEvidence ? doc.splitTextToSize(cleanEvidence, contentWidth - 24) : []

      const boxHeaderHeight = Math.max(26, titleLines.length * 12 + 10)
      const isHeuristic = f.confidence === 'heuristic'
      const heuristicHeight = isHeuristic ? 18 : 0
      const evidenceHeight = cleanEvidence ? evidenceLines.length * 10 + 20 : 0
      const contentHeight = riskLines.length * 11 + fixLines.length * 11 + 40 + heuristicHeight + evidenceHeight
      const totalBoxHeight = boxHeaderHeight + contentHeight

      // Smart page break: if box fits on a single page, ensure it starts on the current page only if it won't overflow
      const usablePageHeight = pageHeight - 110
      if (totalBoxHeight <= usablePageHeight) {
        if (y + totalBoxHeight > pageHeight - 55) {
          doc.addPage()
          y = 45
          renderPageHeader()
        }
      } else {
        // Very large finding - start at top of a new page if already halfway down
        if (y > 90) {
          doc.addPage()
          y = 45
          renderPageHeader()
        }
      }

      // Finding Box Border
      doc.setDrawColor(226, 232, 240)
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(margin, y, contentWidth, totalBoxHeight, 3, 3, 'FD')

      // Finding Header Fill
      doc.setFillColor(248, 250, 252)
      doc.roundedRect(margin, y, contentWidth, boxHeaderHeight, 3, 3, 'F')
      doc.line(margin, y + boxHeaderHeight, margin + contentWidth, y + boxHeaderHeight)

      // Title & Index
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9.5)
      doc.setTextColor(15, 23, 42)
      doc.text(titleLines, margin + 10, y + 16)

      // Severity Badge
      let badgeBg = [241, 245, 249]
      let badgeFg = [71, 85, 105]
      if (cleanSeverity === 'CRITICAL') {
        badgeBg = [254, 226, 226]
        badgeFg = [185, 28, 28]
      } else if (cleanSeverity === 'HIGH') {
        badgeBg = [255, 237, 213]
        badgeFg = [194, 65, 12]
      } else if (cleanSeverity === 'MEDIUM') {
        badgeBg = [254, 249, 195]
        badgeFg = [161, 98, 7]
      } else if (cleanSeverity === 'LOW') {
        badgeBg = [220, 252, 231]
        badgeFg = [21, 128, 61]
      }

      const badgeX = pageWidth - margin - 85
      doc.setFillColor(badgeBg[0], badgeBg[1], badgeBg[2])
      doc.roundedRect(badgeX, y + 6, 75, 15, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(badgeFg[0], badgeFg[1], badgeFg[2])
      doc.text(cleanSeverity, badgeX + 37.5, y + 17, { align: 'center' })

      let innerY = y + boxHeaderHeight + 14

      // Category & Status sub-row
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(100, 116, 139)
      doc.text('Category: ', margin + 12, innerY)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(15, 23, 42)
      doc.text(`${cleanCategory}  |  Status: ${cleanStatus}`, margin + 55, innerY)
      innerY += 14

      // Heuristic Warning Callout if unverified
      if (isHeuristic) {
        doc.setFillColor(254, 243, 199) // Amber-100
        doc.roundedRect(margin + 10, innerY - 9, contentWidth - 20, 15, 2, 2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(7.5)
        doc.setTextColor(180, 83, 9) // Amber-700
        doc.text('Potential - manual verification required: Passive indicator only - requires manual verification.', margin + 15, innerY + 2)
        innerY += 18
      }

      // Risk Context
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(185, 28, 28)
      doc.text('RISK CONTEXT:', margin + 12, innerY)
      innerY += 10
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(51, 65, 85)
      doc.text(riskLines, margin + 12, innerY)
      innerY += riskLines.length * 11 + 6

      // Remediation Guidance
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(21, 128, 61)
      doc.text('REMEDIATION GUIDANCE:', margin + 12, innerY)
      innerY += 10
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(51, 65, 85)
      doc.text(fixLines, margin + 12, innerY)
      innerY += fixLines.length * 11 + 6

      // Evidence Box (if provided)
      if (cleanEvidence) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        doc.setTextColor(71, 85, 105)
        doc.text('TECHNICAL EVIDENCE:', margin + 12, innerY)
        innerY += 10

        doc.setFillColor(241, 245, 249)
        doc.roundedRect(margin + 12, innerY - 8, contentWidth - 24, evidenceLines.length * 10 + 10, 2, 2, 'F')

        doc.setFont('courier', 'normal')
        doc.setFontSize(7.5)
        doc.setTextColor(15, 23, 42)
        doc.text(evidenceLines, margin + 18, innerY + 1)
        innerY += evidenceLines.length * 10 + 12
      }

      y += totalBoxHeight + 14
    })
  }

  // --- 5. METHODOLOGY & SAFETY NOTICE ---
  checkPageBreak(70)
  doc.setFillColor(248, 250, 252)
  doc.setDrawColor(203, 213, 225)
  doc.roundedRect(margin, y, contentWidth, 54, 3, 3, 'FD')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(30, 41, 59)
  doc.text('ASSESSMENT INTEGRITY & SCOPE STATEMENT', margin + 12, y + 14)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  doc.setTextColor(100, 116, 139)
  const noticeLines = doc.splitTextToSize(
    'This security assessment report is generated strictly from non-destructive, passive HTTP/TLS diagnostics and static response cues. Zero attack payloads were submitted, no vulnerabilities were exploited, and no backend data was modified. Scores are estimates based on the checks performed. They do not guarantee that a website is secure or establish the probability that it will be hacked.',
    contentWidth - 24
  )
  doc.text(noticeLines, margin + 12, y + 26)

  // --- 6. NUMBER ALL PAGES IN FOOTER ---
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(148, 163, 184)
    doc.text(
      'Secure X - Website Vulnerability & Risk Assessment Engine',
      margin,
      pageHeight - 25
    )
    doc.text(
      `Page ${i} of ${totalPages}`,
      pageWidth - margin,
      pageHeight - 25,
      { align: 'right' }
    )
    doc.setDrawColor(226, 232, 240)
    doc.setLineWidth(0.5)
    doc.line(margin, pageHeight - 35, pageWidth - margin, pageHeight - 35)
  }

  // Safe filename
  let hostName = 'target'
  try {
    const rawTarget = targetUrl.startsWith('http') ? targetUrl : `https://${targetUrl}`
    const urlObj = new URL(rawTarget)
    hostName = (urlObj.hostname || 'target').replace(/[^a-zA-Z0-9.-]/g, '_')
  } catch {
    hostName = targetUrl.replace(/[^a-zA-Z0-9.-]/g, '_') || 'target'
  }
  const cleanScanId = scanId && scanId !== 'LIVE' ? scanId : 'Latest'
  const filename = `SecureX_Report_${hostName}_Scan${cleanScanId}.pdf`

  // Output valid PDF ArrayBuffer and construct Blob
  const pdfBytes = doc.output('arraybuffer')
  const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' })

  // Trigger reliable browser download
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const blobUrl = window.URL.createObjectURL(pdfBlob)
    const downloadLink = document.createElement('a')
    downloadLink.href = blobUrl
    downloadLink.download = filename
    downloadLink.style.display = 'none'
    document.body.appendChild(downloadLink)
    downloadLink.click()

    setTimeout(() => {
      if (downloadLink.parentNode) {
        downloadLink.parentNode.removeChild(downloadLink)
      }
      window.URL.revokeObjectURL(blobUrl)
    }, 5000)
  }

  return pdfBlob
}
