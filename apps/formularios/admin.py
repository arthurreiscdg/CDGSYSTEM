from django.contrib import admin
from .models import Contato, Unidade, ConfiguracaoImpressao, ArquivoPDF

@admin.register(Contato)
class ContatoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'email', 'criado_em')
    search_fields = ('nome', 'email')
    list_filter = ('criado_em',)
    readonly_fields = ('criado_em', 'atualizado_em', 'criado_por')

@admin.register(Unidade)
class UnidadeAdmin(admin.ModelAdmin):
    list_display = ('nome', 'quantidade', 'criado_em')
    search_fields = ('nome',)
    list_filter = ('criado_em',)
    readonly_fields = ('criado_em', 'atualizado_em', 'criado_por')

class ArquivoPDFInline(admin.TabularInline):
    model = ArquivoPDF
    extra = 0
    readonly_fields = ('criado_em', 'atualizado_em', 'criado_por')

@admin.register(ConfiguracaoImpressao)
class ConfiguracaoImpressaoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'data_entrega', 'formato', 'cor_impressao')
    search_fields = ('titulo',)
    list_filter = ('data_entrega', 'formato', 'cor_impressao')
    inlines = [ArquivoPDFInline]
    readonly_fields = ('criado_em', 'atualizado_em', 'criado_por')
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('titulo', 'data_entrega', 'contato', 'observacoes')
        }),
        ('Configurações de Impressão', {
            'fields': ('formato', 'cor_impressao', 'impressao', 'gramatura')
        }),
        ('Opções Adicionais', {
            'fields': ('papel_adesivo', 'tipo_adesivo', 'grampos', 'espiral', 'capa_pvc')
        }),
        ('Informações do Sistema', {
            'fields': ('criado_em', 'atualizado_em', 'criado_por'),
            'classes': ('collapse',)
        }),
    )

@admin.register(ArquivoPDF)
class ArquivoPDFAdmin(admin.ModelAdmin):
    list_display = ('cod_op', 'configuracao', 'produto', 'link_download', 'criado_em')
    search_fields = ('cod_op', 'configuracao__titulo')
    list_filter = ('criado_em', 'configuracao')
    readonly_fields = ('criado_em', 'atualizado_em', 'criado_por')
    fieldsets = (
        ('Informações do Arquivo', {
            'fields': ('arquivo', 'cod_op', 'configuracao', 'produto')
        }),
        ('Links de Download', {
            'fields': ('link_download', 'json_link')
        }),
        ('Informações do Sistema', {
            'fields': ('criado_em', 'atualizado_em', 'criado_por'),
            'classes': ('collapse',)
        }),
    )
