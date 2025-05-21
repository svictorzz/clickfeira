import random
import string
from app.firebase_config import db

def get_new_id() -> int:
    ref = db.reference("comerciante")
    data = ref.get()
    if not data:
        return 1

    if isinstance(data, dict):
        ids = [int(k) for k in data.keys() if k.isdigit()]
    elif isinstance(data, list):
        ids = [i for i, item in enumerate(data) if item is not None]
    else:
        return 1
    return max(ids) + 1 if ids else 1

def login_user(email: str, password: str) -> dict | None:
    ref = db.reference("comerciante")
    results = ref.order_by_child("email").equal_to(email).get() or {}
    for _, user in results.items():
        if user.get("senha") == password:
            return user  # <-- Retorna os dados do usuário, com idComerciante
    return None

def register_user(data: dict) -> bool:
    ref = db.reference("comerciante")
    existentes = ref.order_by_child("email").equal_to(data["email"]).get() or {}
    if existentes:
        return False

    new_id = get_new_id()
    ref.child(str(new_id)).set({
        "idComerciante": new_id,
        "nome": data["nome"],
        "email": data["email"],
        "senha": data["senha"],
        "telefone": data["telefone"],
        "cpf": data["cpf"],
        "endereco": data["endereco"],
        "listaFeiras": data.get("listaFeiras", [])
    })
    return True

def recover_password(email: str) -> str | None:
    ref = db.reference("comerciante")
    results = ref.order_by_child("email").equal_to(email).get() or {}
    for key, _ in results.items():
        new_password = ''.join(random.choices(string.ascii_letters + string.digits, k=8))
        ref.child(key).update({"senha": new_password})
        return new_password
    return None

def change_password(email: str, old_password: str, new_password: str) -> bool:
    ref = db.reference("comerciante")
    resultados = ref.order_by_child("email").equal_to(email).get() or {}

    if not resultados:  # ✅ Confirma se o usuário existe
        return False  

    senha_correta = False  # ✅ Variável para controlar a validação

    for key, user in resultados.items():
        if user.get("senha") == old_password:  # ✅ Verifica se a senha antiga está correta
            senha_correta = True
            ref.child(key).update({"senha": new_password})
            break  # 🔹 Para o loop após encontrar a correspondência correta

    return senha_correta  # ✅ Retorna True só se a senha antiga estiver correta

def list_all_comerciantes() -> dict:
    data = db.reference("comerciante").get() or {}
    if isinstance(data, list):
        return {str(i): item for i, item in enumerate(data) if item is not None}
    return data
