/**
 * selection.js - Gerenciamento de seleção de itens
 */

var WebhookApp = WebhookApp || {};

WebhookApp.Selection = (function() {
    'use strict';
    
    // Elementos DOM relacionados à seleção
    let selectAllCheckbox = null;
    let checkboxes = [];
    let selectedActions = null;
    let itemsSelectedCount = null;
    let clearSelectionBtn = null;
    let downloadPdfsBtn = null;
    let changeStatusBtn = null;
    
    // Inicializa o módulo
    const init = function() {
        // Elementos
        selectAllCheckbox = document.getElementById('select-all');
        checkboxes = document.querySelectorAll('.webhook-select');
        selectedActions = document.getElementById('selected-actions');
        itemsSelectedCount = document.getElementById('items-selected');
        clearSelectionBtn = document.querySelector('.batch-btn.outline');
        downloadPdfsBtn = document.querySelector('.batch-btn:nth-child(1)');
        changeStatusBtn = document.querySelector('.batch-btn:nth-child(2)');
        
        // Inicializar os event listeners se os elementos existirem
        initEventListeners();
        
        // Atualizar contagem inicialmente
        updateSelectedCount();
    };
    
    // Inicializa os event listeners
    const initEventListeners = function() {
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
                clearAllSelections();
            });
        }
        
        // Event listener para o botão "Download PDFs"
        if (downloadPdfsBtn) {
            downloadPdfsBtn.addEventListener('click', function() {
                const selectedIds = getSelectedIds();
                
                if (selectedIds.length > 0) {
                    // Mostrar um toast de notificação
                    WebhookApp.Notifications.showToast(`Preparando download de ${selectedIds.length} PDFs...`, 'loading');
                    // Aqui implementaríamos a funcionalidade real de download
                }
            });
        }
        
        // Event listener para o botão "Alterar Status"
        if (changeStatusBtn) {
            changeStatusBtn.addEventListener('click', function() {
                const selectedIds = getSelectedIds();
                
                if (selectedIds.length > 0) {
                    // Mostrar o modal de seleção de status
                    WebhookApp.Status.openStatusModal(selectedIds);
                }
            });
        }
    };
    
    // Atualiza a contagem de itens selecionados
    const updateSelectedCount = function() {
        const selectedCount = document.querySelectorAll('.webhook-select:checked').length;
        
        if (itemsSelectedCount) {
            itemsSelectedCount.textContent = selectedCount;
        }
        
        // Mostrar ou esconder a barra de ações
        if (selectedActions) {
            selectedActions.style.display = selectedCount > 0 ? 'flex' : 'none';
        }
        
        // Atualizar o estado do checkbox "selecionar todos"
        if (selectAllCheckbox && checkboxes.length > 0) {
            selectAllCheckbox.checked = selectedCount > 0 && selectedCount === checkboxes.length;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < checkboxes.length;
        }
    };
    
    // Limpa todas as seleções
    const clearAllSelections = function() {
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            const row = checkbox.closest('tr');
            row.classList.remove('selected');
        });
        
        if (selectAllCheckbox) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
        
        updateSelectedCount();
    };
    
    // Retorna os IDs dos webhooks selecionados
    const getSelectedIds = function() {
        return Array.from(document.querySelectorAll('.webhook-select:checked'))
            .map(checkbox => checkbox.value);
    };
    
    // Interface pública
    return {
        init: init,
        updateSelectedCount: updateSelectedCount,
        clearAllSelections: clearAllSelections,
        getSelectedIds: getSelectedIds
    };
})();