// Script específico para a página de formulários

document.addEventListener("DOMContentLoaded", () => {
    // Referências aos elementos
    const hamburger = document.querySelector(".hamburger")
    const navLinks = document.querySelector(".nav-links")
    const formNavButtons = document.querySelectorAll(".form-nav-button")
  
    // Adicionar o botão de toggle de tema se não existir
    if (!document.querySelector(".theme-toggle")) {
      const themeToggle = document.createElement("div")
      themeToggle.className = "theme-toggle"
      themeToggle.innerHTML = "<i>🌙</i>" // Usando emoji como ícone
      document.body.appendChild(themeToggle)
  
      // Verificar se há um tema salvo
      const savedTheme = localStorage.getItem("theme")
      if (savedTheme === "dark") {
        document.body.classList.add("dark-theme")
        themeToggle.innerHTML = "<i>☀️</i>" // Usando emoji como ícone
      }
  
      // Adicionar evento de clique para alternar o tema
      themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark-theme")
  
        if (document.body.classList.contains("dark-theme")) {
          localStorage.setItem("theme", "dark")
          themeToggle.innerHTML = "<i>☀️</i>" // Usando emoji como ícone
        } else {
          localStorage.setItem("theme", "light")
          themeToggle.innerHTML = "<i>🌙</i>" // Usando emoji como ícone
        }
      })
    }
  
    // Toggle do menu mobile
    if (hamburger) {
      hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active")
        navLinks.classList.toggle("active")
      })
    }
  
    // Fechar o menu ao clicar em um link
    document.querySelectorAll(".nav-links li a").forEach((link) => {
      link.addEventListener("click", () => {
        hamburger.classList.remove("active")
        navLinks.classList.remove("active")
      })
    })
  
    // Efeito de clique nos botões de formulário
    formNavButtons.forEach((button) => {
      button.addEventListener("click", function () {
        // Adicionar efeito visual ao clicar
        this.style.transform = "scale(0.95)"
        setTimeout(() => {
          this.style.transform = ""
        }, 200)
  
        // Se o botão não tiver um link, podemos adicionar uma lógica aqui
        const formType = this.getAttribute("data-form")
        console.log(`Formulário selecionado: ${formType}`)
  
        // Aqui você pode adicionar lógica para redirecionar ou mostrar o formulário
        // Por exemplo, se o botão não tiver um link <a>:
        const btnLink = this.querySelector("a")
        if (!btnLink && formType) {
          // Redirecionar para a URL do formulário
          // window.location.href = `/form/${formType}/`;
        }
      })
    })
  
    // Animação de entrada para os cards de formulários
    function animateFormCards() {
      formNavButtons.forEach((card, index) => {
        setTimeout(() => {
          card.style.opacity = "1"
          card.style.transform = "translateY(0)"
        }, 100 * index)
      })
    }
  
    // Iniciar animação quando a página carrega
    animateFormCards()
  })
  