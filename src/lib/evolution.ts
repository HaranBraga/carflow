import axios from "axios";

export type EvolutionConfig = {
  apiUrl?: string;
  apiKey?: string;
  instance?: string;
};

export type SendResult = {
  sent: boolean;
  number: string;
  error?: string;
};

function normalizeBrazilianPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 11) return `55${digits}`;
  return digits;
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

  try {
    await axios.post(
      `${config.apiUrl}/message/sendText/${config.instance}`,
      { number, text: message },
      { headers: { "Content-Type": "application/json", apikey: config.apiKey } }
    );
    return { sent: true, number };
  } catch (error: any) {
    const detail =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Erro desconhecido";
    return { sent: false, number, error: String(detail) };
  }
}

export function buildCarReadyMessage(customerName: string, plate: string, services: string[]): string {
  const serviceList = services.map((s) => `  • ${s}`).join("\n");
  return `Olá, ${customerName}! 🚗✨\n\nSeu veículo *${plate}* está pronto!\n\nServiços realizados:\n${serviceList}\n\nEstamos aguardando sua retirada. Obrigado pela preferência! 🙏`;
}
