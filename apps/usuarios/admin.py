from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import Usuario

@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'data_nascimento')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    list_filter = ('is_staff', 'is_active', 'date_joined', 'tipo_formulario')
    
    # Adicionando configuração para o campo personalizado
    fieldsets = UserAdmin.fieldsets + (
        ('Informações Adicionais', {'fields': ('data_nascimento', 'tipo_formulario')}),
    )
    
    # Se você estiver usando add_fieldsets para o formulário de adição
    add_fieldsets = UserAdmin.add_fieldsets + (
        ('Informações Adicionais', {
            'classes': ('wide',),
            'fields': ('data_nascimento', 'tipo_formulario'),
        }),
    )
