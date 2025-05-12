/**
 * status-dinamico.js - Gerenciamento dinâmico de status dos webhooks
 * Esta versão carrega os status a partir da API
 */

var WebhookApp = WebhookApp || {};

WebhookApp.StatusDinamico = (function() {
    'use strict';
    
    // Elementos DOM
    let statusModal = null;
    let closeStatusModal = null;
    let selectedOrdersCount = null;
    let statusOptionsContainer = null;
    let applyStatusBtn = null;
    let cancelStatusBtn = null;
    
    // Variáveis para armazenar o estado
    let selectedOrderIds = [];
    let selectedStatus = null;
    let allStatus = [];
    
    // Inicializa o módulo
    const init = function() {
        // Obter referências aos elementos DOM
        statusModal = document.getElementById('statusModal');
        closeStatusModal = document.getElementById('closeStatusModal');
        selectedOrdersCount = document.getElementById('selectedOrdersCount');
        statusOptionsContainer = document.querySelector('.status-options');
        applyStatusBtn = document.getElementById('applyStatusBtn');
        cancelStatusBtn = document.getElementById('cancelStatusBtn');
        
        // Inicializar listeners
        initEventListeners();
        
        // Carregar status disponíveis
        loadAvailableStatus();
    };
    
    // Carrega os status disponíveis no sistema
    const loadAvailableStatus = function() {
        fetch('/webhooks/api/status-pedido/', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': WebhookApp.Core.getCsrfToken()
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao carregar status');
            }
            return response.json();
        })
        .then(data => {
            // Salvar todos os status
            allStatus = data;
            console.log("Status carregados:", allStatus);
        })
        .catch(error => {
            console.error('Erro ao carregar status:', error);
            WebhookApp.Notifications.showToast('Erro ao carregar status', 'error', 5000);
        });
    };
    
    // Inicializa os event listeners
    const initEventListeners = function() {
        // Event listener delegado para as opções de status (que podem ser carregadas dinamicamente)
        if (statusOptionsContainer) {
            statusOptionsContainer.addEventListener('click', function(e) {
                const option = e.target.closest('.status-option');
                if (!option) return;
                
                // Remover a classe 'selected' de todas as opções
                const allOptions = statusOptionsContainer.querySelectorAll('.status-option');
                allOptions.forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Adicionar a classe 'selected' à opção clicada
                option.classList.add('selected');
                
                // Armazenar o status selecionado
                selectedStatus = option.getAttribute('data-status');
                
                // Habilitar o botão de aplicar
                if (applyStatusBtn) {
                    applyStatusBtn.disabled = false;
                    applyStatusBtn.classList.remove('btn-disabled');
                }
            });
        }
        
        // Event listener para o botão "Aplicar Status"
        if (applyStatusBtn) {
            applyStatusBtn.addEventListener('click', function() {
                if (selectedStatus) {
                    // Atualizar o status dos pedidos
                    updateOrderStatus(selectedOrderIds, selectedStatus);
                    
                    // Fechar o modal
                    closeStatusModalFunc();
                }
            });
        }
        
        // Event listeners para fechar o modal de status
        if (closeStatusModal) {
            closeStatusModal.addEventListener('click', closeStatusModalFunc);
        }
        
        if (cancelStatusBtn) {
            cancelStatusBtn.addEventListener('click', closeStatusModalFunc);
        }
        
        // Fechar modal ao clicar fora dele
        if (statusModal) {
            statusModal.addEventListener('click', function(e) {
                if (e.target === statusModal) {
                    closeStatusModalFunc();
                }
            });
        }
    };
    
    // Abre o modal de alteração de status
    const openStatusModal = function(orderIds) {
        if (!statusModal) return;
        
        // Armazenar os IDs selecionados
        selectedOrderIds = orderIds;
        
        // Atualizar o texto com a quantidade de pedidos selecionados
        if (selectedOrdersCount) {
            selectedOrdersCount.textContent = orderIds.length;
        }
        
        // Resetar a seleção de status
        selectedStatus = null;
        
        // Resetar seleção visual
        const statusOptions = statusOptionsContainer.querySelectorAll('.status-option');
        statusOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        // Desabilitar o botão de aplicar até que um status seja selecionado
        if (applyStatusBtn) {
            applyStatusBtn.disabled = true;
            applyStatusBtn.classList.add('btn-disabled');
        }
        
        // Mostrar o modal
        if (statusModal) {
            statusModal.style.display = 'flex';
            document.body.style.overflow = 'hidden'; // Prevenir rolagem no fundo
        }
    };
    
    // Fecha o modal de status
    const closeStatusModalFunc = function() {
        if (!statusModal) return;
        
        statusModal.style.display = 'none';
        document.body.style.overflow = ''; // Restaurar rolagem
    };
    
    // Atualiza o status dos pedidos via AJAX
    const updateOrderStatus = function(orderIds, newStatus) {
        // Mostrar um indicador de carregamento
        const loadingToast = WebhookApp.Notifications.showToast('Atualizando status dos pedidos...', 'loading');
        
        // Fazer a chamada AJAX para atualizar os status
        fetch('/webhooks/api/update-status/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': WebhookApp.Core.getCsrfToken()
            },
            body: JSON.stringify({
                webhook_ids: orderIds,
                status: newStatus
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao atualizar status');
            }
            return response.json();
        })
        .then(data => {
            // Buscar o registro de status selecionado
            const statusObj = allStatus.find(status => status.nome === newStatus);
            
            // Atualizar a interface com os novos status
            updateStatusInUI(orderIds, newStatus, statusObj ? statusObj.cor_css : '');
              // Remover o toast de carregamento e mostrar sucesso
            WebhookApp.Notifications.removeToast(loadingToast);
            WebhookApp.Notifications.showToast(`Status atualizado com sucesso: ${data.mensagem}`, 'success', 3000);

            // Processar notificações de alteração de status
            if (data.resultados && data.resultados.notificacoes && data.resultados.notificacoes.length > 0) {
                processStatusChangeNotifications(data.resultados.notificacoes);
            }
            
            // Processar informações sobre webhooks enviados
            if (data.resultados && data.resultados.webhooks_enviados && data.resultados.webhooks_enviados.length > 0) {
                processWebhooksEnviados(data.resultados.webhooks_enviados);
            }
            
            // Atualizar a página após um pequeno delay para garantir que o usuário veja a mensagem de sucesso
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        })
        .catch(error => {
            console.error('Erro:', error);
            
            // Remover o toast de carregamento e mostrar erro
            WebhookApp.Notifications.removeToast(loadingToast);
            WebhookApp.Notifications.showToast('Erro ao atualizar status', 'error', 5000);
        });
    };
    
    // Processa e exibe notificações de alteração de status
    const processStatusChangeNotifications = function(notifications) {
        notifications.forEach(notif => {
            const message = `
                <div class="status-notification">
                    <div class="notification-header">Alteração de Status</div>
                    <div class="notification-content">
                        <p><strong>Pedido:</strong> #${notif.numero_pedido}</p>
                        <p><strong>Data:</strong> ${notif.data}</p>
                        <p><strong>Status Anterior:</strong> ${notif.status_anterior}</p>
                        <p><strong>Novo Status:</strong> ${notif.status}</p>
                        <p><strong>ID do Status:</strong> ${notif.status_id}</p>
                        <p><strong>ID do Pedido:</strong> ${notif.id}</p>
                    </div>
                </div>
            `;
            
            // Mostrar notificação detalhada como um alerta
            WebhookApp.Notifications.showAlert(message, 'info', 10000);
            
            // Enviar a notificação para sistemas externos (opcional)
            sendStatusNotificationToExternalSystems(notif);
        });
    };
    
    // Envia notificação de alteração de status para sistemas externos
    const sendStatusNotificationToExternalSystems = function(notification) {
        // Implementação futura: aqui você pode adicionar código para enviar a notificação
        // para sistemas externos, webhooks, APIs, etc.
        console.log('Notificação de alteração de status para sistemas externos:', notification);
        
        // Exemplo: Armazenar no localStorage para persistência entre sessões
        try {
            const storedNotifications = JSON.parse(localStorage.getItem('statusNotifications') || '[]');
            storedNotifications.push(notification);
            localStorage.setItem('statusNotifications', JSON.stringify(storedNotifications));
        } catch (e) {
            console.error('Erro ao armazenar notificação:', e);
        }
    };
    
    // Processa informações sobre webhooks enviados para sistemas externos
    const processWebhooksEnviados = function(webhooksInfo) {
        webhooksInfo.forEach(webhook => {
            const statusIcon = webhook.sucesso ? 
                '<i class="fas fa-check-circle" style="color: #28a745;"></i>' : 
                '<i class="fas fa-times-circle" style="color: #dc3545;"></i>';
                
            const message = `
                <div class="webhook-notification">
                    <div class="notification-header">
                        ${statusIcon} Webhook Enviado
                    </div>
                    <div class="notification-content">
                        <p><strong>Pedido:</strong> #${webhook.numero_pedido}</p>
                        <p><strong>Status:</strong> ${webhook.status}</p>
                        <p><strong>Destino:</strong> ${webhook.url}</p>
                        <p><strong>Resultado:</strong> ${webhook.sucesso ? 'Sucesso' : 'Falha'} ${webhook.codigo_http ? `(HTTP ${webhook.codigo_http})` : ''}</p>
                        <button class="btn btn-sm btn-outline view-history-btn" onclick="loadWebhookHistory(${webhook.numero_pedido})">
                            Ver Histórico Completo
                        </button>
                    </div>
                </div>
            `;
            
            // Mostrar notificação detalhada como um alerta
            WebhookApp.Notifications.showAlert(message, webhook.sucesso ? 'success' : 'warning', 15000);
            
            // Registrar no console para debugging
            console.log('Webhook enviado:', webhook);
        });
    };
    
    // Atualiza o status na interface
    const updateStatusInUI = function(orderIds, newStatus, cssClass) {
        orderIds.forEach(id => {
            const checkbox = document.querySelector(`.webhook-select[value="${id}"]`);
            if (checkbox) {
                const row = checkbox.closest('tr');
                const statusCell = row.querySelector('td:nth-child(6)'); // Ajustado para a 6ª coluna
                
                if (statusCell) {
                    // Obter o elemento de status
                    const statusSpan = statusCell.querySelector('.status-badge');
                    
                    // Remover todas as classes que começam com 'status-'
                    const classList = Array.from(statusSpan.classList);
                    classList.forEach(cls => {
                        if (cls.startsWith('status-')) {
                            statusSpan.classList.remove(cls);
                        }
                    });
                    
                    // Adicionar a nova classe de status
                    if (cssClass) {
                        statusSpan.classList.add(cssClass);
                    }
                    
                    // Atualizar o texto do status
                    statusSpan.textContent = newStatus;
                    
                    // Atualizar o atributo data-status se existir
                    if (statusSpan.hasAttribute('data-status')) {
                        statusSpan.setAttribute('data-status', newStatus);
                    }
                }
            }
        });
    };
    
    // Interface pública
    return {
        init: init,
        openStatusModal: openStatusModal,
        updateStatusInUI: updateStatusInUI
    };
})();

// Inicializar o módulo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    WebhookApp.StatusDinamico.init();
});
