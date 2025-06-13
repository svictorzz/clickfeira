from app.firebase_config import db 
import firebase_admin 
from firebase_admin import db as firebase_realtime_db 

def get_user_by_id(comerciante_id: str) -> dict | None:
    ref = firebase_realtime_db.reference(f"comerciante/{comerciante_id}")
    data = ref.get()
    return data if data else None

def list_all_comerciantes() -> dict:
    data = firebase_realtime_db.reference("comerciante").get() or {}
    if isinstance(data, list):
        return {str(i): item for i, item in enumerate(data) if item is not None}
    return data

def update_dados_comerciante(comerciante_id: str, novos_dados: dict) -> bool:
    ref = firebase_realtime_db.reference(f"comerciante/{comerciante_id}")
    usuario_existente = ref.get()
    if not usuario_existente:
        return False

    campos_permitidos = ["email", "telefone", "endereco"]
    atualizacoes = {k: v for k, v in novos_dados.items() if k in campos_permitidos}

    if not atualizacoes:
        return False

    try:
        ref.update(atualizacoes)
        return True
    except Exception as e:
        print(f"Erro ao atualizar dados do comerciante: {e}")
        return False

def delete_comerciante(comerciante_id: str) -> bool:
    ref_comerciante = firebase_realtime_db.reference(f"comerciante/{comerciante_id}")
    usuario_existente = ref_comerciante.get()

    if not usuario_existente:
        print(f"Comerciante com ID {comerciante_id} não encontrado.")
        return False

    try:
        print(f"Iniciando exclusão em cascata para o comerciante {comerciante_id}...")

        # Excluir fornecedores vinculados
        fornecedores_ref = firebase_realtime_db.reference("fornecedor")
        all_fornecedores = fornecedores_ref.get() or {}
        
        fornecedores_to_delete_keys = [
            key for key, fornecedor_data in all_fornecedores.items()
            if isinstance(fornecedor_data, dict) and fornecedor_data.get('idComerciante') == comerciante_id
        ]
        
        for key in fornecedores_to_delete_keys:
            firebase_realtime_db.reference(f"fornecedor/{key}").delete()
            print(f"  Fornecedor {key} excluído para o comerciante {comerciante_id}")

        # Excluir produtos vinculados
        produtos_ref = firebase_realtime_db.reference("produto")
        all_produtos = produtos_ref.get() or {}
        
        produtos_to_delete_keys = [
            key for key, produto_data in all_produtos.items()
            if isinstance(produto_data, dict) and produto_data.get('idComerciante') == comerciante_id
        ]

        for key in produtos_to_delete_keys:
            firebase_realtime_db.reference(f"produto/{key}").delete()
            print(f"  Produto {key} excluído para o comerciante {comerciante_id}")

        # Excluir pedidos vinculados
        pedidos_ref = firebase_realtime_db.reference("pedido")
        all_pedidos = pedidos_ref.get() or {}

        pedidos_to_delete_keys = [
            key for key, pedido_data in all_pedidos.items()
            if isinstance(pedido_data, dict) and pedido_data.get('idComerciante') == comerciante_id
        ]

        for key in pedidos_to_delete_keys:
            firebase_realtime_db.reference(f"pedido/{key}").delete()
            print(f"  Pedido {key} excluído para o comerciante {comerciante_id}")

        # Excluir histórico de ações vinculado
        historico_ref = firebase_realtime_db.reference("historicoAcoes")
        all_acoes = historico_ref.get() or {}

        acoes_to_delete_keys = [
            key for key, acao_data in all_acoes.items()
            if isinstance(acao_data, dict) and acao_data.get('idComerciante') == comerciante_id
        ]
        
        for key in acoes_to_delete_keys:
            firebase_realtime_db.reference(f"historicoAcoes/{key}").delete()
            print(f"  Ação do histórico {key} excluída para o comerciante {comerciante_id}")

        # Excluir o próprio comerciante
        ref_comerciante.delete()
        print(f"Comerciante {comerciante_id} e todos os dados relacionados excluídos com sucesso.")
        return True
    except Exception as e:
        print(f"Erro inesperado ao excluir comerciante e dados relacionados: {e}")
        return False