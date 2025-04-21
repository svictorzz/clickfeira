from flask import Blueprint, request, jsonify
from app.services.supplier_service import (
    add_supplier, get_all_suppliers, get_supplier_by_id,
    update_supplier, delete_supplier
)

supplier_bp = Blueprint("suppliers", __name__, url_prefix="/suppliers")

@supplier_bp.route("/", methods=["POST"])
def create_supplier():
    data = request.get_json()
    required_fields = ['nome', 'email', 'contato', 'endereco', 'cnpj']
    if not all(field in data for field in required_fields):
        return jsonify({"message": "Campos obrigatórios ausentes."}), 400

    if "produtosFornecidos" in data and not isinstance(data["produtosFornecidos"], list):
        return jsonify({"message": "produtosFornecidos deve ser uma lista."}), 400

    supplier = add_supplier(data)
    return jsonify(supplier), 201

@supplier_bp.route("/", methods=["GET"])
def list_suppliers():
    return jsonify(get_all_suppliers())

@supplier_bp.route("/<int:supplier_id>", methods=["GET"])
def get_supplier(supplier_id):
    supplier = get_supplier_by_id(supplier_id)
    if not supplier:
        return jsonify({"message": "Fornecedor não encontrado."}), 404
    return jsonify(supplier)

@supplier_bp.route("/<int:supplier_id>", methods=["PUT"])
def update_supplier_route(supplier_id):
    data = request.get_json()
    updated = update_supplier(supplier_id, data)
    if not updated:
        return jsonify({"message": "Fornecedor não encontrado."}), 404
    return jsonify(updated)

@supplier_bp.route("/<int:supplier_id>", methods=["DELETE"])
def delete_supplier_route(supplier_id):
    deleted = delete_supplier(supplier_id)
    if not deleted:
        return jsonify({"message": "Fornecedor não encontrado."}), 404
    return jsonify({"message": "Fornecedor excluído com sucesso."})
