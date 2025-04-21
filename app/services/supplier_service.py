suppliers = []
supplier_id_counter = 1

def add_supplier(supplier):
    global supplier_id_counter
    supplier["idFornecedor"] = supplier_id_counter
    supplier.setdefault("produtosFornecidos", [])
    suppliers.append(supplier)
    supplier_id_counter += 1
    return supplier

def get_all_suppliers():
    return suppliers

def get_supplier_by_id(supplier_id):
    return next((s for s in suppliers if s["idFornecedor"] == supplier_id), None)

def update_supplier(supplier_id, updates):
    supplier = get_supplier_by_id(supplier_id)
    if supplier:
        supplier.update(updates)
        return supplier
    return None

def delete_supplier(supplier_id):
    global suppliers
    supplier = get_supplier_by_id(supplier_id)
    if supplier:
        suppliers = [s for s in suppliers if s["idFornecedor"] != supplier_id]
        return True
    return False
