from django.urls import path
from apps.formularios.views import view_zeroHum
from apps.formularios.views import view_formularios
from . import views

urlpatterns = [
    path('', view_formularios.formularios, name='formularios'),
    path('formZeroHum/', view_zeroHum.formZeroHum, name='formZeroHum'),
    path('formZeroHumEx/', view_zeroHum.formZeroHumEx, name='formZeroHumEx'),
]
