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
            return user
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

def edit_user_info(email: str, new_email: str = None, new_address: str = None, new_phone: str = None) -> bool:
    ref = db.reference("comerciante")
    resultados = ref.order_by_child("email").equal_to(email).get() or {}

    if not resultados:
        return False  

    for key, user in resultados.items():
        updates = {}
        if new_email:
            updates["email"] = new_email
        if new_address:
            updates["endereco"] = new_address
        if new_phone:
            updates["telefone"] = new_phone

        if updates:
            ref.child(key).update(updates)
        return True  

    return False  



def change_password(email: str, old_password: str, new_password: str) -> bool:
    ref = db.reference("comerciante")
    resultados = ref.order_by_child("email").equal_to(email).get() or {}

    if not resultados:
        return False  

    senha_correta = False

    for key, user in resultados.items():
        if user.get("senha") == old_password:
            senha_correta = True
            ref.child(key).update({"senha": new_password})
            break 

    return senha_correta 

def list_all_comerciantes() -> dict:
    data = db.reference("comerciante").get() or {}
    if isinstance(data, list):
        return {str(i): item for i, item in enumerate(data) if item is not None}
    return data
