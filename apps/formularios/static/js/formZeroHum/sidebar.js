
    document.addEventListener('DOMContentLoaded', function() {
        // Elementos da sidebar
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebarMobileToggle = document.getElementById('sidebarMobileToggle');
        const sidebarOverlay = document.getElementById('sidebarOverlay');
        const mainContent = document.getElementById('mainContent');
        const sidebarLinks = document.querySelectorAll('.sidebar-nav-link');
        
        // Toggle sidebar no desktop
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
        
        // Toggle sidebar no mobile
        sidebarMobileToggle.addEventListener('click', function() {
            sidebar.classList.add('active');
            sidebarOverlay.classList.add('active');
        });
        
        // Fechar sidebar no mobile ao clicar no overlay
        sidebarOverlay.addEventListener('click', function() {
            sidebar.classList.remove('active');
            sidebarOverlay.classList.remove('active');
        });
        
        // Navegação suave ao clicar nos links da sidebar
        sidebarLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Remover classe active de todos os links
                sidebarLinks.forEach(l => l.classList.remove('active'));
                
                // Adicionar classe active ao link clicado
                this.classList.add('active');
                
                // Obter o ID da seção alvo
                const targetId = this.getAttribute('href');
        
                // Verifica se o targetId é um ID de seção (começa com #)
                if (targetId.startsWith("#")) {
                    const targetSection = document.querySelector(targetId);
        
                    // Rolar suavemente até a seção
                    if (targetSection) {
                        targetSection.scrollIntoView({ behavior: 'smooth' });
                    }
                } else {
                    // Se não for um ID válido, apenas segue o link normal
                    window.location.href = targetId;
                }
        
                // Fechar sidebar no mobile após clicar em um link
                if (window.innerWidth < 1024) {
                    sidebar.classList.remove('active');
                    sidebarOverlay.classList.remove('active');
                }
            });
        });
        
        
        // Destacar link ativo com base na posição de rolagem
        function highlightActiveSection() {
            const sections = document.querySelectorAll('.form-section');
            const scrollPosition = window.scrollY + 100; // Offset para melhor detecção
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.offsetHeight;
                const sectionId = section.getAttribute('id');
                
                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                    // Remover classe active de todos os links
                    sidebarLinks.forEach(link => link.classList.remove('active'));
                    
                    // Adicionar classe active ao link correspondente
                    const activeLink = document.querySelector(`.sidebar-nav-link[href="#${sectionId}"]`);
                    if (activeLink) {
                        activeLink.classList.add('active');
                    }
                }
            });
        }
        
        // Monitorar rolagem para destacar link ativo
        window.addEventListener('scroll', highlightActiveSection);
        
        // Verificar tamanho da tela para ajustar sidebar
        function checkScreenSize() {
            if (window.innerWidth < 1024) {
                sidebar.classList.remove('collapsed');
                mainContent.classList.remove('expanded');
            }
        }
        
        // Verificar tamanho da tela ao carregar e redimensionar
        window.addEventListener('resize', checkScreenSize);
        checkScreenSize();
    });

    
    