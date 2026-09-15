# AtendeAI BR

> Plataforma SaaS de atendimento, CRM e automação comercial com foco em WhatsApp, construída sobre uma base Whaticket profundamente evoluída para operação multiempresa.

O **AtendeAI BR** centraliza atendimento, contatos, CRM, filas, campanhas, métricas e integrações em um único painel web. O produto é **WhatsApp-first**: hoje o canal externo real operacional é o WhatsApp, enquanto a arquitetura de adapters já está preparada para receber outros canais de forma desacoplada.

## O problema que o produto resolve

Empresas que atendem clientes por WhatsApp normalmente enfrentam quatro gargalos:

- vários colaboradores disputando o mesmo aparelho ou usando números pessoais;
- leads esquecidos ou respondidos tarde demais;
- ausência de controle sobre carteira, histórico e produtividade da equipe;
- operação comercial fragmentada entre WhatsApp, planilhas, anotações e ferramentas isoladas.

O AtendeAI BR transforma esse fluxo em uma operação centralizada, auditável, mensurável e integrável.

## O que já funciona de verdade

| Módulo | Estado atual |
| --- | --- |
| Atendimento WhatsApp multiusuário | ✅ Funcional |
| Tickets, mensagens, anexos e histórico | ✅ Funcional |
| Filas/departamentos e transferências | ✅ Funcional |
| RBAC com 5 papéis + SuperAdmin global | ✅ Funcional |
| Multi-tenancy por `companyId` | ✅ Funcional e testado |
| Contatos e importação | ✅ Funcional |
| Respostas rápidas | ✅ Funcional |
| Notas internas no ticket | ✅ Funcional |
| Chat interno entre colaboradores | ✅ Funcional |
| Dashboard operacional | ✅ Métricas reais |
| SLA por fila e alertas de espera | ✅ Funcional |
| CRM comercial | ✅ Persistente no backend |
| Pipeline/Kanban com drag-and-drop | ✅ Persistente + realtime |
| Tags em contatos/tickets | ✅ Funcional |
| Timeline comercial | ✅ Funcional |
| Agendamentos de mensagens | ✅ Funcional com fila |
| Listas de contatos | ✅ Funcional |
| Campanhas | ✅ BullMQ + Redis + progresso persistente |
| Opt-out de marketing | ✅ Funcional |
| API pública `/api/v1` | ✅ Funcional, versionada e autenticada |
| API Keys por tenant e scopes | ✅ Funcional |
| Webhooks assinados HMAC-SHA256 | ✅ Funcional + retry/DLQ |
| Integração n8n | ✅ Documentada via API + webhooks |
| ManyChat | ✅ Adapter preparado sobre API oficial documentada |
| SharkBot | 🟡 Contrato/adaptador preparado; ativação depende de documentação oficial suficiente |
| Agentes de IA nativos | 🗓️ Roadmap |
| Instagram / Telegram reais | 🗓️ Roadmap |
| WhatsApp Cloud API oficial | 🗓️ Roadmap |
| White-label / billing / planos server-side | 🗓️ Roadmap |

> Importante: o projeto não apresenta recursos futuros como se já estivessem disponíveis. IA, billing, Meta Cloud API, Instagram e Telegram só entram na oferta comercial quando suas respectivas fases forem concluídas e validadas.

## Principais capacidades

### Atendimento centralizado
- múltiplos atendentes usando a mesma operação de WhatsApp;
- tickets com estados de atendimento;
- filas/departamentos;
- atribuição e transferência entre usuários e filas;
- notas privadas da equipe;
- histórico corporativo preservado;
- atualização em tempo real via Socket.IO.

### Gestão e SLA
- tempo médio de espera real;
- tempo médio de atendimento real;
- volume por fila e por atendente;
- status online baseado em sessão Socket.IO;
- alertas de tickets acima do SLA;
- histórico completo de entrada em fila, atribuição, primeira resposta, transferência, encerramento e reabertura.

### CRM e Kanban
- pipelines múltiplos por empresa;
- etapas customizáveis;
- oportunidades/deals;
- responsável, prioridade, valor e status;
- drag-and-drop persistente;
- tags;
- timeline comercial;
- réguas de retenção para clientes inativos e aniversariantes.

