from flask import Blueprint, request, jsonify, send_file
from app.services.report_service import (
    get_reports,
    generate_supplier_report,
)

report_bp = Blueprint('report', __name__)

@report_bp.route('/reports', methods=['GET'])
def fetch_reports():
    tipo = request.args.get("tipo")
    reports = get_reports(tipo)

    if reports:
        return jsonify(reports), 200
    return jsonify({"message": "Nenhum relatório encontrado."}), 404

#@report_bp.route('/reports/stock_rotation', methods=['GET'])
#def stock_rotation_report():
   # file_path = generate_stock_rotation_report()
   # return send_file(file_path, as_attachment=True)

#@report_bp.route('/reports/loss', methods=['GET'])
#def loss_report():
    #file_path = generate_loss_report()
    #return send_file(file_path, as_attachment=True)

#@report_bp.route('/reports/current_stock', methods=['GET'])
#def current_stock_report():
    #file_path = generate_current_stock_report()
   #return send_file(file_path, as_attachment=True)

@report_bp.route('/reports/suppliers', methods=['GET'])
def supplier_report():
    file_path = generate_supplier_report()
    return send_file(file_path, as_attachment=True)

#@report_bp.route('/reports/seasonality', methods=['GET'])
#def seasonality_report():
    #file_path = generate_seasonality_report()
    #return send_file(file_path, as_attachment=True)

#@report_bp.route('/reports/product_performance', methods=['GET'])
#def product_performance_report():
    #file_path = generate_product_performance_report()
    #return send_file(file_path, as_attachment=True)
