import { GoogleGenAI } from "@google/genai";
import { Sale, SalesSummary } from "../types";

const apiKey = process.env.API_KEY || '';

// Safely initialize the client only if the key exists to prevent immediate crashes,
// though functionality will be limited.
const ai = new GoogleGenAI({ apiKey });

export const generateInvoiceEmail = async (sale: Sale): Promise<string> => {
  if (!apiKey) return "Error: API Key no configurada.";

  const itemsList = sale.items
    .map(item => `- ${item.quantity}x ${item.name} ($${item.price * item.quantity})`)
    .join('\n');

  const prompt = `
    Actúa como un asistente de ventas amable y profesional.
    Redacta un correo electrónico corto y cordial para un cliente llamado "${sale.customer.name}".
    
    Detalles de la compra:
    Fecha: ${new Date(sale.date).toLocaleDateString()}
    Total: $${sale.total.toFixed(2)}
    
    Items comprados:
    ${itemsList}

    El correo debe agradecer la compra, incluir el resumen y mencionar que la factura electrónica está adjunta (simulado).
    Usa un tono cálido y profesional. El idioma debe ser Español.
    Solo devuelve el cuerpo del correo, sin asunto ni preámbulos.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No se pudo generar el correo.";
  } catch (error) {
    console.error("Error generating email:", error);
    return "Hubo un error generando el correo de la factura.";
  }
};

export const analyzeSalesData = async (summary: SalesSummary): Promise<string> => {
  if (!apiKey) return "API Key no configurada.";

  const prompt = `
    Analiza los siguientes datos de ventas de mi negocio y dame un resumen ejecutivo corto (máximo 1 párrafo) con una recomendación de negocio.

    Datos:
    - Ingresos Totales: $${summary.totalRevenue}
    - Ventas Totales (Transacciones): ${summary.totalSales}
    - Producto más vendido: ${summary.topSellingProduct}
    
    Responde en Español.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "No se pudo generar el análisis.";
  } catch (error) {
    console.error("Error analyzing sales:", error);
    return "Error al analizar los datos.";
  }
};