document.addEventListener('DOMContentLoaded', function() {
    // Get all form navigation buttons
    const formNavButtons = document.querySelectorAll('.form-nav-button');
    const formContainer = document.getElementById('form-container');
    
    // Add click event to each form button
    formNavButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            formNavButtons.forEach(btn => btn.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Get the form type from data attribute
            const formType = this.getAttribute('data-form');
            
            // Load the appropriate form
            loadForm(formType);
        });
    });
    
    // Function to load form based on type
    function loadForm(formType) {
        // Show loading state
        formContainer.innerHTML = '<div class="loading-spinner"><div class="spinner"></div><p>Carregando formulário...</p></div>';
        
        // Simulate loading delay (in a real app, this would be an AJAX request)
        setTimeout(() => {
            // Load the form content based on type
            switch(formType) {
                case 'coleguium':
                    formContainer.innerHTML = createColeguiumForm();
                    break;
                case 'elite':
                    formContainer.innerHTML = createEliteForm();
                    break;
                case 'zerohum':
                    formContainer.innerHTML = createZeroHumForm();
                    break;
                case 'pensi':
                    formContainer.innerHTML = createPensiForm();
                    break;
                default:
                    formContainer.innerHTML = '<div class="form-error">Formulário não encontrado</div>';
            }
            
            // Add event listeners to the form
            setupFormListeners();
            
            // Scroll to form
            formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 800);
    }
    
    // Function to set up form event listeners
    function setupFormListeners() {
        const form = document.querySelector('.dynamic-form');
        if (form) {
            form.addEventListener('submit', function(e) {
                e.preventDefault();
                
                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'success-message';
                successMessage.style.display = 'block';
                successMessage.innerHTML = '<strong>Sucesso!</strong> Seu formulário foi enviado com sucesso.';
                
                // Replace form with success message
                form.innerHTML = '';
                form.appendChild(successMessage);
                
                // Add return button
                const returnButton = document.createElement('button');
                returnButton.className = 'btn btn-primary';
                returnButton.textContent = 'Voltar para Formulários';
                returnButton.style.marginTop = '2rem';
                returnButton.addEventListener('click', function() {
                    // Reset active state
                    formNavButtons.forEach(btn => btn.classList.remove('active'));
                    
                    // Show form selection placeholder
                    formContainer.innerHTML = `
                        <div class="form-placeholder">
                            <div class="form-placeholder-icon">👆</div>
                            <h3>Selecione um formulário acima</h3>
                            <p>O formulário selecionado será exibido aqui para preenchimento.</p>
                        </div>
                    `;
                    
                    // Scroll to form navigation
                    document.getElementById('forms-nav').scrollIntoView({ behavior: 'smooth', block: 'start' });
                });
                
                form.appendChild(returnButton);
            });
        }
    }
    
    
    // Add loading spinner styles
    const style = document.createElement('style');
    style.textContent = `
        .loading-spinner {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 3rem;
            text-align: center;
        }
        
        .spinner {
            width: 50px;
            height: 50px;
            border: 5px solid var(--gray-200);
            border-top: 5px solid var(--primary-color);
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1.5rem;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .form-error {
            padding: 2rem;
            text-align: center;
            color: var(--danger-color);
            font-weight: 600;
        }
        
        .success-message {
            padding: 1.5rem;
            background-color: rgba(46, 196, 182, 0.15);
            color: #1a8a7e;
            border: 1px solid rgba(46, 196, 182, 0.3);
            border-radius: var(--border-radius);
            text-align: center;
            margin-bottom: 2rem;
        }
    `;
    document.head.appendChild(style);
    
    // Initialize hamburger menu functionality
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    
    if (hamburger) {
        hamburger.addEventListener('click', function() {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }
});