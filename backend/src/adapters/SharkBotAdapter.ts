/**
 * SharkBotAdapter — Arquitetura de conexão e contrato de integração para SharkBot.
 *
 * REGISTRO ARQUITETURAL IMPORTANTE (DIRETRIZ DE ENGENHARIA):
 * - Não inventamos URL base, endpoints, headers ou autenticação não documentados.
 * - Não fazemos engenharia reversa de APIs internas.
 * - A plataforma SharkBot não possui documentação pública oficial aberta para APIs de WhatsApp.
 *
 * O QUE FALTA PARA ATIVAR A CONEXÃO REAL EM PRODUÇÃO:
 * 1. Documentação oficial fornecida pelo vendedor/parceiro da SharkBot;
 * 2. URL base oficial de produção (ex: https://api.sharkbot... ou webhook endpoint);
 * 3. Especificação do formato de autenticação (Bearer Token, API Key header ou Basic Auth);
 * 4. Especificação do formato da assinatura de webhook (HMAC-SHA256 ou token estático);
 * 5. Schema oficial dos payloads inbound de mensagens e status de envio.
 */

export interface ISharkBotConfig {
  apiKey?: string;
  baseUrl?: string;
  webhookSecret?: string;
}

export interface ISharkBotMessagePayload {
  to: string;
  text: string;
  mediaUrl?: string;
}

export interface ISharkBotInboundEvent {
  event: string;
  sender: string;
  messageId: string;
  text?: string;
  timestamp: number;
  rawPayload: any;
}

export interface ISharkBotAdapter {
  isConfigured(): boolean;
  sendMessage(payload: ISharkBotMessagePayload): Promise<any>;
  verifyWebhookSignature(signature: string, payload: string): boolean;
  parseInboundEvent(rawBody: any): ISharkBotInboundEvent;
}

export class SharkBotAdapter implements ISharkBotAdapter {
  private config: ISharkBotConfig;

  constructor(config?: ISharkBotConfig) {
    this.config = config || {};
  }

  public isConfigured(): boolean {
    return Boolean(this.config.apiKey && this.config.baseUrl);
  }

  public async sendMessage(payload: ISharkBotMessagePayload): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error(
        "SharkBotAdapter não está operacional: aguardando documentação oficial de endpoints e credenciais do fornecedor SharkBot."
      );
    }

    // Estrutura pronta para chamada quando as especificações forem fornecidas
    throw new Error(
      "Operação pendente de homologação técnica com a documentação oficial da SharkBot."
    );
  }

  public verifyWebhookSignature(signature: string, payload: string): boolean {
    if (!this.config.webhookSecret) {
      return false;
    }
    // Quando o algoritmo do fornecedor for oficializado (ex: HMAC-SHA256):
    return false;
  }

  public parseInboundEvent(rawBody: any): ISharkBotInboundEvent {
    // Normalização padrão provisória preservando o payload bruto
    return {
      event: rawBody?.event || "unknown",
      sender: rawBody?.from || rawBody?.sender || "",
      messageId: rawBody?.id || rawBody?.messageId || "",
      text: rawBody?.text || rawBody?.body || "",
      timestamp: rawBody?.timestamp || Math.floor(Date.now() / 1000),
      rawPayload: rawBody
    };
  }
}
