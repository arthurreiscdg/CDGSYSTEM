# Generated by Django 5.2 on 2025-05-12 12:17

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('webhooks', '0009_statuspedido_alter_pedido_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='WebhookEndpointConfig',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(help_text='Nome para identificar este endpoint', max_length=100)),
                ('url', models.URLField(help_text='URL para onde os webhooks serão enviados')),
                ('ativo', models.BooleanField(default=True, help_text='Se desativado, webhooks não serão enviados para este endpoint')),
                ('auto_enviar', models.BooleanField(default=True, help_text='Se ativado, webhooks serão enviados automaticamente')),
                ('token_autenticacao', models.CharField(blank=True, help_text='Token de autenticação opcional para incluir nos cabeçalhos de requisição', max_length=255, null=True)),
                ('headers_adicionais', models.TextField(blank=True, help_text="Cabeçalhos adicionais em formato JSON (por exemplo: {'X-Custom': 'Value'})", null=True)),
                ('criado_em', models.DateTimeField(auto_now_add=True)),
                ('atualizado_em', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Configuração de Endpoint de Webhook',
                'verbose_name_plural': 'Configurações de Endpoints de Webhook',
                'ordering': ['nome'],
            },
        ),
    ]
