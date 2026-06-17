import io

import pandas as pd


def to_csv_bytes(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False).encode("utf-8")


def to_tsv_bytes(df: pd.DataFrame) -> bytes:
    return df.to_csv(index=False, sep="\t").encode("utf-8")


def to_json_bytes(df: pd.DataFrame) -> bytes:
    return df.to_json(orient="records", force_ascii=False, indent=2).encode("utf-8")


def to_excel_bytes(df: pd.DataFrame) -> bytes:
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="Data")
        ws = writer.sheets["Data"]
        # Auto-fit column widths (capped at 60 chars to avoid absurdly wide columns)
        for col_cells in ws.columns:
            max_len = max(
                (len(str(cell.value)) if cell.value is not None else 0)
                for cell in col_cells
            )
            ws.column_dimensions[col_cells[0].column_letter].width = min(max_len + 4, 60)
    return buffer.getvalue()


def to_pdf_bytes(title: str, df: pd.DataFrame, max_rows: int = 500) -> bytes:
    """Render a styled tabular PDF report with ReportLab."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        leftMargin=1 * cm,
        rightMargin=1 * cm,
        topMargin=1.5 * cm,
        bottomMargin=1.5 * cm,
    )
    styles = getSampleStyleSheet()
    elements: list = [Paragraph(title, styles["Title"]), Spacer(1, 12)]

    shown = df.head(max_rows).fillna("")
    # If the DataFrame has a single "content" column (PDF/docx text fallback),
    # wrap each cell in a Paragraph so long text flows across multiple lines.
    is_text_doc = list(shown.columns) == ["content"] or list(shown.columns) == ["page", "content"]

    header_row = list(shown.columns)
    body_rows = shown.astype(str).values.tolist()

    if is_text_doc:
        # Render each content cell as a flowing paragraph
        data = [header_row] + [
            [Paragraph(cell, styles["Normal"]) for cell in row]
            for row in body_rows
        ]
        col_widths = None  # let ReportLab decide
    else:
        data = [header_row] + body_rows
        # Distribute available width evenly across columns (max 4 cm each)
        page_w = landscape(A4)[0] - 2 * cm
        col_w = min(page_w / max(len(header_row), 1), 4 * cm)
        col_widths = [col_w] * len(header_row)

    table = Table(data, repeatRows=1, colWidths=col_widths)
    table.setStyle(
        TableStyle([
            ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#2563EB")),
            ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
            ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
            ("FONTSIZE",      (0, 0), (-1, -1), 8),
            ("GRID",          (0, 0), (-1, -1), 0.25, colors.grey),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
            ("VALIGN",        (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING",    (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ])
    )
    elements.append(table)

    if len(df) > max_rows:
        elements.append(Spacer(1, 8))
        elements.append(
            Paragraph(
                f"<i>Showing {max_rows} of {len(df)} rows.</i>",
                styles["Normal"],
            )
        )

    doc.build(elements)
    return buffer.getvalue()
