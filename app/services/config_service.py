from app.firebase_config import db

def get_user_by_id(comerciante_id: str) -> dict | None:
    ref = db.reference(f"comerciante/{comerciante_id}")
    data = ref.get()
    return data if data else None

def list_all_comerciantes() -> dict:
    data = db.reference("comerciante").get() or {}
    if isinstance(data, list):
        return {str(i): item for i, item in enumerate(data) if item is not None}
    return data

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

def delete_comerciante(comerciante_id: str) -> bool:
    ref = db.reference(f"comerciante/{comerciante_id}")
    usuario_existente = ref.get()

    if not usuario_existente:
        return False

    try:
        ref.delete()
        return True
    except Exception as e:
        print(f"Erro ao excluir comerciante: {e}")
        return False