from app.services.stock_service import get_stock

products = []
product_id_counter = 1

def add_product(product):
    global product_id_counter
    product["productId"] = product_id_counter
    products.append(product)
    product_id_counter += 1

def get_all_products():
    return [get_product_by_id(p["productId"]) for p in products]

def get_product_by_id(product_id):
    product = next((p for p in products if p["productId"] == product_id), None)
    if not product:
        return None
    product_with_stock = dict(product)  # cópia para não modificar o original
    product_with_stock["stockQuantity"] = get_stock(product_id)
    return product_with_stock

def update_product(product_id, updates):
    product = next((p for p in products if p["productId"] == product_id), None)
    if product:
        product.update(updates)
        return get_product_by_id(product_id)
    return None

def delete_product(product_id):
    global products
    product = get_product_by_id(product_id)
    if product:
        products = [p for p in products if p["productId"] != product_id]
        return True
    return False
