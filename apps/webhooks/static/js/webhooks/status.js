/**
 * status.js - Gerenciamento de status dos webhooks
 */

var WebhookApp = WebhookApp || {};

WebhookApp.Status = (function() {
    'use strict';
    
    // Elementos DOM
    let statusModal = null;
    let closeStatusModal = null;
    let selectedOrdersCount = null;
    let statusOptions = [];
    let applyStatusBtn = null;
    let cancelStatusBtn = null;
    
    // Variáveis para armazenar o estado
    let selectedOrderIds = [];
    let selectedStatus = null;
    
    // Inicializa o módulo
    const init = function() {
        // Obter referências aos elementos DOM
        statusModal = document.getElementById('statusModal');
        closeStatusModal = document.getElementById('closeStatusModal');
        selectedOrdersCount = document.getElementById('selectedOrdersCount');
        statusOptions = document.querySelectorAll('.status-option');
        applyStatusBtn = document.getElementById('applyStatusBtn');
        cancelStatusBtn = document.getElementById('cancelStatusBtn');
        
        // Inicializar listeners
        initEventListeners();
    };
    
    // Inicializa os event listeners
    const initEventListeners = function() {
        // Event listeners para opções de status
        statusOptions.forEach(option => {
            option.addEventListener('click', function() {
                // Remover a classe 'selected' de todas as opções
                statusOptions.forEach(opt => {
                    opt.classList.remove('selected');
                });
                
                // Adicionar a classe 'selected' à opção clicada
                this.classList.add('selected');
                
                // Armazenar o status selecionado
                selectedStatus = this.getAttribute('data-status');
                
                // Habilitar o botão de aplicar
                if (applyStatusBtn) {
                    applyStatusBtn.disabled = false;
                    applyStatusBtn.classList.remove('btn-disabled');
                }
            });
        });
        
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
            // Atualizar a interface com os novos status
            updateStatusInUI(orderIds, newStatus);
            
            // Remover o toast de carregamento e mostrar sucesso
            WebhookApp.Notifications.removeToast(loadingToast);
            WebhookApp.Notifications.showToast(`Status atualizado com sucesso`, 'success', 3000);
        })
        .catch(error => {
            console.error('Erro:', error);
            
            // Remover o toast de carregamento e mostrar erro
            WebhookApp.Notifications.removeToast(loadingToast);
            WebhookApp.Notifications.showToast('Erro ao atualizar status', 'error', 5000);
        });
    };
    
    // Atualiza o status na interface
    const updateStatusInUI = function(orderIds, newStatus) {
        orderIds.forEach(id => {
            const checkbox = document.querySelector(`.webhook-select[value="${id}"]`);
            if (checkbox) {
                const row = checkbox.closest('tr');
                const statusCell = row.querySelector('td:nth-child(6)'); // Ajustado para a 6ª coluna
                
                if (statusCell) {
                    // Remover as classes de status existentes
                    const statusSpan = statusCell.querySelector('.status-badge');
                    statusSpan.classList.remove(
                        'status-neworder', 
                        'status-production',
                        'status-preparing',
                        'status-readyforpickup',
                        'status-waitingforpickup',
                        'status-shipped',
                        'status-intransit',
                        'status-delivered',
                        'status-returnerror',
                        'status-cancelled'
                    );
                    
                    // Adicionar a nova classe de status
                    let statusClass = '';
                    let statusText = '';
                    
                    switch (newStatus) {
                        case 'Novo Pedido':
                            statusClass = 'status-neworder';
                            statusText = 'Novo Pedido';
                            break;
                        case 'Enviado para Produção':
                            statusClass = 'status-production';
                            statusText = 'Enviado para Produção';
                            break;
                        case 'Preparando Envio':
                            statusClass = 'status-preparing';
                            statusText = 'Preparando Envio';
                            break;
                        case 'Pronto para Retirada':
                            statusClass = 'status-readyforpickup';
                            statusText = 'Pronto para Retirada';
                            break;
                        case 'Aguardando Retirada da Transportadora':
                            statusClass = 'status-waitingforpickup';
                            statusText = 'Aguardando Retirada da Transportadora';
                            break;
                        case 'Enviado':
                            statusClass = 'status-shipped';
                            statusText = 'Enviado';
                            break;
                        case 'Em Trânsito':
                            statusClass = 'status-intransit';
                            statusText = 'Em Trânsito';
                            break;
                        case 'Entregue':
                            statusClass = 'status-delivered';
                            statusText = 'Entregue';
                            break;
                        case 'Retornando - Erro na Entrega':
                            statusClass = 'status-returnerror';
                            statusText = 'Retornando - Erro na Entrega';
                            break;
                        case 'Cancelado':
                            statusClass = 'status-cancelled';
                            statusText = 'Cancelado';
                            break;
                    }
                    
                    statusSpan.classList.add(statusClass);
                    statusSpan.textContent = statusText;
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