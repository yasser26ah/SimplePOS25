import { jsPDF } from "jspdf";
import { Sale } from "../types";
import { APP_CURRENCY } from "../constants";

export const generateReceiptPDF = (sale: Sale) => {
  // Configuración para papel térmico de 80mm
  // El alto es dinámico o fijo largo, usamos uno largo para simular el rollo
  // 80mm de ancho es estándar, convertimos a puntos (1mm = 2.83pt aprox)
  // Pero jsPDF maneja unidades, usaremos 'mm'.
  
  // Calculamos una altura estimada basada en los items
  const baseHeight = 100;
  const itemHeight = 10;
  const estimatedHeight = baseHeight + (sale.items.length * itemHeight);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, estimatedHeight] 
  });

  const margin = 4;
  let yPos = 10;
  const pageWidth = 80;
  const contentWidth = pageWidth - (margin * 2);

  // Helper para centrar texto
  const centerText = (text: string, y: number) => {
    const textWidth = doc.getTextWidth(text);
    const x = (pageWidth - textWidth) / 2;
    doc.text(text, x, y);
  };

  // Helper para linea separadora
  const drawLine = (y: number) => {
    doc.setLineDash([1, 1], 0);
    doc.line(margin, y, pageWidth - margin, y);
    doc.setLineDash([], 0); // Reset
  };

  // --- HEADER ---
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  centerText("SimplePOS", yPos);
  yPos += 5;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  centerText("NIT: 900.123.456-7", yPos);
  yPos += 4;
  centerText("Calle 123 # 45-67, Ciudad", yPos);
  yPos += 4;
  centerText("Tel: (601) 555-5555", yPos);
  yPos += 6;

  drawLine(yPos);
  yPos += 5;

  // --- INFO VENTA ---
  doc.setFontSize(8);
  doc.text(`Fecha: ${new Date(sale.date).toLocaleString()}`, margin, yPos);
  yPos += 4;
  doc.text(`Factura #: ${sale.id}`, margin, yPos);
  yPos += 4;
  doc.text(`Cliente: ${sale.customer.name}`, margin, yPos);
  yPos += 4;
  doc.text(`NIT/CC: ${sale.customer.nit}`, margin, yPos);
  yPos += 6;

  drawLine(yPos);
  yPos += 5;

  // --- ITEMS ---
  doc.setFont("helvetica", "bold");
  doc.text("Cant.", margin, yPos);
  doc.text("Descrip.", margin + 10, yPos);
  doc.text("Total", pageWidth - margin, yPos, { align: "right" });
  doc.setFont("helvetica", "normal");
  yPos += 4;

  sale.items.forEach((item) => {
    // Nombre del producto (truncar si es muy largo)
    const name = item.name.length > 20 ? item.name.substring(0, 18) + '..' : item.name;
    
    doc.text(`${item.quantity}`, margin, yPos);
    doc.text(name, margin + 10, yPos);
    const totalItem = item.price * item.quantity;
    doc.text(`${APP_CURRENCY}${totalItem.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" });
    yPos += 4;
    
    // Si queremos mostrar el precio unitario debajo (opcional)
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(`(${APP_CURRENCY}${item.price.toFixed(2)} c/u)`, margin + 10, yPos);
    doc.setFontSize(8);
    doc.setTextColor(0);
    yPos += 4;
  });

  yPos += 2;
  drawLine(yPos);
  yPos += 6;

  // --- TOTALES ---
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  
  const totalLabel = "TOTAL A PAGAR:";
  doc.text(totalLabel, margin, yPos);
  doc.text(`${APP_CURRENCY}${sale.total.toFixed(2)}`, pageWidth - margin, yPos, { align: "right" });
  
  yPos += 10;

  // --- FOOTER ---
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  centerText("¡Gracias por su compra!", yPos);
  yPos += 4;
  centerText("Régimen Común", yPos);
  yPos += 4;
  centerText("Resolución DIAN #123456789", yPos);

  // Descargar
  doc.save(`tirilla_venta_${sale.id}.pdf`);
};