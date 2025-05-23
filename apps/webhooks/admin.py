from django.contrib import admin
from .models import (
    WebhookConfig, Webhook, Pedido, EnderecoEnvio,
    InformacoesAdicionais, Produto, Design, Mockup,
    WebhookStatusEnviado, StatusPedido, WebhookEndpointConfig,
    EmailNotificacao
)

class ProdutoInline(admin.TabularInline):
    model = Produto
    extra = 0

@admin.register(StatusPedido)
class StatusPedidoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'descricao', 'cor_css', 'ordem', 'ativo')
    list_filter = ('ativo',)
    search_fields = ('nome', 'descricao')
    ordering = ('ordem',)

@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = ('numero_pedido', 'nome_cliente', 'valor_pedido', 'get_status', 'criado_em')
    list_filter = ('criado_em', 'status')
    search_fields = ('numero_pedido', 'nome_cliente', 'email_cliente')
    inlines = [ProdutoInline]
    readonly_fields = ('webhook', 'criado_em', 'atualizado_em')
    
    def get_status(self, obj):
        return obj.status.nome if obj.status else 'Sem status'
    get_status.short_description = 'Status'
    get_status.admin_order_field = 'status__nome'

@admin.register(WebhookConfig)
class WebhookConfigAdmin(admin.ModelAdmin):
    list_display = ('id', 'ativo', 'criado_em')
    list_filter = ('ativo',)
    readonly_fields = ('criado_em', 'atualizado_em')

@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ('evento', 'verificado', 'recebido_em')
    list_filter = ('evento', 'verificado', 'recebido_em')
    search_fields = ('payload',)
    readonly_fields = ('recebido_em',)

@admin.register(EnderecoEnvio)
class EnderecoEnvioAdmin(admin.ModelAdmin):
    list_display = ('nome_destinatario', 'cidade', 'uf', 'cep')
    search_fields = ('nome_destinatario', 'cidade', 'cep')

@admin.register(InformacoesAdicionais)
class InformacoesAdicionaisAdmin(admin.ModelAdmin):
    list_display = ('nome', 'email', 'telefone')
    search_fields = ('nome', 'email')

@admin.register(EmailNotificacao)
class EmailNotificacaoAdmin(admin.ModelAdmin):
    list_display = ('email', 'nome', 'ativo')
    list_filter = ('ativo',)
    search_fields = ('email', 'nome')
    readonly_fields = ('criado_em', 'atualizado_em')

@admin.register(WebhookStatusEnviado)
class WebhookStatusEnviadoAdmin(admin.ModelAdmin):
    list_display = ('pedido', 'status', 'url_destino', 'sucesso', 'enviado_em', 'tentativa_numero')
    list_filter = ('sucesso', 'enviado_em', 'status')
    search_fields = ('pedido__numero_pedido', 'status', 'url_destino')
    readonly_fields = ('enviado_em',)
    
    def pedido_numero(self, obj):
        return obj.pedido.numero_pedido
    pedido_numero.short_description = 'Número do Pedido'
    pedido_numero.admin_order_field = 'pedido__numero_pedido'

@admin.register(WebhookEndpointConfig)
class WebhookEndpointConfigAdmin(admin.ModelAdmin):
    list_display = ('nome', 'url', 'ativo', 'auto_enviar')
    list_filter = ('ativo', 'auto_enviar')
    search_fields = ('nome', 'url')
    readonly_fields = ('criado_em', 'atualizado_em')

@admin.register(Design)
class DesignAdmin(admin.ModelAdmin):
    list_display = ('id', 'capa_frente')
    search_fields = ('capa_frente', 'capa_verso')

@admin.register(Mockup)
class MockupAdmin(admin.ModelAdmin):
    list_display = ('id', 'capa_frente')
    search_fields = ('capa_frente', 'capa_costas')
