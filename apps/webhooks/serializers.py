from rest_framework import serializers
from .models import (
    Webhook, Pedido, EnderecoEnvio, InformacoesAdicionais,
    Produto, Design, Mockup, WebhookStatusEnviado
)

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
    
    class Meta:
        model = Pedido
        fields = [
            'id', 'titulo', 'numero_pedido', 'valor_pedido', 'custo_envio',
            'etiqueta_envio', 'metodo_envio', 'nome_cliente', 'documento_cliente',
            'email_cliente', 'criado_em', 'atualizado_em', 'produtos',
            'endereco_envio', 'informacoes_adicionais'
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