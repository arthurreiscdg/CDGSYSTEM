/**
 * modals.js - Gerenciamento de modais
 */

var WebhookApp = WebhookApp || {};

WebhookApp.Modals = (function() {
    'use strict';
    
    // Elementos DOM
    let detailsModal = null;
    let closeModal = null;
    let modalContent = null;
    let pedidoDetails = null;
    
    // Inicializa o módulo
    const init = function() {
        // Obter referências aos elementos DOM
        detailsModal = document.getElementById('detailsModal');
        closeModal = document.getElementById('closeModal');
        modalContent = document.getElementById('modalContent');
        pedidoDetails = document.getElementById('pedidoDetails');
        
        // Inicializar listeners
        initEventListeners();
    };
    
    // Inicializa os event listeners
    const initEventListeners = function() {
        // Event listener para fechar o modal de detalhes
        if (closeModal) {
            closeModal.addEventListener('click', function() {
                hideDetailsModal();
            });
        }
        
        // Fechar modal ao clicar fora dele
        if (detailsModal) {
            detailsModal.addEventListener('click', function(e) {
                if (e.target === detailsModal) {
                    hideDetailsModal();
                }
            });
        }
        
        // Event listeners para botões de ação nas linhas
        const actionButtons = document.querySelectorAll('.row-actions-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const row = this.closest('tr');
                const checkboxId = row.querySelector('.webhook-select').value;
                
                // Abrir modal de detalhes com o ID do webhook
                showDetailsModal(checkboxId);
            });
        });
    };
    
    // Exibe o modal de detalhes
    const showDetailsModal = function(webhookId) {
        if (!detailsModal || !pedidoDetails) return;
        
        // Mostrar o modal
        detailsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevenir rolagem no fundo
        
        // Mostrar spinner de carregamento
        if (modalContent) {
            pedidoDetails.style.display = 'none';
            pedidoDetails.classList.remove('loaded');
            modalContent.querySelector('.spinner-container').style.display = 'flex';
        }
        
        // Buscar dados do webhook
        fetchWebhookDetails(webhookId);
    };
    
    // Esconde o modal de detalhes
    const hideDetailsModal = function() {
        if (!detailsModal) return;
        
        detailsModal.style.display = 'none';
        document.body.style.overflow = ''; // Restaurar rolagem
    };
    
    // Busca detalhes do webhook via AJAX
    const fetchWebhookDetails = function(webhookId) {
        fetch(`/webhooks/api/webhook/${webhookId}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': WebhookApp.Core.getCsrfToken()
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Erro ao buscar detalhes');
            }
            return response.json();
        })
        .then(data => {
            // Ocultar o spinner
            if (modalContent) {
                modalContent.querySelector('.spinner-container').style.display = 'none';
            }
            
            // Exibir os detalhes
            displayWebhookDetails(data);
        })
        .catch(error => {
            console.error('Erro:', error);
            
            // Ocultar o spinner
            if (modalContent) {
                modalContent.querySelector('.spinner-container').style.display = 'none';
            }
            
            // Mostrar mensagem de erro
            if (pedidoDetails) {
                pedidoDetails.innerHTML = '<div class="error-message">Erro ao carregar os detalhes do webhook</div>';
                pedidoDetails.style.display = 'block';
                pedidoDetails.classList.add('loaded');
            }
        });
    };
    
    // Exibe os detalhes do webhook no modal
    const displayWebhookDetails = function(data) {
        console.log('Dados recebidos:', data); // Para depuração
        
        // Obter informações do pedido se existirem
        const pedidoInfo = data.pedido_info || {};
        
        // Construir HTML para os detalhes do pedido
        let detailsHTML = `
            <div class="detail-section">
                <h4>Informações do Webhook</h4>
                <div class="detail-row">
                    <div class="detail-label">ID:</div>
                    <div class="detail-value">${data.id || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Evento:</div>
                    <div class="detail-value">${data.evento || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Recebido em:</div>
                    <div class="detail-value">${data.recebido_em || 'N/A'}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Verificado:</div>
                    <div class="detail-value">${data.verificado ? 'Sim' : 'Não'}</div>
                </div>
            </div>`;
            
        // Adicionar seção de informações do pedido apenas se houver dados
        if (pedidoInfo && Object.keys(pedidoInfo).length > 0) {
            detailsHTML += `
                <div class="detail-section">
                    <h4>Informações do Pedido</h4>
                    <div class="detail-row">
                        <div class="detail-label">ID do Pedido:</div>
                        <div class="detail-value">ORD-${pedidoInfo.numero_pedido || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Cliente:</div>
                        <div class="detail-value">${pedidoInfo.nome_cliente || 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Valor:</div>
                        <div class="detail-value">R$ ${pedidoInfo.valor_pedido ? parseFloat(pedidoInfo.valor_pedido).toFixed(2) : 'N/A'}</div>
                    </div>
                    <div class="detail-row">
                        <div class="detail-label">Status:</div>
                        <div class="detail-value">
                            <span class="status-badge ${pedidoInfo.cor_css || 'status-pending'}">
                                ${pedidoInfo.status || 'Desconhecido'}
                            </span>
                        </div>
                    </div>
                </div>`;
                
            // Adicionar informações de arquivo somente se pdf_path existir
            if (pedidoInfo.pdf_path || pedidoInfo.cod_op) {
                detailsHTML += `
                    <div class="detail-section">
                        <h4>Detalhes do Arquivo</h4>`;
                
                if (pedidoInfo.pdf_path) {
                    detailsHTML += `
                        <div class="detail-row">
                            <div class="detail-label">Caminho do PDF:</div>
                            <div class="detail-value">${pedidoInfo.pdf_path}</div>
                        </div>`;
                }
                
                if (pedidoInfo.cod_op) {
                    detailsHTML += `
                        <div class="detail-row">
                            <div class="detail-label">Código da Operação:</div>
                            <div class="detail-value">${pedidoInfo.cod_op}</div>
                        </div>`;
                }
                
                detailsHTML += `</div>`;
            }
                
            // Adicionar informações de contato se existirem
            if (pedidoInfo.contato && Object.keys(pedidoInfo.contato).length > 0) {
                detailsHTML += `
                    <div class="detail-section">
                        <h4>Informações do Cliente</h4>`;
                
                if (pedidoInfo.contato.nome) {
                    detailsHTML += `
                        <div class="detail-row">
                            <div class="detail-label">Nome:</div>
                            <div class="detail-value">${pedidoInfo.contato.nome}</div>
                        </div>`;
                }
                
                if (pedidoInfo.contato.email) {
                    detailsHTML += `
                        <div class="detail-row">
                            <div class="detail-label">E-mail:</div>
                            <div class="detail-value">${pedidoInfo.contato.email}</div>
                        </div>`;
                }
                
                detailsHTML += `</div>`;
            }
                
            // Adicionar configurações se existirem
            if (pedidoInfo.configuracao && Object.keys(pedidoInfo.configuracao).length > 0) {
                detailsHTML += `
                    <div class="detail-section">
                        <h4>Configurações do Pedido</h4>`;
                
                const config = pedidoInfo.configuracao;
                const configItems = [
                    { label: 'Título', value: config.titulo },
                    { label: 'Data de Entrega', value: config.data_entrega },
                    { label: 'Formato', value: config.formato },
                    { label: 'Cor de Impressão', value: config.cor_impressao },
                    { label: 'Impressão', value: config.impressao },
                    { label: 'Gramatura', value: config.gramatura }
                ];
                
                configItems.forEach(item => {
                    if (item.value) {
                        detailsHTML += `
                            <div class="detail-row">
                                <div class="detail-label">${item.label}:</div>
                                <div class="detail-value">${item.value}</div>
                            </div>`;
                    }
                });
                
                detailsHTML += `</div>`;
            }
        } else {
            detailsHTML += `
                <div class="detail-section">
                    <div class="empty-state">
                        <i class="fas fa-exclamation-circle"></i>
                        <p>Nenhum pedido associado a este webhook</p>
                    </div>
                </div>`;
        }
        
        // Inserir o HTML no contêiner
        if (pedidoDetails) {
            pedidoDetails.innerHTML = detailsHTML;
            pedidoDetails.style.display = 'block';
            pedidoDetails.classList.add('loaded');
        }
    };
    
    // Interface pública
    return {
        init: init,
        showDetailsModal: showDetailsModal,
        hideDetailsModal: hideDetailsModal
    };
})();

/**
 * Carrega e exibe o histórico de webhooks para um pedido
 * @param {number} numeroPedido - Número do pedido
 */
function loadWebhookHistory(numeroPedido) {
    // Mostrar indicador de carregamento
    const loadingToast = WebhookApp.Notifications.showToast('Carregando histórico de webhooks...', 'loading');
    
    fetch(`/webhooks/api/pedidos/${numeroPedido}/webhooks/`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': WebhookApp.Core.getCsrfToken()
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Erro ao carregar histórico de webhooks');
        }
        return response.json();
    })
    .then(data => {
        // Remover o toast de carregamento
        WebhookApp.Notifications.removeToast(loadingToast);
        
        // Mostrar histórico em um modal
        showWebhookHistoryModal(data);
    })
    .catch(error => {
        console.error('Erro:', error);
        
        // Remover o toast de carregamento e mostrar erro
        WebhookApp.Notifications.removeToast(loadingToast);
        WebhookApp.Notifications.showToast('Erro ao carregar histórico de webhooks', 'error', 5000);
    });
}

/**
 * Exibe o histórico de webhooks em um modal
 * @param {Object} data - Dados recebidos da API
 */
function showWebhookHistoryModal(data) {
    // Criar o modal dinamicamente
    const modalOverlay = document.createElement('div');
    modalOverlay.className = 'modal-overlay';
    modalOverlay.id = 'webhookHistoryModal';
    
    const modalHTML = `
        <div class="modal webhook-history-modal">
            <div class="modal-header">
                <h3 class="modal-title">Histórico de Webhooks - Pedido #${data.numero_pedido}</h3>
                <button type="button" class="modal-close" id="closeWebhookHistoryModal">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="webhook-history-stats">
                    <p>Total de webhooks enviados: <strong>${data.total_webhooks}</strong></p>
                </div>
                
                <div class="webhook-history-list">
                    ${data.webhooks.length > 0 ? 
                        data.webhooks.map(webhook => `
                            <div class="webhook-history-item ${webhook.sucesso ? 'success' : 'failure'}">
                                <div class="webhook-history-header">
                                    <span class="webhook-status ${webhook.sucesso ? 'success' : 'failure'}">
                                        <i class="fas fa-${webhook.sucesso ? 'check' : 'times'}-circle"></i>
                                        ${webhook.sucesso ? 'Sucesso' : 'Falha'}
                                    </span>
                                    <span class="webhook-date">
                                        ${new Date(webhook.enviado_em).toLocaleString()}
                                    </span>
                                </div>
                                <div class="webhook-history-content">
                                    <p><strong>Status:</strong> ${webhook.status}</p>
                                    <p><strong>URL:</strong> ${webhook.url_destino}</p>
                                    ${webhook.codigo_http ? `<p><strong>Código HTTP:</strong> ${webhook.codigo_http}</p>` : ''}
                                    <div class="webhook-payload-toggle">
                                        <button class="btn btn-sm btn-outline" onclick="togglePayload(this)">
                                            Ver Payload
                                        </button>
                                        <div class="webhook-payload" style="display: none;">
                                            <pre>${formatJSON(webhook.payload)}</pre>
                                        </div>
                                    </div>
                                    ${webhook.resposta ? `
                                    <div class="webhook-response-toggle">
                                        <button class="btn btn-sm btn-outline" onclick="toggleResponse(this)">
                                            Ver Resposta
                                        </button>
                                        <div class="webhook-response" style="display: none;">
                                            <pre>${webhook.resposta}</pre>
                                        </div>
                                    </div>` : ''}
                                </div>
                            </div>
                        `).join('') : 
                        '<div class="no-webhooks">Nenhum webhook enviado para este pedido.</div>'
                    }
                </div>
            </div>
            <div class="modal-footer">
                <button id="closeWebhookHistoryBtn" class="btn btn-outline">Fechar</button>
            </div>
        </div>
    `;
    
    modalOverlay.innerHTML = modalHTML;
    document.body.appendChild(modalOverlay);
    
    // Adicionar listeners
    document.getElementById('closeWebhookHistoryModal').addEventListener('click', () => {
        closeWebhookHistoryModal();
    });
    
    document.getElementById('closeWebhookHistoryBtn').addEventListener('click', () => {
        closeWebhookHistoryModal();
    });
    
    // Fechar ao clicar fora
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeWebhookHistoryModal();
        }
    });
    
    // Exibir o modal
    modalOverlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevenir rolagem
}

/**
 * Fecha o modal de histórico de webhooks
 */
function closeWebhookHistoryModal() {
    const modal = document.getElementById('webhookHistoryModal');
    if (modal) {
        modal.remove();
        document.body.style.overflow = ''; // Restaurar rolagem
    }
}

/**
 * Formata JSON para melhor visualização
 * @param {string} jsonStr - String JSON para formatar
 * @returns {string} - HTML escapado com formatação preservada
 */
function formatJSON(jsonStr) {
    try {
        const obj = JSON.parse(jsonStr);
        return JSON.stringify(obj, null, 2)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    } catch (e) {
        return jsonStr
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
}

/**
 * Alterna a exibição do payload
 * @param {HTMLElement} button - Botão clicado
 */
function togglePayload(button) {
    const payloadDiv = button.nextElementSibling;
    const isHidden = payloadDiv.style.display === 'none';
    
    payloadDiv.style.display = isHidden ? 'block' : 'none';
    button.textContent = isHidden ? 'Ocultar Payload' : 'Ver Payload';
}

/**
 * Alterna a exibição da resposta
 * @param {HTMLElement} button - Botão clicado
 */
function toggleResponse(button) {
    const responseDiv = button.nextElementSibling;
    const isHidden = responseDiv.style.display === 'none';
    
    responseDiv.style.display = isHidden ? 'block' : 'none';
    button.textContent = isHidden ? 'Ocultar Resposta' : 'Ver Resposta';
}