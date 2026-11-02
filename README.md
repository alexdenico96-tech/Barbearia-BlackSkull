# ✂️ Barbearia BlackSkull

Sistema de agendamento e gestão para a **Barbearia BlackSkull**: os clientes se cadastram, escolhem serviço, data e um **horário livre**, e o barbeiro é avisado. Há também um painel administrativo privado com serviços, status dos agendamentos, filtros e faturamento.

- **Frontend:** React + Vite (hospedado na Vercel)
- **Backend:** Node.js + Express + SQLite (`better-sqlite3`), hospedado no Render

---

## ✨ Funcionalidades

**Cliente**
- Cadastro (com aceite do aviso de privacidade) e login.
- Escolha de serviço e data; a tela mostra só os **horários livres**, considerando a duração de cada serviço.
- **Meus agendamentos**: lista e cancelamento dos próprios horários.
- **Excluir minha conta** (LGPD): remove os dados pessoais, libera horários futuros e mantém o histórico sem identificação.
- Aviso ao barbeiro por e-mail (Formspree) e, opcionalmente, botão de **WhatsApp** — enviados somente quando o agendamento é gravado.

**Administrador**
- Login protegido, troca de senha e cadastro de serviços.
- Lista de agendamentos com filtros (período, status, busca por nome/telefone) e paginação.
- Alteração de status (Pendente, Confirmado, Concluído, Cancelado) e do serviço de cada agendamento.
- Faturamento de **hoje, da semana, do mês e total** (apenas agendamentos Concluídos).

**Regras de agendamento (backend)**
- Horário de funcionamento, dias de atendimento e antecedência máxima configuráveis.
- Sem datas passadas, sem horários fora do expediente e **sem sobreposição** (usa a duração do serviço).
- Cálculos no fuso de São Paulo, mesmo com o servidor em UTC.

**Segurança**
- Senhas com **bcrypt** (senhas antigas em texto puro são convertidas automaticamente, com backup prévio).
- JWT com segredo em variável de ambiente e **controle de permissão** (cliente × admin).
- `helmet`, limite de tentativas de login/cadastro, validação de todas as entradas e dados de clientes visíveis só para o admin.
- Backup automático diário do banco.

---

## 📁 Estrutura

```text
barbearia-blackskull/
├── backend/
│   ├── index.js            # Rotas da API
│   ├── database.js         # Conexão, schema, migrações e backup automático
│   ├── scheduling.js       # Regras de horários (testadas em test/)
│   ├── scripts/reset-admin.js   # Redefine e-mail/senha do admin
│   ├── test/scheduling.test.js
│   ├── testes.http         # Requisições de exemplo (REST Client)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/             # logo.webp, fundo.webp, favicon.png
│   ├── src/
│   │   ├── components/     # VisaoCliente, VisaoAdmin, ModalConfirmacao
│   │   ├── App.jsx  App.css  api.js  config.js  utils.js  main.jsx
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## 🚀 Rodando localmente

**Backend** (porta 3001):
```bash
cd backend
npm install
npm start          # sem JWT_SECRET, usa um segredo temporário em desenvolvimento
npm test           # testes das regras de agendamento
```
Para usar o seu banco, coloque o `barbearia.db` dentro de `backend/` (ele é ignorado pelo Git).

**Frontend** (porta 5173):
```bash
cd frontend
npm install
npm uninstall axios        # (uma vez) não é mais usado
echo VITE_API_URL=http://localhost:3001/api > .env
npm run dev
```

---

## ☁️ Publicação

### Backend (Render)
1. **Variáveis de ambiente** (Environment):
   - `JWT_SECRET` — **obrigatória**. Gere com: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
   - `DB_PATH=/var/data/barbearia.db`
   - `NODE_ENV=production`
2. **Disco persistente** (Disks → Add Disk, mount path `/var/data`). Sem ele, o Render apaga o banco a cada deploy.
3. Envie o seu `barbearia.db` para `/var/data/barbearia.db` (Shell do Render) e reinicie. Na primeira inicialização, as senhas são convertidas para hash e o banco ganha as colunas novas (`user_id`, `consent_at`) sem perder dados.
4. Opcionais: `OPEN_TIME`, `CLOSE_TIME`, `SLOT_MINUTES`, `BUSINESS_DAYS`, `MAX_ADVANCE_DAYS`, `MIN_NOTICE_MINUTES`, `TIMEZONE` (veja `backend/.env.example`).

### Frontend (Vercel)
Variáveis (Settings → Environment Variables): `VITE_API_URL` e, se quiser o botão de WhatsApp, `VITE_WHATSAPP` (somente números, ex.: `5511999999999`). Veja `frontend/.env.example`.

### Backups
O servidor salva uma cópia por dia em `<pasta do banco>/backups/` (últimas 7). Ela fica no mesmo disco do banco; **baixe uma cópia de vez em quando** para um lugar seguro.

### Esqueci a senha do admin
No Shell do Render, dentro de `backend`:
```bash
node scripts/reset-admin.js novo@email.com NovaSenhaForte123
```

---

## ✉️ Notificações ao barbeiro

- **E-mail:** configure `VITE_FORM_ENDPOINT` (Formspree). Com o valor vazio, o app abre o e-mail do cliente via `mailto:`.
- **WhatsApp:** defina `VITE_WHATSAPP`; após agendar, aparece um botão que abre a conversa com a mensagem pronta.

---

## 📄 Licença

Projeto desenvolvido como solução de gestão e agendamento para barbearias.
