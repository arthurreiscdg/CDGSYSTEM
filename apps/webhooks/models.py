from django.db import models

class WebhookConfig(models.Model):
    secret_key = models.CharField(max_length=255)
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Webhook Config - {'Ativo' if self.ativo else 'Inativo'}"

class Webhook(models.Model):
    evento = models.CharField(max_length=50)
    payload = models.TextField()
    assinatura = models.CharField(max_length=255, null=True)
    verificado = models.BooleanField(default=False)
    recebido_em = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Webhook - {self.evento} {'(Verificado)' if self.verificado else '(Não Verificado)'}"

class EnderecoEnvio(models.Model):
    nome_destinatario = models.CharField(max_length=255)
    endereco = models.CharField(max_length=255)
    numero = models.CharField(max_length=20)
    complemento = models.CharField(max_length=255, blank=True, null=True)
    cidade = models.CharField(max_length=100)
    uf = models.CharField(max_length=2)
    cep = models.CharField(max_length=9)
    bairro = models.CharField(max_length=100)
    telefone = models.CharField(max_length=20)
    pais = models.CharField(max_length=50)

    def __str__(self):
        return f"{self.nome_destinatario} - {self.cidade}/{self.uf}"

class Design(models.Model):
    capa_frente = models.URLField()
    capa_verso = models.URLField(blank=True, null=True)

    def __str__(self):
        return "Design"

class Mockup(models.Model):
    capa_frente = models.URLField()
    capa_costas = models.URLField(blank=True, null=True)

    def __str__(self):
        return "Mockup"

class StatusPedido(models.Model):
    """
    Modelo para armazenar os diferentes status que um pedido pode ter.
    
    Este modelo representa os possíveis estados de um pedido durante seu ciclo de vida,
    desde a criação até a entrega ou cancelamento.
    """
    nome = models.CharField(max_length=50, unique=True)
    descricao = models.TextField(blank=True, null=True)
    cor_css = models.CharField(max_length=50, blank=True, null=True)
    ordem = models.IntegerField(default=0)
    ativo = models.BooleanField(default=True)

    def __str__(self):
        return self.nome

    class Meta:
        verbose_name = "Status de Pedido"
        verbose_name_plural = "Status de Pedidos"
        ordering = ['ordem']

class Produto(models.Model):
    pedido = models.ForeignKey('Pedido', on_delete=models.CASCADE, related_name='produtos')
    nome = models.CharField(max_length=255)
    sku = models.CharField(max_length=100)
    quantidade = models.IntegerField()
    id_sku = models.IntegerField(null=True, blank=True)
    designs = models.OneToOneField(Design, on_delete=models.CASCADE)
    mockups = models.OneToOneField(Mockup, on_delete=models.CASCADE)
    arquivo_pdf = models.URLField(null=True, blank=True)

    def __str__(self):
        return f"{self.nome} - {self.sku}"

class InformacoesAdicionais(models.Model):
    nome = models.CharField(max_length=255)
    telefone = models.CharField(max_length=20)
    email = models.EmailField()

    def __str__(self):
        return self.nome

class Pedido(models.Model):
    titulo = models.CharField(max_length=255)
    valor_pedido = models.DecimalField(max_digits=10, decimal_places=2)
    custo_envio = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    etiqueta_envio = models.URLField(null=True, blank=True)
    metodo_envio = models.IntegerField(null=True, blank=True)
    numero_pedido = models.IntegerField(unique=True)
    nome_cliente = models.CharField(max_length=255)
    documento_cliente = models.CharField(max_length=20)
    email_cliente = models.EmailField()
    status = models.ForeignKey(StatusPedido, on_delete=models.PROTECT, related_name='pedidos')
    pdf_path = models.CharField(max_length=255, null=True, blank=True)
    
    # Relacionamentos
    webhook = models.ForeignKey(Webhook, on_delete=models.CASCADE, related_name='pedidos')
    endereco_envio = models.OneToOneField(EnderecoEnvio, on_delete=models.CASCADE)
    informacoes_adicionais = models.OneToOneField(InformacoesAdicionais, on_delete=models.CASCADE)
    
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Pedido #{self.numero_pedido} - {self.nome_cliente}"

    class Meta:
        ordering = ['-criado_em']

class WebhookStatusEnviado(models.Model):
    """
    Registra os webhooks de status enviados para sistemas externos.
    
    Este modelo armazena informações sobre os webhooks de status que o sistema
    envia para sistemas externos, como por exemplo, para notificar sobre 
    atualizações no status de um pedido.
    """
    pedido = models.ForeignKey(Pedido, on_delete=models.CASCADE, related_name='webhooks_enviados')
    status = models.CharField(max_length=50)
    url_destino = models.URLField()
    payload = models.TextField()
    resposta = models.TextField(null=True, blank=True)
    codigo_http = models.IntegerField(null=True, blank=True)
    sucesso = models.BooleanField(default=False)
    enviado_em = models.DateTimeField(auto_now_add=True)
    tentativa_numero = models.IntegerField(default=1)
    
    def __str__(self):
        return f"Status webhook para pedido #{self.pedido.numero_pedido} - {'Sucesso' if self.sucesso else 'Falha'}"
    
    class Meta:
        ordering = ['-enviado_em']
        verbose_name = "Webhook de Status Enviado"
        verbose_name_plural = "Webhooks de Status Enviados"

class WebhookEndpointConfig(models.Model):
    """
    Configuração para endpoints externos que receberão webhooks de status.
    
    Este modelo permite configurar URLs para onde os webhooks de status serão enviados
    automaticamente quando o status de um pedido for alterado.
    """
    nome = models.CharField(max_length=100, help_text="Nome para identificar este endpoint")
    url = models.URLField(help_text="URL para onde os webhooks serão enviados")
    ativo = models.BooleanField(default=True, help_text="Se desativado, webhooks não serão enviados para este endpoint")
    auto_enviar = models.BooleanField(default=True, help_text="Se ativado, webhooks serão enviados automaticamente")
    access_token = models.CharField(
        max_length=255, blank=True, null=True, 
        help_text="Token de autenticação opcional para incluir na URL"
    )
    token_autenticacao = models.CharField(
        max_length=255, blank=True, null=True, 
        help_text="Token de autenticação opcional para incluir nos cabeçalhos de requisição"
    )
    headers_adicionais = models.TextField(
        blank=True, null=True, 
        help_text="Cabeçalhos adicionais em formato JSON (por exemplo: {'X-Custom': 'Value'})"
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.nome} - {'Ativo' if self.ativo else 'Inativo'}"
    
    class Meta:
        verbose_name = "Configuração de Endpoint de Webhook"
        verbose_name_plural = "Configurações de Endpoints de Webhook"
        ordering = ['nome']
