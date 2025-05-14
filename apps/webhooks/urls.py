from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views as views

app_name = 'webhooks'

# Configurar router para API REST
router = DefaultRouter()
router.register(r'webhooks', views.WebhookViewSet, basename='webhook')
router.register(r'pedidos', views.PedidoViewSet, basename='pedido')
router.register(r'status-enviados', views.WebhookStatusEnviadoViewSet, basename='status-enviado')

urlpatterns = [
    # Endpoint de recebimento de webhook
    path('pedido/', views.WebhookReceiverView.as_view(), name='receber_webhook'),
    
    # Página de listagem de webhooks
    path('list/', views.WebhookListView.as_view(), name='webhook_list'),
    
    # API REST
    path('api/', include(router.urls)),
    path('api/pedidos/<int:numero_pedido>/', views.PedidoBuscaAPIView.as_view(), name='buscar_pedido'),
    path('api/pedidos/<int:numero_pedido>/webhooks/', views.WebhooksEnviadosPorPedidoAPIView.as_view(), name='webhooks_enviados_pedido'),
    path('api/enviar-status/', views.WebhookStatusEnviarAPIView.as_view(), name='enviar_status'),
    path('api/webhook/<int:webhook_id>/', views.WebhookDetailAPIView.as_view(), name='webhook_detail_api'),
    path('api/update-status/', views.UpdateStatusAPIView.as_view(), name='update_status'),
    path('api/status-pedido/', views.StatusPedidoListAPIView.as_view(), name='status_pedido_list'),
]
