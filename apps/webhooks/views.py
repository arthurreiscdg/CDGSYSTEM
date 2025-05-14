import hmac
import hashlib
import json
import logging
import requests
from datetime import datetime

from django.http import HttpResponse, HttpResponseForbidden, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST
from django.db import transaction
from django.conf import settings
from django.shortcuts import render, redirect
from django.db.models import Q
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.utils.decorators import method_decorator
from django.views import View

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .services.db_service import WebhookDBService
from .serializers import (
    WebhookSerializer,
    WebhookListSerializer,
    PedidoSerializer,
    WebhookStatusEnviadoSerializer,
    WebhookStatusEnviadoCreateSerializer,
    WebhookDetailSerializer,
    StatusPedidoSerializer,
)
from .models import (
    WebhookConfig, Webhook, Pedido, EnderecoEnvio, 
    InformacoesAdicionais, Produto, Design, Mockup,
    WebhookStatusEnviado, StatusPedido
)

# Configuração de logging
logger = logging.getLogger('apps.webhooks')


class WebhookUtilsMixin:
    """
    Mixin que fornece métodos utilitários para manipulação de webhooks.
    """
    
    def validar_assinatura(self, payload, assinatura_recebida):
        """
        Valida a assinatura do webhook usando HMAC.
        
        Utiliza HMAC-SHA256 para validar se o webhook foi enviado por uma fonte confiável,
        comparando a assinatura recebida com a calculada a partir da chave secreta.
        
        Args:
            payload (str): O conteúdo do webhook como string JSON
            assinatura_recebida (str): A assinatura recebida no cabeçalho do webhook
            
        Returns:
            bool: True se a assinatura for válida, False caso contrário
        """
        try:
            # Buscar configuração ativa
            config = WebhookDBService.buscar_config_ativa()
            if not config:
                logger.warning("Nenhuma configuração de webhook ativa encontrada")
                return False
                
            # Extrair o hash da assinatura
            if assinatura_recebida.startswith('sha256='):
                assinatura_recebida = assinatura_recebida[7:]
                
            # Cria hash HMAC usando SHA256
            hmac_obj = hmac.new(
                config.secret_key.encode('utf-8'),
                payload.encode('utf-8'),
                hashlib.sha256
            )
            assinatura_calculada = hmac_obj.hexdigest()
            
            # Compara assinaturas em tempo constante para evitar timing attacks
            resultado = hmac.compare_digest(
                assinatura_calculada.encode('utf-8'),
                assinatura_recebida.encode('utf-8')
            )
            
            if resultado:
                logger.debug("Assinatura do webhook validada com sucesso")
            else:
                logger.warning("Assinatura do webhook inválida")
                
            return resultado
        except Exception as e:
            logger.error(f"Erro ao validar assinatura: {str(e)}")
            return False
            
    def validar_campos_obrigatorios(self, dados):
        """
        Valida se todos os campos obrigatórios estão presentes no payload.
        
        Verifica a estrutura do JSON recebido para garantir que todos os campos
        necessários para o processamento estão presentes. Realiza verificações
        em múltiplos níveis, incluindo campos de produtos, designs e endereços.
        
        Args:
            dados (dict): Dicionário Python representando o JSON recebido
            
        Raises:
            ValueError: Se algum campo obrigatório estiver ausente, com mensagem
                       detalhada indicando quais campos estão faltando
        """
        # Campos obrigatórios no nível raiz
        campos_obrigatorios = [
            'valor_pedido', 'numero_pedido', 'nome_cliente',
            'documento_cliente', 'email_cliente', 'produtos',
            'informacoes_adicionais', 'endereco_envio'
        ]
        
        # Verificar campos no nível raiz
        campos_faltantes = [campo for campo in campos_obrigatorios if campo not in dados]
        if campos_faltantes:
            msg = f'Campos obrigatórios ausentes: {", ".join(campos_faltantes)}'
            logger.error(msg)
            raise ValueError(msg)
            
        # Validar campos internos dos produtos
        for i, produto in enumerate(dados['produtos']):
            campos_produto = ['nome', 'sku', 'quantidade', 'designs', 'mockups']
            campos_faltantes = [campo for campo in campos_produto if campo not in produto]
            if campos_faltantes:
                msg = f'Campos obrigatórios do produto {i+1} ausentes: {", ".join(campos_faltantes)}'
                logger.error(msg)
                raise ValueError(msg)
                
            # Validar campos internos de designs
            if 'designs' in produto:
                if 'capa_frente' not in produto['designs']:
                    msg = f'Campo obrigatório capa_frente ausente no design do produto {i+1}'
                    logger.error(msg)
                    raise ValueError(msg)
                    
            # Validar campos internos de mockups
            if 'mockups' in produto:
                if 'capa_frente' not in produto['mockups']:
                    msg = f'Campo obrigatório capa_frente ausente no mockup do produto {i+1}'
                    logger.error(msg)
                    raise ValueError(msg)
        
        # Validar campos do endereço
        campos_endereco = [
            'nome_destinatario', 'endereco', 'numero', 'cidade', 
            'uf', 'cep', 'bairro', 'telefone', 'pais'
        ]
        campos_faltantes = [campo for campo in campos_endereco if campo not in dados['endereco_envio']]
        if campos_faltantes:
            msg = f'Campos obrigatórios do endereço ausentes: {", ".join(campos_faltantes)}'
            logger.error(msg)
            raise ValueError(msg)
            
        # Validar campos das informações adicionais
        campos_info = ['nome', 'telefone', 'email']
        campos_faltantes = [campo for campo in campos_info if campo not in dados['informacoes_adicionais']]
        if campos_faltantes:
            msg = f'Campos obrigatórios das informações adicionais ausentes: {", ".join(campos_faltantes)}'
            logger.error(msg)
            raise ValueError(msg)
        
        logger.debug("Validação de campos obrigatórios concluída com sucesso")


