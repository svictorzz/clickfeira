from app.firebase_config import db

def _normalize_fornecedores_data(data):
    if isinstance(data, dict):
        return data
    if isinstance(data, list):
        return {str(i): item for i, item in enumerate(data) if item is not None}
    return {}


def get_next_supplier_id() -> int:
    ref = db.reference("fornecedor")
    raw = ref.get()
    fornecedores = _normalize_fornecedores_data(raw)
    if not fornecedores:
        return 1
    ids = [int(fid) for fid in fornecedores.keys() if fid.isdigit()]
    return max(ids) + 1 if ids else 1


def add_supplier(supplier: dict) -> dict:
    supplier_id = get_next_supplier_id()
    supplier["idFornecedor"] = supplier_id
    supplier.setdefault("produtosFornecidos", [])
    db.reference("fornecedor").child(str(supplier_id)).set(supplier)
    return supplier


def get_all_suppliers() -> list:
    ref = db.reference("fornecedor")
    raw = ref.get()
    fornecedores = _normalize_fornecedores_data(raw)
    return list(fornecedores.values())


def get_supplier_by_id(supplier_id: int) -> dict | None:
    ref = db.reference(f"fornecedor/{supplier_id}")
    supplier = ref.get()
    return supplier if supplier else None


def update_supplier(supplier_id: int, updates: dict) -> dict | None:
    ref = db.reference(f"fornecedor/{supplier_id}")
    if not ref.get():
        return None
    ref.update(updates)
    return get_supplier_by_id(supplier_id)


def delete_supplier(supplier_id: int) -> bool:
    ref = db.reference(f"fornecedor/{supplier_id}")
    if not ref.get():
        return False
    ref.delete()
    return True
