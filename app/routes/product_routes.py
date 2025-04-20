from flask import Blueprint, request, jsonify
from uuid import uuid4
from app.services.product_service import (
    add_product,
    get_all_products,
    get_product_by_id,
    update_product,
    delete_product
)

product_bp = Blueprint('product', __name__)

@product_bp.route('/products', methods=['POST'])
def create_product():
    data = request.json
    required_fields = ['name', 'category', 'description', 'price', 'stockQuantity', 'minQuantity', 'expirationDate']

    if not all(field in data for field in required_fields):
        return jsonify({"message": "Obrigatório preencher todos os campos para criar um produto."}), 400

    product = {
        "productId": str(uuid4()),
        "name": data['name'],
        "category": data['category'],
        "description": data['description'],
        "price": data['price'],
        "stockQuantity": data['stockQuantity'],
        "minQuantity": data['minQuantity'],
        "expirationDate": data['expirationDate']
    }

    add_product(product)
    return jsonify({"message": "Produto criado.", "product": product}), 201


@product_bp.route('/products', methods=['GET'])
def read_products():
    return jsonify(get_all_products()), 200


@product_bp.route('/products/<product_id>', methods=['GET'])
def read_product(product_id):
    product = get_product_by_id(product_id)
    if product:
        return jsonify(product), 200
    return jsonify({"message": "Produto não encontrado."}), 404


@product_bp.route('/products/<product_id>', methods=['PUT'])
def update_product_route(product_id):
    data = request.json
    updated = update_product(product_id, data)
    if updated:
        return jsonify({"message": "Produto atualizado.", "product": updated}), 200
    return jsonify({"message": "Produto não encontrado."}), 404


@product_bp.route('/products/<product_id>', methods=['DELETE'])
def delete_product_route(product_id):
    deleted = delete_product(product_id)
    if deleted:
        return jsonify({"message": "Produto deletado."}), 200
    return jsonify({"message": "Produto não encontrado."}), 404