class WebhookListView(View):
    """
    View para renderizar a página de listagem de webhooks.
    """
    
    @method_decorator(login_required)
    def get(self, request):
        """
        Processa requisições GET para exibir a lista de webhooks.
        
        Esta função busca webhooks do banco de dados e os renderiza
        na página list.html, permitindo ao usuário visualizar e gerenciar
        os webhooks recebidos. Implementa filtros por status e busca por texto.
        
        Requer que o usuário seja membro da equipe para acessar.
        
        Args:
            request (HttpRequest): O objeto de requisição HTTP
            
        Returns:
            HttpResponse: Resposta HTML renderizada com o template list.html
                         ou redirecionamento caso o usuário não tenha permissão
        """
        # Verificar se o usuário é membro da equipe
        if not request.user.is_staff:
            messages.error(request, "Você não tem permissão para acessar esta página. Apenas membros da equipe podem acessar.")
            return redirect('/home')  # Redirecionamento para a URL direta ao invés de usar namespace
        
        # Iniciar queryset de webhooks - sem usar select_related para pedido
        queryset = Webhook.objects.all().prefetch_related('pedidos').order_by('-recebido_em')
          # Aplicar filtros se fornecidos
        status_filter = request.GET.get('status')
        search_query = request.GET.get('q')
        
        if status_filter:
            # Filtramos baseado nos pedidos relacionados
            queryset = queryset.filter(pedidos__status__id=status_filter)
        
        if search_query:
            # Buscar por número do pedido ou evento
            queryset = queryset.filter(
                Q(pedidos__numero_pedido__icontains=search_query) | 
                Q(evento__icontains=search_query)
            )
        
        # Limitar a 100 resultados para performance
        webhooks = queryset[:100]
        
        # Calcular estatísticas
        total_webhooks = Webhook.objects.count()
        total_pedidos = Pedido.objects.count()
          # Buscar todos os status de pedido ativos
        status_pedidos = StatusPedido.objects.filter(ativo=True).order_by('ordem')
        
        # Contexto para o template
        context = {
            'webhooks': webhooks,
            'total_webhooks': total_webhooks,
            'total_pedidos': total_pedidos,
            'status_filter': status_filter,
            'search_query': search_query,
            'status_pedidos': status_pedidos,
        }
        
        # Renderizar o template com o contexto
        return render(request, 'webhooks/list.html', context)


