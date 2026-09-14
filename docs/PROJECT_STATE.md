# Estado do Projeto — Whaticket AtendeAI BR

> Auditoria técnica realizada em 14/09/2026

## O que funciona ✅

### Frontend
- ✅ `npm install` — 474 pacotes instalados sem erros
- ✅ `npm run build` (Vite) — compila em ~9s sem erros
- ✅ `npm run dev` — Vite dev server inicia corretamente
- ✅ Todas as 10 páginas definidas e importadas (Dashboard, Tickets, Contacts, Users, Queues, Settings, Connections, QuickAnswers, Login, Signup)
- ✅ Sistema de rotas funcionando (react-router-dom v5)
- ✅ i18n configurado (pt-BR e en)
- ✅ Dark mode implementado via Context
- ✅ Socket.IO client configurado

### Backend
- ✅ `npm install` — 1265 pacotes instalados sem erros
- ✅ `npm run build` (tsc) — compila sem erros (após fix mínimo)
- ✅ Estrutura de 37 migrations e 3 seeders
- ✅ 12 modelos Sequelize com relações definidas
- ✅ 11 grupos de rotas cobrindo todas as funcionalidades
- ✅ Autenticação JWT com refresh token
- ✅ Socket.IO server configurado
- ✅ Redis integration para cache e sessions
- ✅ Dois providers WhatsApp (wwebjs e whaileys)
- ✅ Sentry integration para error tracking

## O que está quebrado / requer atenção ⚠️

### Bugs Corrigidos (Fase 0)

| ID | Severidade | Descrição | Status |
|----|-----------|-----------|--------|
| B1 | P0 | `session` property deprecated no whatsapp-web.js Client | ✅ Corrigido |

### Bugs Conhecidos (não corrigidos nesta fase)

| ID | Severidade | Descrição |
|----|-----------|-----------|
| B2 | P2 | JWT fallback hardcoded em `config/auth.ts` ("mysecret") — funciona mas inseguro se .env não for configurado |
| B3 | P3 | JWT armazenado em localStorage (vulnerável a XSS) — padrão do Whaticket community |
| B4 | P3 | Chunks grandes no build do frontend (>500KB) — precisa code-splitting |

## Funcionalidades Incompletas

Nenhuma funcionalidade está mockada ou incompleta na base community. Todas as páginas e rotas têm implementação real conectada ao backend.

## Endpoints / APIs

Todos os endpoints do backend existem e possuem controllers + services implementados:

| Grupo | Status |
|-------|--------|
| Auth (login/signup/refresh/logout) | ✅ Completo |
| Users CRUD | ✅ Completo |
| Contacts CRUD + Import | ✅ Completo |
| Tickets CRUD | ✅ Completo |
| Messages CRUD | ✅ Completo |
| WhatsApp connections CRUD | ✅ Completo |
| WhatsApp sessions (start/update/delete) | ✅ Completo |
| Queues CRUD | ✅ Completo |
| QuickAnswers CRUD | ✅ Completo |
| Settings (read/update) | ✅ Completo |
| API externa (envio de mensagens) | ✅ Completo |

## Vulnerabilidades de Dependências

### Backend (55 vulnerabilidades)
| Severidade | Quantidade |
|-----------|-----------|
| Crítica | 4 |
| Alta | 21 |
| Moderada | 25 |
| Baixa | 5 |

### Frontend (8 vulnerabilidades)
| Severidade | Quantidade |
|-----------|-----------|
| Alta | 5 |
| Moderada | 3 |

### Dependências que precisam de atenção

| Severidade | Pacote | Problema |
|-----------|--------|---------|
| CRÍTICO | Node 14 target | End-of-life; @types/node ^14.11.8 |
| CRÍTICO | whatsapp-web.js | GitHub fork, não versionado no npm |
| ALTO | sequelize ^5.22.3 | Versão 5, migrar para 6/7 |
| ALTO | React ^16.13.1 | Legacy, migrar para 18+ |
| ALTO | Material UI v4 | Sem manutenção ativa desde Set/2021 |
| ALTO | multer ^1.4.2 | CVE-2022-24434 |
| MÉDIO | axios ^0.21.1 | SSRF bypass CVEs |
| MÉDIO | react-router-dom ^5.2.0 | v5 → v6 recomendado |
| MÉDIO | eslint ^7.10.0 | EOL, v8+ disponível |
| BAIXO | date-fns ^2.16.1 | Funcional, v3+ disponível |
| BAIXO | i18next ^19.8.2 | Funcional, versões novas disponíveis |

## Dívida Técnica

1. **Stack desatualizada** — Node 14, React 16, Sequelize 5, MUI v4
2. **Frontend em JavaScript** — sem TypeScript, propenso a erros de tipo
3. **Sem testes frontend** — apenas testes backend (jest)
4. **JWT em localStorage** — risco XSS
5. **Sem rate limiting** — API aberta sem proteção contra abuso
6. **Sem healthcheck endpoint** — dificulta monitoramento
7. **CORS depende de env var** — se FRONTEND_URL não estiver setada, comportamento imprevisível
8. **Code splitting** — bundle principal do frontend > 1.5MB

## Próximos Passos Recomendados

### Fase 1 — Backend próprio (Issue #3)
- Garantir que o backend roda com MySQL/Redis
- Adicionar healthcheck endpoint
- Implementar rate limiting básico
- Preparar para multi-tenancy

### Fase 2 — Atualização de Stack
- Migrar Node target para 18/20
- Atualizar Sequelize 5 → 6
- Considerar migração React 16 → 18
- Considerar migração MUI v4 → v5

### Fase 3 — Segurança
- Migrar JWT de localStorage para HttpOnly cookies
- Adicionar rate limiting
- Atualizar axios, multer, e dependências com CVEs
- Implementar CSP headers
