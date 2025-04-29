document.addEventListener('DOMContentLoaded', function() {
    // Elementos
    const selectAllCheckbox = document.getElementById('select-all');
    const checkboxes = document.querySelectorAll('.webhook-select');
    const selectedActions = document.getElementById('selected-actions');
    const itemsSelectedCount = document.getElementById('items-selected');
    const clearSelectionBtn = document.getElementById('clearSelection');
    const downloadPdfsBtn = document.getElementById('downloadPdfs');
    const changeStatusBtn = document.getElementById('changeStatus');
    
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
            const newStatus = prompt('Selecione o novo status (Processing, Pending, Completed):');
            if (newStatus && ['Processing', 'Pending', 'Completed'].includes(newStatus)) {
                alert(`Alterando status de ${selectedIds.length} webhooks para ${newStatus}...`);
                // Aqui implementaríamos a funcionalidade real de mudança de status
            }
        }
    });
    
    // Inicializar o estado da barra de ações
    updateSelectedCount();
});