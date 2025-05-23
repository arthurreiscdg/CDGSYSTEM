import logging
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags

logger = logging.getLogger('apps.webhooks')

class EmailService:
    """
    Serviço para envio de e-mails relacionados a webhooks.
    """
    
    @staticmethod
    def enviar_notificacao_novo_pedido(pedido, emails_destinatarios):
        """
        Envia uma notificação por e-mail sobre um novo pedido recebido.
        
        Args:
            pedido (Pedido): O objeto Pedido recebido
            emails_destinatarios (list): Lista de endereços de e-mail para receber a notificação
            
        Returns:
            bool: True se o e-mail foi enviado com sucesso, False caso contrário
        """
        try:
            if not emails_destinatarios:
                logger.warning("Nenhum e-mail destinatário configurado para notificação de novos pedidos")
                return False
                
            # Assunto do e-mail
            assunto = f"Novo Pedido #{pedido.numero_pedido} Recebido - {pedido.nome_cliente}"
              # Preparar contexto para o template
            produtos_info = []
            for produto in pedido.produtos.all():
                produto_data = {
                    'nome': produto.nome,
                    'sku': produto.sku,
                    'quantidade': produto.quantidade,
                    'designs': {
                        'capa_frente': produto.designs.capa_frente if produto.designs else None,
                        'capa_verso': produto.designs.capa_verso if produto.designs else None,
                    },
                    'mockups': {
                        'capa_frente': produto.mockups.capa_frente if produto.mockups else None,
                        'capa_costas': produto.mockups.capa_costas if produto.mockups else None,
                    },
                    'arquivo_pdf': produto.arquivo_pdf if produto.arquivo_pdf else None
                }
                produtos_info.append(produto_data)
            
            # Contexto para o template de e-mail
            contexto = {
                'pedido': pedido,
                'produtos': produtos_info,
                'url_admin': f"{settings.SITE_URL}/admin/webhooks/pedido/{pedido.id}/change/"
            }
              # Renderizar template HTML
            try:
                html_content = render_to_string('webhooks/emails/novo_pedido.html', contexto)
                # Versão em texto plano do e-mail
                text_content = strip_tags(html_content)
            except Exception as e:
                logger.error(f"Erro ao renderizar template de e-mail: {str(e)}")
                # Template fallback em texto simples
                produtos_texto = []
                for p in produtos_info:
                    produto_linha = f"- {p['nome']} ({p['sku']}) - Qtd: {p['quantidade']}"
                    if p['designs']['capa_frente']:
                        produto_linha += f"\n  Design Frente: {p['designs']['capa_frente']}"
                    if p['designs']['capa_verso']:
                        produto_linha += f"\n  Design Verso: {p['designs']['capa_verso']}"
                    if p['mockups']['capa_frente']:
                        produto_linha += f"\n  Mockup Frente: {p['mockups']['capa_frente']}"
                    if p['mockups']['capa_costas']:
                        produto_linha += f"\n  Mockup Costas: {p['mockups']['capa_costas']}"
                    if p['arquivo_pdf']:
                        produto_linha += f"\n  Arquivo PDF: {p['arquivo_pdf']}"
                    produtos_texto.append(produto_linha)
                
                etiqueta_info = f"\nEtiqueta de Envio: {pedido.etiqueta_envio}" if pedido.etiqueta_envio else ""
                
                text_content = f"""
                Novo pedido recebido:
                
                Número do pedido: {pedido.numero_pedido}
                Cliente: {pedido.nome_cliente}
                Valor: R$ {pedido.valor_pedido}
                Data: {pedido.criado_em.strftime('%d/%m/%Y %H:%M:%S')}{etiqueta_info}
                
                Produtos:
{chr(10).join(produtos_texto)}
                
                Acesse o sistema para mais detalhes.
                """
                html_content = None
            
            # Enviar e-mail
            from_email = settings.DEFAULT_FROM_EMAIL
            
            # Se o template HTML foi renderizado com sucesso, usar EmailMultiAlternatives
            if html_content:
                msg = EmailMultiAlternatives(
                    subject=assunto,
                    body=text_content,
                    from_email=from_email,
                    to=emails_destinatarios
                )
                msg.attach_alternative(html_content, "text/html")
                msg.send()
            else:
                # Caso contrário, enviar apenas texto plano
                send_mail(
                    subject=assunto,
                    message=text_content,
                    from_email=from_email,
                    recipient_list=emails_destinatarios
                )
                
            logger.info(f"E-mail de notificação enviado para {len(emails_destinatarios)} destinatários sobre o pedido #{pedido.numero_pedido}")
            return True
            
        except Exception as e:
            logger.error(f"Erro ao enviar e-mail de notificação sobre novo pedido: {str(e)}")
            return False
