from datetime import datetime
from app.services.stock_service import register_exit, get_stock
from app.services.product_service import get_product_by_id

orders = []
order_counter = 1 


def create_order(data):
    global order_counter

    required = ['comerciante', 'dataPedido', 'fornecedor', 'itensPedido', 'status', 'tipoPedido']
    if any(field not in data for field in required):
        return False, "Obrigatório preencher todos os campos do pedido."
    
    order_id = order_counter
    order_counter += 1

    order = {
        'idPedido': order_id,
        'comerciante': data['comerciante'],
        'dataPedido': data['dataPedido'],
        'fornecedor': data['fornecedor'],
        'tipoPedido': data['tipoPedido'], 
        'status': data['status'],        
        'itensPedido': [],
        'totalPedido': 0
    }

    total = 0
    for item in data['itensPedido']:
        pid = item.get('productId')
        qty = item.get('quantity')
        if pid is None or qty is None:
            return False, f"Dados inválidos no item: {item}"

        prod = get_product_by_id(pid)
        if not prod:
            return False, f"Produto com ID {pid} não encontrado."

        if data['tipoPedido'] == 'venda':
            stock = get_stock(pid)
            if stock < qty:
                return False, f"Estoque insuficiente para produto {prod['name']} (ID {pid})."
            success, msg = register_exit(pid, qty)
            if not success:
                return False, msg

        subtotal = prod['price'] * qty
        total += subtotal
        order['itensPedido'].append({
            'productId': pid,
            'name': prod['name'],
            'quantity': qty,
            'unitPrice': prod['price'],
            'total': subtotal
        })

    order['totalPedido'] = total
    orders.append(order)
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
