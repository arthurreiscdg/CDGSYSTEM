import json
import requests
import logging
from datetime import datetime
from django.db import transaction
from django.conf import settings

from ..models import (
    WebhookConfig, Webhook, Pedido, EnderecoEnvio, 
    InformacoesAdicionais, Produto, Design, Mockup,
    WebhookStatusEnviado, StatusPedido, WebhookEndpointConfig
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
    def obter_status_padrao():
        """
        Obtém o status padrão para novos pedidos.
        
        Returns:
            StatusPedido: O objeto StatusPedido padrão (Novo Pedido) ou o status com ID 1 se não existir
        """
        try:
            status = StatusPedido.objects.filter(nome="Novo Pedido").first()
            if not status:
                # Se não encontrar o status "Novo Pedido", tenta obter o status com ID 1
                status = StatusPedido.objects.filter(id=1).first()
                logger.info("Status 'Novo Pedido' não encontrado, usando status ID 1")
            return status
        except Exception as e:
            logger.error(f"Erro ao obter status padrão: {str(e)}")
            return None
    
    @staticmethod
    def obter_status_por_nome(nome_status):
        """
        Obtém um status pelo nome.
        
        Args:
            nome_status (str): O nome do status
            
        Returns:
            StatusPedido: O objeto StatusPedido correspondente ou None se não existir
        """
        try:
            return StatusPedido.objects.filter(nome=nome_status).first()
        except Exception as e:
            logger.error(f"Erro ao obter status '{nome_status}': {str(e)}")
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
            # Obter status padrão (Novo Pedido)
            status_padrao = WebhookDBService.obter_status_padrao()
            
            # Se ainda não encontrou status, força a busca pelo ID 1
            if not status_padrao:
                status_padrao = StatusPedido.objects.filter(id=1).first()
                logger.warning("Status padrão não encontrado, usando status com ID 1 diretamente.")
                
                # Se ainda não encontrou, cria um status padrão para evitar erro
                if not status_padrao:
                    status_padrao = StatusPedido.objects.create(
                        nome="Novo Pedido",
                        descricao="Status padrão para novos pedidos"
                    )
                    logger.warning("Status ID 1 não encontrado, criado status padrão para evitar erro.")
            
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
                informacoes_adicionais=info_adicionais,
                status=status_padrao
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
    def atualizar_status_pedido(pedido_id, novo_status_nome):
        """
        Atualiza o status de um pedido.
        
        Args:
            pedido_id (int): O ID do pedido
            novo_status_nome (str): O nome do novo status
            
        Returns:
            Pedido: O objeto Pedido atualizado ou None se falhar
        """
        try:
            pedido = Pedido.objects.get(pk=pedido_id)
            status = WebhookDBService.obter_status_por_nome(novo_status_nome)
            
            if not status:
                logger.error(f"Status '{novo_status_nome}' não encontrado")
                return None
                
            pedido.status = status
            pedido.save(update_fields=['status', 'atualizado_em'])
            logger.info(f"Status do pedido #{pedido.numero_pedido} atualizado para '{novo_status_nome}'")
            return pedido
        except Pedido.DoesNotExist:
            logger.error(f"Pedido com ID {pedido_id} não encontrado")
            return None
        except Exception as e:
            logger.error(f"Erro ao atualizar status do pedido: {str(e)}")
            return None
      
    @staticmethod
    def enviar_webhook_status(numero_pedido, url_destino, status_nome, informacoes_adicionais=None, endpoint_config=None):
        """
        Envia um webhook de status para um sistema externo.
        
        Args:
            numero_pedido (int): O número do pedido
            url_destino (str): A URL para onde enviar o webhook (ignorado se endpoint_config for fornecido)
            status_nome (str): O nome do status atual do pedido
            informacoes_adicionais (dict, optional): Informações adicionais a incluir
            endpoint_config (WebhookEndpointConfig, optional): Configuração específica do endpoint
            
        Returns:
            WebhookStatusEnviado: O objeto WebhookStatusEnviado criado ou None em caso de erro
        """
        try:
            # Buscar pedido
            pedido = WebhookDBService.buscar_pedido(numero_pedido)
            if not pedido:
                logger.error(f"Pedido #{numero_pedido} não encontrado para envio de webhook")
                return None
              # Determinar URL de destino
            url_final = endpoint_config.url if endpoint_config else url_destino
            
            # Formatar data atual no formato exato solicitado
            data_atual = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            
            # Buscar o status_id do status pelo nome
            status_obj = WebhookDBService.obter_status_por_nome(status_nome)
            status_id = status_obj.id if status_obj else 0
              # Determinar qual access_token usar
            # Prioridade: 1. informacoes_adicionais, 2. endpoint_config.access_token, 3. valor padrão
            access_token_value = "error"
            
            # Usar token do endpoint se disponível
            if endpoint_config and endpoint_config.access_token:
                access_token_value = endpoint_config.access_token
            
            # Criar payload exatamente no formato solicitado
            payload = {
                "data": data_atual,
                "access_token": access_token_value,
                "json": {
                    "casa_grafica_id": str(pedido.numero_pedido),
                    "status_id": status_id,
                    "status": status_nome
                }
            }
            
            # Atualizar access_token se fornecido nas informações adicionais (maior prioridade)
            if informacoes_adicionais and 'access_token' in informacoes_adicionais:
                payload['access_token'] = informacoes_adicionais['access_token']
            
            # Converter para JSON
            payload_json = json.dumps(payload)
            
            # Preparar headers básicos
            headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'PDFlow-Webhook/1.0',
            }
            
            # Adicionar headers e autenticação caso tenha configuração específica
            if endpoint_config:
                # Adicionar token de autenticação se configurado
                if endpoint_config.token_autenticacao:
                    headers['Authorization'] = f'Bearer {endpoint_config.token_autenticacao}'
                
                # Adicionar headers adicionais se configurados
                if endpoint_config.headers_adicionais:
                    try:
                        headers_adicionais = json.loads(endpoint_config.headers_adicionais)
                        if isinstance(headers_adicionais, dict):
                            headers.update(headers_adicionais)
                    except json.JSONDecodeError:
                        logger.warning(f"Headers adicionais mal formatados para o endpoint {endpoint_config.nome}")
            
            # Tentar enviar a requisição
            try:
                resposta = requests.post(
                    url_final,
                    data=payload_json,
                    headers=headers,
                    timeout=settings.WEBHOOK_TIMEOUT
                )
                  # Registrar a resposta
                status_webhook = WebhookStatusEnviado.objects.create(
                    pedido=pedido,
                    status=status_nome,
                    url_destino=url_final,
                    payload=payload_json,
                    resposta=resposta.text,
                    codigo_http=resposta.status_code,
                    sucesso=resposta.status_code >= 200 and resposta.status_code < 300,
                    tentativa_numero=1
                )
                
                return status_webhook
                
            except requests.RequestException as e:                # Registrar erro
                status_webhook = WebhookStatusEnviado.objects.create(
                    pedido=pedido,
                    status=status_nome,
                    url_destino=url_final,
                    payload=payload_json,
                    resposta=str(e),
                    sucesso=False,
                    tentativa_numero=1
                )
                
                logger.error(f"Erro ao enviar webhook para {url_final}: {str(e)}")
                return status_webhook
                
        except Exception as e:
            logger.error(f"Erro ao processar envio de webhook: {str(e)}")
            return None
    
    @staticmethod
    def buscar_endpoints_webhook_ativos():
        """
        Busca todos os endpoints de webhook configurados e ativos.
        
        Returns:
            list: Lista de objetos WebhookEndpointConfig ativos
        """
        try:
            return WebhookEndpointConfig.objects.filter(ativo=True)
        except Exception as e:
            logger.error(f"Erro ao buscar endpoints de webhook ativos: {str(e)}")
            return []

    @staticmethod
    def enviar_webhook_status_para_todos_endpoints(numero_pedido, status_nome, informacoes_adicionais=None):
        """
        Envia um webhook de status para todos os endpoints ativos configurados.
        
        Args:
            numero_pedido (int): O número do pedido
            status_nome (str): O nome do status atual do pedido
            informacoes_adicionais (dict, optional): Informações adicionais a incluir
            
        Returns:
            list: Lista de objetos WebhookStatusEnviado criados
        """
        resultados = []
        
        # Buscar todos os endpoints ativos
        endpoints = WebhookDBService.buscar_endpoints_webhook_ativos()
        
        # Caso não tenha endpoints configurados, tenta usar a URL padrão das configurações
        if not endpoints and hasattr(settings, 'WEBHOOK_STATUS_ENDPOINT') and settings.WEBHOOK_STATUS_AUTO_NOTIFY:
            webhook = WebhookDBService.enviar_webhook_status(
                numero_pedido, 
                settings.WEBHOOK_STATUS_ENDPOINT,
                status_nome, 
                informacoes_adicionais
            )
            if webhook:
                resultados.append(webhook)
            return resultados
        
        # Enviar para cada endpoint configurado e ativo
        for endpoint in endpoints:
            # Verificar se o endpoint está configurado para envio automático
            if endpoint.auto_enviar:
                webhook = WebhookDBService.enviar_webhook_status(
                    numero_pedido, 
                    None,  # URL será obtida da configuração do endpoint
                    status_nome, 
                    informacoes_adicionais,
                    endpoint
                )
                if webhook:
                    resultados.append(webhook)
        
        return resultados