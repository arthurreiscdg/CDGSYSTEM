/**
 * filters.js - Gerenciamento de filtros
 */

var WebhookApp = WebhookApp || {};

WebhookApp.Filters = (function() {
    'use strict';
      // Elementos DOM
    let filterForm = null;
    let filterBtn = null;
    let clearFilterBtn = null;
    let filterSelects = [];
    let filterInputs = [];
    let addFilterBtn = null;
    
    // Inicializa o módulo
    const init = function() {
        // Obter referências aos elementos DOM
        filterForm = document.getElementById('filter-form');
        filterBtn = document.querySelector('.filter-btn');
        clearFilterBtn = document.querySelector('.clear-filter');
        filterSelects = document.querySelectorAll('.filter-panel .form-select');
        filterInputs = document.querySelectorAll('.filter-panel .form-control');
        addFilterBtn = document.querySelector('.add-filter-btn');
        
        // Inicializar event listeners
        initEventListeners();
        
        // Preencher os filtros com valores da URL
        fillFiltersFromUrl();
        
        // Adicionar estilos para os filtros personalizados
        addFilterStyles();
    };
      // Inicializa os event listeners
    const initEventListeners = function() {
        // Event listener para o formulário de filtro
        if (filterForm) {
            filterForm.addEventListener('submit', function(e) {
                e.preventDefault();  // Impedir o envio padrão do formulário
                applyFilters();
            });
        }
        
        // Event listener para o botão de limpar filtros
        if (clearFilterBtn) {
            clearFilterBtn.addEventListener('click', function() {
                clearFilters();
            });
        }
        
        // Permitir aplicar filtro pressionando Enter nos campos de texto
        filterInputs.forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();  // Impedir o envio padrão do formulário
                    applyFilters();
                }
            });
        });
        
        // Funcionalidade para Adicionar Filtro Customizado
        if (addFilterBtn) {
            addFilterBtn.addEventListener('click', function() {
                addCustomFilter();
            });
        }
    };
      // Aplica os filtros selecionados
    const applyFilters = function() {
        console.log("applyFilters() chamado");
        
        const filters = getFilterValues();
        console.log("Filtros obtidos:", filters);
        
        // Verificar se há algum filtro a ser aplicado
        if (Object.keys(filters).length === 0) {
            WebhookApp.Notifications.showToast('Selecione pelo menos um filtro para continuar', 'error', 3000);
            return;
        }
        
        // Mostrar toast de carregamento
        const loadingToast = WebhookApp.Notifications.showToast('Aplicando filtros...', 'loading');
        
        // Construir a query string para a URL
        const queryParams = new URLSearchParams();
        
        // Adicionar cada filtro à query string
        for (const [key, value] of Object.entries(filters)) {
            console.log(`Adicionando filtro: ${key}=${value}`);
            queryParams.append(key, value);
        }
        
        const newUrl = `${window.location.pathname}?${queryParams.toString()}`;
        console.log("Redirecionando para:", newUrl);
        
        // Redirecionar para a URL com os filtros
        window.location.href = newUrl;
    };
      // Limpa todos os filtros
    const clearFilters = function() {
        console.log("Limpando todos os filtros...");
        
        // Limpar os campos de filtro
        filterSelects.forEach(select => {
            select.selectedIndex = 0;
            console.log(`Limpando select: ${select.name || select.getAttribute('data-filter') || select.id}`);
        });
        
        filterInputs.forEach(input => {
            input.value = '';
            console.log(`Limpando input: ${input.name || input.getAttribute('data-filter') || input.id}`);
        });
        
        // Remover filtros personalizados
        const filterTagsContainer = document.querySelector('.custom-filter-tags');
        if (filterTagsContainer) {
            filterTagsContainer.innerHTML = '';
            console.log("Limpando filtros customizados");
        }
        
        // Mostrar toast de carregamento
        WebhookApp.Notifications.showToast('Removendo filtros...', 'info', 2000);
        
        // Redirecionar para a URL sem parâmetros
        console.log("Redirecionando para:", window.location.pathname);
        window.location.href = window.location.pathname;
    };
    
    // Adiciona um filtro customizado
    const addCustomFilter = function() {
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
    };    // Coleta os valores dos filtros do formulário
    const getFilterValues = function() {
        const filters = {};
        console.log("Coletando valores dos filtros...");
        let hasFilters = false;
        
        // Coletar valores dos selects
        filterSelects.forEach(select => {
            const name = select.name || select.getAttribute('data-filter') || select.id;
            if (name && select.value) {
                console.log(`Select ${name} = ${select.value}`);
                filters[name] = select.value;
                hasFilters = true;
            }
        });
        
        // Coletar valores dos inputs
        filterInputs.forEach(input => {
            const name = input.name || input.getAttribute('data-filter') || input.id;
            if (name && input.value.trim()) {
                console.log(`Input ${name} = ${input.value.trim()}`);
                filters[name] = input.value.trim();
                hasFilters = true;
            }
        });
        
        // Coletar filtros customizados
        const customFilterTags = document.querySelectorAll('.custom-filter-tag span');
        if (customFilterTags.length > 0) {
            const customFilters = Array.from(customFilterTags).map(tag => tag.textContent.trim());
            if (customFilters.length > 0) {
                filters['custom'] = customFilters.join(',');
                console.log(`Custom filters: ${filters['custom']}`);
                hasFilters = true;
            }
        }
        
        console.log("Filtros coletados:", filters, "Há filtros:", hasFilters);
        return filters;
    };
    
    // Preenche os filtros com valores da URL
    const fillFiltersFromUrl = function() {
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
        
        // Preencher filtros customizados
        if (urlParams.has('custom')) {
            const customFilters = urlParams.get('custom').split(',');
            customFilters.forEach(filter => {
                if (filter.trim()) {
                    addCustomFilterTag(filter.trim());
                }
            });
        }
        
        // Destacar o botão de filtro se houver filtros aplicados
        if (urlParams.toString()) {
            filterBtn.classList.add('active');
        }
    };
    
    // Adiciona um filtro personalizado com o texto especificado
    const addCustomFilterTag = function(text) {
        const customSearchContainer = document.querySelector('.custom-search');
        if (!customSearchContainer) return;
        
        // Criar uma área para tags de filtro se não existir
        let filterTagsContainer = document.querySelector('.custom-filter-tags');
        if (!filterTagsContainer) {
            filterTagsContainer = document.createElement('div');
            filterTagsContainer.className = 'custom-filter-tags';
            customSearchContainer.insertBefore(filterTagsContainer, customSearchContainer.querySelector('.custom-search-input'));
        }
        
        // Criar um novo elemento de filtro personalizado
        const customFilter = document.createElement('div');
        customFilter.className = 'custom-filter-tag';
        customFilter.innerHTML = `
            <span>${text}</span>
            <button type="button" class="remove-filter">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Adicionar a tag ao container
        filterTagsContainer.appendChild(customFilter);
        
        // Adicionar evento para remover o filtro
        customFilter.querySelector('.remove-filter').addEventListener('click', function() {
            filterTagsContainer.removeChild(customFilter);
        });
    };
    
    // Adiciona estilos CSS para os filtros
    const addFilterStyles = function() {
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
    };
    
    // Interface pública
    return {
        init: init,
        applyFilters: applyFilters,
        clearFilters: clearFilters
    };
})();