### Campanhas e agendamentos
- listas de contatos;
- importação CSV/Excel;
- agendamentos de texto/mídia;
- campanhas com jobs individuais;
- BullMQ + Redis;
- retries com backoff;
- idempotência contra duplicidade;
- pausa, retomada e cancelamento;
- progresso persistente;
- janela de envio e cadência;
- opt-out para comunicação de marketing.

### API pública e integrações
- namespace público versionado em `/api/v1`;
- autenticação por chave específica do tenant;
- credenciais armazenadas por hash;
- scopes granulares por recurso/ação;
- expiração, revogação e rotação de chaves;
- `Idempotency-Key` para ações sensíveis;
- rate limit por credencial/tenant;
- webhooks de domínio assíncronos via BullMQ;
- assinatura HMAC-SHA256;
- retry com backoff e dead-letter;
- histórico de entregas;
- documentação de integração com n8n;
- adapters desacoplados para conectores externos.

### Convenções públicas de integração

As chaves geradas atualmente utilizam prefixo:

```text
atd_live_...
```

Os webhooks de saída usam os headers:

```text
X-Webhook-Signature
X-Webhook-Timestamp
X-Webhook-Event
X-Webhook-Id
```

A assinatura é HMAC-SHA256 calculada sobre `timestamp.payload`, com janela de proteção contra replay conforme documentação da integração.

## Segurança e arquitetura SaaS

A plataforma foi estruturada para operação multiempresa desde o backend:

- dados segregados por tenant;
- RBAC validado server-side;
- papéis canônicos: `visitor`, `collaborator`, `agent`, `manager`, `admin`;
- `isSuperAdmin` separado dos papéis internos do tenant;
- auditoria de ações sensíveis;
- rate limiting e Helmet;
- healthcheck e readiness;
- Socket.IO segregado por empresa;
- workers assíncronos para tarefas pesadas;
- API pública não expõe automaticamente as rotas internas;
- tenant de API derivado da credencial, nunca de `companyId` arbitrário enviado pelo cliente;
- nenhuma credencial deve ser versionada no Git.

## Stack principal

### Backend
- Node.js + TypeScript
- Express
- Sequelize
- MySQL / MariaDB
- Redis
- BullMQ
- Socket.IO
- Jest

### Frontend
- React
- Material UI
- React Router
- Axios
- Socket.IO Client

### Canal atual
- WhatsApp através do provider atual baseado em sessão web.
- O domínio usa `ChannelManager`/adapters para permitir novos provedores sem reescrever o core.

## Arquitetura de alto nível

```text
Frontend React
     │
     ▼
REST interno + Socket.IO
     │
     ├── Auth / RBAC / Multi-tenant
     ├── Atendimento / Tickets / Mensagens
     ├── CRM / Pipeline / Tags
     ├── SLA / Lifecycle / Dashboard
     ├── Campanhas / Agendamentos
     │        └── BullMQ + Redis Workers
     ├── Integrações
     │        ├── API Pública /api/v1
     │        ├── API Keys + Scopes
     │        ├── Webhooks HMAC
     │        ├── n8n
     │        └── Adapters externos
     └── ChannelManager
              └── WhatsApp Adapter
```

## Perfis de usuário

| Perfil | Uso principal |
| --- | --- |
| `visitor` | visualização restrita |
| `collaborator` | acompanhamento interno |
| `agent` | atendimento operacional |
| `manager` | gestão de equipe, filas e operação |
| `admin` | administração completa do tenant |
| `isSuperAdmin` | governança global da plataforma, fora do profile do tenant |

## Público ideal

O produto é especialmente adequado a empresas com aproximadamente **2 a 15 pessoas atendendo clientes pelo WhatsApp**, incluindo:

- autopeças e distribuidores;
- materiais de construção e comércio especializado;
- clínicas, estética e veterinária;
- imobiliárias;
- oficinas e assistências técnicas;
- contabilidades e prestadores de serviços;
- pequenas e médias equipes comerciais.

## Proposta de valor comercial

A venda não deve ser baseada em “software de ticket”. A proposta é:

> **centralizar o WhatsApp da empresa, reduzir atendimentos perdidos, preservar a carteira de clientes e dar ao gestor controle sobre a operação comercial.**