class WebhookReceiverView(WebhookUtilsMixin, View):
    """
    View para receber webhooks via HTTP POST.
    """
    
    @method_decorator(csrf_exempt)
    @method_decorator(require_POST)
    def dispatch(self, *args, **kwargs):
        return super().dispatch(*args, **kwargs)
    
    def post(self, request):
        """
        Endpoint principal para receber webhooks.
        
        Processa as requisições POST de webhooks, validando a assinatura (se configurado),
        analisando o payload JSON e criando os registros correspondentes no banco de dados.
        
        O fluxo de processamento inclui:
        1. Verificação da assinatura do webhook (se configurada)
        2. Decodificação e validação do JSON recebido
        3. Criação dos registros relacionados no banco de dados
        4. Retorno de uma resposta apropriada
        
        Args:
            request (HttpRequest): O objeto de requisição HTTP
            
        Returns:
            JsonResponse: Resposta JSON com o status do processamento e detalhes
                         relevantes ou mensagens de erro
        """
        try:
            # Registrar informações básicas da requisição
            logger.info(f"Webhook recebido de {request.META.get('REMOTE_ADDR')}")
            
            # Ler o corpo da requisição
            body_text = request.body.decode('utf-8')
            assinatura = request.headers.get('X-Hub-Signature-256')
            
            # Validar assinatura se configurada
            if settings.WEBHOOK_REQUIRE_SIGNATURE:
                if not assinatura:
                    logger.warning("Webhook rejeitado: assinatura ausente")
                    return JsonResponse({
                        'status': 'erro',
                        'mensagem': 'Assinatura ausente'
                    }, status=403)
                if not self.validar_assinatura(body_text, assinatura):
                    logger.warning("Webhook rejeitado: assinatura inválida")
                    return JsonResponse({
                        'status': 'erro',
                        'mensagem': 'Assinatura inválida'
                    }, status=403)
            
            try:
                # Decodificar o JSON
                dados = json.loads(body_text)
                logger.debug(f"Webhook recebido para pedido #{dados.get('numero_pedido', 'desconhecido')}")
                
                # Validar estrutura do JSON
                self.validar_campos_obrigatorios(dados)

                # Preparar dados do webhook
                webhook_data = {
                    'evento': dados.get('evento', 'pedido'),
                    'payload': body_text,
                    'assinatura': assinatura,
                    'verificado': True if not settings.WEBHOOK_REQUIRE_SIGNATURE else assinatura is not None
                }

                # Criar pedido usando o serviço
                pedido, produtos_criados = WebhookDBService.criar_pedido_completo(dados, webhook_data)
                logger.info(f"Webhook processado com sucesso: pedido #{pedido.numero_pedido} com {len(produtos_criados)} produtos")

                # Retornar resposta de sucesso
                return JsonResponse({
                    'status': 'sucesso',
                    'mensagem': 'Pedido criado com sucesso',
                    'numero_pedido': pedido.numero_pedido,
                    'produtos': len(produtos_criados)
                }, status=201)

            except json.JSONDecodeError as e:
                # Erro na decodificação do JSON
                logger.error(f"Erro ao decodificar JSON: {str(e)}")
                return JsonResponse({
                    'status': 'erro',
                    'mensagem': f'JSON inválido: {str(e)}'
                }, status=400)
            except ValueError as e:
                # Erro na validação dos campos
                logger.error(f"Erro de validação: {str(e)}")
                return JsonResponse({
                    'status': 'erro',
                    'mensagem': str(e)
                }, status=400)
            except Exception as e:
                # Outros erros no processamento
                logger.error(f"Erro ao processar pedido: {str(e)}")
                return JsonResponse({
                    'status': 'erro',
                    'mensagem': f'Erro ao processar pedido: {str(e)}'
                }, status=500)

        except Exception as e:
            # Erros inesperados
            logger.error(f"Erro interno no processamento do webhook: {str(e)}")
            return JsonResponse({
                'status': 'erro',
                'mensagem': f'Erro interno: {str(e)}'
            }, status=500)


class WebhookViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API ViewSet para listar e visualizar webhooks.
    
    Permite apenas operações de leitura (GET) dos webhooks recebidos.
    Utiliza diferentes serializadores para a listagem e para os detalhes.
    """
    queryset = Webhook.objects.all().order_by('-recebido_em')
    
    def get_serializer_class(self):
        """
        Retorna o serializador apropriado conforme a ação.
        
        Usa um serializador simplificado para a listagem e um
        serializador completo para os detalhes de um webhook específico.
        
        Returns:
            class: A classe do serializador a ser usada
        """
        if self.action == 'list':
            return WebhookListSerializer
        return WebhookSerializer


class PedidoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API ViewSet para listar e visualizar pedidos.
    
    Permite apenas operações de leitura (GET) dos pedidos recebidos via webhook.
    Implementa filtros e ordenação por data de criação.
    """
    serializer_class = PedidoSerializer
    
    def get_queryset(self):
        """
        Retorna o queryset base para o ViewSet, aplicando filtros conforme parâmetros.
        
        Permite filtrar por número de pedido ou nome do cliente (busca parcial).
        
        Returns:
            QuerySet: Queryset filtrado e ordenado por data de criação decrescente
        """
        queryset = Pedido.objects.all().order_by('-criado_em')
        
        # Filtrar por número de pedido
        numero_pedido = self.request.query_params.get('numero_pedido')
        if numero_pedido:
            queryset = queryset.filter(numero_pedido=numero_pedido)
            
        # Filtrar por nome do cliente (busca parcial case-insensitive)
        nome_cliente = self.request.query_params.get('nome_cliente')
        if nome_cliente:
            queryset = queryset.filter(nome_cliente__icontains=nome_cliente)
            
        return queryset


