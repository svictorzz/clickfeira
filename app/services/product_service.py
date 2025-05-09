from app.firebase_config import db
from app.services.stock_service import get_stock

def _normalize_produtos_data(data):
    if isinstance(data, dict):
        return data
    if isinstance(data, list):
        return {str(i): item for i, item in enumerate(data) if item is not None}
    return {}

def get_next_product_id():
    ref = db.reference("produto")
    data = ref.get()
    produtos = _normalize_produtos_data(data)
    if not produtos:
        return 1
    existing_ids = [int(pid) for pid in produtos.keys() if pid.isdigit()]
    return max(existing_ids) + 1 if existing_ids else 1


def add_product(product):
    product_id = get_next_product_id()
    product["idProduto"] = product_id
    db.reference("produto").child(str(product_id)).set(product)
    return product


def get_all_products():
    ref = db.reference("produto")
    data = ref.get()
    produtos = _normalize_produtos_data(data)
    result = []
    for pid, info in produtos.items():
        item = dict(info)
        item["quantidadeEstoque"] = get_stock(int(pid))
        result.append(item)
    return result


def get_product_by_id(product_id):
    ref = db.reference(f"produto/{product_id}")
    data = ref.get()
    if not data:
        return None
    item = dict(data)
    item["quantidadeEstoque"] = get_stock(int(product_id))
    return item


def update_product(product_id, updates):
    ref = db.reference(f"produto/{product_id}")
    if ref.get() is None:
        return None
    ref.update(updates)
    return get_product_by_id(product_id)


def delete_product(product_id):
    ref = db.reference(f"produto/{product_id}")
    if ref.get() is None:
        return False
    ref.delete()
    return True
