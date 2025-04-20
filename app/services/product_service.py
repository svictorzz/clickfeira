products = []
product_id_counter = 1

def add_product(product):
    global product_id_counter
    product["productId"] = product_id_counter
    products.append(product)
    product_id_counter += 1

def get_all_products():
    return products

def get_product_by_id(product_id):
    return next((p for p in products if p["productId"] == product_id), None)

def update_product(product_id, updates):
    product = get_product_by_id(product_id)
    if product:
        product.update(updates)
        return product
    return None

def delete_product(product_id):
    global products
    product = get_product_by_id(product_id)
    if product:
        products = [p for p in products if p["productId"] != product_id]
        return True
    return False
