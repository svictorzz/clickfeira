import os
import pandas as pd
from datetime import datetime
from fpdf import FPDF
from firebase_admin import db
from flask import jsonify

reports_dir = os.path.join(os.getcwd(), "app", "reports")
if not os.path.exists(reports_dir):
    os.makedirs(reports_dir)

def get_reports(tipo=None):
    ref = db.reference("relatorio")
    reports = ref.get() or {}

    if isinstance(reports, list):
        reports_filtrados = [report for report in reports if report]

    elif isinstance(reports, dict):
        reports_filtrados = {key: report for key, report in reports.items() if report and report.get("tipo") == tipo} if tipo else {key: report for key, report in reports.items() if report}

        return [{
            "idRelatorio": report.get("idRelatorio"),
            "dataGeracao": report.get("dataGeracao"),
            "descricao": report.get("descricao"),
            "status": report.get("status"),
            "tipo": report.get("tipo"),
            "totalItens": report.get("totalItens"),
            "valorTotal": report.get("valorTotal"),
            "produtosAfetados": report.get("produtosAfetados"),
        } for report in reports_filtrados.values()]
    
    return reports_filtrados

def generate_current_stock_report():
    ref = db.reference("estoque")
    data = ref.get() or {}

    report_data = []
    for produto_id, produto in data.items():
        report_data.append({
            "Produto": produto["nome"],
            "Categoria": produto["categoria"],
            "Quantidade em Estoque": produto["quantidadeEstoque"],
            "Preço Unitário": produto["precoVenda"],
            "Validade": produto["validade"],
            "Última Atualização": produto.get("ultimaAtualizacao", "N/A"),
        })

    df = pd.DataFrame(report_data)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(reports_dir, f"current_stock_{timestamp}.xlsx")

    df.to_excel(file_path, index=False)

    return file_path

def generate_supplier_report():
    ref = db.reference("fornecedores")
    data = ref.get() or {}

    df = pd.DataFrame(data.values())

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    file_path = os.path.join(reports_dir, f"supplier_report_{timestamp}.xlsx")

    df.to_excel(file_path, index=False)

    return file_path
