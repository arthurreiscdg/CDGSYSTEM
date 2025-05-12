# PDFlow System

PDFlow System é uma aplicação desenvolvida em Django para gerenciar formulários e fluxos de produção de documentos.

## Estrutura do Projeto

A estrutura do projeto é organizada da seguinte forma:


## Funcionalidades

- **Formulários Dinâmicos**: Formulários como o ZeroHum permitem upload de arquivos PDF e Excel.
- **Processamento de Dados**: Integração com pandas para manipulação de dados em Excel.
- **Interface Responsiva**: Interface moderna e responsiva com HTML, CSS e JavaScript.
- **Gerenciamento de Usuários**: Sistema de autenticação e gerenciamento de usuários.
- **Webhooks**: Sistema de recebimento e envio de webhooks para integração com aplicações externas.
  - Recebe webhooks de pedidos externos
  - Envia notificações de alteração de status automaticamente
  - Configuração flexível de endpoints externos através do painel administrativo

## Webhooks

### Recebimento de Webhooks

O sistema pode receber webhooks de sistemas externos para criar pedidos. Para receber um webhook, a requisição POST deve ser enviada para `/webhooks/receber/` com uma estrutura JSON específica.

### Envio de Webhooks de Status

O sistema automaticamente envia webhooks para endpoints configurados sempre que o status de um pedido é alterado. Os webhooks enviados incluem:
- Data e hora da alteração
- Status anterior e novo status
- IDs do pedido e do status
- Informações do cliente

### Configuração de Endpoints

Para configurar um endpoint para recebimento de webhooks:

1. Acesse o painel administrativo em `/admin/`
2. Navegue até "Configurações de Endpoints de Webhook"
3. Clique em "Adicionar"
4. Preencha:
   - Nome do endpoint
   - URL de destino
   - Token de autenticação (opcional)
   - Cabeçalhos adicionais (opcional)
5. Ative ou desative o envio automático conforme necessário

## Requisitos

- Python 3.8+
- Django 3.2+
- Pandas
- Biblioteca para manipulação de arquivos Excel (como openpyxl)

## Configuração

1. Clone o repositório:
   ```bash
   git clone <url-do-repositorio>
   cd PDFLOW_SYSTEM

