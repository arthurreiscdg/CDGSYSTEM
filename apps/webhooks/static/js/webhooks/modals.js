/**
 * modals.js - Gerenciamento de modais
 */

var WebhookApp = WebhookApp || {};

WebhookApp.Modals = (function() {
    'use strict';
    
    // Elementos DOM
    let detailsModal = null;
    let closeModal = null;
    let pedidoDetails = null;
    
    // Inicializa o módulo
    const init = function() {
        // Obter referências aos elementos DOM
        detailsModal = document.getElementById('detailsModal');
        closeModal = document.getElementById('closeModal');
        pedidoDetails = document.getElementById('pedidoDetails');
        
        // Inicializar listeners
        initEventListeners();
    };
    
    // Inicializa os event listeners
    const initEventListeners = function() {
        // Adicionar listeners aos botões de detalhes
        document.querySelectorAll('.view-details, .row-actions-btn').forEach(button => {
            button.addEventListener('click', function() {
                // Tentar obter o ID do webhook do atributo data-id ou do input mais próximo
                let webhookId = this.getAttribute('data-id');
                
                // Se não tiver o atributo data-id, procurar o checkbox mais próximo
                if (!webhookId) {
                    const row = this.closest('tr');
                    if (row) {
                        const checkbox = row.querySelector('.webhook-select');
                        if (checkbox) {
                            webhookId = checkbox.value;
                        }
                    }
                }
                
                if (webhookId) {
                    openDetailsModal(webhookId);
                }
            });
        });
        
        // Fechar modal pelo botão
        if (closeModal) {
            closeModal.addEventListener('click', function() {
                closeDetailsModal();
            });
        }
        
        // Fechar modal ao clicar fora dele
        if (detailsModal) {
            detailsModal.addEventListener('click', function(e) {
                if (e.target === detailsModal) {
                    closeDetailsModal();
                }
            });
        }
    };
    
    // Abre o modal de detalhes e carrega os dados do webhook
    const openDetailsModal = function(webhookId) {
        if (!detailsModal) return;
        
        // Mostrar modal
        detailsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevenir rolagem no fundo
        
        // Resetar conteúdo do modal
        pedidoDetails.innerHTML = '';
        pedidoDetails.classList.remove('loaded');
        document.querySelector('.spinner-container').style.display = 'flex';
        
        // Simular carregamento (aqui você faria uma chamada AJAX real)
        setTimeout(() => {
            fetchWebhookDetails(webhookId);
        }, 800);
    };
    
    // Fecha o modal de detalhes
    const closeDetailsModal = function() {
        if (!detailsModal) return;
        
        detailsModal.style.display = 'none';
        document.body.style.overflow = ''; // Restaurar rolagem
    };
    
    // Busca os detalhes do webhook via AJAX
    const fetchWebhookDetails = function(webhookId) {
        fetch(`/webhooks/api/webhook/${webhookId}/`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao buscar dados do pedido');
                }
                return response.json();
            })
            .then(data => {
                displayWebhookDetails(data);
            })
            .catch(error => {
                // Em caso de erro, exibir mensagem
                pedidoDetails.innerHTML = `
                    <div class="error-message">
                        <h4>Erro ao carregar detalhes</h4>
                        <p>${error.message}</p>
                    </div>
                `;
                pedidoDetails.classList.add('loaded');
                document.querySelector('.spinner-container').style.display = 'none';
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
                            <span class="status-badge 
                                ${pedidoInfo.status === 'Novo Pedido' ? 'status-neworder' :
                                pedidoInfo.status === 'Enviado para Produção' ? 'status-production' :
                                pedidoInfo.status === 'Preparando Envio' ? 'status-preparing' :
                                pedidoInfo.status === 'Pronto para Retirada' ? 'status-readyforpickup' :
                                pedidoInfo.status === 'Aguardando Retirada da Transportadora' ? 'status-waitingforpickup' :
                                pedidoInfo.status === 'Enviado' ? 'status-shipped' :
                                pedidoInfo.status === 'Em Trânsito' ? 'status-intransit' :
                                pedidoInfo.status === 'Entregue' ? 'status-delivered' :
                                pedidoInfo.status === 'Retornando - Erro na Entrega' ? 'status-returnerror' :
                                pedidoInfo.status === 'Cancelado' ? 'status-cancelled' : 'status-pending'}">
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
                            <div class="detail-label">Email:</div>
                            <div class="detail-value">${pedidoInfo.contato.email}</div>
                        </div>`;
                }
                
                detailsHTML += `</div>`;
            }
                
            // Adicionar configurações se existirem
            if (pedidoInfo.configuracao && Object.keys(pedidoInfo.configuracao).length > 0) {
                detailsHTML += `
                    <div class="detail-section">
                        <h4>Especificações do Trabalho</h4>`;
                
                const configFields = [
                    { label: 'Título', field: 'titulo' },
                    { label: 'Data de Entrega', field: 'data_entrega' },
                    { label: 'Formato', field: 'formato' },
                    { label: 'Cor da Impressão', field: 'cor_impressao' },
                    { label: 'Impressão', field: 'impressao' },
                    { label: 'Gramatura', field: 'gramatura' }
                ];
                
                configFields.forEach(item => {
                    if (pedidoInfo.configuracao[item.field]) {
                        detailsHTML += `
                            <div class="detail-row">
                                <div class="detail-label">${item.label}:</div>
                                <div class="detail-value">${pedidoInfo.configuracao[item.field]}</div>
                            </div>`;
                    }
                });
                
                detailsHTML += `</div>`;
            }
        } else {
            // Se não houver pedido associado
            detailsHTML += `
                <div class="detail-section">
                    <div class="no-data">Nenhum pedido associado a este webhook</div>
                </div>`;
        }
        
        // Exibir os detalhes no modal
        pedidoDetails.innerHTML = detailsHTML;
        pedidoDetails.classList.add('loaded');
        document.querySelector('.spinner-container').style.display = 'none';
    };
    
    // Interface pública
    return {
        init: init,
        openDetailsModal: openDetailsModal,
        closeDetailsModal: closeDetailsModal
    };
})();