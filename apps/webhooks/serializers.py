from rest_framework import serializers
from .models import (
    Webhook, Pedido, EnderecoEnvio, InformacoesAdicionais,
    Produto, Design, Mockup, WebhookStatusEnviado, StatusPedido
)

class StatusPedidoSerializer(serializers.ModelSerializer):
    """
    Serializer para o modelo StatusPedido.
    """
    class Meta:
        model = StatusPedido
        fields = ['id', 'nome', 'descricao', 'cor_css', 'ordem']

class DesignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Design
        fields = ['capa_frente', 'capa_verso']

class MockupSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mockup
        fields = ['capa_frente', 'capa_costas']

class ProdutoSerializer(serializers.ModelSerializer):
    designs = DesignSerializer()
    mockups = MockupSerializer()
    
    class Meta:
        model = Produto
        fields = ['id', 'nome', 'sku', 'quantidade', 'id_sku', 'designs', 'mockups', 'arquivo_pdf']

class EnderecoEnvioSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnderecoEnvio
        fields = ['nome_destinatario', 'endereco', 'numero', 'complemento',
                 'cidade', 'uf', 'cep', 'bairro', 'telefone', 'pais']

class InformacoesAdicionaisSerializer(serializers.ModelSerializer):
    class Meta:
        model = InformacoesAdicionais
        fields = ['nome', 'telefone', 'email']

class PedidoSerializer(serializers.ModelSerializer):
    produtos = ProdutoSerializer(many=True, read_only=True)
    endereco_envio = EnderecoEnvioSerializer()
    informacoes_adicionais = InformacoesAdicionaisSerializer()
    status_obj = StatusPedidoSerializer(source='status', read_only=True)
    status_nome = serializers.CharField(source='status.nome', read_only=True)
    
    class Meta:
        model = Pedido
        fields = [
            'id', 'titulo', 'numero_pedido', 'valor_pedido', 'custo_envio',
            'etiqueta_envio', 'metodo_envio', 'nome_cliente', 'documento_cliente',
            'email_cliente', 'criado_em', 'atualizado_em', 'produtos',
            'endereco_envio', 'informacoes_adicionais', 'status', 'status_obj', 'status_nome'
        ]

class WebhookSerializer(serializers.ModelSerializer):
    pedidos = PedidoSerializer(many=True, read_only=True)
    
    class Meta:
        model = Webhook
        fields = ['id', 'evento', 'payload', 'assinatura', 'verificado', 'recebido_em', 'pedidos']

class WebhookListSerializer(serializers.ModelSerializer):
    pedidos_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Webhook
        fields = ['id', 'evento', 'verificado', 'recebido_em', 'pedidos_count']
    
    def get_pedidos_count(self, obj):
        return obj.pedidos.count()

class WebhookStatusEnviadoSerializer(serializers.ModelSerializer):
    numero_pedido = serializers.SerializerMethodField()
    nome_cliente = serializers.SerializerMethodField()
    
    class Meta:
        model = WebhookStatusEnviado
        fields = [
            'id', 'numero_pedido', 'nome_cliente', 'status', 'url_destino', 
            'payload', 'resposta', 'codigo_http', 'sucesso', 'enviado_em'
        ]
    
    def get_numero_pedido(self, obj):
        return obj.pedido.numero_pedido
    
    def get_nome_cliente(self, obj):
        return obj.pedido.nome_cliente

class WebhookStatusEnviadoCreateSerializer(serializers.Serializer):
    numero_pedido = serializers.IntegerField()
    url_destino = serializers.URLField()
    status = serializers.CharField()
    informacoes_adicionais = serializers.JSONField(required=False)
    
    def validate_numero_pedido(self, value):
        from .services.db_service import WebhookDBService
        pedido = WebhookDBService.buscar_pedido(value)
        if not pedido:
            raise serializers.ValidationError(f"Pedido #{value} não encontrado")
        return value

class WebhookDetailSerializer(serializers.ModelSerializer):
    """
    Serializer para detalhes detalhados de um webhook, usado principalmente 
    para exibir informações no modal de detalhes.
    """
    pedido_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Webhook
        fields = ['id', 'evento', 'verificado', 'recebido_em', 'pedido_info']
    
    def get_pedido_info(self, obj):
        pedido = obj.pedidos.first()
        if not pedido:
            return None
            
        return {
            'numero_pedido': pedido.numero_pedido,
            'valor_pedido': pedido.valor_pedido,
            'nome_cliente': pedido.nome_cliente,
            'status': pedido.status.nome if pedido.status else 'Desconhecido',
            'cor_css': pedido.status.cor_css if pedido.status else '',
            'pdf_path': pedido.pdf_path if hasattr(pedido, 'pdf_path') else None,
            'cod_op': getattr(pedido, 'cod_op', None),
            'configuracao': self._get_configuracao_info(pedido),
            'contato': self._get_contato_info(pedido)
        }
        
    def _get_configuracao_info(self, pedido):
        if not hasattr(pedido, 'configuracao') or not pedido.configuracao:
            return None
            
        config = pedido.configuracao
        return {
            'titulo': config.titulo if hasattr(config, 'titulo') else None,
            'data_entrega': config.data_entrega.strftime('%d/%m/%Y') if hasattr(config, 'data_entrega') and config.data_entrega else None,
            'formato': config.formato if hasattr(config, 'formato') else None,
            'cor_impressao': config.cor_impressao if hasattr(config, 'cor_impressao') else None,
            'impressao': config.impressao if hasattr(config, 'impressao') else None,
            'gramatura': config.gramatura if hasattr(config, 'gramatura') else None,
        }
        
    def _get_contato_info(self, pedido):
        if not hasattr(pedido, 'configuracao') or not pedido.configuracao or not hasattr(pedido.configuracao, 'contato') or not pedido.configuracao.contato:
            return None
            
        contato = pedido.configuracao.contato
        return {
            'nome': contato.nome if hasattr(contato, 'nome') else None,
            'email': contato.email if hasattr(contato, 'email') else None,
        }