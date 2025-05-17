from app.firebase_config import db

def get_user_by_id(comerciante_id: str) -> dict | None:
    ref = db.reference(f"comerciante/{comerciante_id}")
    data = ref.get()
    return data if data else None


def update_dados_comerciante(comerciante_id: str, novos_dados: dict) -> bool:
    ref = db.reference(f"comerciante/{comerciante_id}")
    usuario_existente = ref.get()
    if not usuario_existente:
        return False

    campos_permitidos = ["email", "telefone", "endereco"]
    atualizacoes = {k: v for k, v in novos_dados.items() if k in campos_permitidos}

    if not atualizacoes:
        return False

    try:
        ref.update(atualizacoes)
        return True
    except Exception as e:
        print(f"Erro ao atualizar dados do comerciante: {e}")
        return False


def alterar_senha_comerciante(comerciante_id: str, senha_atual: str, nova_senha: str) -> bool:
    ref = db.reference(f"comerciante/{comerciante_id}")
    data = ref.get()

    if not data or data.get("senha") != senha_atual:
        return False  # Senha incorreta ou usuário não existe

    try:
        ref.update({"senha": nova_senha})
        return True
    except Exception as e:
        print(f"Erro ao alterar senha do comerciante: {e}")
        return False