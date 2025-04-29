document.addEventListener('DOMContentLoaded', function () {
    // Elementos do modal
    const statusModal = document.getElementById('statusModal');
    const closeModal = document.getElementById('closeModal');
    const modalContent = document.getElementById('modalContent');
    const modalActionButton = document.getElementById('modalActionButton');
    const form = document.getElementById('formZeroHum');

    function showModal() {
        statusModal.classList.add('active');
    }

    function hideModal() {
        statusModal.classList.remove('active');
    }

    function showProcessingStatus() {
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
        showModal();
    }

    function showSuccessStatus(arquivos = []) {
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
        modalActionButton.style.display = 'block';
        modalActionButton.textContent = 'Fechar';
        showModal();
    }

    function showErrorStatus(mensagem = 'Ocorreu um problema ao processar seu pedido. Por favor, tente novamente ou entre em contato conosco.') {
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
    }

    closeModal?.addEventListener('click', hideModal);
    modalActionButton?.addEventListener('click', hideModal);
});
