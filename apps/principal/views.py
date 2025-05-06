# apps/home/views.py
from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages

@login_required
def home(request):
    if not request.user.is_staff:
        messages.error(request, "Você não tem permissão para acessar esta página. Apenas membros da equipe podem acessar.")
        return redirect('login')  # Redirecionando para a página de login
    
    return render(request, 'home.html')
