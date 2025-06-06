# Generated by Django 5.2 on 2025-05-08 14:59

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('webhooks', '0008_alter_pedido_status'),
    ]

    operations = [
        migrations.CreateModel(
            name='StatusPedido',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('nome', models.CharField(max_length=50, unique=True)),
                ('descricao', models.TextField(blank=True, null=True)),
                ('cor_css', models.CharField(blank=True, max_length=50, null=True)),
                ('ordem', models.IntegerField(default=0)),
                ('ativo', models.BooleanField(default=True)),
            ],
            options={
                'verbose_name': 'Status de Pedido',
                'verbose_name_plural': 'Status de Pedidos',
                'ordering': ['ordem'],
            },
        ),
        migrations.AlterField(
            model_name='pedido',
            name='status',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='pedidos', to='webhooks.statuspedido'),
        ),
    ]
