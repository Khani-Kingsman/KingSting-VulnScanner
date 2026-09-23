import os
from pathlib import Path
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from app.models.scan import ScanResult
from app.config import REPORTS_DIR

def generate_pdf_report(scan_result: ScanResult) -> str:
    """Generates a professional executive & technical security audit PDF report using ReportLab."""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"KingSting_Audit_{scan_result.scan_id}.pdf"
    file_path = REPORTS_DIR / filename

    doc = SimpleDocTemplate(
        str(file_path),
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    
    # Custom palette
    DARK_BLUE = colors.HexColor("#0f172a")
    ACCENT_CYAN = colors.HexColor("#0284c7")
    TEXT_MUTED = colors.HexColor("#64748b")
    BORDER_COLOR = colors.HexColor("#cbd5e1")
    BG_LIGHT = colors.HexColor("#f8fafc")
    
    CRIT_COLOR = colors.HexColor("#dc2626")
    HIGH_COLOR = colors.HexColor("#ea580c")
    MED_COLOR = colors.HexColor("#d97706")
    LOW_COLOR = colors.HexColor("#2563eb")
    INFO_COLOR = colors.HexColor("#475569")

    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=DARK_BLUE
    )

    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=ACCENT_CYAN
    )

    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=DARK_BLUE,
        spaceBefore=12,
        spaceAfter=6
    )

    body_style = ParagraphStyle(
        'DocBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#1e293b")
    )

    body_bold = ParagraphStyle(
        'DocBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    meta_label = ParagraphStyle(
        'MetaLabel',
        parent=body_style,
        fontName='Helvetica-Bold',
        textColor=TEXT_MUTED
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>KING STING VULNScanner</b><br/><font size='9' color='#64748b'>DEFENSIVE DEVICE AUDIT & COMPLIANCE REPORT</font>", title_style),
            Paragraph(f"<b>STATUS:</b> <font color='#16a34a'>AUDIT VERIFIED</font><br/><b>REF:</b> {scan_result.scan_id}<br/><b>DATE:</b> {scan_result.completed_at}", ParagraphStyle('RightH', parent=body_style, alignment=TA_RIGHT))
        ]
    ]
    header_table = Table(header_data, colWidths=[340, 200])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(header_table)
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT_CYAN, spaceAfter=14))

    # 2. Executive Scope & Target Details
    story.append(Paragraph("1. Audit Target & Environmental Scope", h2_style))

    scope_data = [
        [Paragraph("Target Asset Name:", meta_label), Paragraph(scan_result.target.name, body_bold),
         Paragraph("Target Type / Module:", meta_label), Paragraph(scan_result.module.upper(), body_bold)],
        [Paragraph("Network / Serial Identifier:", meta_label), Paragraph(scan_result.target.ip_or_serial, body_style),
         Paragraph("Audit Depth Level:", meta_label), Paragraph(scan_result.depth.upper() + " AUDIT", body_style)],
        [Paragraph("Operating System:", meta_label), Paragraph(scan_result.target.os_version or "N/A", body_style),
         Paragraph("Connection Interface:", meta_label), Paragraph(scan_result.target.connection_mode.upper(), body_style)],
        [Paragraph("Authorized Auditor:", meta_label), Paragraph(scan_result.authorized_by, body_style),
         Paragraph("Assigned Organization:", meta_label), Paragraph(scan_result.organization, body_style)],
    ]
    scope_table = Table(scope_data, colWidths=[120, 150, 120, 150])
    scope_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('PADDING', (0, 0), (-1, -1), 5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(scope_table)
    story.append(Spacer(1, 12))

    # 3. Security Scorecard & Findings Overview
    story.append(Paragraph("2. Security Posture Scorecard", h2_style))

    crit_cnt = sum(1 for f in scan_result.findings if f.severity == "critical")
    high_cnt = sum(1 for f in scan_result.findings if f.severity == "high")
    med_cnt = sum(1 for f in scan_result.findings if f.severity == "medium")
    low_cnt = sum(1 for f in scan_result.findings if f.severity == "low")
    info_cnt = sum(1 for f in scan_result.findings if f.severity == "info")

    score_color = "#16a34a" if scan_result.score >= 80 else ("#d97706" if scan_result.score >= 65 else "#dc2626")

    scorecard_data = [
        [
            Paragraph(f"<font size='26' color='{score_color}'><b>{scan_result.score}</b></font>/100<br/><font size='10' color='#64748b'>Grade: <b>{scan_result.grade}</b></font>", ParagraphStyle('ScoreCell', alignment=TA_CENTER)),
            Paragraph(f"<b>Total Controls Evaluated:</b> {scan_result.total_checks}<br/>"
                      f"<b>Controls Passed:</b> {scan_result.passed_checks}<br/>"
                      f"<b>Advisories Flagged:</b> {scan_result.warning_checks}<br/>"
                      f"<b>Deficiencies Detected:</b> {scan_result.failed_checks}", body_style),
            Paragraph(f"<font color='#dc2626'><b>Critical:</b> {crit_cnt}</font><br/>"
                      f"<font color='#ea580c'><b>High:</b> {high_cnt}</font><br/>"
                      f"<font color='#d97706'><b>Medium:</b> {med_cnt}</font><br/>"
                      f"<font color='#2563eb'><b>Low/Info:</b> {low_cnt + info_cnt}</font>", body_style)
        ]
    ]
    scorecard_table = Table(scorecard_data, colWidths=[140, 200, 200])
    scorecard_table.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
        ('BACKGROUND', (0,0), (0,0), colors.HexColor("#f1f5f9")),
        ('BACKGROUND', (1,0), (-1,-1), BG_LIGHT),
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('PADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(scorecard_table)
    story.append(Spacer(1, 8))

    # Executive Summary Paragraph
    story.append(Paragraph(f"<b>Executive Summary:</b> {scan_result.summary}", body_style))
    story.append(Spacer(1, 14))

    # 4. Detailed Vulnerabilities & Remediation
    story.append(Paragraph(f"3. Detailed Vulnerability Findings ({len(scan_result.findings)} Detected)", h2_style))

    if not scan_result.findings:
        story.append(Paragraph("<i>No critical vulnerabilities or security misconfigurations were identified during this audit.</i>", body_style))
    else:
        for idx, finding in enumerate(scan_result.findings, start=1):
            sev_color = {
                "critical": CRIT_COLOR,
                "high": HIGH_COLOR,
                "medium": MED_COLOR,
                "low": LOW_COLOR,
                "info": INFO_COLOR
            }.get(finding.severity.lower(), INFO_COLOR)

            finding_rows = [
                [
                    Paragraph(f"<b>#{idx} [{finding.severity.upper()}] {finding.title}</b>", ParagraphStyle('FTitle', parent=body_style, textColor=sev_color, fontName='Helvetica-Bold')),
                    Paragraph(f"<b>Component:</b> {finding.component} | <b>CVE:</b> {finding.cve_id or 'N/A'}", ParagraphStyle('FMeta', parent=body_style, alignment=TA_RIGHT))
                ],
                [
                    Paragraph(f"<b>Category:</b> {finding.category}<br/>"
                              f"<b>Analysis:</b> {finding.description}<br/>"
                              f"<font color='#0284c7'><b>Remediation Recommendation:</b></font> {finding.remediation}",
                              ParagraphStyle('FDesc', parent=body_style, leading=14)),
                    ""
                ]
            ]

            f_table = Table(finding_rows, colWidths=[380, 160])
            f_table.setStyle(TableStyle([
                ('SPAN', (0, 1), (1, 1)),
                ('BOX', (0, 0), (-1, -1), 0.75, BORDER_COLOR),
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#f8fafc")),
                ('LINEBELOW', (0, 0), (-1, 0), 0.5, BORDER_COLOR),
                ('PADDING', (0, 0), (-1, -1), 6),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))

            story.append(KeepTogether([f_table, Spacer(1, 8)]))

    # 5. Methodological & Non-Intrusive Sign-Off
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=BORDER_COLOR, spaceAfter=8))
    
    compliance_text = (
        "<b>LEGAL & COMPLIANCE ASSURANCE (§2 Ground Rules):</b> This security audit was executed with zero payload delivery, "
        "zero exploit execution, and zero authentication bypass. All evaluations were purely non-intrusive configuration and "
        "patch integrity checks authorized by the device owner / enterprise program. "
        f"<br/><b>Cryptographic Audit Hash:</b> <font face='Courier'>{scan_result.audit_hash}</font>"
    )
    story.append(Paragraph(compliance_text, ParagraphStyle('Compliance', parent=body_style, fontSize=7.5, leading=10, textColor=TEXT_MUTED)))

    doc.build(story)
    return str(file_path)
