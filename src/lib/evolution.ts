import axios from "axios";

export type EvolutionConfig = {
  apiUrl?: string;
  apiKey?: string;
  instance?: string;
};

export async function sendWhatsAppMessage(
  phone: string,
  message: string,
  config: EvolutionConfig
): Promise<boolean> {
  if (!config.apiUrl || !config.apiKey || !config.instance) {
    console.warn("Evolution API não configurada para esta empresa.");
    return false;
  }

  try {
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    await axios.post(
      `${config.apiUrl}/message/sendText/${config.instance}`,
      { number: phoneWithCountry, text: message },
      { headers: { "Content-Type": "application/json", apikey: config.apiKey } }
    );

    return true;
  } catch (error) {
    console.error("Erro ao enviar WhatsApp:", error);
    return false;
  }
}

export function buildCarReadyMessage(customerName: string, plate: string, services: string[]): string {
  const serviceList = services.map((s) => `  • ${s}`).join("\n");
  return `Olá, ${customerName}! 🚗✨\n\nSeu veículo *${plate}* está pronto!\n\nServiços realizados:\n${serviceList}\n\nEstamos aguardando sua retirada. Obrigado pela preferência! 🙏`;
}
