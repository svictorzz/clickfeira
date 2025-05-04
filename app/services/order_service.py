from datetime import datetime
from app.firebase_config import db
from app.services.product_service import get_product_by_id
from app.services.stock_service import register_entry, register_exit, get_stock

def _normalize_orders_data(data):
    if isinstance(data, dict):
        return data
    if isinstance(data, list):
        return {str(i): item for i, item in enumerate(data) if item is not None}
    return {}

def get_next_order_id():
    ref = db.reference("pedido")
    data = ref.get()
    pedidos = _normalize_orders_data(data)
    if not pedidos:
        return 1
    existing_ids = [int(oid) for oid in pedidos.keys() if oid.isdigit()]
    return max(existing_ids) + 1 if existing_ids else 1

def create_order(data):
    required_fields = ['comerciante', 'fornecedor', 'itensPedido', 'tipoPedido']
    if not all(field in data for field in required_fields):
        return False, "Campos obrigatórios ausentes."

    tipo = data['tipoPedido']

    if tipo == 'Compra':
        tipo = 'entrada'

    for item in data['itensPedido']:
        product = get_product_by_id(item['productId'])
        if not product:
            return False, f"Produto com ID {item['productId']} não encontrado."
        
        if tipo == 'venda' and get_stock(item['productId']) < item['quantity']:
            return False, f"Estoque insuficiente para produto {product['nome']} (ID {item['productId']})."

    for item in data['itensPedido']:
        if tipo == 'venda':
            success, msg = register_exit(item['productId'], item['quantity'])
        elif tipo == 'entrada':
            success = register_entry(item['productId'], item['quantity'])
            msg = "Entrada registrada." if success else "Erro na entrada."
        else:
            return False, "Tipo de pedido inválido."

        if not success:
            return False, f"Erro no estoque do produto {item['productId']}: {msg}"

    total = sum(get_product_by_id(item['productId'])['preco'] * item['quantity'] for item in data['itensPedido'])

    order_id = get_next_order_id()
    order = {
        "idPedido": order_id,
        "comerciante": data['comerciante'],
        "fornecedor": data['fornecedor'],
        "dataPedido": data.get('dataPedido', datetime.now().isoformat()),
        "tipoPedido": tipo,
        "status": data.get('status', 'pendente'),
        "itensPedido": data['itensPedido'],
        "totalPedido": total
    }

    db.reference("pedido").child(str(order_id)).set(order)
    return True, order

def get_all_orders():
    ref = db.reference("pedido")
    data = ref.get()
    pedidos = _normalize_orders_data(data)
    return list(pedidos.values())

def get_order_by_id(order_id):
    ref = db.reference(f"pedido/{order_id}")
    return ref.get()

def update_order(order_id, updates):
    ref = db.reference(f"pedido/{order_id}")
    if ref.get() is None:
        return False, "Pedido não encontrado."
    ref.update(updates)
    return True, ref.get()

def delete_order(order_id):
    ref = db.reference(f"pedido/{order_id}")
    if ref.get() is None:
        return False, "Pedido não encontrado."
    ref.delete()
    return True, "Pedido excluído com sucesso."
