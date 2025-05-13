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
        
        // Inicializar componentes do modal
        initModalComponents();
    };
    
    // Inicializa componentes interativos do modal
    const initModalComponents = function() {
        // Inicializar as abas
        setupTabEvents();
        
        // Inicializar botões de ação
        const changeStatusBtn = document.getElementById('changeStatusBtn');
        const viewDocumentsBtn = document.getElementById('viewDocumentsBtn');
        const printOrderBtn = document.getElementById('printOrderBtn');
        const copyPayloadBtn = document.getElementById('copyPayloadBtn');
        
        if (copyPayloadBtn) {
            copyPayloadBtn.addEventListener('click', function() {
                const payload = document.getElementById('webhookPayload');
                if (payload) {
                    navigator.clipboard.writeText(payload.textContent)
                        .then(() => {
                            // Feedback visual
                            this.innerHTML = '<i class="fas fa-check"></i>';
                            setTimeout(() => {
                                this.innerHTML = '<i class="fas fa-copy"></i>';
                            }, 2000);
                        })
                        .catch(err => {
                            console.error('Erro ao copiar: ', err);
                        });
                }
            });
        }
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
        console.log('Abrindo modal para webhook ID:', webhookId);
        if (!detailsModal || !pedidoDetails) {
            console.error('Elementos do modal não encontrados', {detailsModal, pedidoDetails});
            return;
        }
        
        // Mostrar o modal
        detailsModal.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Prevenir rolagem no fundo
        
        // Mostrar spinner de carregamento
        if (modalContent) {
            // Ocultar conteúdo e mostrar spinner
            pedidoDetails.style.display = 'none';
            pedidoDetails.classList.remove('loaded');
            modalContent.querySelector('.spinner-container').style.display = 'flex';
            
            // Resetar as abas para o primeiro item
            document.querySelectorAll('.tab-button').forEach((button, index) => {
                if (index === 0) {
                    button.classList.add('active');
                } else {
                    button.classList.remove('active');
                }
            });
            
            // Preparar a primeira aba para ser exibida quando os dados carregarem
            const firstTab = document.getElementById('tab-overview');
            if (firstTab) {
                firstTab.classList.add('active');
            }
        }
        
        // Adicionar efeito de entrada com animação
        setTimeout(() => {
            const modalElement = detailsModal.querySelector('.modal');
            if (modalElement) {
                modalElement.classList.add('modal-show');
            }
        }, 50);
        
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
        console.log('Buscando detalhes para o webhook ID:', webhookId);
        
        fetch(`/webhooks/api/webhook/${webhookId}/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': WebhookApp.Core.getCsrfToken()
            }
        })
        .then(response => {
            console.log('Resposta da API:', response.status, response.statusText);
            if (!response.ok) {
                throw new Error(`Erro ao buscar detalhes: ${response.status} ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Dados recebidos do webhook:', data);
            
            // Ocultar o spinner
            if (modalContent) {
                modalContent.querySelector('.spinner-container').style.display = 'none';
                
                // Garantir que todas as abas estejam visíveis, mas apenas a primeira ativa
                document.querySelectorAll('.tab-pane').forEach((pane, index) => {
                    // Importante: remover style="display: none" que pode estar causando os problemas
                    pane.style.display = '';
                    
                    if (index === 0) {
                        pane.classList.add('active');
                    } else {
                        pane.classList.remove('active');
                    }
                });
            }
            
            // Exibir os detalhes
            displayWebhookDetails(data);
        })
        .catch(error => {
            console.error('Erro na requisição:', error);
            
            // Ocultar o spinner
            if (modalContent) {
                modalContent.querySelector('.spinner-container').style.display = 'none';
            }
            
            // Mostrar mensagem de erro
            showErrorMessage(`Erro ao carregar os detalhes do webhook: ${error.message || 'Erro desconhecido'}`);
        });
    };
    // Exibe os detalhes do webhook no modal
    const displayWebhookDetails = function(data) {
        console.log('Dados recebidos:', data); // Para depuração
        
        if (!data) {
            console.error("Nenhum dado recebido para exibir");
            showErrorMessage("Nenhum dado recebido do servidor");
            return;
        }
        
        // Obter informações do pedido se existirem
        const pedidoInfo = data.pedido_info || {};
        const webhookId = data.id || '';
        const pedidoExists = pedidoInfo && Object.keys(pedidoInfo).length > 0;
        
        // Logs detalhados para depuração        console.log('ID do webhook:', webhookId);
        console.log('Pedido existe:', pedidoExists);
        console.log('Informações do pedido:', pedidoInfo);
        
        // Verificar especificamente os produtos
        if (pedidoInfo.produtos) {
            console.log('Produtos encontrados:', pedidoInfo.produtos.length);
            console.log('Detalhes dos produtos:', pedidoInfo.produtos);
        } else {
            console.log('Nenhum produto encontrado no pedido');
        }
        
        console.log('Informações do pedido:', pedidoInfo);
        console.log('Pedido existe:', pedidoExists);
        
        // Se houver produtos, mostre-os no console para depuração
        if (pedidoInfo.produtos && Array.isArray(pedidoInfo.produtos)) {
            console.log(`Produtos encontrados: ${pedidoInfo.produtos.length}`);
            pedidoInfo.produtos.forEach((produto, index) => {
                console.log(`Produto ${index + 1}:`, produto);
                if (produto.designs) console.log(`Designs de ${index + 1}:`, produto.designs);
                if (produto.mockups) console.log(`Mockups de ${index + 1}:`, produto.mockups);
            });
        } else {
            console.log('Nenhum produto encontrado ou não é um array');
        }
        
        // Preencher informações básicas do pedido nos elementos HTML
        if (pedidoExists) {
            // Título do modal
            if (document.getElementById('modalOrderTitle')) {
                document.getElementById('modalOrderTitle').textContent = `Pedido #${pedidoInfo.numero_pedido || ''}`;
            }
            
            // Status
            if (document.getElementById('orderStatusBadge')) {
                const statusBadge = document.getElementById('orderStatusBadge');
                statusBadge.textContent = pedidoInfo.status || 'Desconhecido';
                statusBadge.className = `status-badge ${pedidoInfo.cor_css || 'status-pending'}`;
            }
            
            // Número do pedido
            if (document.getElementById('orderNumber')) {
                document.getElementById('orderNumber').textContent = `Pedido #${pedidoInfo.numero_pedido || ''}`;
            }
            
            // Data de recebimento
            if (document.getElementById('orderDate')) {
                document.getElementById('orderDate').textContent = data.recebido_em || 'N/A';
            }
            
            // Nome do cliente
            if (document.getElementById('customerName')) {
                document.getElementById('customerName').textContent = pedidoInfo.nome_cliente || 'N/A';
            }
            
            // Valor total
            if (document.getElementById('orderValue')) {
                document.getElementById('orderValue').textContent = `R$ ${pedidoInfo.valor_pedido ? parseFloat(pedidoInfo.valor_pedido).toFixed(2) : '0,00'}`;
            }
            
            // Quantidade de produtos
            let productsCount = 0;
            if (pedidoInfo.produtos && Array.isArray(pedidoInfo.produtos)) {
                productsCount = pedidoInfo.produtos.length;
            }
            if (document.getElementById('productsCount')) {
                document.getElementById('productsCount').textContent = productsCount;
            }
            
            // Frete
            if (document.getElementById('shippingValue')) {
                document.getElementById('shippingValue').textContent = `R$ ${pedidoInfo.custo_envio ? parseFloat(pedidoInfo.custo_envio).toFixed(2) : '0,00'}`;
            }
            
            // Preparar os produtos para a aba de produtos
            if (document.getElementById('productsList') && pedidoInfo.produtos && Array.isArray(pedidoInfo.produtos)) {
                const productsContainer = document.getElementById('productsList');
                let productsHTML = '';
                
                pedidoInfo.produtos.forEach(produto => {
                    // Obter capa do mockup ou design
                    let imageUrl = '';
                    if (produto.mockups && produto.mockups.capa_frente) {
                        imageUrl = produto.mockups.capa_frente;                    } else if (produto.designs && produto.designs.capa_frente) {
                        imageUrl = produto.designs.capa_frente;
                    } else {
                        imageUrl = 'https://picsum.photos/300/300?blur=1&text=Sem+Imagem';
                    }
                    
                    productsHTML += `
                        <div class="product-card">
                            <div class="product-image" style="background-image: url('${imageUrl}')">
                                <div class="product-quantity">Qtd: ${produto.quantidade || 1}</div>
                            </div>
                            <div class="product-info">
                                <h3 class="product-name">${produto.nome || 'Sem nome'}</h3>
                                <p class="product-sku">SKU: ${produto.sku || 'N/A'}</p>
                                <div class="product-actions">
                                    <button class="btn btn-sm btn-outline" onclick="window.open('${produto.designs?.capa_frente || '#'}', '_blank')">
                                        <i class="fas fa-image"></i> Design
                                    </button>
                                    ${produto.arquivo_pdf ? `
                                        <button class="btn btn-sm btn-primary" onclick="window.open('${produto.arquivo_pdf}', '_blank')">
                                            <i class="fas fa-file-pdf"></i> PDF
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                productsContainer.innerHTML = productsHTML || '<div class="empty-state"><i class="fas fa-box-open"></i><p>Nenhum produto encontrado</p></div>';
            }
            
            // Preparar informações de endereço para a aba de envio
            if (document.getElementById('shippingAddress') && pedidoInfo.endereco_envio) {
                const addressContainer = document.getElementById('shippingAddress');
                const endereco = pedidoInfo.endereco_envio;
                
                let addressHTML = `
                    <div class="address-title">
                        <i class="fas fa-map-marker-alt"></i> Endereço de Entrega
                    </div>
                    <div class="address-line">
                        <strong>${endereco.nome_destinatario || 'Destinatário'}</strong>
                    </div>
                    <div class="address-line">
                        ${endereco.endereco || ''}, ${endereco.numero || ''}
                        ${endereco.complemento ? endereco.complemento : ''}
                    </div>
                    <div class="address-line">
                        ${endereco.bairro || ''} - ${endereco.cidade || ''}, ${endereco.uf || ''}
                    </div>
                    <div class="address-line">
                        CEP: ${endereco.cep || 'N/A'}
                    </div>
                    <div class="address-line">
                        ${endereco.pais || 'Brasil'}
                    </div>
                    
                    <div class="address-contact">
                        <div class="address-line">
                            <i class="fas fa-phone"></i> ${endereco.telefone || 'N/A'}
                        </div>
                    </div>
                `;
                
                addressContainer.innerHTML = addressHTML;
                  // Se quisermos mostrar um mapa real no futuro, podemos usar Google Maps ou similar aqui
                // Por enquanto, atualizamos a imagem do placeholder com o endereço
                if (document.getElementById('addressMapImg')) {
                    const addressStr = `${endereco.endereco || ''}, ${endereco.numero || ''}, ${endereco.cidade || ''}, ${endereco.uf || ''}`;
                    // Evitar problemas de DNS com via.placeholder
                    document.getElementById('addressMapImg').src = `https://picsum.photos/600/300?blur=2&text=${encodeURIComponent('Endereço: ' + addressStr)}`;
                }
            }
            
            // Preparar a timeline para a aba de histórico
            if (document.getElementById('orderTimeline')) {
                const timelineContainer = document.getElementById('orderTimeline');
                
                // Como exemplo, vamos criar uma timeline básica (no futuro, poderíamos buscar o histórico real)
                let timelineHTML = `
                    <div class="timeline-item">
                        <div class="timeline-point"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">${data.recebido_em || 'N/A'}</div>
                            <h4 class="timeline-title">Pedido Recebido</h4>
                            <p class="timeline-desc">Pedido #${pedidoInfo.numero_pedido} foi recebido via webhook.</p>
                        </div>
                    </div>
                `;
                
                if (pedidoInfo.status) {
                    timelineHTML += `
                        <div class="timeline-item">
                            <div class="timeline-point"></div>
                            <div class="timeline-content">
                                <div class="timeline-date">${data.recebido_em || 'N/A'}</div>
                                <h4 class="timeline-title">Status Atualizado</h4>
                                <p class="timeline-desc">Pedido marcado como "${pedidoInfo.status}".</p>
                            </div>
                        </div>
                    `;
                }
                
                timelineContainer.innerHTML = timelineHTML;
            }
            
            // Preparar o payload formated para a aba de dados brutos
            if (document.getElementById('webhookPayload')) {
                try {
                    const webhookPayload = document.getElementById('webhookPayload');
                    const payloadObj = JSON.parse(data.payload || '{}');
                    const formattedPayload = JSON.stringify(payloadObj, null, 4);
                    webhookPayload.textContent = formattedPayload;
                    
                    // Adicionar evento de clique para o botão de copiar
                    if (document.getElementById('copyPayloadBtn')) {
                        document.getElementById('copyPayloadBtn').onclick = function() {
                            navigator.clipboard.writeText(formattedPayload)
                                .then(() => {
                                    // Feedback visual
                                    this.innerHTML = '<i class="fas fa-check"></i>';
                                    setTimeout(() => {
                                        this.innerHTML = '<i class="fas fa-copy"></i>';
                                    }, 2000);
                                })
                                .catch(err => {
                                    console.error('Erro ao copiar: ', err);
                                });
                        };
                    }
                } catch (e) {
                    document.getElementById('webhookPayload').textContent = 'Erro ao processar payload JSON';
                }
            }
            
        } else {
            // Se não houver pedido, mostrar informação básica do webhook
            if (document.getElementById('modalOrderTitle')) {
                document.getElementById('modalOrderTitle').textContent = `Webhook ID: ${webhookId}`;
            }
            
            // Mostrar estado vazio em todas as abas
            const emptyState = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>Nenhum pedido associado a este webhook</p>
                </div>
            `;
            
            if (document.getElementById('tab-overview')) {
                document.getElementById('tab-overview').innerHTML = emptyState;
            }
            
            if (document.getElementById('productsList')) {
                document.getElementById('productsList').innerHTML = emptyState;
            }
            
            if (document.getElementById('shippingAddress')) {
                document.getElementById('shippingAddress').innerHTML = emptyState;
            }
            
            if (document.getElementById('orderTimeline')) {
                document.getElementById('orderTimeline').innerHTML = emptyState;
            }
        }
        
        // Se tiver o pedidoDetails, manter compatibilidade com o código original
        if (pedidoDetails) {
            pedidoDetails.style.display = 'block';
            pedidoDetails.classList.add('loaded');
        }
        
        // Configurar os eventos das abas
        setupTabEvents();
        
        // Configurar eventos dos botões de ação
        setupActionButtons(data.id, pedidoInfo);
    };
    
    // Configurar eventos das abas
    const setupTabEvents = function() {
        console.log('Configurando eventos das abas');
        const tabButtons = document.querySelectorAll('.tab-button');
        
        tabButtons.forEach(button => {
            // Remover qualquer listener anterior para evitar duplicação
            button.removeEventListener('click', tabClickHandler);
            // Adicionar novo listener
            button.addEventListener('click', tabClickHandler);
        });

        // Verificar se a aba ativa está corretamente configurada
        const activeTab = document.querySelector('.tab-button.active');
        if (activeTab) {
            const tabId = activeTab.getAttribute('data-tab');
            document.querySelectorAll('.tab-pane').forEach(pane => {
                if (pane.id === `tab-${tabId}`) {
                    pane.classList.add('active');
                    console.log(`Aba ativa definida: ${tabId}`);
                } else {
                    pane.classList.remove('active');
                }
                // Garantir que nenhuma aba tenha display:none direto no estilo
                pane.style.display = '';
            });
        }
        
        console.log('Eventos das abas configurados com sucesso');
    };
    
    // Handler de clique da aba separado para facilitar a remoção/adição
    const tabClickHandler = function(e) {
        console.log('Clique na aba detectado');
        
        // Remover classe ativa de todos os botões
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Adicionar classe ativa ao botão clicado
        this.classList.add('active');
        
        // Mostrar o conteúdo da aba correspondente
        const tabId = this.getAttribute('data-tab');
        console.log(`Aba selecionada: ${tabId}`);
        
        // Esconder todos os painéis
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('active');
            // Não usar style.display = 'none' para evitar conflitos com CSS
        });
        
        // Mostrar o painel correspondente
        const tabPane = document.getElementById(`tab-${tabId}`);
        if (tabPane) {
            tabPane.classList.add('active');
            console.log(`Painel ${tabId} ativado`);
        } else {
            console.error(`Painel tab-${tabId} não encontrado`);
        }
    };
    
    // Configurar botões de ação
    const setupActionButtons = function(webhookId, pedidoInfo) {
        // Botão de alterar status
        const changeStatusBtn = document.getElementById('changeStatusBtn');
        if (changeStatusBtn) {
            changeStatusBtn.onclick = function() {
                hideDetailsModal();
                // Selecionar automaticamente o webhook no grid
                const checkbox = document.getElementById(`webhook-${webhookId}`);
                if (checkbox) {
                    checkbox.checked = true;
                    showStatusModal();
                }
            };
        }
        
        // Botão de visualizar documentos
        const viewDocumentsBtn = document.getElementById('viewDocumentsBtn');
        if (viewDocumentsBtn) {
            viewDocumentsBtn.onclick = function() {
                // Se tiver PDF, abrir em nova guia
                if (pedidoInfo && pedidoInfo.produtos && pedidoInfo.produtos.length > 0) {
                    const pdfUrls = [];
                    
                    pedidoInfo.produtos.forEach(produto => {
                        if (produto.arquivo_pdf) {
                            pdfUrls.push(produto.arquivo_pdf);
                        }
                    });
                    
                    if (pdfUrls.length > 0) {
                        pdfUrls.forEach(url => window.open(url, '_blank'));
                    } else {
                        alert('Nenhum documento PDF disponível para este pedido.');
                    }
                } else {
                    alert('Nenhum documento disponível para este pedido.');
                }
            };
        }
        
        // Botão de imprimir
        const printOrderBtn = document.getElementById('printOrderBtn');
        if (printOrderBtn) {
            printOrderBtn.onclick = function() {
                const printWindow = window.open('', '_blank');
                
                // Criar um estilo básico para impressão
                let printContent = `
                    <html>
                    <head>
                        <title>Detalhes do Pedido #${pedidoInfo.numero_pedido || ''}</title>
                        <style>
                            body { font-family: Arial, sans-serif; margin: 20px; }
                            h1 { color: #333; }
                            .header { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 20px; }
                            .section { margin-bottom: 20px; }
                            .section h2 { border-bottom: 1px solid #eee; padding-bottom: 5px; }
                            table { width: 100%; border-collapse: collapse; }
                            th, td { text-align: left; padding: 8px; border-bottom: 1px solid #ddd; }
                            th { background-color: #f2f2f2; }
                            .footer { margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h1>Detalhes do Pedido #${pedidoInfo.numero_pedido || ''}</h1>
                            <p>Data do pedido: ${data.recebido_em || 'N/A'}</p>
                            <p>Status: ${pedidoInfo.status || 'Desconhecido'}</p>
                        </div>
                        
                        <div class="section">
                            <h2>Cliente</h2>
                            <p><strong>Nome:</strong> ${pedidoInfo.nome_cliente || 'N/A'}</p>
                            <p><strong>E-mail:</strong> ${pedidoInfo.email_cliente || 'N/A'}</p>
                            <p><strong>Documento:</strong> ${pedidoInfo.documento_cliente || 'N/A'}</p>
                        </div>
                `;
                
                if (pedidoInfo.produtos && pedidoInfo.produtos.length > 0) {
                    printContent += `
                        <div class="section">
                            <h2>Produtos</h2>
                            <table>
                                <tr>
                                    <th>Nome</th>
                                    <th>SKU</th>
                                    <th>Quantidade</th>
                                </tr>
                    `;
                    
                    pedidoInfo.produtos.forEach(produto => {
                        printContent += `
                            <tr>
                                <td>${produto.nome || 'Sem nome'}</td>
                                <td>${produto.sku || 'N/A'}</td>
                                <td>${produto.quantidade || '1'}</td>
                            </tr>
                        `;
                    });
                    
                    printContent += `
                            </table>
                        </div>
                    `;
                }
                
                if (pedidoInfo.endereco_envio) {
                    const endereco = pedidoInfo.endereco_envio;
                    printContent += `
                        <div class="section">
                            <h2>Endereço de Entrega</h2>
                            <p><strong>Destinatário:</strong> ${endereco.nome_destinatario || 'N/A'}</p>
                            <p><strong>Endereço:</strong> ${endereco.endereco || ''}, ${endereco.numero || ''} ${endereco.complemento ? endereco.complemento : ''}</p>
                            <p><strong>Bairro:</strong> ${endereco.bairro || 'N/A'}</p>
                            <p><strong>Cidade/UF:</strong> ${endereco.cidade || ''}, ${endereco.uf || ''}</p>
                            <p><strong>CEP:</strong> ${endereco.cep || 'N/A'}</p>
                            <p><strong>País:</strong> ${endereco.pais || 'Brasil'}</p>
                            <p><strong>Telefone:</strong> ${endereco.telefone || 'N/A'}</p>
                        </div>
                    `;
                }
                
                printContent += `
                        <div class="footer">
                            <p>Gerado por PDFlow em ${new Date().toLocaleString()}</p>
                        </div>
                    </body>
                    </html>
                `;
                
                printWindow.document.open();
                printWindow.document.write(printContent);
                printWindow.document.close();
                
                // Esperar o carregamento completo antes de imprimir
                printWindow.onload = function() {
                    printWindow.print();
                    // printWindow.close(); // Opcional: fechar após imprimir
                };
            };
        }
    };
      // Função auxiliar para mostrar mensagens de erro no modal
    const showErrorMessage = function(message) {
        console.error(message);
        
        // Verificar se o elemento pedidoDetails existe
        if (pedidoDetails) {
            // Exibir mensagem de erro no container
            pedidoDetails.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Erro ao carregar os detalhes do webhook</p>
                    <p class="error-details">${message || 'Erro desconhecido'}</p>
                    <button class="btn btn-outline btn-sm retry-btn">
                        <i class="fas fa-sync-alt"></i> Tentar novamente
                    </button>
                </div>
            `;
            
            // Mostrar o container de detalhes
            pedidoDetails.style.display = 'block';
            pedidoDetails.classList.add('loaded');
            
            // Adicionar evento ao botão de tentar novamente
            const retryBtn = pedidoDetails.querySelector('.retry-btn');
            if (retryBtn) {
                retryBtn.addEventListener('click', function() {
                    // Extrair o ID do webhook da URL atual
                    const currentWebhookId = window.location.hash.replace('#webhook-', '');
                    if (currentWebhookId) {
                        showDetailsModal(currentWebhookId);
                    } else {
                        // Tentar obter o ID de outra forma
                        const row = this.closest('tr');
                        if (row) {
                            const checkboxId = row.querySelector('.webhook-select')?.value;
                            if (checkboxId) {
                                showDetailsModal(checkboxId);
                            }
                        }
                    }
                });
            }
            
            // Ocultar o spinner
            if (modalContent) {
                modalContent.querySelector('.spinner-container').style.display = 'none';
            }
            
            // Esconder todas as abas e manter apenas a primeira visível
            document.querySelectorAll('.tab-pane').forEach((pane, index) => {
                if (index === 0) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
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