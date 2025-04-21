stock_data = {}

def register_entry(product_id, quantity):
    if product_id in stock_data:
        stock_data[product_id] += quantity
    else:
        stock_data[product_id] = quantity
    return True

def register_exit(product_id, quantity):
    if product_id not in stock_data:
        return False, "Produto não encontrado no estoque."
    if stock_data[product_id] < quantity:
        return False, "Quantidade insuficiente no estoque."
    stock_data[product_id] -= quantity
    return True, "Saída registrada com sucesso."

def get_stock(product_id):
    return stock_data.get(product_id, 0)

def get_all_stock():
    return stock_data

def get_low_stock_alerts(threshold=5):
    return {pid: qty for pid, qty in stock_data.items() if qty < threshold}