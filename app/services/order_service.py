from datetime import datetime
from app.services.stock_service import register_entry, register_exit, get_stock
from app.services.product_service import get_product_by_id

orders = []
order_id_counter = 1

def create_order(data):
    global order_id_counter

    required_fields = ['comerciante', 'fornecedor', 'itensPedido', 'tipoPedido']
    if not all(field in data for field in required_fields):
        return False, "Campos obrigatórios ausentes."

    tipo = data['tipoPedido']

    # Validação dos itens
    for item in data['itensPedido']:
        product = get_product_by_id(item['productId'])
        if not product:
            return False, f"Produto com ID {item['productId']} não encontrado."

        if tipo == 'venda':
            if get_stock(item['productId']) < item['quantity']:
                return False, f"Estoque insuficiente para produto {product['name']} (ID {item['productId']})."

    # Atualização do estoque
    for item in data['itensPedido']:
        if tipo == 'venda':
            success, msg = register_exit(item['productId'], item['quantity'])
        elif tipo == 'entrada':
            success = register_entry(item['productId'], item['quantity'])
            msg = "Entrada registrada com sucesso." if success else "Erro ao registrar entrada."
        else:
            return False, "Tipo de pedido inválido."

        if not success:
            return False, f"Erro ao atualizar estoque do produto {item['productId']}: {msg}"

    # Cálculo do total
    total = sum(
        get_product_by_id(item['productId'])['price'] * item['quantity']
        for item in data['itensPedido']
    )

    order = {
        "idPedido": order_id_counter,
        "comerciante": data['comerciante'],
        "fornecedor": data['fornecedor'],
        "dataPedido": data.get('dataPedido', datetime.now().isoformat()),
        "tipoPedido": tipo,
        "status": data.get('status', 'pendente'),
        "itensPedido": data['itensPedido'],
        "totalPedido": total
    }

    orders.append(order)
    order_id_counter += 1

    return True, order

def get_all_orders():
    return orders

def get_order_by_id(order_id):
    return next((o for o in orders if o['idPedido'] == order_id), None)

def update_order(order_id, updates):
    order = get_order_by_id(order_id)
    if not order:
        return False, "Pedido não encontrado."
    order['status'] = updates.get('status', order['status'])
    order['fornecedor'] = updates.get('fornecedor', order['fornecedor'])
    return True, order

def delete_order(order_id):
    global orders
    order = get_order_by_id(order_id)
    if not order:
        return False, "Pedido não encontrado."
    orders = [o for o in orders if o['idPedido'] != order_id]
    return True, "Pedido excluído com sucesso."
