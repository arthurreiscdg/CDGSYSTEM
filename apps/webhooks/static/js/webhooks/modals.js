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