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

## Matriz Funcional do Frontend (Auditoria e Compatibilização — Issue #13)

Auditoria funcional detalhada do frontend avançado sincronizado a partir de `AtendeaiSETUP` (com módulo de CRM integrado) contra o backend oficial.

| Módulo / Tela | Recurso / Ação | Status Real | Endpoints Utilizados | Problema Encontrado | Correção Aplicada | Pendências |
|---|---|---|---|---|---|---|
| **Autenticação** | Login (`/login`) | Funcional com backend real | `POST /auth/login` | Nenhum erro bloqueante. Redirecionamento e JWT válidos. | Sincronizado contexto de autenticação com armazenamento local de token e dados do usuário. | Migração para cookies `HttpOnly` em fase futura de segurança. |
| **Autenticação** | Registro (`/signup`) | Funcional com backend real | `POST /auth/signup` | Formato do payload compatibilizado com empresa e usuário default. | Suporte a criação de tenant/empresa e primeiro admin no signup. | Nenhuma. |
| **Autenticação** | Logout & Sessão | Funcional com backend real | `POST /auth/logout`, `POST /auth/refresh_token` | Nenhum. | Limpeza correta de estado e desconexão de sockets. | Nenhuma. |
| **Dashboard** | Métricas consolidadas (`/dashboard`) | Funcional com backend real | `GET /dashboard?days=...` | Frontend avançado esperava `GET /dashboard` com métricas consolidadas (`supportPending`, `supportHappening`, `supportFinished`, `leads`, `avgSupportTime`, `avgWaitTime`, `attendants`), enquanto o backend só tinha rotas legadas. | Criado `DashboardController.ts` e rota `GET /dashboard` com agregação em tempo real dos tickets e contatos da empresa com isolamento multi-tenant. | Nenhuma. |
| **Atendimentos (Tickets)** | Gestão de Tickets (`/tickets`) | Funcional com backend real | `GET /tickets`, `POST /tickets`, `PUT /tickets/:ticketId`, `DELETE /tickets/:ticketId` | Visualização avançada com abas e filtros por fila/usuário. | Preservadas rotas oficiais e eventos de socket `ticket` / `appMessage`. | Nenhuma. |
| **Mensagens** | Envio e Recebimento no Ticket | Funcional com backend real | `GET /messages/:ticketId`, `POST /messages/:ticketId` | Envio de mensagens de texto e mídia em tickets WhatsApp. | Comunicação bidirecional preservada com WhatsApp Web provider. | Nenhuma. |
| **Notas Internas** | Notas no Ticket (`TicketNotesDialog`) | Funcional com backend real | `GET /tickets/:ticketId/notes`, `POST /tickets/:ticketId/notes`, `DELETE /ticket-notes/:ticketNoteId` | Hook `useTicketNotes` utilizava payload com campo `note` e rota de exclusão direta `/ticket-notes/:id`, enquanto backend exigia campo `body` e não tinha rota DELETE. | Implementada rota `DELETE /ticket-notes/:ticketNoteId` no backend; controller passou a aceitar `body` ou `note`; hook do frontend adaptado para mapeamento bidirecional. | Nenhuma. |
| **Chat Interno** | Mensagens entre Usuários (`/chats`) | Funcional com backend real | `GET /internal-chat/users`, `GET /internal-chat/messages/:targetUserId`, `POST /internal-chat/messages`, `PUT /internal-chat/read/:targetUserId` | Componente continha encadeamento opcional solto em expressão gerando falha de build (`no-unused-expressions`) no Babel do CRA. Backend não possuía o alias de rota `PUT /read/:targetUserId`. | Corrigido código para `if (ref.current) ref.current.scrollIntoView(...)`, adicionada rota `PUT /internal-chat/read/:targetUserId` e conectado evento `company-${companyId}-internal-chat`. | Nenhuma. |
| **Respostas Rápidas** | Gestão de Mensagens Rápidas (`/quick-messages`) | Funcional com backend real | `GET /quick-messages`, `POST /quick-messages`, `PUT /quick-messages/:id`, `DELETE /quick-messages/:id` | Frontend avançado requisitava `/quick-messages` esperando resposta `{ records: [...], count }` e evento socket `company${companyId}-quickemessage`, divergindo de `/quickAnswers`. | Adicionados aliases `/quick-messages` no backend, retorno dual (`records` e array) e emissão do evento socket correspondente. | Nenhuma. |
| **Contatos** | Listagem, Edição e Importação (`/contacts`) | Funcional com backend real | `GET /contacts`, `POST /contacts`, `PUT /contacts/:id`, `DELETE /contacts/:id`, `POST /contacts/import` | Nenhum erro funcional detectado. | Mantido fluxo oficial com isolamento de tenant. | Nenhuma. |
| **Conexões** | Conexão WhatsApp / QR Code (`/connections`) | Funcional com backend real | `GET /whatsapp`, `POST /whatsapp`, `PUT /whatsapp/:id`, `DELETE /whatsapp/:id`, `POST /whatsappsession/:id`, `DELETE /whatsappsession/:id` | Interface possui cards visuais demonstrativos para outros canais. | Preservada conexão WhatsApp funcional; canais externos mantidos desabilitados para envio. | Implementação de canais adicionais (Instagram/Telegram) nas próximas fases. |
| **Filas** | Gestão de Departamentos / Filas (`/queues`) | Funcional com backend real | `GET /queue`, `POST /queue`, `PUT /queue/:id`, `DELETE /queue/:id` | Seleção de cores e mensagens de saudação compatibilizadas com o schema do banco. | Rotas e validações mantidas. | Nenhuma. |
| **Usuários & RBAC** | Gestão de Usuários e Perfis (`/users`) | Funcional com backend real | `GET /users`, `POST /users`, `PUT /users/:id`, `DELETE /users/:id` | Existiam divergências históricas nos papéis (`user`, `supervisor`, `superadmin`). | Matriz canônica unificada de 5 papéis: `visitor`, `collaborator`, `agent`, `manager`, `admin`, com `isSuperAdmin` modelado como privilégio global booleano separado (não como papel comum do tenant). Migração executada com compatibilidade retroativa para aliases antigos. | Nenhuma. |
| **Dashboard** | Métricas consolidadas (`/dashboard`) | Funcional com backend real | `GET /dashboard?days=...` | Existiam valores fictícios hardcoded (12, 4, 0, online: true). | Métricas 100% reais: `avgSupportTime` calculado a partir dos tickets finalizados no período (ou `null` se insuficiente); `avgWaitTime: null` e `rating: null` (explicitamente indisponíveis nesta fase); contagem respeita filtro `days`; status `online` dos atendentes calculado a partir de conexões ativas no Socket.IO. | Nenhuma. |
| **CRM Comercial** | Funil de Vendas, Leads e Pipeline (`/crm`) | Funcional com backend real | `GET/POST /crm/pipelines`, `GET/POST/PUT/DELETE /crm/deals`, `PUT /crm/deals/:id/stage`, `GET /crm/deals/:id/timeline`, `GET/PUT /crm/config`, `GET /crm/retention/missing`, `GET /crm/retention/birthdays` | O módulo utilizava apenas armazenamento local e não persistia no backend. | Criadas tabelas `Pipelines`, `PipelineStages`, `Deals`, `DealTimelines` e `CrmConfigs` no banco MySQL com isolamento multi-tenant, suporte a múltiplos funis, drag-and-drop persistente, auditoria de mudanças de estágio em timeline e réguas de retenção automatizadas. `crmStorage.js` refatorado para consultar e persistir diretamente nas APIs REST, usando cache local apenas como fallback. | Nenhuma. |
| **Kanban & Tags** | Quadro Kanban e Etiquetas (`/kanban`, `/tags`) | Funcional com backend real | `GET/POST/PUT/DELETE /tags`, `GET /tags/kanban`, `GET /ticket/kanban`, `PUT/DELETE /ticket-tags/:ticketId/:tagId` | Tabelas de etiquetas e vinculações não existiam no backend. | Criadas tabelas `Tags`, `TicketTags` e `ContactTags` com isolamento multi-tenant, CRUD completo, ordenação e flag `kanban`. Corrigida assinatura do drag-and-drop do `react-trello` no frontend (`handleCardMove`) para persistência imediata das trocas de estágio no backend via `/ticket-tags`. Sincronização em tempo real via Socket.IO implementada. | Nenhuma. |
| **Tarefas** | Lista de Tarefas / To-Do (`/todolist`) | Funcional no frontend com storage local | Nenhum (Persistência via `localStorage`) | Componente visual sem tabela no backend. | Mantido funcional no navegador para uso das equipes de atendimento. | Persistência remota opcional em fase futura. |
| **Agendamentos** | Disparos Agendados (`/schedules`) | Sem backend correspondente | Esperaria `GET /schedules`, `POST /schedules` | Não há tabelas de agendamento ou filas Bull ativas no backend para schedules. | Interface visual preservada. | Implementação do agendador com Bull/Redis em fase futura. |
| **Campanhas** | Campanhas e Listas de Contatos (`/campaigns`, `/contact-lists`) | Sem backend correspondente | Esperaria `GET /campaigns`, `GET /contact-lists` | Sistema de disparo em massa não implementado no backend. | Interface visual mantida sem quebrar a execução. | Implementação do motor de campanhas e listas na fase de disparos. |
| **Faturamento** | Financeiro e Planos (`/financeiro`, `/subscription`) | Sem backend correspondente | Esperaria `GET /invoices`, `GET /plans` | Hook `usePlans` quebrava a renderização com erro 404 em rotas de billing ausentes. | Adicionado tratamento defensivo (`try/catch`) com plano default no `usePlans`, eliminando crashes de tela. | Implementação do módulo completo de faturamento/billing na fase dedicada. |
| **IA & Chatbots** | Integrações Typebot / N8N / Webhooks (`/prompts`, `/queue-integration`) | Sem backend correspondente | Esperaria `/prompts`, `/queueIntegrations` | Recursos avançados de inteligência artificial e webhooks externos. | Telas catalogadas e mantidas isoladas. | Implementação nas fases de automações e IA. |
| **Ajuda e Avisos** | Central de Ajuda e Comunicados (`/helps`, `/announcements`) | Sem backend correspondente | Esperaria `/helps`, `/announcements` | Telas de ajuda e comunicados sem tabelas correspondentes. | Visual preservado. | Implementação de comunicados globais em fase posterior. |
