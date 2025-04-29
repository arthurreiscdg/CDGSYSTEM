import json
import requests
import logging
from datetime import datetime
from django.db import transaction
from django.conf import settings

from ..models import (
    WebhookConfig, Webhook, Pedido, EnderecoEnvio, 
    InformacoesAdicionais, Produto, Design, Mockup,
    WebhookStatusEnviado
)

logger = logging.getLogger('apps.webhooks')

class WebhookDBService:
    """
    Serviço para operações no banco de dados relacionadas a webhooks.
    
    Esta classe contém métodos estáticos para lidar com operações de banco de dados
    relacionadas aos webhooks, como buscar configurações, criar pedidos, etc.
    """
    
    @staticmethod
    def buscar_config_ativa():
        """
        Busca a configuração de webhook ativa.
        
        Returns:
            WebhookConfig: A configuração ativa ou None se não existir
        """
        try:
            return WebhookConfig.objects.filter(ativo=True).first()
        except Exception as e:
            logger.error(f"Erro ao buscar configuração ativa: {str(e)}")
            return None
    
    @staticmethod
    def criar_webhook(evento, payload, assinatura=None, verificado=False):
        """
        Cria um registro de webhook recebido.
        
        Args:
            evento (str): O tipo de evento do webhook
            payload (str): O conteúdo do webhook em formato JSON
            assinatura (str, optional): A assinatura do webhook
            verificado (bool, optional): Se o webhook foi verificado
            
        Returns:
            Webhook: O objeto Webhook criado
        """
        try:
            return Webhook.objects.create(
                evento=evento,
                payload=payload,
                assinatura=assinatura,
                verificado=verificado
            )
        except Exception as e:
            logger.error(f"Erro ao criar webhook: {str(e)}")
            raise
    
    @staticmethod
    def criar_endereco_envio(dados):
        """
        Cria um registro de endereço de envio.
        
        Args:
            dados (dict): Dicionário com os dados do endereço
            
        Returns:
            EnderecoEnvio: O objeto EnderecoEnvio criado
        """
        try:
            return EnderecoEnvio.objects.create(
                nome_destinatario=str(dados['nome_destinatario']),
                endereco=str(dados['endereco']),
                numero=str(dados['numero']),
                complemento=str(dados.get('complemento', '')),
                cidade=str(dados['cidade']),
                uf=str(dados['uf']),
                cep=str(dados['cep']),
                bairro=str(dados['bairro']),
                telefone=str(dados['telefone']),
                pais=str(dados.get('pais', 'Brasil'))
            )
        except Exception as e:
            logger.error(f"Erro ao criar endereço: {str(e)}")
            raise
    
    @staticmethod
    def criar_info_adicionais(dados):
        """
        Cria um registro de informações adicionais.
        
        Args:
            dados (dict): Dicionário com os dados das informações
            
        Returns:
            InformacoesAdicionais: O objeto InformacoesAdicionais criado
        """
        try:
            return InformacoesAdicionais.objects.create(
                nome=str(dados['nome']),
                telefone=str(dados['telefone']),
                email=str(dados['email'])
            )
        except Exception as e:
            logger.error(f"Erro ao criar informações adicionais: {str(e)}")
            raise
    
    @staticmethod
    def criar_pedido(dados, webhook):
        """
        Cria um registro de pedido.
        
        Args:
            dados (dict): Dicionário com os dados do pedido
            webhook (Webhook): O objeto Webhook relacionado
            
        Returns:
            Pedido: O objeto Pedido criado
        """
        try:
            # Criar endereço e informações
            endereco = WebhookDBService.criar_endereco_envio(dados['endereco_envio'])
            info_adicionais = WebhookDBService.criar_info_adicionais(dados['informacoes_adicionais'])
            
            # Criar o pedido
            return Pedido.objects.create(
                titulo=f"Pedido #{dados['numero_pedido']}",
                valor_pedido=float(dados['valor_pedido']),
                custo_envio=float(dados.get('custo_envio', 0)),
                etiqueta_envio=str(dados.get('etiqueta_envio', '')),
                metodo_envio=int(dados.get('metodo_envio', 0)),
                numero_pedido=int(dados['numero_pedido']),
                nome_cliente=str(dados['nome_cliente']),
                documento_cliente=str(dados['documento_cliente']),
                email_cliente=str(dados['email_cliente']),
                webhook=webhook,
                endereco_envio=endereco,
                informacoes_adicionais=info_adicionais
            )
        except Exception as e:
            logger.error(f"Erro ao criar pedido: {str(e)}")
            raise
    
    @staticmethod
    def criar_produto(dados_produto, pedido):
        """
        Cria um registro de produto.
        
        Args:
            dados_produto (dict): Dicionário com os dados do produto
            pedido (Pedido): O objeto Pedido relacionado
            
        Returns:
            Produto: O objeto Produto criado
        """
        try:
            # Criar design
            design_dados = dados_produto['designs']
            design = Design.objects.create(
                capa_frente=str(design_dados['capa_frente']),
                capa_verso=str(design_dados.get('capa_verso', ''))
            )
            
            # Criar mockup
            mockup_dados = dados_produto['mockups']
            mockup = Mockup.objects.create(
                capa_frente=str(mockup_dados['capa_frente']),
                capa_costas=str(mockup_dados.get('capa_costas', ''))
            )
            
            # Criar produto
            return Produto.objects.create(
                pedido=pedido,
                nome=str(dados_produto['nome']),
                sku=str(dados_produto['sku']),
                quantidade=int(dados_produto['quantidade']),
                id_sku=dados_produto.get('id_sku'),
                designs=design,
                mockups=mockup,
                arquivo_pdf=str(dados_produto.get('arquivo_pdf', ''))
            )
        except Exception as e:
            logger.error(f"Erro ao criar produto: {str(e)}")
            raise
    
    @staticmethod
    @transaction.atomic
    def criar_pedido_completo(dados, webhook_data):
        """
        Cria um pedido completo com todos os relacionamentos.
        
        Args:
            dados (dict): Dicionário com os dados do pedido
            webhook_data (dict): Dicionário com os dados do webhook
            
        Returns:
            tuple: (Pedido, list) Objeto Pedido criado e lista de Produtos criados
        """
        try:
            # Criar webhook
            webhook = WebhookDBService.criar_webhook(
                webhook_data.get('evento', 'pedido'),
                webhook_data.get('payload', '{}'),
                webhook_data.get('assinatura'),
                webhook_data.get('verificado', False)
            )
            
            # Criar pedido
            pedido = WebhookDBService.criar_pedido(dados, webhook)
            
            # Criar produtos
            produtos_criados = []
            for produto_dados in dados['produtos']:
                produto = WebhookDBService.criar_produto(produto_dados, pedido)
                produtos_criados.append(produto)
            
            return pedido, produtos_criados
        except Exception as e:
            logger.error(f"Erro ao criar pedido completo: {str(e)}")
            transaction.set_rollback(True)
            raise
    
    @staticmethod
    def buscar_pedido(numero_pedido):
        """
        Busca um pedido pelo número.
        
        Args:
            numero_pedido (int): O número do pedido
            
        Returns:
            Pedido: O objeto Pedido encontrado ou None
        """
        try:
            return Pedido.objects.filter(numero_pedido=numero_pedido).first()
        except Exception as e:
            logger.error(f"Erro ao buscar pedido #{numero_pedido}: {str(e)}")
            return None
    
    @staticmethod
    def enviar_webhook_status(numero_pedido, url_destino, status, informacoes_adicionais=None):
        """
        Envia um webhook de status para um sistema externo.
        
        Args:
            numero_pedido (int): O número do pedido
            url_destino (str): A URL para onde enviar o webhook
            status (str): O status atual do pedido
            informacoes_adicionais (dict, optional): Informações adicionais a incluir
            
        Returns:
            WebhookStatusEnviado: O objeto WebhookStatusEnviado criado ou None em caso de erro
        """
        try:
            # Buscar pedido
            pedido = WebhookDBService.buscar_pedido(numero_pedido)
            if not pedido:
                logger.error(f"Pedido #{numero_pedido} não encontrado para envio de webhook")
                return None
            
            # Preparar payload
            payload = {
                "numero_pedido": pedido.numero_pedido,
                "nome_cliente": pedido.nome_cliente,
                "email_cliente": pedido.email_cliente,
                "valor_pedido": float(pedido.valor_pedido),
                "status": status,
                "timestamp": datetime.now().isoformat(),
                "quantidade_produtos": pedido.produtos.count()
            }
            
            # Adicionar informações adicionais, se houver
            if informacoes_adicionais:
                for chave, valor in informacoes_adicionais.items():
                    if chave not in payload:
                        payload[chave] = valor
            
            # Converter para JSON
            payload_json = json.dumps(payload)
            
            # Enviar webhook
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'PDFlow-Webhook/1.0',
            }
            
            # Tentar enviar a requisição
            try:
                resposta = requests.post(
                    url_destino,
                    data=payload_json,
                    headers=headers,
                    timeout=settings.WEBHOOK_TIMEOUT
                )
                
                # Registrar a resposta
                status_webhook = WebhookStatusEnviado.objects.create(
                    pedido=pedido,
                    status=status,
                    url_destino=url_destino,
                    payload=payload_json,
                    resposta=resposta.text,
                    codigo_http=resposta.status_code,
                    sucesso=resposta.status_code >= 200 and resposta.status_code < 300
                )
                
                return status_webhook
                
            except requests.RequestException as e:
                # Registrar erro
                status_webhook = WebhookStatusEnviado.objects.create(
                    pedido=pedido,
                    status=status,
                    url_destino=url_destino,
                    payload=payload_json,
                    resposta=str(e),
                    sucesso=False
                )
                
                logger.error(f"Erro ao enviar webhook para {url_destino}: {str(e)}")
                return status_webhook
                
        except Exception as e:
            logger.error(f"Erro ao processar envio de webhook: {str(e)}")
            return None