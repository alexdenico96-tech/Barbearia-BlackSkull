# ✂️ Barbearia BlackSkull

Sistema de gestão e agendamento de serviços para a **Barbearia BlackSkull**. Este projeto oferece uma plataforma web interativa, responsiva e moderna que permite aos clientes realizar agendamentos em linha e notificar o barbeiro por e-mail, além de fornecer um painel administrativo privado para gestão de serviços, controlo de estados de agendamento e cálculo automático de faturamento.

---

## 📌 Características Principais

### 👤 Área do Cliente
* **Autenticação Completa**: Registo e login de clientes com persistência de token via `localStorage`.
* **Agendamento Interativo**: Formulário dinâmico para seleção de serviço, data e horário.
* **Notificações por E-mail**: Disparo de aviso automático ao barbeiro ao confirmar um agendamento (via Formspree ou fallback com `mailto:`).

### 🛠️ Painel Administrativo
* **Acesso Protegido**: Autenticação única para o administrador com verificação de perfil (`CHECK (id = 1)` em SQLite).
* **Gestão de Serviços**: Cadastro e alteração de novos serviços com preço e duração.
* **Edição em Tempo Real**: Alteração direta do serviço associado a cada agendamento na tabela.
* **Controlo de Estados**: Atualização de estado das reservas (*Pendente*, *Concluído*, *Cancelado*).
* **Cálculo de Faturamento**: Soma automática dos ganhos baseada exclusivamente nos serviços marcados como *Concluídos*.
* **Modal Moderno de Exclusão**: Componente flutuante no centro do ecrã (`ModalConfirmacao`) para eliminação segura de agendamentos.

### 🎨 Design e Interface
* **Proporções Dinâmicas**: Cartão compacto (`card-compact`) para ecrãs de autenticação e expandido (`card-wide`) para a visão administrativa.
* **Alternância de Tema**: Seletor de modo claro/escuro (`☀️`/`🌙`) fixo no canto superior direito com persistência de preferência.
* **Identidade Visual**: Logótipo circular (`Skull Dourado.png`) nos formulários e imagem de fundo translúcida com iluminação âmbar.

---

## 🛠️ Tecnologias Utilizadas

* **Frontend**: React.js, Vite, CSS3 (variáveis CSS e layout responsivo sem dependências externas de UI).
* **Backend**: Node.js, Express.js.
* **Base de Dados**: SQLite local (`better-sqlite3` / `sqlite3`).
* **Notificações**: API REST via [Formspree](https://formspree.io/) ou protocolo cliente `mailto:`.

---

## 📁 Estrutura do Projeto

```text
barbearia-blackskull/
├── backend/
│   ├── database.db          # Ficheiro da base de dados SQLite
│   ├── index.js             # Servidor Express e rotas da API
│   └── package.json
├── frontend/
│   ├── public/
│   │   ├── Barbearia Moderna com Iluminação Âmbar.png
│   │   └── Skull Dourado.png
│   ├── src/
│   │   ├── components/
│   │   │   ├── ModalConfirmacao.jsx  # Modal flutuante para confirmar exclusão
│   │   │   ├── VisaoAdmin.jsx        # Painel de controlo do administrador
│   │   │   └── VisaoCliente.jsx      # Autenticação e reservas do cliente
│   │   ├── App.jsx                   # Componente principal e controlo de temas
│   │   ├── App.css                   # Estilos globais e responsividade
│   │   └── main.jsx
│   └── package.json
└── README.md
```

---

## 🚀 Instruções de Instalação e Execução

Siga os passos abaixo para executar o projeto no seu ambiente local:

### 1. Clonar o Repositório
```bash
git clone https://github.com/seu-usuario/barbearia-blackskull.git
cd barbearia-blackskull
```

### 2. Configurar e Executar o Backend
No terminal, entre na pasta `backend`:
```bash
cd backend
npm install
npm start
```
*O servidor backend estará ativo em `http://localhost:3001`.*

### 3. Configurar e Executar o Frontend
Num segundo terminal, entre na pasta `frontend`:
```bash
cd frontend
npm install
npm run dev
```
*A aplicação web estará disponível na URL indicada pelo Vite (geralmente `http://localhost:5173`).*

---

## ✉️ Configuração da Notificação por E-mail (Formspree)

Para ativar a notificação por e-mail ao barbeiro:
1. Crie uma conta no [formspree.io](https://formspree.io/).
2. Crie um novo formulário e aponte para o e-mail onde deseja receber os agendamentos.
3. Copie o URL gerado (exemplo: `https://formspree.io/f/seu-id`).
4. No ficheiro `frontend/src/components/VisaoCliente.jsx`, defina o URL na constante `CONFIG.formEndpoint`:

```javascript
const CONFIG = {
  formEndpoint: "https://formspree.io/f/seu-id",
  emailBarbeiro: "barbeiro@blackskull.com"
};
```

*Nota: Se `formEndpoint` for mantido vazio (`""`), a aplicação abrirá automaticamente o cliente de e-mail padrão via `mailto:`.*

---

## 📄 Licença

Este projeto foi desenvolvido como uma solução de software para gestão e agendamento de barbearias.