# Generated by Django 4.2.5 on 2025-04-22 14:13

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('webhooks', '0002_design_enderecoenvio_informacoesadicionais_mockup_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='produto',
            name='arquivo_pdf',
        ),
    ]
