document.addEventListener('DOMContentLoaded', function() {
    // Elementos
    const selectAllCheckbox = document.getElementById('select-all');
    const checkboxes = document.querySelectorAll('.webhook-select');
    const selectedActions = document.getElementById('selected-actions');
    const itemsSelectedCount = document.getElementById('items-selected');
    const clearSelectionBtn = document.getElementById('clearSelection');
    const downloadPdfsBtn = document.getElementById('downloadPdfs');
    const changeStatusBtn = document.getElementById('changeStatus');
    const detailsButtons = document.querySelectorAll('.view-details');
    const detailsModal = document.getElementById('detailsModal');
    const closeModal = document.getElementById('closeModal');
    const pedidoDetails = document.getElementById('pedidoDetails');
    
    // Inicialmente esconder a barra de ações
    selectedActions.style.display = 'none';
    
    // Função para atualizar a contagem de itens selecionados
    function updateSelectedCount() {
        const selectedCount = document.querySelectorAll('.webhook-select:checked').length;
        itemsSelectedCount.textContent = selectedCount;
        
        // Mostrar ou esconder a barra de ações
        selectedActions.style.display = selectedCount > 0 ? 'flex' : 'none';
        
        // Atualizar o estado do checkbox "selecionar todos"
        selectAllCheckbox.checked = selectedCount > 0 && selectedCount === checkboxes.length;
        selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
    }
    
    // Event listener para o checkbox "selecionar todos"
    selectAllCheckbox.addEventListener('change', function() {
        checkboxes.forEach(checkbox => {
            checkbox.checked = this.checked;
            
            // Adicionar ou remover a classe 'selected' na linha da tabela
            const row = checkbox.closest('tr');
            if (this.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
        
        updateSelectedCount();
    });
    
    // Event listeners para cada checkbox individual
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            // Adicionar ou remover a classe 'selected' na linha da tabela
            const row = this.closest('tr');
            if (this.checked) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
            
            updateSelectedCount();
        });
    });
    
    // Event listener para o botão "Limpar seleção"
    clearSelectionBtn.addEventListener('click', function() {
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const row = checkbox.closest('tr');
            row.classList.remove('selected');
        });
        
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
        updateSelectedCount();
    });
    
    // Event listeners para botões "Ver mais"
    detailsButtons.forEach(button => {
        button.addEventListener('click', function() {
            const webhookId = this.getAttribute('data-id');
            openDetailsModal(webhookId);
        });
    });
    
    // Abrir modal e carregar detalhes do pedido
    function openDetailsModal(webhookId) {
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
    }
    
    // Função para buscar detalhes do webhook via AJAX
    function fetchWebhookDetails(webhookId) {
        // Aqui você faria uma chamada AJAX real para buscar os detalhes do pedido
        // Exemplo:
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
    }
    
    // Função para exibir os detalhes do webhook no modal
    function displayWebhookDetails(data) {
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
                            <span class="status ${pedidoInfo.status === 'Completed' ? 'status-completed' : pedidoInfo.status === 'Pending' ? 'status-pending' : 'status-processing'}">
                                ${pedidoInfo.status || 'Processing'}
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
    }
    
    // Fechar modal
    closeModal.addEventListener('click', function() {
        detailsModal.style.display = 'none';
        document.body.style.overflow = ''; // Restaurar rolagem
    });
    
    // Fechar modal ao clicar fora dele
    detailsModal.addEventListener('click', function(e) {
        if (e.target === detailsModal) {
            detailsModal.style.display = 'none';
            document.body.style.overflow = ''; // Restaurar rolagem
        }
    });
    
    // Event listener para o botão "Download PDFs"
    downloadPdfsBtn.addEventListener('click', function() {
        const selectedIds = Array.from(document.querySelectorAll('.webhook-select:checked'))
            .map(checkbox => checkbox.value);
        
        if (selectedIds.length > 0) {
            alert(`Preparando download de ${selectedIds.length} PDFs...`);
            // Aqui implementaríamos a funcionalidade real de download
        }
    });
    
    // Event listener para o botão "Alterar Status"
    changeStatusBtn.addEventListener('click', function() {
        const selectedIds = Array.from(document.querySelectorAll('.webhook-select:checked'))
            .map(checkbox => checkbox.value);
        
        if (selectedIds.length > 0) {
            // Mostrar o modal de seleção de status
            openStatusModal(selectedIds);
        }
    });
    
    // Elementos do modal de status
    const statusModal = document.getElementById('statusModal');
    const closeStatusModal = document.getElementById('closeStatusModal');
    const selectedOrdersCount = document.getElementById('selectedOrdersCount');
    const statusOptions = document.querySelectorAll('.status-option');
    const applyStatusBtn = document.getElementById('applyStatusBtn');
    const cancelStatusBtn = document.getElementById('cancelStatusBtn');
    
    // Variáveis para armazenar o estado
    let selectedOrderIds = [];
    let selectedStatus = null;
    
    // Função para abrir o modal de status
    function openStatusModal(orderIds) {
        // Armazenar os IDs selecionados
        selectedOrderIds = orderIds;
        
        // Atualizar o texto com a quantidade de pedidos selecionados
        selectedOrdersCount.textContent = orderIds.length;
        
        // Resetar a seleção de status
        selectedStatus = null;
        statusOptions.forEach(option => {
            option.classList.remove('selected');
        });
        
        // Desabilitar o botão de aplicar até que um status seja selecionado
        applyStatusBtn.disabled = true;
        applyStatusBtn.classList.add('btn-disabled');
        
        // Mostrar o modal
        statusModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevenir rolagem no fundo
    }
    
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
            applyStatusBtn.disabled = false;
            applyStatusBtn.classList.remove('btn-disabled');
        });
    });
    
    // Event listener para o botão "Aplicar Status"
    applyStatusBtn.addEventListener('click', function() {
        if (selectedStatus) {
            // Aqui você faria a chamada AJAX para atualizar o status dos pedidos
            updateOrderStatus(selectedOrderIds, selectedStatus);
            
            // Fechar o modal
            closeStatusModalFunc();
        }
    });
    
    // Função para atualizar o status dos pedidos
    function updateOrderStatus(orderIds, newStatus) {
        // Mostrar um indicador de carregamento
        const loadingToast = showToast('Atualizando status dos pedidos...', 'loading');
        
        // Fazer a chamada AJAX para atualizar os status
        fetch('/webhooks/api/update-status/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
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
            removeToast(loadingToast);
            showToast(`Status atualizado para ${newStatus}`, 'success', 3000);
        })
        .catch(error => {
            console.error('Erro:', error);
            
            // Remover o toast de carregamento e mostrar erro
            removeToast(loadingToast);
            showToast('Erro ao atualizar status', 'error', 5000);
        });
    }
    
    // Função para atualizar o status na interface
    function updateStatusInUI(orderIds, newStatus) {
        orderIds.forEach(id => {
            const checkbox = document.querySelector(`.webhook-select[value="${id}"]`);
            if (checkbox) {
                const row = checkbox.closest('tr');
                const statusCell = row.querySelector('td:nth-child(5)');
                
                if (statusCell) {
                    // Remover as classes de status existentes
                    const statusSpan = statusCell.querySelector('.status');
                    statusSpan.classList.remove('status-processing', 'status-pending', 'status-completed', 'status-cancelled');
                    
                    // Adicionar a nova classe de status
                    let statusClass = '';
                    switch (newStatus) {
                        case 'Processing':
                            statusClass = 'status-processing';
                            break;
                        case 'Pending':
                            statusClass = 'status-pending';
                            break;
                        case 'Completed':
                            statusClass = 'status-completed';
                            break;
                        case 'Cancelled':
                            statusClass = 'status-cancelled';
                            break;
                    }
                    
                    statusSpan.classList.add(statusClass);
                    statusSpan.textContent = newStatus;
                }
            }
        });
    }
    
    // Função para obter o token CSRF
    function getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue;
    }
    
    // Função para mostrar um toast de notificação
    function showToast(message, type, duration = 0) {
        // Criar o elemento de toast se ele não existir
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
        
        // Criar o toast
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        // Criar ícone baseado no tipo
        let icon = '';
        switch (type) {
            case 'success':
                icon = '✓';
                break;
            case 'error':
                icon = '✕';
                break;
            case 'loading':
                icon = '<div class="spinner-small"></div>';
                break;
        }
        
        // Estrutura do toast
        toast.innerHTML = `
            <div class="toast-icon">${icon}</div>
            <div class="toast-message">${message}</div>
        `;
        
        // Adicionar o toast ao container
        toastContainer.appendChild(toast);
        
        // Configurar tempo para remover o toast
        if (duration > 0) {
            setTimeout(() => {
                removeToast(toast);
            }, duration);
        }
        
        return toast;
    }
    
    // Função para remover um toast
    function removeToast(toast) {
        if (toast && toast.parentNode) {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                toast.parentNode.removeChild(toast);
            }, 300);
        }
    }
    
    // Função para fechar o modal de status
    function closeStatusModalFunc() {
        statusModal.style.display = 'none';
        document.body.style.overflow = ''; // Restaurar rolagem
    }
    
    // Event listeners para fechar o modal de status
    closeStatusModal.addEventListener('click', closeStatusModalFunc);
    cancelStatusBtn.addEventListener('click', closeStatusModalFunc);
    
    // Fechar o modal ao clicar fora dele
    statusModal.addEventListener('click', function(e) {
        if (e.target === statusModal) {
            closeStatusModalFunc();
        }
    });
    
    // Inicializar o estado da barra de ações
    updateSelectedCount();
});