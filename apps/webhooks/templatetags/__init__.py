from django import template
from urllib.parse import urlencode

register = template.Library()

@register.simple_tag(takes_context=True)
def url_replace(context, **kwargs):
    """
    Template tag para construir URLs preservando parâmetros existentes
    Uso: {% url_replace page=2 %}
    """
    request = context['request']
    query = request.GET.copy()
    
    for key, value in kwargs.items():
        query[key] = value
    
    return '?' + query.urlencode()
