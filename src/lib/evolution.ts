import axios from "axios";

const evolutionApi = axios.create({
  baseURL: process.env.EVOLUTION_API_URL,
  headers: {
    "Content-Type": "application/json",
    apikey: process.env.EVOLUTION_API_KEY,
  },
});

export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  try {
    const instance = process.env.EVOLUTION_INSTANCE;
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneWithCountry = cleanPhone.startsWith("55") ? cleanPhone : `55${cleanPhone}`;

    await evolutionApi.post(`/message/sendText/${instance}`, {
      number: phoneWithCountry,
      text: message,
    });

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
