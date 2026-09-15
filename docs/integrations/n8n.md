# Guia Oficial de Integração: AtendeAIBR & n8n

Este guia detalha como integrar o **AtendeAIBR** ao **n8n** utilizando a **API Pública v1** e o **Motor de Webhooks Assinados**, sem qualquer acoplamento de código no núcleo do sistema.

---

## 1. Visão Geral da Arquitetura

A integração entre o AtendeAIBR e o n8n é bidirecional e 100% desacoplada:

1. **AtendeAIBR ➔ n8n (Eventos em Tempo Real)**:
   - O AtendeAIBR envia webhooks HTTP POST assinados com HMAC-SHA256 (`X-Webhook-Signature`).
   - O nó **Webhook Trigger** do n8n recebe o evento e inicia fluxos automatizados.
2. **n8n ➔ AtendeAIBR (Ações via API Pública)**:
   - O nó **HTTP Request** do n8n chama os endpoints `/api/v1/...` autenticado via Bearer Token (`X-API-Key`).
   - Suporte nativo ao cabeçalho `Idempotency-Key` para evitar ações duplicadas.

---

## 2. Configurando o Recebimento de Eventos no n8n

### Passo 1: Criar nó de Webhook no n8n
1. No n8n, adicione um nó **Webhook**.
2. Configure:
   - **HTTP Method**: `POST`
   - **Path**: `/atendeai-events` (ou o caminho desejado)
   - **Response Code**: `200`
3. Copie a URL gerada (ex: `https://n8n.suaempresa.com.br/webhook/atendeai-events`).

### Passo 2: Cadastrar Webhook no AtendeAIBR
1. Acesse o painel AtendeAIBR ➔ **Integrações** ➔ aba **Webhooks**.
2. Clique em **Novo Webhook**:
   - **Nome**: `n8n - Fluxo de Vendas e Suporte`
   - **URL**: `https://n8n.suaempresa.com.br/webhook/atendeai-events`
   - **Eventos**: selecione os eventos de interesse (ex: `message.received`, `contact.created`, `ticket.closed`, `deal.created`).
3. Ao salvar, **copie o Secret gerado** (ex: `whsec_9a8b7c6d5e...`).

### Passo 3: Validando a Assinatura HMAC-SHA256 no n8n
O AtendeAIBR envia os seguintes cabeçalhos de segurança:
- `X-Webhook-Signature`: `sha256=<hmac_hex>`
- `X-Webhook-Timestamp`: Timestamp Unix em segundos
- `X-Webhook-Event`: Nome do evento (ex: `message.received`)
- `X-Webhook-Id`: ID de rastreamento do disparo

No n8n, você pode adicionar um nó **Code** (JavaScript) para verificar a assinatura e evitar replay attacks:
```javascript
const crypto = require('crypto');

const secret = 'whsec_9a8b7c6d5e...'; // Seu webhook secret
const signatureHeader = $input.item.json.headers['x-webhook-signature'];
const timestamp = $input.item.json.headers['x-webhook-timestamp'];
const rawBody = JSON.stringify($input.item.json.body);

// 1. Validação contra Replay Attacks (tolerância de 5 minutos)
const now = Math.floor(Date.now() / 1000);
if (Math.abs(now - parseInt(timestamp, 10)) > 300) {
  throw new Error("Timestamp expirado. Possível ataque de repetição.");
}

// 2. Validação da Assinatura HMAC
const expectedSignature = 'sha256=' + crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex');

if (signatureHeader !== expectedSignature) {
  throw new Error("Assinatura de Webhook inválida.");
}

return $input.item;
```

---

## 3. Exemplos de Chamadas à API Pública (`/api/v1`) via n8n

Para todas as requisições do n8n para o AtendeAIBR:
- **Header `Authorization`**: `Bearer atd_live_...`
- **Header `Content-Type`**: `application/json`
- **Header `Idempotency-Key`**: `$executionId` (ou UUID para garantir que falhas de rede no n8n não dupliquem a ação).

---

### Exemplo 1: Enviar Mensagem no WhatsApp
- **Método**: `POST`
- **URL**: `https://api.atendeai.com.br/api/v1/messages/send`
- **Body JSON**:
```json
{
  "number": "5511999998888",
  "body": "Olá {{ $json.name }}, confirmamos o recebimento do seu pedido #{{ $json.orderId }}!"
}
```

---

### Exemplo 2: Criar ou Atualizar Contato
- **Método**: `POST`
- **URL**: `https://api.atendeai.com.br/api/v1/contacts`
- **Body JSON**:
```json
{
  "name": "Maria Oliveira",
  "number": "5511988887777",
  "email": "maria@empresa.com.br",
  "optOut": false,
  "extraInfo": [
    { "name": "Segmento", "value": "B2B" },
    { "name": "Origem", "value": "Campanha Google Ads" }
  ]
}
```

---

### Exemplo 3: Criar Ticket de Atendimento
- **Método**: `POST`
- **URL**: `https://api.atendeai.com.br/api/v1/tickets`
- **Body JSON**:
```json
{
  "contactId": 1234,
  "status": "open",
  "queueId": 2
}
```

---

### Exemplo 4: Criar Deal no CRM / Kanban
- **Método**: `POST`
- **URL**: `https://api.atendeai.com.br/api/v1/crm/deals`
- **Body JSON**:
```json
{
  "name": "Contrato Anual - Empresa ABC",
  "value": 15000,
  "pipelineId": 1,
  "stageId": 2,
  "contactId": 1234,
  "description": "Lead qualificado via automação n8n"
}
```

---

### Exemplo 5: Encerrar Ticket
- **Método**: `POST`
- **URL**: `https://api.atendeai.com.br/api/v1/tickets/5678/close`

---

## 4. Melhores Práticas
1. **Scopes Mínimos**: Crie chaves de API com o menor privilégio necessário (ex: uma chave apenas para `messages:send` para disparos transacionais).
2. **Idempotency-Key**: Em nós de mutação crítica, use sempre o ID de execução ou chave única no header `Idempotency-Key`.
3. **Respeito ao Rate Limit**: O AtendeAIBR fornece os cabeçalhos `X-RateLimit-Limit`, `X-RateLimit-Remaining` e `X-RateLimit-Reset`.
