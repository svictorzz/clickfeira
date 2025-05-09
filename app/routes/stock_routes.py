from flask import Blueprint, request, jsonify
from app.services.stock_service import (
    register_entry,
    register_exit,
    get_stock,
    get_all_stock,
    get_low_stock_alerts
)
from app.routes.auth_routes import login_required

stock_bp = Blueprint('stock', __name__)

@stock_bp.route('/stock/entry', methods=['POST'])
@login_required
def entry_route():
    data = request.json
    product_id = data.get("productId")
    quantity = data.get("quantity")

    if not product_id or not isinstance(quantity, int):
        return jsonify({"message": "Informe o ID do produto e a quantidade (inteira)."}), 400

    register_entry(product_id, quantity)
    return jsonify({"message": "Entrada registrada com sucesso."}), 200

@stock_bp.route('/stock/exit', methods=['POST'])
@login_required
def exit_route():
    data = request.json
    product_id = data.get("productId")
    quantity = data.get("quantity")

    if not product_id or not isinstance(quantity, int):
        return jsonify({"message": "Informe o ID do produto e a quantidade (inteira)."}), 400

    success, msg = register_exit(product_id, quantity)
    status = 200 if success else 400
    return jsonify({"message": msg}), status

@stock_bp.route('/stock/<int:product_id>', methods=['GET'])
@login_required
def get_stock_route(product_id):
    quantity = get_stock(product_id)
    return jsonify({"productId": product_id, "quantity": quantity}), 200

@stock_bp.route('/stock', methods=['GET'])
@login_required
def get_all_stock_route():
    return jsonify(get_all_stock()), 200

@stock_bp.route('/stock/alerts', methods=['GET'])
@login_required
def low_stock_alerts_route():
    threshold = request.args.get("threshold", default=5, type=int)
    alerts = get_low_stock_alerts(threshold)
    return jsonify(alerts), 200