class PedidoBuscaAPIView(APIView):
    """
    API View para buscar um pedido específico pelo número.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, numero_pedido):
        """
        Busca um pedido específico pelo número.
        
        Endpoint dedicado para encontrar um pedido por seu número único,
        retornando detalhes completos incluindo informações de envio,
        produtos associados e outros detalhes relevantes.
        
        Args:
            request (Request): Objeto de requisição do DRF
            numero_pedido (int): Número do pedido a ser buscado
            
        Returns:
            Response: Resposta com os dados completos do pedido ou
                     mensagem de erro caso o pedido não seja encontrado
        """
        try:
            pedido = WebhookDBService.buscar_pedido(numero_pedido)
            if not pedido:
                logger.warning(f"Pedido #{numero_pedido} não encontrado na busca")
                return Response(
                    {'erro': 'Pedido não encontrado'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            logger.info(f"Pedido #{numero_pedido} encontrado e retornado")
            serializer = PedidoSerializer(pedido)
            return Response(serializer.data)
        except Exception as e:
            logger.error(f"Erro ao buscar pedido #{numero_pedido}: {str(e)}")
            return Response(
                {'erro': f'Erro ao buscar pedido: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WebhookStatusEnviarAPIView(APIView):
    """
    API View para enviar um webhook de status para um sistema externo.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Endpoint para enviar um webhook de status para um sistema externo.
        
        Recebe dados sobre o pedido e seu status atual, e envia estas informações
        para a URL especificada, registrando o resultado do envio no banco de dados.
        
        O processo inclui:
        1. Validação dos dados recebidos
        2. Busca do pedido no banco de dados
        3. Montagem do payload com status e informações adicionais
        4. Envio via HTTP para o destino
        5. Registro do resultado
        
        Args:
            request (Request): Objeto de requisição do DRF contendo os dados necessários
                              para o envio do webhook
            
        Returns:
            Response: Resposta com detalhes do envio ou mensagem de erro
        """
        try:
            # Validar dados de entrada
            serializer = WebhookStatusEnviadoCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(
                    {'erro': serializer.errors}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extrair dados validados
            dados = serializer.validated_data
            numero_pedido = dados['numero_pedido']
            url_destino = dados['url_destino']
            status_pedido = dados['status']
            informacoes_adicionais = dados.get('informacoes_adicionais', {})
            
            # Enviar webhook
            webhook_status = WebhookDBService.enviar_webhook_status(
                numero_pedido, 
                url_destino, 
                status_pedido, 
                informacoes_adicionais
            )
            
            if not webhook_status:
                logger.error(f"Falha ao enviar webhook de status para pedido #{numero_pedido}")
                return Response(
                    {'erro': 'Não foi possível enviar o webhook de status'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Retornar resultados
            resultado = WebhookStatusEnviadoSerializer(webhook_status).data
            logger.info(f"Webhook de status enviado para pedido #{numero_pedido} com sucesso={webhook_status.sucesso}")
            
            return Response({
                'mensagem': 'Webhook de status enviado com sucesso' if webhook_status.sucesso else 'Falha ao enviar webhook',
                'resultado': resultado
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Erro ao processar envio de webhook de status: {str(e)}")
            return Response(
                {'erro': f'Erro interno: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class WebhookStatusEnviadoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API ViewSet para listar e visualizar webhooks de status enviados.
    
    Permite apenas operações de leitura (GET) dos webhooks de status enviados.
    Inclui filtros por número de pedido, URL de destino e resultado do envio.
    """
    serializer_class = WebhookStatusEnviadoSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Retorna o queryset base para o ViewSet, aplicando filtros conforme parâmetros.
        
        Permite filtrar por:
        - Número do pedido
        - URL de destino (busca parcial)
        - Status de sucesso do envio
        
        Returns:
            QuerySet: Queryset filtrado e ordenado por data de envio decrescente
        """
        queryset = WebhookStatusEnviado.objects.all().order_by('-enviado_em')
        
        # Filtrar por número de pedido
        numero_pedido = self.request.query_params.get('numero_pedido')
        if numero_pedido:
            queryset = queryset.filter(pedido__numero_pedido=numero_pedido)
            
        # Filtrar por URL de destino
        url_destino = self.request.query_params.get('url_destino')
        if url_destino:
            queryset = queryset.filter(url_destino__icontains=url_destino)
            
        # Filtrar por sucesso
        sucesso = self.request.query_params.get('sucesso')
        if sucesso is not None:
            queryset = queryset.filter(sucesso=(sucesso.lower() == 'true'))
            
        return queryset
        
    @action(detail=True, methods=['post'])
    def reenviar(self, request, pk=None):
        """
        Reenvia um webhook de status existente.
        
        Esta action permite reenviar um webhook que já foi enviado anteriormente,
        mantendo os mesmos dados mas gerando uma nova requisição. Útil para
        casos em que o destinatário não recebeu o webhook original ou
        para testes de conexão.
        
        Args:
            request (Request): Objeto de requisição do DRF
            pk (str): ID do webhook de status a ser reenviado
            
        Returns:
            Response: Resposta com detalhes do reenvio ou mensagem de erro
        """
        try:
            # Buscar webhook existente
            webhook = self.get_object()
            
            # Obter dados originais
            pedido = webhook.pedido
            url_destino = webhook.url_destino
            
            # Extrair status do payload original
            try:
                payload_data = json.loads(webhook.payload)
                status_pedido = payload_data.get('status', 'processando')
                informacoes_adicionais = {
                    k: v for k, v in payload_data.items() 
                    if k not in ['numero_pedido', 'status', 'nome_cliente', 'email_cliente', 
                                'valor_pedido', 'timestamp', 'quantidade_produtos']
                }
            except json.JSONDecodeError:
                status_pedido = 'processando'
                informacoes_adicionais = {}
                
            # Reenviar webhook
            novo_webhook = WebhookDBService.enviar_webhook_status(
                pedido.numero_pedido,
                url_destino,
                status_pedido,
                informacoes_adicionais
            )
            
            if not novo_webhook:
                return Response(
                    {'erro': 'Falha ao reenviar webhook de status'}, 
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
                
            resultado = WebhookStatusEnviadoSerializer(novo_webhook).data
            return Response({
                'mensagem': 'Webhook de status reenviado com sucesso',
                'resultado': resultado
            })
            
        except Exception as e:
            logger.error(f"Erro ao reenviar webhook de status: {str(e)}")
            return Response(
                {'erro': f'Erro ao reenviar: {str(e)}'}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class StatusPedidoListAPIView(APIView):
    """
    API View para obter a lista de status de pedido.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        """
        API para obter a lista de status de pedido.
        Usado para atualizar dinamicamente os status no modal.
        """
        try:
            status_pedidos = StatusPedido.objects.filter(ativo=True).order_by('ordem')
            serializer = StatusPedidoSerializer(status_pedidos, many=True)
            return Response(serializer.data)
        except Exception as e:
            return Response({'error': str(e)}, status=500)


