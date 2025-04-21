from flask import Blueprint, request, jsonify
from app.services.order_service import (
    create_order, get_all_orders,
    get_order_by_id, update_order, delete_order
)
from app.routes.auth_routes import login_required
from app.services.product_service import get_product_by_id, update_product

order_bp = Blueprint('order', __name__)

@order_bp.route('/orders', methods=['POST'])
@login_required
def create_order_route():
    success, result = create_order(request.json)
    if success:
        return jsonify({"message": "Pedido criado com sucesso!", "order": result}), 201
    return jsonify({"message": result}), 400

@order_bp.route('/orders', methods=['GET'])
@login_required
def list_orders_route():
    return jsonify(get_all_orders()), 200

@order_bp.route('/orders/<int:order_id>', methods=['GET'])
@login_required
def get_order_route(order_id):
    order = get_order_by_id(order_id)
    if order:
        return jsonify(order), 200
    return jsonify({"message": "Pedido não encontrado."}), 404

@order_bp.route('/orders/<int:order_id>', methods=['PUT'])
@login_required
def update_order_route(order_id):
    success, result = update_order(order_id, request.json)
    if success:
        return jsonify({"message": "Pedido atualizado com sucesso!", "order": result}), 200
    return jsonify({"message": result}), 404

@order_bp.route('/orders/<int:order_id>', methods=['DELETE'])
@login_required
def delete_order_route(order_id):
    success, result = delete_order(order_id)
    status = 200 if success else 404
    return jsonify({"message": result}), status
