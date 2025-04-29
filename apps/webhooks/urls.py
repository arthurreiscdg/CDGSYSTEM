from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

app_name = 'webhooks'

# Configurar router para API REST
router = DefaultRouter()
router.register(r'webhooks', views.WebhookViewSet, basename='webhook')
router.register(r'pedidos', views.PedidoViewSet, basename='pedido')
router.register(r'status-enviados', views.WebhookStatusEnviadoViewSet, basename='status-enviado')

urlpatterns = [
    # Endpoint de recebimento de webhook
    path('pedido/', views.receber, name='receber_webhook'),
    
    # Página de listagem de webhooks
    path('list/', views.webhook_list, name='webhook_list'),
    
    # API REST
    path('api/', include(router.urls)),
    path('api/pedidos/<int:numero_pedido>/', views.buscar_pedido, name='buscar_pedido'),
    path('api/enviar-status/', views.enviar_webhook_status, name='enviar_status'),
]
