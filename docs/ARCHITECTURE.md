# Arquitetura — Whaticket AtendeAI BR

## Visão Geral

O Whaticket é um sistema de atendimento baseado em WhatsApp com arquitetura monolítica composta por:

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│         React 16 + Vite + Material UI v4         │
│                                                  │
│  Pages: Dashboard, Tickets, Contacts, Users,     │
│         Queues, Settings, Connections,            │
│         QuickAnswers, Login, Signup               │
└─────────────┬───────────────┬────────────────────┘
              │ REST API      │ WebSocket
              │ (Axios)       │ (Socket.IO)
              ▼               ▼
┌─────────────────────────────────────────────────┐
│                   Backend                        │
│      Node.js + Express + TypeScript              │
│                                                  │
│  Routes → Controllers → Services → Models        │
│                                                  │
│  Providers:                                      │
│    ├── wwebjs (whatsapp-web.js)                  │
│    └── whaileys (Baileys fork)                   │
└──────┬──────────────┬──────────────┬─────────────┘
       │              │              │
       ▼              ▼              ▼
   ┌────────┐   ┌──────────┐   ┌──────────┐
   │ MySQL  │   │  Redis   │   │ WhatsApp │
   │MariaDB │   │ (cache,  │   │  (API    │
   │        │   │ sessions)│   │  Web)    │
   └────────┘   └──────────┘   └──────────┘
```

## Backend

### Estrutura de Diretórios

```
backend/src/
├── config/         # Configurações (auth, database, upload)
├── controllers/    # Handlers de rotas Express
├── database/       # Sequelize: migrations e seeds
│   ├── migrations/ # 37 migrations (2020–2024)
│   └── seeds/      # 3 seeders (users, settings, apiToken)
├── errors/         # Classes de erro customizadas
├── handlers/       # Event handlers (WhatsApp events)
├── helpers/        # Funções auxiliares
├── libs/           # Inicialização de serviços (Redis, Socket.IO)
├── middleware/     # Middlewares Express (isAuth, isAdmin)
├── models/         # 12 modelos Sequelize
├── providers/      # Implementações WhatsApp (wwebjs, whaileys)
├── routes/         # 11 arquivos de rotas
├── services/       # Lógica de negócio (CRUD, WhatsApp bot)
└── utils/          # Utilitários (logger)
```

### Modelos de Banco

| Modelo | Descrição | Relações Principais |
|--------|-----------|-------------------|
| User | Agentes/admins | HasMany Ticket, BelongsToMany Queue |
| Contact | Contatos WhatsApp | HasMany Ticket, HasMany ContactCustomField |
| Ticket | Conversas/atendimentos | BelongsTo User, Contact, Queue, Whatsapp |
| Message | Mensagens individuais | BelongsTo Ticket, Contact |
| Whatsapp | Conexões WhatsApp | HasMany Ticket, BelongsToMany Queue |
| Queue | Filas de atendimento | BelongsToMany User, Whatsapp |
| QuickAnswer | Respostas rápidas | — |
| Setting | Configurações globais | — |
| WppKey | Chaves WhatsApp | BelongsTo Whatsapp |
| UserQueue | Pivot User↔Queue | — |
| WhatsappQueue | Pivot Whatsapp↔Queue | — |
| ContactCustomField | Campos customizados | BelongsTo Contact |

### Rotas da API

| Grupo | Endpoints | Autenticação |
|-------|----------|-------------|
| Auth | `POST /auth/signup`, `/login`, `/refresh_token`, `DELETE /logout` | Público (signup/login) |
| Users | `GET/POST /users`, `GET/PUT/DELETE /users/:id` | JWT |
| Contacts | `GET/POST /contacts`, `GET/PUT/DELETE /contacts/:id` | JWT |
| Tickets | `GET/POST /tickets`, `GET/PUT/DELETE /tickets/:id` | JWT |
| Messages | `GET/POST /messages/:ticketId`, `DELETE /messages/:id` | JWT |
| WhatsApp | `GET/POST /whatsapp/`, `GET/PUT/DELETE /whatsapp/:id` | JWT |
| Sessions | `POST/PUT/DELETE /whatsappSession/:id` | JWT |
| Queues | `GET/POST /queue`, `GET/PUT/DELETE /queue/:id` | JWT |
| QuickAnswers | `GET/POST /quickAnswers`, `GET/PUT/DELETE /quickAnswers/:id` | JWT |
| Settings | `GET /settings`, `PUT /settings/:key` | JWT |
| API | `POST /api/messages/send` | API Token |

### Autenticação

- JWT com access token + refresh token
- Access token: validado pelo middleware `isAuth`
- Refresh token: armazenado em cookie HttpOnly
- Token Version: campo `tokenVersion` no User para invalidação
- Roles: `admin` e `user`

### WebSocket (Socket.IO)

**Eventos escutados:**
- `joinChatBox` / `joinNotification` / `joinTickets` — entrar em rooms

**Eventos emitidos:**
- `appMessage` — nova mensagem
- `ticket` — atualização de ticket
- `contact` — atualização de contato
- `user`, `queue`, `whatsapp`, `settings`, `quickAnswer` — atualizações de entidades

### WhatsApp Providers

O backend suporta dois providers (configurável via `WHATSAPP_PROVIDER`):

1. **wwebjs** — `whatsapp-web.js`: Puppeteer-based, emula WhatsApp Web
2. **whaileys** — Fork do Baileys: WebSocket direto ao WhatsApp, multi-device

## Frontend

### Estrutura de Diretórios

```
frontend/src/
├── assets/       # Imagens e recursos estáticos
├── components/   # Componentes reutilizáveis (Modais, Chat, etc.)
├── config.js     # Configuração (backend URL)
├── context/      # React Contexts (Auth, WhatsApp, DarkMode)
├── errors/       # Tratamento de erros (toasts)
├── hooks/        # Custom hooks (useAuth, useTickets, etc.)
├── layout/       # Layout principal (sidebar, header)
├── pages/        # 10 páginas da aplicação
├── routes/       # Definições de rotas
├── services/     # API client (axios) e Socket.IO client
└── translate/    # i18n (i18next)
```

### Páginas

| Rota | Página | Descrição |
|------|--------|-----------|
| `/login` | Login | Autenticação |
| `/signup` | Signup | Registro de usuário |
| `/` | Dashboard | Métricas e visão geral |
| `/tickets/:id?` | Tickets | Interface principal de chat |
| `/connections` | Connections | Gerenciamento de conexões WhatsApp |
| `/contacts` | Contacts | Lista e gerenciamento de contatos |
| `/users` | Users | Gerenciamento de agentes |
| `/quickAnswers` | QuickAnswers | Respostas rápidas |
| `/Settings` | Settings | Configurações do sistema |
| `/Queues` | Queues | Filas de atendimento |

### Fluxo de Autenticação

1. Usuário faz login → recebe JWT
2. Token armazenado em `localStorage`
3. Axios interceptor adiciona `Bearer token` em cada request
4. Se 403 → tenta refresh via `/auth/refresh_token`
5. Se 401 → logout automático
6. Rotas privadas verificam `isAuth` via Context
