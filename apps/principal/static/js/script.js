// Elementos DOM
const sidebarToggle = document.getElementById("toggle-sidebar")
const sidebar = document.getElementById("sidebar")
const moduleCards = document.querySelectorAll(".module-card")
const quickActionBtns = document.querySelectorAll(".quick-action-btn")

// Forçar tema escuro sempre
document.addEventListener("DOMContentLoaded", () => {
  document.body.classList.add("dark-theme")
  // Remove qualquer configuração de tema salva anteriormente
  localStorage.removeItem("theme")
})

// Toggle do sidebar em dispositivos móveis
sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open")
})

// Fecha o sidebar ao clicar fora dele em dispositivos móveis
document.addEventListener("click", (e) => {
  if (
    window.innerWidth <= 768 &&
    !sidebar.contains(e.target) &&
    !sidebarToggle.contains(e.target) &&
    sidebar.classList.contains("open")
  ) {
    sidebar.classList.remove("open")
  }
})

// Adiciona evento de clique aos cards de módulos
moduleCards.forEach((card) => {
  card.addEventListener("click", () => {
    const module = card.getAttribute("data-module")
    // Aqui você pode adicionar a lógica para navegar para o módulo específico
    console.log(`Navegando para o módulo: ${module}`)

    // Exemplo de animação ao clicar
    card.style.transform = "scale(0.95)"
    setTimeout(() => {
      card.style.transform = ""
    }, 200)
  })
})

// Adiciona evento de clique aos botões de ação rápida
quickActionBtns.forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation() // Evita propagação do evento

    // Exemplo de animação ao clicar
    btn.style.transform = "scale(0.95)"
    setTimeout(() => {
      btn.style.transform = ""
    }, 200)

    // Aqui você pode adicionar a lógica para cada ação rápida
    const action = btn.querySelector("span").textContent
    console.log(`Executando ação: ${action}`)
  })
})

// Função para atualizar a data e hora
function updateDateTime() {
  const now = new Date()
  const options = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }

  // Aqui você pode atualizar um elemento com a data/hora atual se necessário
  // Por exemplo: document.getElementById('current-time').textContent = now.toLocaleDateString('pt-BR', options);
}

// Atualiza a data/hora a cada minuto
updateDateTime()
setInterval(updateDateTime, 60000)

// Simulação de notificações em tempo real (apenas para demonstração)
function simulateNewNotification() {
  const notificationsList = document.querySelector(".notifications-list")
  const notificationTypes = ["warning", "info", "success", "error"]
  const notificationMessages = [
    "Nova venda registrada",
    "Atualização do sistema disponível",
    "Backup automático concluído",
    "Erro na sincronização de dados",
  ]

  // Gera uma notificação aleatória
  const randomType = notificationTypes[Math.floor(Math.random() * notificationTypes.length)]
  const randomMessage = notificationMessages[Math.floor(Math.random() * notificationMessages.length)]

  // Cria o elemento de notificação
  const notificationItem = document.createElement("div")
  notificationItem.className = "notification-item unread"
  notificationItem.style.animation = "slideIn 0.3s ease-out forwards"

  // Define o ícone com base no tipo
  let icon = ""
  switch (randomType) {
    case "warning":
      icon = "exclamation-triangle"
      break
    case "info":
      icon = "info-circle"
      break
    case "success":
      icon = "check-circle"
      break
    case "error":
      icon = "times-circle"
      break
  }

  // Conteúdo da notificação
  notificationItem.innerHTML = `
        <div class="notification-icon ${randomType}">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="notification-content">
            <p>${randomMessage}</p>
            <span class="notification-time">Agora mesmo</span>
        </div>
    `

  // Adiciona a notificação ao início da lista
  if (notificationsList.firstChild) {
    notificationsList.insertBefore(notificationItem, notificationsList.firstChild)
  } else {
    notificationsList.appendChild(notificationItem)
  }

  // Remove a última notificação se houver mais de 4
  if (notificationsList.children.length > 4) {
    const lastNotification = notificationsList.lastChild
    lastNotification.style.animation = "slideOut 0.3s ease-out forwards"
    setTimeout(() => {
      notificationsList.removeChild(lastNotification)
    }, 300)
  }

  // Atualiza o contador de notificações
  const badge = document.querySelector(".notifications .badge")
  badge.textContent = Number.parseInt(badge.textContent) + 1
}

// Simula novas notificações a cada 30-60 segundos (apenas para demonstração)
setInterval(
  () => {
    // 50% de chance de gerar uma nova notificação
    if (Math.random() > 0.5) {
      simulateNewNotification()
    }
  },
  Math.random() * 30000 + 30000,
)
