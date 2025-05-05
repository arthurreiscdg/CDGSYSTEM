/**
 * notifications.js - Gerenciamento de notificações
 */

var WebhookApp = WebhookApp || {};

WebhookApp.Notifications = (function() {
    'use strict';
    
    // Elementos DOM
    let toastContainer = null;
    
    // Inicializa o módulo
    const init = function() {
        // Criar o container de toast se ele não existir
        toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }
    };
    
    // Mostra um toast de notificação
    const showToast = function(message, type, duration = 0) {
        init(); // Garantir que o container existe
        
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
            case 'warning':
                icon = '<i class="fas fa-exclamation-triangle"></i>';
                break;
            case 'info':
                icon = '<i class="fas fa-info-circle"></i>';
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
    };
    
    // Remove um toast
    const removeToast = function(toast) {
        if (toast && toast.parentNode) {
            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }
    };
    
    // Remove todos os toasts
    const removeAllToasts = function() {
        if (toastContainer) {
            const toasts = toastContainer.querySelectorAll('.toast');
            toasts.forEach(toast => removeToast(toast));
        }
    };
    
    // Interface pública
    return {
        init: init,
        showToast: showToast,
        removeToast: removeToast,
        removeAllToasts: removeAllToasts
    };
})();