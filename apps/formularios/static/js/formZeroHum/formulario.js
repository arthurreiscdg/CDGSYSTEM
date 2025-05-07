// Código comum para modais e formulários
document.addEventListener('DOMContentLoaded', function() {
    // Elementos do formulário principal
    const form = document.getElementById('formZeroHum');
    const fileInput = document.getElementById('fileInput') || document.getElementById('pdfInput');
    const excelInput = document.getElementById('excelInput');
    const fileList = document.getElementById('fileList');
    const excelList = document.getElementById('excelList');
    
    // Elementos para escolha do método de pedido
    const metodoManual = document.getElementById('metodoManual');
    const metodoExcel = document.getElementById('metodoExcel');
    const stepEscolas = document.querySelectorAll('.step-escolas');
    const stepExcel = document.querySelectorAll('.step-excel');
    const stepManualContent = document.getElementById('step-5-manual');
    const stepExcelContent = document.getElementById('step-5-excel');
    
    // Elementos do modal
    const statusModal = document.getElementById('statusModal');
    const closeModal = document.getElementById('closeModal');
    const modalContent = document.getElementById('modalContent');
    const modalActionButton = document.getElementById('modalActionButton');
    
    // Elementos do modal de PDF
    const pdfModal = document.getElementById('pdfModal');
    const pdfPreview = document.getElementById('pdfPreview');
    const closePdfModal = document.getElementById('closePdfModal');
    
    // Elementos para navegação por etapas
    const stepItems = document.querySelectorAll('.step-item');
    const stepContents = document.querySelectorAll('.step-content');
    const nextButton = document.querySelector('.next-step');
    const prevButton = document.querySelector('.prev-step');
    const submitButton = document.querySelector('.submit-form');
    
    // Constantes para validação
    const MAX_FILE_SIZE_MB = 200; // Tamanho máximo total de arquivos (em MB)
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024; // Convertendo para bytes
    
    let currentStep = 1;
    const totalSteps = 6; // Agora temos 6 etapas no total
    
    // Função para alternar entre os métodos de preenchimento
    function toggleMetodoPedido() {
        if (metodoManual && metodoExcel) {
            if (metodoManual.checked) {
                // Mostrar etapa de escolas e esconder etapa de Excel
                stepEscolas.forEach(item => item.style.display = '');
                stepExcel.forEach(item => item.style.display = 'none');
                stepManualContent.style.display = '';
                stepExcelContent.style.display = 'none';
                
                // Tornar obrigatório inputs de escolas e opcional o Excel
                if (excelInput) excelInput.removeAttribute('required');
                document.querySelectorAll('#step-5-manual input[type="number"]').forEach(input => {
                    input.setAttribute('data-validation', 'escola');
                });
            } else if (metodoExcel.checked) {
                // Mostrar etapa de Excel e esconder etapa de escolas
                stepEscolas.forEach(item => item.style.display = 'none');
                stepExcel.forEach(item => item.style.display = '');
                stepManualContent.style.display = 'none';
                stepExcelContent.style.display = '';
                
                // Tornar obrigatório o Excel e opcional inputs de escolas
                if (excelInput) excelInput.setAttribute('required', 'required');
                document.querySelectorAll('#step-5-manual input[type="number"]').forEach(input => {
                    input.removeAttribute('data-validation');
                });
            }
        }
    }
    
    // Inicializar o método selecionado quando a página carregar
    toggleMetodoPedido();
    
    // Event listeners para alternar o método de preenchimento
    if (metodoManual) {
        metodoManual.addEventListener('change', toggleMetodoPedido);
    }
    
    if (metodoExcel) {
        metodoExcel.addEventListener('change', toggleMetodoPedido);
    }
    
    // Funções para navegação por etapas
    function goToStep(step) {
        // Esconder todas as etapas
        stepContents.forEach(content => {
            content.classList.remove('active');
        });
        
        // Remover classe ativa de todos os itens de navegação
        stepItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Mostrar a etapa atual
        if (step === 5) {
            // Para etapa 5, verificar qual método foi escolhido
            if (metodoManual && metodoManual.checked) {
                document.getElementById('step-5-manual').classList.add('active');
            } else {
                document.getElementById('step-5-excel').classList.add('active');
            }
        } else {
            document.getElementById(`step-${step}`).classList.add('active');
        }
        
        // Atualizar navegação
        for (let i = 1; i <= totalSteps; i++) {
            // Encontrar o item correto da etapa para destacar
            let stepItem;
            if (i === 5) {
                // Para etapa 5, verificar qual método foi escolhido para destacar o item correto
                if (metodoManual && metodoManual.checked) {
                    stepItem = document.querySelector(`.step-escolas[data-step="${i}"]`);
                } else {
                    stepItem = document.querySelector(`.step-excel[data-step="${i}"]`);
                }
            } else {
                stepItem = document.querySelector(`.step-item[data-step="${i}"]`);
            }
            
            if (stepItem) {
                if (i < step) {
                    stepItem.classList.add('completed');
                } else if (i === step) {
                    stepItem.classList.add('active');
                } else {
                    stepItem.classList.remove('completed');
                }
            }
        }
        
        // Atualizar botões de navegação
        prevButton.style.display = step > 1 ? 'block' : 'none';
        nextButton.style.display = step < totalSteps ? 'block' : 'none';
        submitButton.style.display = step === totalSteps ? 'block' : 'none';
        
        // Atualizar o passo atual
        currentStep = step;
    }
    
    function validateCurrentStep() {
        let isValid = true;
        const currentStepContent = currentStep === 5 ? 
            (metodoManual && metodoManual.checked ? document.getElementById('step-5-manual') : document.getElementById('step-5-excel')) : 
            document.getElementById(`step-${currentStep}`);
        
        // Validar campos obrigatórios da etapa atual
        const requiredFields = currentStepContent.querySelectorAll('[required]');
        requiredFields.forEach(field => {
            if (!field.checkValidity()) {
                isValid = false;
                field.reportValidity();
            }
        });
        
        // Validações específicas por etapa
        switch (currentStep) {
            case 1:
                // Validar se um método foi selecionado (sempre será válido já que um é selecionado por padrão)
                break;
                
            case 2:
                // Validar se há arquivos PDF selecionados
                if (fileInput && fileInput.files.length === 0) {
                    isValid = false;
                    fileInput.setCustomValidity('Selecione pelo menos um arquivo PDF');
                    fileInput.reportValidity();
                } else if (fileInput && fileInput.files.length > 0) {
                    // Verificar o tipo de arquivo (apenas PDF)
                    let validFiles = true;
                    let totalSize = 0;
                    
                    for (let i = 0; i < fileInput.files.length; i++) {
                        const file = fileInput.files[i];
                        
                        // Verificar tipo do arquivo
                        if (!file.type || file.type !== 'application/pdf') {
                            validFiles = false;
                            fileInput.setCustomValidity(`O arquivo "${file.name}" não é um PDF válido`);
                            fileInput.reportValidity();
                            isValid = false;
                            break;
                        }
                        
                        // Acumular tamanho total
                        totalSize += file.size;
                    }
                    
                    // Verificar tamanho total dos arquivos
                    if (validFiles && totalSize > MAX_FILE_SIZE_BYTES) {
                        isValid = false;
                        const sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
                        fileInput.setCustomValidity(`O tamanho total dos arquivos (${sizeMB}MB) excede o limite de ${MAX_FILE_SIZE_MB}MB`);
                        fileInput.reportValidity();
                    } else if (validFiles) {
                        fileInput.setCustomValidity('');
                    }
                }
                break;
                
            case 3:
                // Validar o título do material (pelo menos 5 caracteres)
                const titulo = document.getElementById('titulo');
                if (titulo && titulo.value.trim().length < 5) {
                    isValid = false;
                    titulo.setCustomValidity('O título precisa ter pelo menos 5 caracteres');
                    titulo.reportValidity();
                } else if (titulo) {
                    titulo.setCustomValidity('');
                }
                
                // Validar a data de entrega (não pode ser no passado)
                const dataEntrega = document.getElementById('dataEntrega');
                if (dataEntrega) {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const dataSelecionada = new Date(dataEntrega.value);
                    
                    if (dataSelecionada < hoje) {
                        isValid = false;
                        dataEntrega.setCustomValidity('A data de entrega não pode ser no passado');
                        dataEntrega.reportValidity();
                    } else {
                        dataEntrega.setCustomValidity('');
                    }
                }
                break;
                
            case 4:
                // Validar seleção de impressão
                const impressao = document.getElementById('impressao');
                if (impressao && impressao.value === "") {
                    isValid = false;
                    impressao.setCustomValidity('Selecione um tipo de impressão');
                    impressao.reportValidity();
                } else if (impressao) {
                    impressao.setCustomValidity('');
                }
                
                // Validar seleção de grampos
                const grampos = document.getElementById('grampos');
                if (grampos && grampos.value === "") {
                    isValid = false;
                    grampos.setCustomValidity('Selecione uma opção de grampos');
                    grampos.reportValidity();
                } else if (grampos) {
                    grampos.setCustomValidity('');
                }
                break;
                
            case 5:
                if (metodoManual && metodoManual.checked) {
                    // Verificar se pelo menos uma escola tem quantidade preenchida para o método manual
                    const escolaInputs = document.querySelectorAll('#step-5-manual input[type="number"]');
                    let temEscolaSelecionada = false;
                    
                    escolaInputs.forEach(input => {
                        if (input.value && parseInt(input.value) > 0) {
                            temEscolaSelecionada = true;
                        }
                    });
                    
                    if (!temEscolaSelecionada) {
                        isValid = false;
                        alert('Selecione pelo menos uma escola e informe a quantidade');
                    }
                } else {
                    // Verificar se o Excel foi carregado para o método de Excel
                    if (excelInput && excelInput.files.length === 0) {
                        isValid = false;
                        excelInput.setCustomValidity('Selecione um arquivo Excel');
                        excelInput.reportValidity();
                    } else if (excelInput && excelInput.files.length > 0) {
                        // Verificar se é um arquivo Excel válido
                        const file = excelInput.files[0];
                        const validExtensions = ['.xls', '.xlsx'];
                        const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                        
                        if (!validExtensions.includes(extension)) {
                            isValid = false;
                            excelInput.setCustomValidity('O arquivo não é um Excel válido');
                            excelInput.reportValidity();
                        } else {
                            excelInput.setCustomValidity('');
                        }
                    }
                }
                break;
                
            case 6:
                // Validar nome (pelo menos 5 caracteres)
                const nome = document.getElementById('nome');
                if (nome && nome.value.trim().length < 5) {
                    isValid = false;
                    nome.setCustomValidity('O nome precisa ter pelo menos 5 caracteres');
                    nome.reportValidity();
                } else if (nome) {
                    nome.setCustomValidity('');
                }
                
                // Validar o email
                const email = document.getElementById('email');
                if (email && email.value) {
                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!emailRegex.test(email.value)) {
                        isValid = false;
                        email.setCustomValidity('Digite um endereço de email válido');
                        email.reportValidity();
                    } else {
                        email.setCustomValidity('');
                    }
                }
                break;
        }
        
        return isValid;
    }
    
    // Event listeners para botões de navegação
    nextButton.addEventListener('click', function() {
        if (validateCurrentStep()) {
            goToStep(currentStep + 1);
        }
    });
    
    prevButton.addEventListener('click', function() {
        goToStep(currentStep - 1);
    });
    
    // Event listeners para clicar diretamente nos steps
    stepItems.forEach(item => {
        item.addEventListener('click', function() {
            const clickedStep = parseInt(this.getAttribute('data-step'));
            
            // Só permitir clicar em etapas anteriores ou a próxima
            if (clickedStep <= currentStep || clickedStep === currentStep + 1) {
                // Validar a etapa atual antes de mudar se estiver indo para frente
                if (clickedStep > currentStep) {
                    if (validateCurrentStep()) {
                        goToStep(clickedStep);
                    }
                } else {
                    goToStep(clickedStep);
                }
            }
        });
    });
    
    // Funções para manipulação do modal de status
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
    
    // Funções de manipulação de arquivos
    if (fileInput) {
        fileInput.addEventListener('change', function() {
            fileList.innerHTML = '';
            
            // Verificar se há arquivos selecionados
            if (this.files.length > 0) {
                let totalSize = 0;
                let invalidFiles = [];
                
                // Verificar tipos e tamanhos dos arquivos
                for (let i = 0; i < this.files.length; i++) {
                    const file = this.files[i];
                    totalSize += file.size;
                    
                    // Verificar se é um PDF
                    if (!file.type || file.type !== 'application/pdf') {
                        invalidFiles.push({
                            name: file.name,
                            reason: 'Tipo de arquivo inválido. Apenas PDFs são permitidos.'
                        });
                        continue;
                    }
                    
                    // Criar item na lista
                    const li = document.createElement('li');
                    li.textContent = file.name;
                    
                    // Adicionar informação do tamanho do arquivo
                    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
                    const sizeSpan = document.createElement('span');
                    sizeSpan.classList.add('file-size');
                    sizeSpan.textContent = `${fileSize} MB`;
                    li.appendChild(sizeSpan);
                    
                    // Adicionar evento de pré-visualização
                    li.addEventListener('click', () => previewPDF(file));
                    fileList.appendChild(li);
                }
                
                // Verificar tamanho total
                if (totalSize > MAX_FILE_SIZE_BYTES) {
                    const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);
                    this.setCustomValidity(`O tamanho total dos arquivos (${totalSizeMB}MB) excede o limite de ${MAX_FILE_SIZE_MB}MB`);
                    this.reportValidity();
                    
                    // Adicionar aviso visual
                    const errorDiv = document.createElement('div');
                    errorDiv.classList.add('file-error');
                    errorDiv.textContent = `Tamanho total excede ${MAX_FILE_SIZE_MB}MB (atual: ${totalSizeMB}MB)`;
                    fileList.appendChild(errorDiv);
                } else if (invalidFiles.length > 0) {
                    // Mostrar arquivos inválidos
                    this.setCustomValidity(`Há ${invalidFiles.length} arquivo(s) com formato inválido`);
                    this.reportValidity();
                    
                    // Adicionar aviso para cada arquivo inválido
                    invalidFiles.forEach(invalid => {
                        const errorDiv = document.createElement('div');
                        errorDiv.classList.add('file-error');
                        errorDiv.textContent = `${invalid.name}: ${invalid.reason}`;
                        fileList.appendChild(errorDiv);
                    });
                } else {
                    this.setCustomValidity('');
                }
            } else {
                this.setCustomValidity('Selecione pelo menos um arquivo PDF');
            }
        });
    }
    
    if (excelInput) {
        excelInput.addEventListener('change', function() {
            excelList.innerHTML = '';
            
            if (this.files.length > 0) {
                // Verificar se é um arquivo Excel válido
                const file = this.files[0];
                const validExtensions = ['.xls', '.xlsx'];
                const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
                
                if (!validExtensions.includes(extension)) {
                    this.setCustomValidity('O arquivo não é um Excel válido. Use .xls ou .xlsx');
                    this.reportValidity();
                    
                    const errorDiv = document.createElement('div');
                    errorDiv.classList.add('file-error');
                    errorDiv.textContent = `${file.name}: Formato inválido. Apenas .xls ou .xlsx são aceitos.`;
                    excelList.appendChild(errorDiv);
                } else {
                    const li = document.createElement('li');
                    li.textContent = file.name;
                    
                    // Adicionar informação do tamanho do arquivo
                    const fileSize = (file.size / (1024 * 1024)).toFixed(2);
                    const sizeSpan = document.createElement('span');
                    sizeSpan.classList.add('file-size');
                    sizeSpan.textContent = `${fileSize} MB`;
                    li.appendChild(sizeSpan);
                    
                    excelList.appendChild(li);
                    this.setCustomValidity('');
                }
            } else {
                this.setCustomValidity('Selecione um arquivo Excel');
            }
        });
    }
    
    // Função para pré-visualização de PDF
    function previewPDF(file) {
        if (!pdfModal || !pdfPreview) return;
        
        // Verificar se é um PDF
        if (!file.type || file.type !== 'application/pdf') {
            alert('O arquivo selecionado não é um PDF válido.');
            return;
        }
        
        // Remover classe active de todos os itens
        const fileItems = document.querySelectorAll('.file-list li');
        fileItems.forEach(item => item.classList.remove('active'));
        
        // Adicionar classe active ao item selecionado
        const selectedItem = Array.from(fileItems).find(li => li.textContent.includes(file.name));
        if (selectedItem) {
            selectedItem.classList.add('active');
        }

        // Criar URL do objeto e mostrar no iframe
        const fileUrl = URL.createObjectURL(file);
        pdfPreview.src = fileUrl;
        pdfModal.classList.add('active');

        // Limpar URL do objeto quando o iframe carregar
        pdfPreview.onload = () => {
            URL.revokeObjectURL(fileUrl);
        };
    }
    
    // Event listeners para os modais
    if (closePdfModal) {
        closePdfModal.addEventListener('click', () => {
            pdfModal.classList.remove('active');
        });
        
        // Fechar modal ao clicar fora dele
        pdfModal.addEventListener('click', (e) => {
            if (e.target === pdfModal) {
                pdfModal.classList.remove('active');
            }
        });
    }
    
    if (closeModal) {
        closeModal.addEventListener('click', hideModal);
    }
    
    if (modalActionButton) {
        modalActionButton.addEventListener('click', hideModal);
    }
    
    // Event listener para o formulário
    if (form) {
        form.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            // Validar o formulário completo
            if (!form.checkValidity() || !validateCurrentStep()) {
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
                    
                    // Limpar listas de arquivos e voltar para a primeira etapa
                    if (fileList) fileList.innerHTML = '';
                    if (excelList) excelList.innerHTML = '';
                    goToStep(1);
                } else {
                    showErrorStatus(data.error || 'Erro ao processar o pedido.');
                }
            } catch (error) {
                console.error('Erro ao enviar formulário:', error);
                showErrorStatus();
            }
        });
    }
    
    // Validação de datas
    const dataEntrega = document.getElementById('dataEntrega');
    if (dataEntrega) {
        // Definir data mínima como hoje
        const dataHoje = new Date().toISOString().split('T')[0];
        dataEntrega.setAttribute('min', dataHoje);
        
        dataEntrega.addEventListener('input', function() {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            const dataSelecionada = new Date(this.value);
            
            if (dataSelecionada < hoje) {
                this.setCustomValidity('A data de entrega não pode ser no passado');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    // Adicionar validação em tempo real para o campo de título
    const tituloInput = document.getElementById('titulo');
    if (tituloInput) {
        tituloInput.addEventListener('input', function() {
            if (this.value.trim().length < 5) {
                this.setCustomValidity('O título precisa ter pelo menos 5 caracteres');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    // Adicionar validação em tempo real para o campo de nome
    const nomeInput = document.getElementById('nome');
    if (nomeInput) {
        nomeInput.addEventListener('input', function() {
            if (this.value.trim().length < 5) {
                this.setCustomValidity('O nome precisa ter pelo menos 5 caracteres');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    // Adicionar validação em tempo real para o campo de email
    const emailInput = document.getElementById('email');
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(this.value)) {
                this.setCustomValidity('Digite um endereço de email válido');
            } else {
                this.setCustomValidity('');
            }
        });
    }
    
    // Função para formatar números de entrada
    function setupNumberInputs() {
        const numberInputs = document.querySelectorAll('input[type="number"]');
        numberInputs.forEach(input => {
            // Garantir que seja apenas número positivo
            input.addEventListener('input', function() {
                if (parseInt(this.value) < 0) {
                    this.value = 0;
                }
            });
        });
    }
    
    setupNumberInputs();
});