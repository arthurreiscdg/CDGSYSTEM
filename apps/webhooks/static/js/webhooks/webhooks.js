document.addEventListener('DOMContentLoaded', function() {
    // Elementos
    const selectAllCheckbox = document.getElementById('select-all');
    const checkboxes = document.querySelectorAll('.webhook-select');
    const selectedActions = document.getElementById('selected-actions');
    const itemsSelectedCount = document.getElementById('items-selected');
    const clearSelectionBtn = document.querySelector('.batch-btn.outline'); // Alterado para o novo seletor
    const downloadPdfsBtn = document.querySelector('.batch-btn:nth-child(1)'); // Primeiro botão de batch
    const changeStatusBtn = document.querySelector('.batch-btn:nth-child(2)'); // Segundo botão de batch
    const detailsButtons = document.querySelectorAll('.view-details, .row-actions-btn'); // Adicionado suporte ao novo botão
    const detailsModal = document.getElementById('detailsModal');
    const closeModal = document.getElementById('closeModal');
    const pedidoDetails = document.getElementById('pedidoDetails');
    
    // Elementos dos filtros
    const filterBtn = document.querySelector('.filter-btn');
    const clearFilterBtn = document.querySelector('.clear-filter');
    const filterSelects = document.querySelectorAll('.filter-panel .form-select');
    const filterInputs = document.querySelectorAll('.filter-panel .form-control');
    const addFilterBtn = document.querySelector('.add-filter-btn');
    
    // Inicialmente esconder a barra de ações (a menos que haja itens já selecionados)
    updateSelectedCount();
    
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
    if (selectAllCheckbox) {
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
    }
    
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
    if (clearSelectionBtn) {
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
    }
    
    // Event listeners para botões "Ver mais"
    detailsButtons.forEach(button => {
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
    
    // Função para exibir os detalhes do webhook no modal - adaptada para o novo tema escuro
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
                            <span class="status-badge ${pedidoInfo.status === 'Completed' ? 'status-completed' : pedidoInfo.status === 'Pending' ? 'status-pending' : 'status-processing'}">
                                ${pedidoInfo.status === 'Completed' ? 'Autorizada' : 
                                  pedidoInfo.status === 'Pending' ? 'Pendente' : 'Emitida DANFE'}
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
    if (closeModal) {
        closeModal.addEventListener('click', function() {
            detailsModal.style.display = 'none';
            document.body.style.overflow = ''; // Restaurar rolagem
        });
    }
    
    // Fechar modal ao clicar fora dele
    if (detailsModal) {
        detailsModal.addEventListener('click', function(e) {
            if (e.target === detailsModal) {
                detailsModal.style.display = 'none';
                document.body.style.overflow = ''; // Restaurar rolagem
            }
        });
    }
    
    // Event listener para o botão "Download PDFs"
    if (downloadPdfsBtn) {
        downloadPdfsBtn.addEventListener('click', function() {
            const selectedIds = Array.from(document.querySelectorAll('.webhook-select:checked'))
                .map(checkbox => checkbox.value);
            
            if (selectedIds.length > 0) {
                // Mostrar um toast de notificação em vez de um alert
                showToast(`Preparando download de ${selectedIds.length} PDFs...`, 'loading');
                // Aqui implementaríamos a funcionalidade real de download
            }
        });
    }
    
    // Event listener para o botão "Alterar Status"
    if (changeStatusBtn) {
        changeStatusBtn.addEventListener('click', function() {
            const selectedIds = Array.from(document.querySelectorAll('.webhook-select:checked'))
                .map(checkbox => checkbox.value);
            
            if (selectedIds.length > 0) {
                // Mostrar o modal de seleção de status
                openStatusModal(selectedIds);
            }
        });
    }
    
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
                // Aqui você faria a chamada AJAX para atualizar o status dos pedidos
                updateOrderStatus(selectedOrderIds, selectedStatus);
                
                // Fechar o modal
                closeStatusModalFunc();
            }
        });
    }
    
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
            showToast(`Status atualizado com sucesso`, 'success', 3000);
        })
        .catch(error => {
            console.error('Erro:', error);
            
            // Remover o toast de carregamento e mostrar erro
            removeToast(loadingToast);
            showToast('Erro ao atualizar status', 'error', 5000);
        });
    }
    
    // Função para atualizar o status na interface - adaptada para o novo tema
    function updateStatusInUI(orderIds, newStatus) {
        orderIds.forEach(id => {
            const checkbox = document.querySelector(`.webhook-select[value="${id}"]`);
            if (checkbox) {
                const row = checkbox.closest('tr');
                const statusCell = row.querySelector('td:nth-child(6)'); // Ajustado para a 6ª coluna
                
                if (statusCell) {
                    // Remover as classes de status existentes
                    const statusSpan = statusCell.querySelector('.status-badge');
                    statusSpan.classList.remove('status-processing', 'status-pending', 'status-completed', 'status-cancelled');
                    
                    // Adicionar a nova classe de status
                    let statusClass = '';
                    let statusText = '';
                    
                    switch (newStatus) {
                        case 'Processing':
                            statusClass = 'status-processing';
                            statusText = 'Emitida DANFE';
                            break;
                        case 'Pending':
                            statusClass = 'status-pending';
                            statusText = 'Pendente';
                            break;
                        case 'Completed':
                            statusClass = 'status-completed';
                            statusText = 'Autorizada';
                            break;
                        case 'Cancelled':
                            statusClass = 'status-cancelled';
                            statusText = 'Cancelada';
                            break;
                    }
                    
                    statusSpan.classList.add(statusClass);
                    statusSpan.textContent = statusText;
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
    
    // Função para mostrar um toast de notificação - adaptada para o novo tema
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
                icon = '<i class="fas fa-check"></i>';
                break;
            case 'error':
                icon = '<i class="fas fa-times"></i>';
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
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    }
    
    // Função para fechar o modal de status
    function closeStatusModalFunc() {
        if (statusModal) {
            statusModal.style.display = 'none';
            document.body.style.overflow = ''; // Restaurar rolagem
        }
    }
    
    // Event listeners para fechar o modal de status
    if (closeStatusModal) {
        closeStatusModal.addEventListener('click', closeStatusModalFunc);
    }
    
    if (cancelStatusBtn) {
        cancelStatusBtn.addEventListener('click', closeStatusModalFunc);
    }
    
    // Fechar o modal ao clicar fora dele
    if (statusModal) {
        statusModal.addEventListener('click', function(e) {
            if (e.target === statusModal) {
                closeStatusModalFunc();
            }
        });
    }
    
    // Inicializar o estado da barra de ações
    updateSelectedCount();
    
    // Adicionar listener para as ações em linha (três pontinhos)
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
                openDetailsModal(webhookId);
                actionsMenu.remove();
            });
            
            actionsMenu.querySelector('.download-pdf').addEventListener('click', () => {
                showToast('Preparando download do PDF...', 'loading');
                actionsMenu.remove();
                // Implementar download real aqui
            });
            
            actionsMenu.querySelector('.change-status').addEventListener('click', () => {
                openStatusModal([webhookId]);
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
    
    // Event listeners para filtros
    if (filterBtn) {
        filterBtn.addEventListener('click', function() {
            applyFilters();
        });
    }
    
    if (clearFilterBtn) {
        clearFilterBtn.addEventListener('click', function() {
            clearFilters();
        });
    }
    
    // Permitir aplicar filtro pressionando Enter nos campos de texto
    filterInputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                applyFilters();
            }
        });
    });
    
    // Função para coletar os valores dos filtros
    function getFilterValues() {
        const filters = {};
        
        // Coletar valores dos selects
        filterSelects.forEach(select => {
            const name = select.name || select.getAttribute('data-filter') || select.id;
            if (name && select.value) {
                filters[name] = select.value;
            }
        });
        
        // Coletar valores dos inputs
        filterInputs.forEach(input => {
            const name = input.name || input.getAttribute('data-filter') || input.id;
            if (name && input.value.trim()) {
                filters[name] = input.value.trim();
            }
        });
        
        return filters;
    }
    
    // Função para aplicar os filtros
    function applyFilters() {
        const filters = getFilterValues();
        
        // Verificar se há algum filtro a ser aplicado
        if (Object.keys(filters).length === 0) {
            showToast('Selecione pelo menos um filtro para continuar', 'error', 3000);
            return;
        }
        
        // Mostrar toast de carregamento
        const loadingToast = showToast('Aplicando filtros...', 'loading');
        
        // Construir a query string para a URL
        const queryParams = new URLSearchParams();
        
        // Adicionar cada filtro à query string
        for (const [key, value] of Object.entries(filters)) {
            queryParams.append(key, value);
        }
        
        // Redirecionar para a URL com os filtros
        window.location.href = `${window.location.pathname}?${queryParams.toString()}`;
    }
    
    // Função para limpar todos os filtros
    function clearFilters() {
        // Limpar os campos de filtro
        filterSelects.forEach(select => {
            select.selectedIndex = 0;
        });
        
        filterInputs.forEach(input => {
            input.value = '';
        });
        
        // Redirecionar para a URL sem parâmetros
        window.location.href = window.location.pathname;
    }
    
    // Função para preencher os filtros com valores da URL
    function fillFiltersFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Preencher selects
        filterSelects.forEach(select => {
            const name = select.name || select.getAttribute('data-filter') || select.id;
            if (name && urlParams.has(name)) {
                select.value = urlParams.get(name);
            }
        });
        
        // Preencher inputs
        filterInputs.forEach(input => {
            const name = input.name || input.getAttribute('data-filter') || input.id;
            if (name && urlParams.has(name)) {
                input.value = urlParams.get(name);
            }
        });
        
        // Destacar o botão de filtro se houver filtros aplicados
        if (urlParams.toString()) {
            filterBtn.classList.add('active');
        }
    }
    
    // Executar ao carregar a página para preencher os filtros com valores da URL
    fillFiltersFromUrl();
    
    // Funcionalidade para Adicionar Filtro Customizado
    if (addFilterBtn) {
        addFilterBtn.addEventListener('click', function() {
            const customSearchInput = document.querySelector('.custom-search-input input');
            
            if (customSearchInput && customSearchInput.value.trim()) {
                // Criar um novo elemento de filtro personalizado
                const customFilter = document.createElement('div');
                customFilter.className = 'custom-filter-tag';
                customFilter.innerHTML = `
                    <span>${customSearchInput.value.trim()}</span>
                    <button type="button" class="remove-filter">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                
                // Encontrar o elemento container para inserir antes do input
                const customSearchContainer = document.querySelector('.custom-search');
                if (customSearchContainer) {
                    // Criar uma área para tags de filtro se não existir
                    let filterTagsContainer = document.querySelector('.custom-filter-tags');
                    if (!filterTagsContainer) {
                        filterTagsContainer = document.createElement('div');
                        filterTagsContainer.className = 'custom-filter-tags';
                        customSearchContainer.insertBefore(filterTagsContainer, customSearchContainer.querySelector('.custom-search-input'));
                    }
                    
                    // Adicionar a tag ao container
                    filterTagsContainer.appendChild(customFilter);
                    
                    // Limpar o campo de entrada
                    customSearchInput.value = '';
                    
                    // Adicionar evento para remover o filtro
                    customFilter.querySelector('.remove-filter').addEventListener('click', function() {
                        filterTagsContainer.removeChild(customFilter);
                    });
                }
            }
        });
    }
    
    // Adicionar estilos para os filtros personalizados
    const filterStyles = document.createElement('style');
    filterStyles.textContent = `
        .custom-filter-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
        }
        
        .custom-filter-tag {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background-color: var(--dark-bg-tertiary);
            border-radius: 30px;
            padding: 0.35rem 0.75rem;
            font-size: 0.8rem;
            color: var(--dark-text-secondary);
        }
        
        .custom-filter-tag .remove-filter {
            background: none;
            border: none;
            color: var(--dark-text-tertiary);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            padding: 0;
        }
        
        .custom-filter-tag .remove-filter:hover {
            color: var(--dark-text-primary);
            background-color: rgba(255, 255, 255, 0.1);
        }
        
        .filter-btn.active {
            background-color: #009E3F;
        }
    `;
    document.head.appendChild(filterStyles);
});