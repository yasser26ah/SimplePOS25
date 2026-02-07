import { Sale, CartItem } from '@/types';
import { APP_CURRENCY } from '@/constants';

export interface PrinterConfig {
    paperWidth: number; // mm
    charsPerLine: number;
    dotDensity: number;
}

const PRINTER_CONFIG: PrinterConfig = {
    paperWidth: 80,
    charsPerLine: 42,
    dotDensity: 203,
};

/**
 * Genera una cadena de caracteres repetidos
 */
function repeatChar(char: string, times: number): string {
    return char.repeat(times);
}

/**
 * Centra un texto para papel de 80mm
 */
function centerText(text: string, width: number = PRINTER_CONFIG.charsPerLine): string {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
}

/**
 * Alinea texto a la derecha
 */
function rightAlign(text: string, width: number = PRINTER_CONFIG.charsPerLine): string {
    const padding = Math.max(0, width - text.length);
    return ' '.repeat(padding) + text;
}

/**
 * Formatea una línea de producto (nombre, cantidad, precio, total)
 */
function formatProductLine(item: CartItem, product: any): string {
    const name = item.name.substring(0, 20);
    const qty = item.quantity.toString();
    const price = item.price.toFixed(2);
    const total = (item.quantity * item.price).toFixed(2);

    const qtyPriceSection = `${qty}x${price}`;
    const padding = PRINTER_CONFIG.charsPerLine - name.length - qtyPriceSection.length - total.length - 2;

    return `${name}${' '.repeat(Math.max(1, padding))}${qtyPriceSection}${' '.repeat(1)}${total}`;
}

/**
 * Genera el contenido de la tirilla en formato texto
 */
function generateReceiptContent(sale: Sale, storeName: string = 'Mi Tienda'): string {
    const lines: string[] = [];

    // Encabezado
    lines.push(repeatChar('=', PRINTER_CONFIG.charsPerLine));
    lines.push(centerText(storeName.toUpperCase()));
    lines.push(centerText('TICKET DE VENTA'));
    lines.push(repeatChar('=', PRINTER_CONFIG.charsPerLine));

    // Información de la venta
    lines.push('');
    lines.push(`Fecha: ${new Date(sale.date).toLocaleString('es-ES')}`);
    lines.push(`Transacción: ${sale.id}`);
    if (sale.customer) {
        lines.push(`Cliente: ${sale.customer.name}`);
    }
    lines.push(repeatChar('-', PRINTER_CONFIG.charsPerLine));

    // Detalles de productos
    lines.push('');
    lines.push(`${' '.repeat(2)}CONCEPTO${' '.repeat(17)}CANT  TOTAL`);
    lines.push(repeatChar('-', PRINTER_CONFIG.charsPerLine));

    sale.items.forEach((item) => {
        lines.push(formatProductLine(item, {}));
    });

    // Resumen
    lines.push(repeatChar('-', PRINTER_CONFIG.charsPerLine));
    lines.push('');

    const subtotal = sale.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
    const tax = sale.tax || 0;
    const total = sale.total;

    lines.push(
        `Subtotal:${rightAlign(subtotal.toFixed(2), PRINTER_CONFIG.charsPerLine - 10)}`
    );
    if (tax > 0) {
        lines.push(`IVA (${((tax / subtotal) * 100).toFixed(0)}%):${rightAlign(tax.toFixed(2), PRINTER_CONFIG.charsPerLine - 10)}`);
    }
    lines.push(repeatChar('-', PRINTER_CONFIG.charsPerLine));
    lines.push(
        `TOTAL:${rightAlign(`${APP_CURRENCY} ${total.toFixed(2)}`, PRINTER_CONFIG.charsPerLine - 7)}`
    );

    // Método de pago
    lines.push('');
    lines.push(`Pago: ${sale.paymentMethod || 'Efectivo'}`);

    // Pie de página
    lines.push('');
    lines.push(repeatChar('=', PRINTER_CONFIG.charsPerLine));
    lines.push(centerText('¡GRACIAS POR SU COMPRA!'));
    lines.push(centerText(new Date().toLocaleTimeString('es-ES')));
    lines.push(repeatChar('=', PRINTER_CONFIG.charsPerLine));

    return lines.join('\n');
}

/**
 * Imprime la tirilla en la impresora térmica
 */
export async function printReceipt(sale: Sale, storeName?: string): Promise<boolean> {
    try {
        const content = generateReceiptContent(sale, storeName);

        // Crear un iframe oculto para imprimir
        const printWindow = window.open('', '', 'width=400,height=600');
        if (!printWindow) {
            console.error('No se pudo abrir ventana de impresión');
            return false;
        }

        // Escribir contenido con font monoespaciada
        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        margin: 0;
                        padding: 10px;
                        line-height: 1.2;
                        width: 80mm;
                        white-space: pre-wrap;
                        word-wrap: break-word;
                    }
                    @media print {
                        body { margin: 0; padding: 0; }
                    }
                </style>
            </head>
            <body>${content}</body>
            </html>
        `);
        printWindow.document.close();

        // Esperar a que cargue y luego imprimir
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
            // Cerrar después de imprimir (opcional)
            setTimeout(() => printWindow.close(), 1000);
        };

        return true;
    } catch (error) {
        console.error('Error al imprimir tirilla:', error);
        return false;
    }
}

/**
 * Descarga la tirilla como archivo de texto
 */
export function downloadReceipt(sale: Sale, storeName?: string): void {
    const content = generateReceiptContent(sale, storeName);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tirilla_${sale.id}_${new Date().getTime()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
}