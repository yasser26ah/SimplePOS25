import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

// Inicialización perezosa: evita crashear si no hay clave.
let client: GoogleGenAI | null = null;
function getClient(): GoogleGenAI | null {
  if (!apiKey) return null;
  if (!client) client = new GoogleGenAI({ apiKey });
  return client;
}

export interface SaleEmailInput {
  customerName: string;
  total: number;
  date: string;
  items: { name: string; quantity: number; price: number }[];
}

export interface SalesAnalysisInput {
  totalRevenue: number;
  totalSales: number;
  topSellingProduct: string;
}

class AiService {
  private async generate(prompt: string): Promise<string | null> {
    const ai = getClient();
    if (!ai) return null;
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      return response.text ?? null;
    } catch (error) {
      console.error('[ai.service] Gemini call failed:', error);
      return null;
    }
  }

  async generateInvoiceEmail(input: SaleEmailInput): Promise<string> {
    const prompt = `
      Actúa como un asistente de ventas amable y profesional.
      Redacta un correo electrónico corto y cordial para un cliente llamado "${input.customerName}".

      Detalles de la compra:
      Fecha: ${new Date(input.date).toLocaleDateString('es')}
      Total: $${input.total.toFixed(2)}

      Items comprados:
      ${input.items.map((i) => `- ${i.quantity}x ${i.name} ($${(i.price * i.quantity).toFixed(2)})`).join('\n')}

      El correo debe agradecer la compra, incluir el resumen y mencionar que la factura electrónica está adjunta.
      Usa un tono cálido y profesional. El idioma debe ser Español.
      Solo devuelve el cuerpo del correo, sin asunto ni preámbulos.
    `.trim();

    const generated = await this.generate(prompt);
    if (generated) return generated;

    // Fallback sin IA: plantilla útil y clara.
    const items = input.items
      .map((i) => `- ${i.quantity} x ${i.name} — $${(i.price * i.quantity).toFixed(2)}`)
      .join('\n');
    return (
      `Hola ${input.customerName},\n\n` +
      `¡Gracias por tu compra! Adjuntamos el resumen de tu factura:\n\n` +
      `${items}\n\n` +
      `Total: $${input.total.toFixed(2)}\n\n` +
      `La factura electrónica va adjunta a este correo. Cualquier duda, estamos a tu disposición.\n\n` +
      `— El equipo de la tienda`
    );
  }

  async analyzeSalesData(input: SalesAnalysisInput): Promise<string> {
    const prompt = `
      Analiza los siguientes datos de ventas de mi negocio de los últimos 30 días y dame un resumen
      ejecutivo corto (máximo 1 párrafo) con una recomendación de negocio concreta.

      Datos:
      - Ingresos Totales: $${input.totalRevenue.toFixed(2)}
      - Ventas Totales (Transacciones): ${input.totalSales}
      - Producto más vendido: ${input.topSellingProduct}

      Responde en Español.
    `.trim();

    const generated = await this.generate(prompt);
    if (generated) return generated;

    const avg = input.totalSales > 0 ? input.totalRevenue / input.totalSales : 0;
    return (
      `En los últimos 30 días registraste ${input.totalSales} ventas por $${input.totalRevenue.toFixed(2)} ` +
      `(ticket promedio $${avg.toFixed(2)}), con "${input.topSellingProduct}" como producto más vendido. ` +
      `Recomendación: asegura inventario suficiente de ${input.topSellingProduct} y arma promociones cruzadas ` +
      `para elevar el ticket promedio. (Análisis generado sin IA: configura GEMINI_API_KEY en el servidor para análisis avanzado.)`
    );
  }
}

export const aiService = new AiService();
