from django.db import models
from django.contrib.auth.models import AbstractUser

class Usuario(AbstractUser):
    TIPO_FORMULARIO_CHOICES = [
        ('admin', 'Administrador'),
        ('zerohum', 'ZeroHum'),
        ('elite', 'Elite'),
        ('coleguium', 'Coleguium'),
        ('pensi', 'Pensi'),
    ]
    
    data_nascimento = models.DateField(null=True, blank=True)
    tipo_formulario = models.CharField(
        max_length=10,
        choices=TIPO_FORMULARIO_CHOICES,
        default='zerohum',
        verbose_name='Tipo de Formulário',
        help_text='Define o tipo de formulário que o usuário tem acesso'
    )
    
    def is_admin_form(self):
        """Verifica se o usuário é um administrador de formulários"""
        return self.tipo_formulario == 'admin' or self.is_superuser
        
    def get_allowed_forms(self):
        """Retorna os formulários permitidos para este usuário"""
        if self.is_admin_form():
            return ['zerohum', 'elite', 'coleguium', 'pensi']
        return [self.tipo_formulario]
        
    def get_redirect_url(self):
        """Retorna a URL para redirecionamento pós-login com base no tipo de usuário"""
        if self.is_admin_form():
            return 'formularios'
        
        # Mapeamento do tipo de formulário para a URL correspondente
        form_urls = {
            'zerohum': 'formZeroHum',
            'elite': 'formularios',  # Ajustar quando existir
            'coleguium': 'formularios',  # Ajustar quando existir
            'pensi': 'formularios',  # Ajustar quando existir
        }
        
        return form_urls.get(self.tipo_formulario, 'formularios')
