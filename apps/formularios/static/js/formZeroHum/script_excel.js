document.addEventListener('DOMContentLoaded', function() {
    // Elementos do formulário
    const pdfInput = document.getElementById('pdfInput');
    const fileList = document.getElementById('fileList');
    const excelInput = document.getElementById('excelInput');
    const excelList = document.getElementById('excelList');

    // Elementos do modal do PDF
    const pdfModal = document.getElementById('pdfModal');
    const pdfPreview = document.getElementById('pdfPreview');
    const closePdfModal = document.getElementById('closePdfModal');

    // Manipular uploads de PDF
    pdfInput?.addEventListener('change', function(event) {
        fileList.innerHTML = '';
        for (let file of event.target.files) {
            const li = document.createElement('li');
            li.textContent = file.name;
            li.addEventListener('click', () => previewPDF(file));
            fileList.appendChild(li);
        }
    });

    // Manipular uploads de Excel
    excelInput?.addEventListener('change', function(event) {
        excelList.innerHTML = '';
        for (let file of event.target.files) {
            const li = document.createElement('li');
            li.textContent = file.name;
            excelList.appendChild(li);
        }
    });

    // Função para pré-visualizar PDF no modal
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
});