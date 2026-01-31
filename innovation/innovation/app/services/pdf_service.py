from fpdf import FPDF

def gerar_pdf_nota(dados: dict) -> bytes:
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", size=12)

    for k, v in dados.items():
        pdf.cell(200, 10, f"{k}: {v}", ln=True)

    return pdf.output(dest="S").encode("latin1")
