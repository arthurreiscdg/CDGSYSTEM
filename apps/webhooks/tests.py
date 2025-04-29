import json
import hmac
import hashlib
from django.test import TestCase, Client
from django.urls import reverse
from .models import WebhookConfig, Webhook, Pedido, Produto

class WebhookTests(TestCase):
    def setUp(self):
        # Criar uma configuração de webhook para os testes
        self.webhook_config = WebhookConfig.objects.create(
            secret_key='chave_secreta_teste',
            ativo=True
        )
        
        # Criar um cliente para fazer as requisições
        self.client = Client()
        
        # Dados de exemplo para o webhook
        self.payload = {
            "valor_pedido": 150.50,
            "custo_envio": 15.90,
            "etiqueta_envio": "https://exemplo.com/etiqueta.pdf",
            "metodo_envio": 1,
            "numero_pedido": 12345,
            "nome_cliente": "João Silva",
            "documento_cliente": "123.456.789-00",
            "email_cliente": "joao@exemplo.com",
            "produtos": [{
                "nome": "Cartão de Visita",
                "sku": "CV-001",
                "quantidade": 1000,
                "id_sku": 1,
                "designs": {
                    "capa_frente": "https://exemplo.com/design_frente.jpg",
                    "capa_verso": "https://exemplo.com/design_verso.jpg"
                },
                "mockups": {
                    "capa_frente": "https://exemplo.com/mockup_frente.jpg",
                    "capa_costas": "https://exemplo.com/mockup_verso.jpg"
                },
                "arquivo_pdf": "https://exemplo.com/arquivo.pdf"
            }],
            "informacoes_adicionais": {
                "nome": "Loja Teste",
                "telefone": "(11) 99999-9999",
                "email": "loja@teste.com"
            },
            "endereco_envio": {
                "nome_destinatario": "João Silva",
                "endereco": "Rua Teste",
                "numero": "123",
                "complemento": "Apto 45",
                "cidade": "São Paulo",
                "uf": "SP",
                "cep": "01234-567",
                "bairro": "Centro",
                "telefone": "(11) 99999-9999",
                "pais": "Brasil"
            }
        }

    def test_webhook_recebimento_sucesso(self):
        """Testa o recebimento bem-sucedido de um webhook"""
        # Preparar a assinatura
        payload_bytes = json.dumps(self.payload).encode()
        assinatura = hmac.new(
            self.webhook_config.secret_key.encode(),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        
        # Fazer a requisição
        response = self.client.post(
            reverse('webhooks:receber_webhook'),
            data=json.dumps(self.payload),
            content_type='application/json',
            HTTP_X_HUB_SIGNATURE_256=f'sha256={assinatura}'
        )
        
        # Verificar se a requisição foi bem-sucedida
        self.assertEqual(response.status_code, 201)
        
        # Verificar se o pedido foi criado
        self.assertTrue(Pedido.objects.filter(numero_pedido=12345).exists())
        
        # Verificar se o produto foi criado
        pedido = Pedido.objects.get(numero_pedido=12345)
        self.assertEqual(pedido.produtos.count(), 1)
        
        # Verificar os detalhes do produto
        produto = pedido.produtos.first()
        self.assertEqual(produto.nome, "Cartão de Visita")
        self.assertEqual(produto.sku, "CV-001")
        self.assertEqual(produto.quantidade, 1000)

    def test_webhook_sem_assinatura(self):
        """Testa o recebimento de um webhook sem assinatura"""
        response = self.client.post(
            reverse('webhooks:receber_webhook'),
            data=json.dumps(self.payload),
            content_type='application/json'
        )
        self.assertEqual(response.status_code, 403)

    def test_webhook_assinatura_invalida(self):
        """Testa o recebimento de um webhook com assinatura inválida"""
        response = self.client.post(
            reverse('webhooks:receber_webhook'),
            data=json.dumps(self.payload),
            content_type='application/json',
            HTTP_X_HUB_SIGNATURE_256='sha256=assinatura_invalida'
        )
        self.assertEqual(response.status_code, 403)

    def test_webhook_payload_invalido(self):
        """Testa o recebimento de um webhook com payload inválido"""
        payload_invalido = self.payload.copy()
        del payload_invalido['valor_pedido']  # Remove um campo obrigatório
        
        # Preparar a assinatura
        payload_bytes = json.dumps(payload_invalido).encode()
        assinatura = hmac.new(
            self.webhook_config.secret_key.encode(),
            payload_bytes,
            hashlib.sha256
        ).hexdigest()
        
        response = self.client.post(
            reverse('webhooks:receber_webhook'),
            data=json.dumps(payload_invalido),
            content_type='application/json',
            HTTP_X_HUB_SIGNATURE_256=f'sha256={assinatura}'
        )
        self.assertEqual(response.status_code, 400)