Perguntas de descoberta úteis:

- Quantos clientes mandam mensagem e ficam esperando resposta?
- Quantas pessoas precisam atender o mesmo número?
- O gestor consegue saber quem respondeu, quanto demorou e o que ficou pendente?
- Se um vendedor sair, o histórico e a carteira continuam na empresa?
- Quantas vezes a equipe responde as mesmas perguntas manualmente?

## Estrutura comercial sugerida

Os valores abaixo são uma **proposta comercial**, não significam que limites e cobrança já estejam tecnicamente automatizados. Entitlements e billing server-side fazem parte da próxima fase SaaS.

| Oferta | Posicionamento | Mensalidade de referência | Implantação |
| --- | --- | ---: | ---: |
| **Start** | operação pequena, atendimento centralizado | R$ 97–147 | R$ 0–97 |
| **Pro** | gestão, CRM, SLA e onboarding guiado | R$ 247–397 | R$ 300–500 |
| **Scale** | operação maior, campanhas, integrações e acompanhamento | R$ 597–997 | R$ 1.500–3.000 |

### Start
- 1 operação/conexão WhatsApp como referência comercial;
- até 3 usuários como referência comercial;
- atendimento, contatos, filas básicas e respostas rápidas;
- onboarding self-service.

### Pro
- mais usuários/conexões conforme contrato;
- CRM/Kanban;
- métricas e SLA;
- configuração de filas, tags e pipeline;
- treinamento da equipe;
- suporte prioritário.

### Scale
- operação dimensionada conforme demanda;
- campanhas, agendamentos e listas;
- API pública, webhooks e integrações externas;
- onboarding consultivo;
- acompanhamento operacional.

**Agentes de IA serão adicionados como diferencial High Ticket somente após a fase específica de IA estar concluída.**

## Como rodar localmente

### Requisitos
- Node.js compatível com a configuração atual do projeto;
- MySQL/MariaDB;
- Redis;
- variáveis de ambiente configuradas a partir dos arquivos `.env.example`.

### Backend

```bash
cd backend
npm install
npx sequelize db:migrate
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm start
```

Nunca versione `.env`, tokens, sessões do WhatsApp, cookies ou credenciais.

## Estado e documentação

Documentos canônicos do projeto:

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — arquitetura e decisões estruturais;
- [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) — estado funcional, auditorias e pendências;
- [`docs/integrations/n8n.md`](docs/integrations/n8n.md) — integração n8n/API/webhooks.

A execução é rastreada por Issues e commits no GitHub. O repositório é a fonte de verdade.

## Roadmap imediato

1. **#18 — SaaS comercial: planos, onboarding, branding e billing-ready**
2. **#19 — Hardening de produção: segurança, backup, observabilidade, deploy e recuperação**
3. **#20 — Agentes de IA nativos: RAG, tools/actions e handoff humano**
4. **#21 — WhatsApp Cloud API oficial como adapter alternativo para operações de maior escala**
5. **Canais futuros — Instagram e Telegram via adapters independentes**

O plano de lançamento comercial está rastreado na **Issue #22** e pode ser preparado em paralelo. Aquisição paga em escala deve esperar a conclusão do hardening de produção.

## Estratégia de lançamento

O primeiro lançamento deve focar no que já está validado:

**WhatsApp + multiatendimento + filas + CRM + SLA + campanhas/agendamentos + integrações.**

Evitar vender IA, omnichannel completo, Cloud API oficial ou billing automatizado antes dessas etapas existirem no produto.

A abordagem recomendada é iniciar por **um nicho e uma região por vez**, com demonstração real do painel, onboarding próximo e coleta rápida de prova social. Depois de validar conversão, suporte e retenção, expandir para outros segmentos.

## Fluxo de desenvolvimento

1. necessidade entra como Issue;
2. implementação acontece sobre a `main`/fluxo definido;
3. testes e build devem passar;
4. resultado é registrado na Issue;
5. GitHub permanece como fonte de verdade.

---

**AtendeAI BR** — atendimento, CRM, automação comercial e integrações centrados no WhatsApp, com arquitetura preparada para crescer sem perder controle do tenant, do histórico e da operação.
