import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from reportlab.lib.enums import TA_CENTER, TA_LEFT

def generate_gap_report_pdf(gap_reports: list, conflicts: list = [], output_path: str = None) -> str:
    if not output_path:
        os.makedirs("outputs", exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M")
        output_path = f"outputs/GapReport_{timestamp}.pdf"

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=2*cm,
        leftMargin=2*cm,
        topMargin=2*cm,
        bottomMargin=2*cm
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        "Title", parent=styles["Title"],
        fontSize=22, textColor=colors.HexColor("#1a1a2e"),
        spaceAfter=6, alignment=TA_CENTER
    )
    subtitle_style = ParagraphStyle(
        "Subtitle", parent=styles["Normal"],
        fontSize=11, textColor=colors.HexColor("#4a4a8a"),
        spaceAfter=20, alignment=TA_CENTER
    )
    section_style = ParagraphStyle(
        "Section", parent=styles["Heading2"],
        fontSize=14, textColor=colors.HexColor("#1a1a2e"),
        spaceBefore=16, spaceAfter=8,
        borderPad=4
    )
    body_style = ParagraphStyle(
        "Body", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#333333"),
        spaceAfter=6, leading=14
    )
    gap_style = ParagraphStyle(
        "Gap", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#222222"),
        spaceAfter=4, leading=13,
        leftIndent=10
    )
    warning_style = ParagraphStyle(
        "Warning", parent=styles["Normal"],
        fontSize=10, textColor=colors.HexColor("#c0392b"),
        spaceAfter=4, leading=13
    )

    story = []

    # Header
    story.append(Paragraph("ComplianceBot", title_style))
    story.append(Paragraph("Gap Analysis & Conflict Report", subtitle_style))
    story.append(Paragraph(
        f"Generated: {datetime.now().strftime('%B %d, %Y at %H:%M')}",
        ParagraphStyle("meta", parent=styles["Normal"], fontSize=9,
                       textColor=colors.grey, alignment=TA_CENTER)
    ))
    story.append(Spacer(1, 0.5*cm))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#4a4a8a")))
    story.append(Spacer(1, 0.5*cm))

    # Summary table
    total_gaps = len(gap_reports)
    high_risk = sum(1 for g in gap_reports if (g.get("confidence_score") or 0) >= 0.8)
    needs_review = sum(1 for g in gap_reports if g.get("requires_human_review"))
    total_conflicts = len(conflicts)

    summary_data = [
        ["Total Gaps", "High Confidence", "Needs Review", "Conflicts"],
        [str(total_gaps), str(high_risk), str(needs_review), str(total_conflicts)]
    ]
    summary_table = Table(summary_data, colWidths=[4*cm, 4*cm, 4*cm, 4*cm])
    summary_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 11),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("BACKGROUND", (0, 1), (-1, 1), colors.HexColor("#f0f0fa")),
        ("FONTSIZE", (0, 1), (-1, 1), 16),
        ("FONTNAME", (0, 1), (-1, 1), "Helvetica-Bold"),
        ("TEXTCOLOR", (0, 1), (-1, 1), colors.HexColor("#1a1a2e")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#4a4a8a")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("ROWBACKGROUNDS", (0, 1), (-1, 1), [colors.HexColor("#f0f0fa")]),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 0.8*cm))

    # Gap Reports Section
    if gap_reports:
        story.append(Paragraph("Compliance Gaps", section_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc")))
        story.append(Spacer(1, 0.3*cm))

        for i, gap in enumerate(gap_reports, 1):
            confidence = gap.get("confidence_score") or 0
            conf_pct = f"{confidence:.0%}"
            jurisdiction = gap.get("jurisdiction", "N/A")
            deadline = gap.get("deadline", "")
            days = gap.get("days_remaining", -1)
            requires_review = gap.get("requires_human_review", False)

            # Color by confidence
            if confidence >= 0.8:
                conf_color = "#27ae60"
            elif confidence >= 0.6:
                conf_color = "#f39c12"
            else:
                conf_color = "#c0392b"

            row_data = [[
                Paragraph(f"<b>#{i} — {gap.get('regulation_title', 'Unknown')}</b>", body_style),
                Paragraph(
                    f'<font color="{conf_color}"><b>{conf_pct}</b></font> confidence | {jurisdiction}',
                    ParagraphStyle("badge", parent=styles["Normal"], fontSize=10, alignment=TA_LEFT)
                )
            ]]
            row_table = Table(row_data, colWidths=[11*cm, 5*cm])
            row_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8f8ff")),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#4a4a8a")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(row_table)
            story.append(Spacer(1, 0.15*cm))

            story.append(Paragraph(f"<b>Gap:</b> {gap.get('gap_description', '')}", gap_style))

            if gap.get("policy_section"):
                story.append(Paragraph(f"<b>Policy Section:</b> {gap.get('policy_section')}", gap_style))

            if deadline:
                day_text = f"{days} days remaining" if days >= 0 else "overdue"
                color = "#c0392b" if days < 30 else "#f39c12"
                story.append(Paragraph(
                    f'<font color="{color}"><b>⚠ Deadline: {deadline} ({day_text})</b></font>',
                    gap_style
                ))

            if requires_review:
                story.append(Paragraph("⚠ Human review required — confidence below threshold", warning_style))

            if gap.get("jira_key"):
                story.append(Paragraph(f"<b>Jira:</b> {gap.get('jira_key')}", gap_style))

            story.append(Spacer(1, 0.4*cm))

    # Conflicts Section
    if conflicts:
        story.append(Paragraph("Jurisdiction Conflicts", section_style))
        story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#e74c3c")))
        story.append(Spacer(1, 0.3*cm))

        for i, c in enumerate(conflicts, 1):
            story.append(Paragraph(
                f"<b>Conflict #{i}:</b> {c.get('regulation_1_jurisdiction')} vs {c.get('regulation_2_jurisdiction')}",
                body_style
            ))
            story.append(Paragraph(
                f"{c.get('regulation_1_title', '')} ↔ {c.get('regulation_2_title', '')}",
                gap_style
            ))
            story.append(Paragraph(
                f"<b>Plain English:</b> {c.get('plain_english_explanation', '')}",
                gap_style
            ))
            story.append(Spacer(1, 0.4*cm))

    # Footer
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc")))
    story.append(Spacer(1, 0.2*cm))
    story.append(Paragraph(
        "Generated by ComplianceBot — AI-Powered Compliance Monitoring",
        ParagraphStyle("footer", parent=styles["Normal"], fontSize=8,
                       textColor=colors.grey, alignment=TA_CENTER)
    ))

    doc.build(story)
    print(f"  📄 PDF saved: {output_path}")
    return output_path