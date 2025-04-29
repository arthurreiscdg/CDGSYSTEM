"""
Arquivo de compatibilidade para Render.
Este arquivo redireciona para a aplicação WSGI do Django.
"""

import os
from PDFlow.wsgi import application

# Renomear para 'app' para compatibilidade com Render
app = application