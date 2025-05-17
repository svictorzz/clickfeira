from flask import Blueprint, request, jsonify
from app.services.config_service import (
    get_user_by_id,
    update_dados_comerciante,
    alterar_senha_comerciante
)
from app.routes.auth_routes import login_required  

user_bp = Blueprint("user", __name__)

@user_bp.route('/users/<string:comerciante_id>', methods=['GET'])
@login_required
def get_user_route(comerciante_id):
    user = get_user_by_id(comerciante_id)
    if user:
        return jsonify(user), 200
    return jsonify({"message": "Usuário não encontrado."}), 404


@user_bp.route('/users/<string:comerciante_id>', methods=['PUT'])
@login_required
def update_user_route(comerciante_id):
    dados = request.json
    # só atualiza email, telefone e endereço
    allowed_fields = ["email", "telefone", "endereco"]
    novos_dados = {k: v for k, v in dados.items() if k in allowed_fields}

    if not novos_dados:
        return jsonify({"message": "Nenhum dado válido para atualizar."}), 400

    sucesso = update_dados_comerciante(comerciante_id, novos_dados)
    if sucesso:
        return jsonify({"message": "Dados atualizados com sucesso."}), 200
    return jsonify({"message": "Erro ao atualizar dados ou usuário não encontrado."}), 404


@user_bp.route('/users/<string:comerciante_id>/password', methods=['PUT'])
@login_required
def change_password_route(comerciante_id):
    dados = request.json
    senha_atual = dados.get("senha_atual")
    nova_senha = dados.get("nova_senha")

    if not senha_atual or not nova_senha:
        return jsonify({"message": "Senha atual e nova senha são obrigatórias."}), 400

    sucesso = alterar_senha_comerciante(comerciante_id, senha_atual, nova_senha)
    if sucesso:
        return jsonify({"message": "Senha alterada com sucesso."}), 200
    return jsonify({"message": "Senha atual incorreta ou usuário não encontrado."}), 400
