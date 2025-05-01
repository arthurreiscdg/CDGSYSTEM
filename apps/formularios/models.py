from django.db import models
from apps.webhooks.models import Produto
from django.conf import settings
from django.utils import timezone

class Contato(models.Model):
    nome = models.CharField(max_length=100)
    email = models.EmailField()
    criado_em = models.DateTimeField(default=timezone.now)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='contatos_criados')

    class Meta:
        ordering = ['-criado_em']
        verbose_name = 'Contato'
        verbose_name_plural = 'Contatos'

    def __str__(self):
        return self.nome

class Unidade(models.Model):
    nome = models.CharField(max_length=50, unique=True)
    quantidade = models.IntegerField(default=0)
    criado_em = models.DateTimeField(default=timezone.now)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='unidades_criadas')

    class Meta:
        ordering = ['nome']
        verbose_name = 'Unidade'
        verbose_name_plural = 'Unidades'

    def __str__(self):
        return self.nome

class ConfiguracaoImpressao(models.Model):
    FORMATO_CHOICES = [
        ('A4', 'A4'),
        ('A3', 'A3'),
        ('A5', 'A5'),
        ('Carta', 'Carta'),
    ]
    
    COR_CHOICES = [
        ('PB', 'Preto e Branco'),
        ('Color', 'Colorido'),
    ]
    
    IMPRESSAO_CHOICES = [
        ('1_LADO', 'Um Lado'),
        ('2_LADOS', 'Frente e Verso'),
    ]

    titulo = models.CharField(max_length=255)
    data_entrega = models.DateField()
    observacoes = models.TextField(blank=True)
    formato = models.CharField(max_length=10, choices=FORMATO_CHOICES, default='A4')
    cor_impressao = models.CharField(max_length=10, choices=COR_CHOICES, default='PB')
    impressao = models.CharField(max_length=20, choices=IMPRESSAO_CHOICES, default='1_LADO')
    gramatura = models.CharField(max_length=10, default='75g')
    papel_adesivo = models.BooleanField(default=False)
    tipo_adesivo = models.CharField(max_length=50, null=True, blank=True)
    grampos = models.CharField(max_length=10, null=True, blank=True)
    espiral = models.BooleanField(default=False)
    capa_pvc = models.BooleanField(default=False)
    contato = models.ForeignKey(Contato, on_delete=models.CASCADE, related_name='configuracoes')
    criado_em = models.DateTimeField(default=timezone.now)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='configuracoes_criadas')

    class Meta:
        ordering = ['-data_entrega']
        verbose_name = 'Configuração de Impressão'
        verbose_name_plural = 'Configurações de Impressão'

    def __str__(self):
        return f"{self.titulo} - {self.data_entrega}"

class ArquivoPDF(models.Model):
    configuracao = models.ForeignKey(ConfiguracaoImpressao, on_delete=models.CASCADE, related_name='arquivos')
    arquivo = models.FileField(upload_to='pdfs/', null=True, blank=True)
    cod_op = models.CharField(max_length=10)
    produto = models.ForeignKey(Produto, on_delete=models.SET_NULL, null=True, blank=True)
    unidades = models.ManyToManyField(Unidade, related_name='arquivos_pdf')
    link_download = models.URLField(max_length=500, null=True, blank=True)  # Novo campo para armazenar o link
    json_link = models.URLField(max_length=500, null=True, blank=True)  # Novo campo para armazenar o link do JSON
    criado_em = models.DateTimeField(default=timezone.now)
    atualizado_em = models.DateTimeField(auto_now=True)
    criado_por = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='arquivos_criados')

    class Meta:
        ordering = ['-criado_em']
        verbose_name = 'Arquivo PDF'
        verbose_name_plural = 'Arquivos PDF'

    def __str__(self):
        return f"{self.cod_op} - {self.configuracao.titulo}"
