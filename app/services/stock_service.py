from app.firebase_config import db

def register_entry(product_id, quantity):
    ref = db.reference(f"estoque/{product_id}")
    current_stock = ref.get() or 0
    ref.set(current_stock + quantity)
    return True

def register_exit(product_id, quantity):
    ref = db.reference(f"estoque/{product_id}")
    current_stock = ref.get() or 0

    if current_stock < quantity:
        return False, "Quantidade insuficiente no estoque."

    ref.set(current_stock - quantity)
    return True, "Saída registrada com sucesso."

def get_stock(product_id):
    ref = db.reference(f"estoque/{product_id}")
    return ref.get() or 0

def get_all_stock():
    ref = db.reference("estoque")
    return ref.get() or {}

def get_low_stock_alerts(threshold=5):
    stock_data = get_all_stock()
    return {pid: qty for pid, qty in stock_data.items() if qty < threshold}
