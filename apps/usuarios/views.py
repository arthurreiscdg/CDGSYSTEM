from django.http import HttpResponse
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect
from .models import Usuario
from django.contrib.auth.views import LoginView
from django.urls import reverse

class CustomLoginView(LoginView):
    template_name = 'usuarios/login.html'
    
    def get_success_url(self):
        # Redirecionar com base no tipo de usuário
        usuario = self.request.user
        return reverse(usuario.get_redirect_url())

def perfil(request):
    return HttpResponse("Perfil do usuário.")

@login_required
def exibir_formulario(request):
    usuario = request.user
    if usuario.is_admin_form():
        # Administrador vê todos os formulários
        formularios = usuario.get_allowed_forms()
        return render(request, 'usuarios/formularios.html', {'formularios': formularios})
    else:
        # Usuário comum é redirecionado para seu formulário específico
        return redirect(reverse(usuario.get_redirect_url()))
