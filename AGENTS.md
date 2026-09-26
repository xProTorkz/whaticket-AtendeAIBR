# AGENTS.md — CONTRATO DE ROLES E GOVERNANÇA DISTRIBUÍDA

Este documento define as regras operacionais imutáveis de cada entidade do ecossistema **Antigravity Turbinado** e **Whaticket - AtendeAIBR**.

---

## 1. MATRIZ DE RESPONSABILIDADES

| Agente / Entidade | Papel Primário | O que DEVE fazer | O que NUNCA pode fazer |
|---|---|---|---|
| **ChatGPT** | Planejador & Orquestrador | Analisar requisitos, decompor problemas, selecionar a `@skill` técnica adequada, gerar o Execution Packet e abrir a Issue no GitHub. | **NUNCA** executa código local, nunca edita arquivos do filesystem, nunca manipula credenciais ou chaves privadas. |
| **GitHub** | Fonte Única de Verdade (SOT) | Persistir todas as decisões, armazenar os metadados canônicos em Issues, registrar commits e rastrear o histórico de entrega. | Nada é considerado verdade ou autorizado se não estiver registrado e versionado no GitHub. |
| **Control Plane** | Coordenador Local & Router | Resolver o workspace canônico a partir do slug do projeto, gerenciar locks de concorrência e encaminhar o Execution Packet. | **NUNCA** executa tarefas sem registro em `PROJECT_REGISTRY.json`, nunca permite execuções concorrentes no mesmo workspace. |
| **Sentinela Guardião** | Governança & Integridade | Auditar escopo (`allowed_scope`), bloquear mutações cruzadas entre projetos, sanear segredos, aplicar PRE_FLIGHT e POST_FLIGHT e gerenciar Human Gates. | **NUNCA** é tratada como skill técnica comum, não cria tarefas extras e não relaxa proteções de segurança. |
| **Antigravity** | Único Executor Local | Executar comandos locais, aplicar alterações cirúrgicas de código, rodar testes (Test Before / Test After), realizar commits e sincronizar o estado. | **NUNCA** planeja tarefas fora de Issues, não inventa escopos não autorizados e não altera arquivos fora de `allowed_scope`. |

---

## 2. FLUXO DETERMINÍSTICO DE EXECUÇÃO

```text
1. REQUISITO DO USUÁRIO
   ↓
2. CHATGPT (PLANNER)
   - Valida o projeto canônico
   - Consulta o Skill Router para escolher a @skill
   - Monta o Execution Packet com Scope Lock estrito
   ↓
3. GITHUB ISSUE (agent_task v5)
   - Registro da tarefa e atribuição de labels canônicas
   ↓
4. CONTROL PLANE & ROUTER
   - Resolução determinística do diretório físico
   - Validação de que não há execução concorrente
   ↓
5. SENTINELA PRE-CHECK
   - Verificação de baseline SHA e worktree limpo
   - Validação dos caminhos autorizados em allowed_scope
   ↓
6. ANTIGRAVITY (EXECUTOR LOCAL)
   - Execução autônoma focada dentro do workspace do projeto
   - Execução de testes direcionados (Discover → Baseline → Change → Test)
   ↓
7. SENTINELA POST-CHECK
   - Garantia de FILES_OUTSIDE_ALLOWED_SCOPE = 0
   - Escaneamento de segredos (SECRET_LEAK = 0)
   - Testes de regressão validados
   ↓
8. COMMIT SELETIVO & PUSH
   - Commit auditado, push para branch autorizada
   ↓
9. GITHUB STATE SYNC
   - Comentário com recibo de entrega na Issue
   - Fechamento formal da tarefa com estado DONE
```

---

## 3. POLÍTICA DE PERMISSÕES NO WORKSPACE

- **No Workspace do Projeto:** O Antigravity opera com máxima autonomia para ler, editar arquivos e rodar testes da tarefa, sem requisições excessivas de confirmação humana.
- **Fora do Workspace do Projeto:** Qualquer tentativa de acesso, leitura ou modificação em caminhos externos dispara imediatamente bloqueio e `Request Review`.
