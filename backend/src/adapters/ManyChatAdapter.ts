/**
 * ManyChatAdapter — Integração oficial baseada estritamente na documentação Swagger da ManyChat.
 * Especificação de referência: https://api.manychat.com/swagger
 *
 * NOTA ARQUITETURAL / LIMITAÇÕES OFICIAIS:
 * - A API pública da ManyChat opera orientada a assinantes (subscriber-centric).
 * - O envio de mensagens exige que o contato exista previamente como subscriber (`subscriber_id`).
 * - A ManyChat não envia webhooks de saída automáticos para qualquer endpoint sem que o usuário configure
 *   uma ação "External Request" dentro de um Fluxo (Flow) ou crie um Dev Bot App.
 */

export interface ManyChatConfig {
  apiKey: string;
}

export interface ManyChatSubscriberData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  whatsapp_phone?: string;
  email?: string;
  gender?: string;
  has_opt_in_sms?: boolean;
  has_opt_in_email?: boolean;
  consent_phrase?: string;
}

export interface ManyChatCustomField {
  field_id: number;
  field_value: any;
}

export class ManyChatAdapter {
  private apiKey: string;
  private baseUrl = "https://api.manychat.com";

  constructor(config: ManyChatConfig) {
    if (!config.apiKey) {
      throw new Error("ManyChat API Key is required");
    }
    this.apiKey = config.apiKey;
  }

  private async request(path: string, options: { method: string; body?: any; query?: Record<string, string> }) {
    let url = `${this.baseUrl}${path}`;

    if (options.query) {
      const params = new URLSearchParams(options.query).toString();
      url += `?${params}`;
    }

    const headers: Record<string, string> = {
      "Authorization": `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    const res = await fetch(url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || `ManyChat API error HTTP ${res.status}`);
    }
    return data;
  }

  /**
   * Procura assinante por campo de sistema (email ou phone).
   * GET /fb/subscriber/findBySystemField
   */
  public async findBySystemField(params: { email?: string; phone?: string }) {
    const query: Record<string, string> = {};
    if (params.email) query.email = params.email;
    if (params.phone) query.phone = params.phone;
    return this.request("/fb/subscriber/findBySystemField", { method: "GET", query });
  }

  /**
   * Cria novo assinante na base da ManyChat.
   * POST /fb/subscriber/createSubscriber
   */
  public async createSubscriber(subscriberData: ManyChatSubscriberData) {
    return this.request("/fb/subscriber/createSubscriber", {
      method: "POST",
      body: subscriberData
    });
  }

  /**
   * Atualiza campos personalizados de um assinante.
   * POST /fb/subscriber/setCustomFields
   */
  public async setCustomFields(subscriberId: number, fields: ManyChatCustomField[]) {
    return this.request("/fb/subscriber/setCustomFields", {
      method: "POST",
      body: {
        subscriber_id: subscriberId,
        fields
      }
    });
  }

  /**
   * Envia conteúdo de mensagem para um assinante.
   * POST /fb/sending/sendContent
   */
  public async sendContent(subscriberId: number, data: any) {
    return this.request("/fb/sending/sendContent", {
      method: "POST",
      body: {
        subscriber_id: subscriberId,
        data
      }
    });
  }

  /**
   * Dispara um fluxo pré-configurado na ManyChat para o assinante.
   * POST /fb/sending/sendFlow
   */
  public async sendFlow(subscriberId: number, flowNs: string) {
    return this.request("/fb/sending/sendFlow", {
      method: "POST",
      body: {
        subscriber_id: subscriberId,
        flow_ns: flowNs
      }
    });
  }
}
