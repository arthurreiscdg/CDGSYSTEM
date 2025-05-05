/**
 * core.js - Inicialização e funcionalidades básicas
 */

// Namespace global para evitar conflitos
var WebhookApp = WebhookApp || {};

WebhookApp.Core = (function() {
    'use strict';

    // Variáveis privadas
    let initialized = false;
    
    // Inicializa a aplicação
    const init = function() {
        if (initialized) return;
        
        // Inicializar todos os módulos
        WebhookApp.Selection.init();
        WebhookApp.Modals.init();
        WebhookApp.Status.init();
        WebhookApp.Filters.init();
        WebhookApp.Notifications.init();
        
        // Inicializar listeners para ações em linha (três pontinhos)
        initRowActions();
        
        initialized = true;
        console.log('WebhookApp: Inicializado com sucesso');
    };
    
    // Inicializa as ações em linha para cada registro
    const initRowActions = function() {
        document.querySelectorAll('.row-actions-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                
                // Remover qualquer menu de ações aberto
                document.querySelectorAll('.row-actions-menu').forEach(menu => {
                    menu.remove();
                });
                
                const row = this.closest('tr');
                const webhookId = row.querySelector('.webhook-select').value;
                
                // Criar menu de ações contextual
                const actionsMenu = document.createElement('div');
                actionsMenu.className = 'row-actions-menu';
                actionsMenu.innerHTML = `
                    <div class="action-item view-details" data-id="${webhookId}">
                        <i class="fas fa-eye"></i> Ver detalhes
                    </div>
                    <div class="action-item download-pdf" data-id="${webhookId}">
                        <i class="fas fa-file-pdf"></i> Baixar PDF
                    </div>
                    <div class="action-item change-status" data-id="${webhookId}">
                        <i class="fas fa-exchange-alt"></i> Alterar status
                    </div>
                `;
                
                // Posicionar o menu próximo ao botão
                const rect = this.getBoundingClientRect();
                actionsMenu.style.position = 'absolute';
                actionsMenu.style.top = `${rect.bottom + 5}px`;
                actionsMenu.style.right = `${window.innerWidth - rect.right + 5}px`;
                actionsMenu.style.zIndex = '999';
                document.body.appendChild(actionsMenu);
                
                // Adicionar listeners para as ações do menu
                actionsMenu.querySelector('.view-details').addEventListener('click', () => {
                    WebhookApp.Modals.openDetailsModal(webhookId);
                    actionsMenu.remove();
                });
                
                actionsMenu.querySelector('.download-pdf').addEventListener('click', () => {
                    WebhookApp.Notifications.showToast('Preparando download do PDF...', 'loading');
                    actionsMenu.remove();
                    // Implementar download real aqui
                });
                
                actionsMenu.querySelector('.change-status').addEventListener('click', () => {
                    WebhookApp.Status.openStatusModal([webhookId]);
                    actionsMenu.remove();
                });
                
                // Fechar o menu ao clicar fora
                document.addEventListener('click', function closeMenu(e) {
                    if (!actionsMenu.contains(e.target) && e.target !== btn) {
                        actionsMenu.remove();
                        document.removeEventListener('click', closeMenu);
                    }
                });
            });
        });
        
        // Adicionar estilos CSS para o menu de ações de linha
        addActionMenuStyles();
    };
    
    // Adiciona estilos para o menu de ações
    const addActionMenuStyles = function() {
        const style = document.createElement('style');
        style.textContent = `
            .row-actions-menu {
                background-color: var(--dark-bg-secondary);
                border: 1px solid var(--dark-border);
                border-radius: 4px;
                box-shadow: var(--dark-shadow);
                overflow: hidden;
                min-width: 180px;
            }
            
            .action-item {
                padding: 10px 15px;
                color: var(--dark-text-secondary);
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .action-item:hover {
                background-color: var(--dark-bg-tertiary);
                color: var(--dark-text-primary);
            }
            
            .action-item i {
                width: 16px;
                text-align: center;
            }
        `;
        document.head.appendChild(style);
    };
    
    // Função para obter o token CSRF
    const getCsrfToken = function() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue;
    };
    
    // Interface pública
    return {
        init: init,
        getCsrfToken: getCsrfToken
    };
})();