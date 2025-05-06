import hmac
import hashlib
import json
import logging
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

from rest_framework import viewsets, status
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .services.db_service import WebhookDBService
from .serializers import (
    WebhookSerializer,
    WebhookListSerializer,
    PedidoSerializer,
    WebhookStatusEnviadoSerializer,
    WebhookStatusEnviadoCreateSerializer,
    WebhookDetailSerializer,
)
from .models import (
    WebhookConfig, Webhook, Pedido, EnderecoEnvio, 
    InformacoesAdicionais, Produto, Design, Mockup,
    WebhookStatusEnviado
)

# Configuração de logging
logger = logging.getLogger('apps.webhooks')

@login_required
def webhook_list(request):
    """
    View para renderizar a página de listagem de webhooks.
    
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
        queryset = queryset.filter(pedidos__status=status_filter)
    
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
    
    # Contexto para o template
    context = {
        'webhooks': webhooks,
        'total_webhooks': total_webhooks,
        'total_pedidos': total_pedidos,
        'status_filter': status_filter,
        'search_query': search_query,
    }
    
    # Renderizar o template com o contexto
    return render(request, 'webhooks/list.html', context)


def validar_assinatura(payload, assinatura_recebida):
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


def validar_campos_obrigatorios(dados):
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


@csrf_exempt
@require_POST
def receber(request):
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
            if not validar_assinatura(body_text, assinatura):
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
            validar_campos_obrigatorios(dados)

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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def buscar_pedido(request, numero_pedido):
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


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enviar_webhook_status(request):
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def webhook_detail_api(request, webhook_id):
    """
    API para obter detalhes de um webhook específico.
    Usado para carregar informações detalhadas no modal.
    """
    try:
        webhook = Webhook.objects.get(pk=webhook_id)
        serializer = WebhookDetailSerializer(webhook)
        return Response(serializer.data)
    except Webhook.DoesNotExist:
        return Response({'error': 'Webhook não encontrado'}, status=404)
    except Exception as e:
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_status(request):
    """
    API para atualizar o status de múltiplos pedidos de uma vez.
    Recebe uma lista de IDs de webhooks e um novo status.
    """
    try:
        # Validar dados de entrada
        webhook_ids = request.data.get('webhook_ids', [])
        new_status = request.data.get('status')
        
        if not webhook_ids or not new_status:
            return Response(
                {'error': 'É necessário fornecer IDs de webhooks e um novo status'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Validar o status
        valid_statuses = ['Processing', 'Pending', 'Completed', 'Cancelled']
        if new_status not in valid_statuses:
            return Response(
                {'error': f'Status inválido. Deve ser um dos seguintes: {", ".join(valid_statuses)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Buscar webhooks e seus pedidos associados
        webhooks = Webhook.objects.filter(id__in=webhook_ids)
        pedidos_atualizados = 0
        
        # Atualizar o status de cada pedido associado aos webhooks
        for webhook in webhooks:
            pedidos = webhook.pedidos.all()
            for pedido in pedidos:
                pedido.status = new_status
                pedido.save()
                pedidos_atualizados += 1
        
        logger.info(f"Status de {pedidos_atualizados} pedidos atualizado para '{new_status}'")
        
        return Response({
            'message': f'Status atualizado com sucesso para {pedidos_atualizados} pedidos',
            'pedidos_atualizados': pedidos_atualizados
        })
        
    except Exception as e:
        logger.error(f"Erro ao atualizar status dos pedidos: {str(e)}")
        return Response(
            {'error': f'Erro ao atualizar status: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
