document.addEventListener('DOMContentLoaded', function () {
    // Elementos do modal
    const statusModal = document.getElementById('statusModal');
    const closeModal = document.getElementById('closeModal');
    const modalContent = document.getElementById('modalContent');
    const modalActionButton = document.getElementById('modalActionButton');
    const processingIndicator = document.getElementById('processingIndicator');
    const form = document.getElementById('formZeroHum');    
    let isProcessing = false;
    let warningTimeoutId = null;

    function showModal() {
        statusModal.classList.add('active');
    }    function hideModal() {
        // Dupla verificação para não permitir fechar se estiver processando
        if (isProcessing) {
            console.log('Não é possível fechar o modal durante o processamento');
            return; // Impede qualquer tentativa de fechar
        }
        statusModal.classList.remove('active');
    }
      // Prevenir clique fora do modal durante processamento
    statusModal?.addEventListener('click', function(e) {
        if (e.target === statusModal) {
            if (isProcessing) {
                showProcessingWarning();
            } else {
                hideModal();
            }
        }
    });
    
    // Função para mostrar aviso durante o processamento
    function showProcessingWarning() {
        // Limpar timeout anterior se existir
        if (warningTimeoutId) {
            clearTimeout(warningTimeoutId);
        }
        
        // Mostrar o indicador de processamento
        if (processingIndicator) {
            processingIndicator.classList.add('show');
            
            // Esconder o aviso após 3 segundos
            warningTimeoutId = setTimeout(() => {
                processingIndicator.classList.remove('show');
            }, 3000);
        }
    }function showProcessingStatus() {
        isProcessing = true; // Ativa o bloqueio do modal
        modalContent.innerHTML = `
            <div class="status-icon status-processing">
                <div class="spinner"></div>
            </div>
            <div class="status-message">
                <h4 class="status-title">Processando seu pedido</h4>
                <p class="status-description">Estamos enviando suas informações. Por favor, aguarde...</p>
            </div>
        `;
        modalActionButton.style.display = 'none';
        // Desabilitar botão de fechar durante o processamento
        closeModal.style.display = 'none';
        // Adiciona classe de processamento ao modal
        statusModal.classList.add('processing');
        showModal();
    }    function showSuccessStatus(arquivos = []) {
        isProcessing = false; // Desativa o bloqueio do modal
        // Remove a classe de processamento
        statusModal.classList.remove('processing');
        
        let listaArquivos = '';
        if (arquivos.length > 0) {
            listaArquivos = `
                <div class="status-files">
                    <p><strong>Arquivos enviados:</strong></p>
                    <ul>
                        ${arquivos.map(arquivo => `<li>${arquivo.nome}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
    
        modalContent.innerHTML = `
            <div class="status-icon status-success">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
            </div>
            <div class="status-message">
                <h4 class="status-title">Pedido Enviado com Sucesso!</h4>
                <p class="status-description">Seu pedido foi recebido e será processado em breve.</p>
                ${listaArquivos}
            </div>
        `;
        // Reativa botões de fechar
        closeModal.style.display = 'flex';
        modalActionButton.style.display = 'block';
        modalActionButton.textContent = 'Fechar';
        showModal();
    }    function showErrorStatus(mensagem = 'Ocorreu um problema ao processar seu pedido. Por favor, tente novamente ou entre em contato conosco.') {
        isProcessing = false; // Desativa o bloqueio do modal
        // Remove a classe de processamento
        statusModal.classList.remove('processing');
        
        modalContent.innerHTML = `
            <div class="status-icon status-error">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
            </div>
            <div class="status-message">
                <h4 class="status-title">Erro ao Enviar Pedido</h4>
                <p class="status-description">${mensagem}</p>
            </div>
        `;
        // Reativa botões de fechar
        closeModal.style.display = 'flex';
        modalActionButton.style.display = 'block';
        modalActionButton.textContent = 'Tentar Novamente';
        showModal();
    }

    if (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }

            showProcessingStatus();
            const formData = new FormData(form);

            try {
                const response = await fetch(form.action, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    showSuccessStatus(data.arquivos || []);
                    form.reset();
                } else {
                    showErrorStatus(data.error || 'Erro ao processar o pedido.');
                }
            } catch (error) {
                console.error('Erro ao enviar formulário:', error);
                showErrorStatus();
            }
        });
    }    // Adiciona evento para fechar o modal, mas apenas se não estiver processando    closeModal?.addEventListener('click', function() {
        if (isProcessing) {
            showProcessingWarning();
        } else {
            hideModal();
        }
    });
    
    // Adiciona evento para o botão de ação, mas apenas se não estiver processando
    modalActionButton?.addEventListener('click', function() {
        if (isProcessing) {
            showProcessingWarning();
        } else {
            hideModal();
        }
    });
      // Prevenir fechamento do modal com tecla ESC durante processamento
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && statusModal.classList.contains('active')) {
            if (isProcessing) {
                e.preventDefault();
                e.stopPropagation();
                showProcessingWarning();
                return false;
            }
        }
    });
});