class WebhookDetailAPIView(APIView):
    """
    API View para obter detalhes de um webhook específico.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, webhook_id):
        """
        API para obter detalhes de um webhook específico.
        Usado para carregar informações detalhadas no modal.
        """
        try:
            logger.info(f"Buscando detalhes para o webhook ID: {webhook_id}")
            webhook = Webhook.objects.get(pk=webhook_id)
            serializer = WebhookDetailSerializer(webhook)
            logger.info(f"Webhook {webhook_id} serializado com sucesso")
            return Response(serializer.data)
        except Webhook.DoesNotExist:
            logger.warning(f"Webhook ID {webhook_id} não encontrado")
            return Response({'error': 'Webhook não encontrado'}, status=404)
        except Exception as e:
            logger.error(f"Erro ao processar webhook ID {webhook_id}: {str(e)}", exc_info=True)
            return Response({'error': str(e)}, status=500)


class UpdateStatusAPIView(APIView):
    """
    API View para atualizar o status de um ou mais pedidos.
    """
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        """
        Endpoint para atualizar o status de um ou mais pedidos.
        
        Recebe uma lista de IDs de webhook e um novo status para aplicar a todos
        os pedidos associados. Válida a existência do status antes de aplicar
        e retorna os resultados da operação.
        
        Também envia webhooks para o endpoint configurado sempre que o status é alterado.
        
        Args:
            request (Request): Objeto de requisição com webhook_ids e status
            
        Returns:
            Response: Resposta com os resultados da atualização ou mensagens de erro
        """
        try:
            # Validar dados de entrada
            webhook_ids = request.data.get('webhook_ids', [])
            novo_status_nome = request.data.get('status')
            
            if not webhook_ids or not isinstance(webhook_ids, list):
                return Response({'erro': 'IDs de webhook não fornecidos ou inválidos'}, status=400)
            
            if not novo_status_nome:
                return Response({'erro': 'Status não fornecido'}, status=400)
            
            # Buscar o objeto StatusPedido correspondente (por nome ou por ID)
            if novo_status_nome.isdigit():
                novo_status = StatusPedido.objects.filter(id=novo_status_nome, ativo=True).first()
            else:
                novo_status = StatusPedido.objects.filter(nome=novo_status_nome, ativo=True).first()
                
            if not novo_status:
                return Response({'erro': f'Status "{novo_status_nome}" não encontrado ou inativo'}, status=400)
                
            # Buscar webhooks e seus pedidos
            webhooks = Webhook.objects.filter(id__in=webhook_ids).prefetch_related('pedidos')
            
            # Resultados para retornar
            resultados = {
                'sucesso': [],
                'erro': [],
                'notificacoes': [],  # Lista para armazenar notificações de alteração
                'webhooks_enviados': []  # Lista para armazenar informações dos webhooks enviados
            }
              # Atualizar status de cada pedido
            for webhook in webhooks:
                try:
                    with transaction.atomic():
                        for pedido in webhook.pedidos.all():
                            # Guardar status anterior para comparação
                            status_anterior = pedido.status
                            
                            # Preparar notificação de alteração de status
                            data_alteracao = datetime.now().strftime('%d/%m/%Y %H:%M:%S')
                            notificacao = {
                                'data': data_alteracao,
                                'status_id': novo_status.id,
                                'status': novo_status.nome,
                                'id': pedido.id,
                                'numero_pedido': pedido.numero_pedido,
                                'status_anterior': status_anterior.nome if status_anterior else "Sem status"
                            }
                              # Informações adicionais para o webhook
                            info_adicionais = {
                                'data_alteracao': data_alteracao,
                                'status_anterior': status_anterior.nome if status_anterior else "Sem status",
                                'status_anterior_id': status_anterior.id if status_anterior else None,
                                'alterado_por': request.user.username,
                                'cliente': pedido.nome_cliente,
                                'documento_cliente': pedido.documento_cliente,
                                'data_criacao': pedido.criado_em.strftime('%Y-%m-%d %H:%M:%S'),
                                'data_atualizacao': pedido.atualizado_em.strftime('%Y-%m-%d %H:%M:%S'),
                                'produtos': [
                                    {
                                        'nome': produto.nome,
                                        'sku': produto.sku,
                                        'quantidade': produto.quantidade
                                    } for produto in pedido.produtos.all()[:5]  # Limitado a 5 produtos para evitar payloads muito grandes
                                ],
                                'endereco': {
                                    'cidade': pedido.endereco_envio.cidade,
                                    'uf': pedido.endereco_envio.uf
                                }
                            }
                            
                            # Enviar webhooks para todos os endpoints ativos
                            webhook_falhou = False
                            try:
                                # Enviar webhooks para todos os endpoints ativos
                                webhooks_enviados = WebhookDBService.enviar_webhook_status_para_todos_endpoints(
                                    pedido.numero_pedido, 
                                    novo_status.nome,
                                    info_adicionais
                                )
                                
                                # Verificar se algum webhook falhou
                                if webhooks_enviados:
                                    for webhook_enviado in webhooks_enviados:
                                        resultados['webhooks_enviados'].append({
                                            'numero_pedido': pedido.numero_pedido,
                                            'status': novo_status.nome,
                                            'sucesso': webhook_enviado.sucesso,
                                            'url': webhook_enviado.url_destino,
                                            'codigo_http': webhook_enviado.codigo_http
                                        })
                                        
                                        logger.info(
                                            f"Webhook enviado para pedido #{pedido.numero_pedido} para {webhook_enviado.url_destino}: "
                                            f"{'sucesso' if webhook_enviado.sucesso else 'falha'}"
                                        )
                                        
                                        # Se algum webhook falhou, marca a flag
                                        if not webhook_enviado.sucesso:
                                            webhook_falhou = True
                                else:
                                    logger.info(f"Nenhum endpoint de webhook ativo configurado para o pedido #{pedido.numero_pedido}")
                                    
                            except Exception as e:
                                logger.error(f"Erro ao enviar webhooks para pedido #{pedido.numero_pedido}: {str(e)}")
                                webhook_falhou = True
                            
                            # Determinar se deve atualizar o status
                            # - O status é atualizado se não houve falha
                            # - OU se não há endpoints configurados (webhooks_enviados vazio)
                            atualizar_status = not webhook_falhou or len(webhooks_enviados) == 0
                            
                            # Log do resultado do envio de webhooks
                            if len(webhooks_enviados) > 0:
                                logger.info(
                                    f"Webhook para pedido #{pedido.numero_pedido}: "
                                    f"{'Todos enviados com sucesso' if not webhook_falhou else 'Houve falhas no envio'}"
                                )
                            else:
                                logger.info(f"Nenhum endpoint de webhook configurado para o pedido #{pedido.numero_pedido}")
                                
                            # Só atualizar o status se os webhooks foram enviados com sucesso ou se não há endpoints configurados
                            if atualizar_status:
                                # Atualizar status
                                pedido.status = novo_status
                                pedido.save()
                                
                                # Adicionar notificação que o status foi alterado
                                resultados['notificacoes'].append(notificacao)
                                
                                # Log da alteração
                                logger.info(
                                    f"Status do pedido #{pedido.numero_pedido} alterado de "
                                    f"'{status_anterior.nome if status_anterior else 'Sem status'}' para '{novo_status.nome}'"
                                )
                            else:
                                # Log que o status não foi alterado devido a falha no webhook
                                logger.warning(
                                    f"Status do pedido #{pedido.numero_pedido} NÃO foi alterado para '{novo_status.nome}' "
                                    f"devido a falha no envio do webhook"
                                )
                    
                    # Obter informações sobre todos os pedidos do webhook para a resposta
                    pedidos_sucesso = []
                    pedidos_falha_webhook = []
                    
                    for p in webhook.pedidos.all():
                        # Verificar se este pedido teve seu status atualizado com sucesso
                        # (Se foi adicionado na lista de notificações)
                        pedido_atualizado = False
                        for notif in resultados['notificacoes']:
                            if notif['numero_pedido'] == p.numero_pedido:
                                pedido_atualizado = True
                                pedidos_sucesso.append(p.numero_pedido)
                                break
                        
                        # Se não foi atualizado, foi devido a falha no webhook
                        if not pedido_atualizado:
                            pedidos_falha_webhook.append(p.numero_pedido)
                    
                    # Adicionar webhook à lista de sucesso
                    resultados['sucesso'].append({
                        'webhook_id': webhook.id,
                        'pedidos': pedidos_sucesso
                    })
                    
                    # Se algum pedido não teve o status alterado por falha do webhook, registrar
                    if pedidos_falha_webhook:
                        resultados['erro'].append({
                            'webhook_id': webhook.id,
                            'erro': 'Falha no envio do webhook, status não alterado conforme solicitado',
                            'pedidos': pedidos_falha_webhook,
                            'tipo_erro': 'webhook_falha' # Identificador para o front-end diferenciar o tipo de erro
                        })
                            
                except Exception as e:
                    logger.error(f"Erro ao atualizar pedidos do webhook {webhook.id}: {str(e)}")
                    resultados['erro'].append({
                        'webhook_id': webhook.id,
                        'erro': str(e),
                        'tipo_erro': 'erro_geral',
                        'pedidos': [p.numero_pedido for p in webhook.pedidos.all()]
                    })
            
            # Contar pedidos atualizados e não atualizados
            total_sucesso = sum(len(item.get('pedidos', [])) for item in resultados['sucesso'])
            total_erro_webhook = sum(len(item.get('pedidos', [])) for item in resultados['erro'] 
                                 if item.get('tipo_erro') == 'webhook_falha')
            total_erro_outros = sum(len(item.get('pedidos', [])) for item in resultados['erro'] 
                                if item.get('tipo_erro') != 'webhook_falha')
            
            mensagem = f'{total_sucesso} pedidos atualizados com sucesso'
            if total_erro_webhook > 0:
                mensagem += f', {total_erro_webhook} não atualizados devido a falhas no webhook'
            if total_erro_outros > 0:
                mensagem += f', {total_erro_outros} com outros erros'
            
            # Retornar resultados
            return Response({
                'mensagem': mensagem,
                'resultados': resultados
            })
        except Exception as e:
            logger.error(f"Erro ao atualizar status: {str(e)}")
            return Response({'erro': str(e)}, status=500)


class WebhooksEnviadosPorPedidoAPIView(APIView):
    """
    API View para listar todos os webhooks de status enviados para um pedido específico.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request, numero_pedido):
        """
        Lista todos os webhooks de status enviados para um pedido específico.
        
        Args:
            request (Request): O objeto de requisição
            numero_pedido (int): O número do pedido
            
        Returns:
            Response: Lista de webhooks enviados para o pedido
        """
        try:
            pedido = WebhookDBService.buscar_pedido(numero_pedido)
            if not pedido:
                return Response(
                    {'erro': f'Pedido #{numero_pedido} não encontrado'}, 
                    status=status.HTTP_404_NOT_FOUND
                )
                
            webhooks_enviados = WebhookStatusEnviado.objects.filter(pedido=pedido).order_by('-enviado_em')
            serializer = WebhookStatusEnviadoSerializer(webhooks_enviados, many=True)
            
            return Response({
                'numero_pedido': numero_pedido,
                'total_webhooks': webhooks_enviados.count(),
                'webhooks': serializer.data
            })
            
        except Exception as e:
            logger.error(f"Erro ao buscar webhooks enviados para pedido #{numero_pedido}: {str(e)}")
            return Response(
                {'erro': str(e)}, 
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
