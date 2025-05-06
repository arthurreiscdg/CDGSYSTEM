from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.shortcuts import redirect
from django.views.generic import RedirectView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('formularios/', include('apps.formularios.urls')),
    path('usuarios/', include('apps.usuarios.urls')),
    path('webhooks/', include('apps.webhooks.urls')),
    path('home/', include('apps.principal.urls')),
    # Redirecionar a página raiz para a página de login
    path('', RedirectView.as_view(url='/usuarios/login/', permanent=False)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
