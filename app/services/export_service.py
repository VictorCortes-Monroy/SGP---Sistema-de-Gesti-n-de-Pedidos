import io
from typing import List
from openpyxl import Workbook
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet


def export_requests_excel(requests: List) -> io.BytesIO:
    """Generate Excel file from a list of Request objects."""
    wb = Workbook()
    ws = wb.active
    ws.title = "Solicitudes"

    headers = ["ID", "Titulo", "Estado", "Monto Total", "Moneda", "Fecha Creacion"]
    ws.append(headers)

    for req in requests:
        ws.append([
            str(req.id),
            req.title,
            req.status.value if hasattr(req.status, "value") else str(req.status),
            float(req.total_amount),
            req.currency,
            req.created_at.strftime("%Y-%m-%d %H:%M") if req.created_at else "",
        ])

    for col in ws.columns:
        max_length = max(len(str(cell.value or "")) for cell in col)
        ws.column_dimensions[col[0].column_letter].width = min(max_length + 2, 50)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output


def export_requests_pdf(requests: List) -> io.BytesIO:
    """Generate PDF file from a list of Request objects."""
    output = io.BytesIO()
    doc = SimpleDocTemplate(output, pagesize=landscape(letter))
    styles = getSampleStyleSheet()

    elements = []
    elements.append(Paragraph("Reporte de Solicitudes", styles["Title"]))
    elements.append(Spacer(1, 12))

    data = [["ID", "Titulo", "Estado", "Monto", "Moneda", "Fecha"]]
    for req in requests:
        data.append([
            str(req.id)[:8] + "...",
            (req.title[:30] + "...") if len(req.title) > 30 else req.title,
            req.status.value if hasattr(req.status, "value") else str(req.status),
            f"${float(req.total_amount):,.2f}",
            req.currency,
            req.created_at.strftime("%Y-%m-%d") if req.created_at else "",
        ])

    table = Table(data)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("GRID", (0, 0), (-1, -1), 1, colors.black),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.lightgrey]),
    ]))
    elements.append(table)

    doc.build(elements)
    output.seek(0)
    return output
