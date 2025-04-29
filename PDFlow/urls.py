from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('formularios/', include('apps.formularios.urls')),
    path('usuarios/', include('apps.usuarios.urls')),
    path('webhooks/', include('apps.webhooks.urls')),
    path('', include('apps.principal.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
