document.addEventListener('DOMContentLoaded', function() {
    // Elementos do formulário
    const form = document.getElementById('formZeroHum');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const papelAdesivo = document.getElementById('papelAdesivo');
    const tipoAdesivoGroup = document.getElementById('tipoAdesivoGroup');
    const dataEntrega = document.getElementById('dataEntrega');
    
    // Elementos do modal do PDF
    const pdfModal = document.getElementById('pdfModal');
    const pdfPreview = document.getElementById('pdfPreview');
    const closePdfModal = document.getElementById('closePdfModal');
    
    // Exibir nomes dos arquivos selecionados
    fileInput?.addEventListener('change', function() {
        fileList.innerHTML = '';
        
        if (this.files.length > 0) {
            for (let i = 0; i < this.files.length; i++) {
                const file = this.files[i];
                const li = document.createElement('li');
                li.textContent = file.name;
                li.addEventListener('click', () => previewPDF(file));
                fileList.appendChild(li);
            }
        }
    });

    // Função para abrir o modal e mostrar o PDF
    function previewPDF(file) {
        // Remover classe active de todos os itens
        fileList.querySelectorAll('li').forEach(item => item.classList.remove('active'));
        
        // Adicionar classe active ao item selecionado
        const selectedItem = Array.from(fileList.querySelectorAll('li')).find(li => li.textContent === file.name);
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
    
    // Fechar modal ao clicar no botão de fechar
    closePdfModal?.addEventListener('click', () => {
        pdfModal.classList.remove('active');
    });
    
    // Fechar modal ao clicar fora dele
    pdfModal?.addEventListener('click', (e) => {
        if (e.target === pdfModal) {
            pdfModal.classList.remove('active');
        }
    });
    
    // Mostrar/esconder opções de adesivo
    papelAdesivo?.addEventListener('change', function() {
        if (this.value === 'sim') {
            tipoAdesivoGroup.style.display = 'block';
        } else {
            tipoAdesivoGroup.style.display = 'none';
        }
    });
    
    // Validação da data (não permitir datas passadas)
    dataEntrega?.addEventListener('input', function() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        
        const dataSelecionada = new Date(this.value);
        
        if (dataSelecionada < hoje) {
            this.setCustomValidity('A data de entrega não pode ser no passado');
        } else {
            this.setCustomValidity('');
        }
    });
    
    // Definir data mínima como hoje
    if (dataEntrega) {
        const dataHoje = new Date().toISOString().split('T')[0];
        dataEntrega.setAttribute('min', dataHoje);
    }
});


