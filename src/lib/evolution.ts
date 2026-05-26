import axios from "axios";

export type EvolutionConfig = {
  apiUrl?: string;
  apiKey?: string;
  instance?: string;
};

export type SendResult = {
  sent: boolean;
  number: string;
  url?: string;
  status?: number;
  error?: string;
};

function normalizeBrazilianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 11) return `55${digits}`;
  return digits;
}

function trimSlash(s: string): string {
  return s.replace(/\/+$/, "");
}

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  config: EvolutionConfig
): Promise<SendResult> {
  const number = normalizeBrazilianPhone(phone);

  if (!config.apiUrl || !config.apiKey || !config.instance) {
    return { sent: false, number, error: "Evolution API não configurada para essa empresa." };
  }

  const baseUrl = trimSlash(config.apiUrl);
  const instance = trimSlash(config.instance).replace(/^\/+/, "");
  const url = `${baseUrl}/message/sendText/${instance}`;

  try {
    const res = await axios.post(
      url,
      { number, text: message, textMessage: { text: message } },
      {
        headers: { "Content-Type": "application/json", apikey: config.apiKey },
        validateStatus: () => true,
        timeout: 10000,
      }
    );

    if (res.status >= 200 && res.status < 300) {
      return { sent: true, number, url, status: res.status };
    }

    const detail =
      typeof res.data === "string"
        ? res.data.slice(0, 300)
        : JSON.stringify(res.data).slice(0, 300);

    return { sent: false, number, url, status: res.status, error: `HTTP ${res.status}: ${detail}` };
  } catch (error: any) {
    const detail = error?.code || error?.message || "Erro de rede";
    return { sent: false, number, url, error: String(detail) };
  }
}

export function buildCarReadyMessage(customerName: string, plate: string, services: string[]): string {
  const serviceList = services.map((s) => `  • ${s}`).join("\n");
  return `Olá, ${customerName}! 🚗✨\n\nSeu veículo *${plate}* está pronto!\n\nServiços realizados:\n${serviceList}\n\nEstamos aguardando sua retirada. Obrigado pela preferência! 🙏`;
}
