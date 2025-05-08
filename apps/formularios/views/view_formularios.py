from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.http import HttpResponseForbidden

@login_required
def formularios(request):
    # Se o usuário não for administrador, redirecionar para o formulário específico
    user = request.user
    if not user.is_admin_form():
        return redirect(user.get_redirect_url())
    
    return render(request, 'formularios/formularios.html')