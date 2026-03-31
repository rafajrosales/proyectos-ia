import { DetailedQuoteData, Quote } from '../types';
import jsPDF from 'jspdf';

export function generarPDF(cliente: string, resultado: DetailedQuoteData) {
  const doc = new jsPDF();
  
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 138); // blue-900
  doc.text('COTIZACIÓN LÁSER CDMX', 105, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text('Sistema Profesional de Cotización', 105, 28, { align: 'center' });

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(1);
  doc.line(20, 32, 190, 32);

  doc.setFontSize(11);
  doc.setTextColor(50);
  doc.text(`Artículo: ${cliente}`, 20, 45);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-MX')}`, 20, 52);
  doc.text(`Folio: COT-${Date.now().toString().slice(-6)}`, 140, 45);
  doc.text(`Validez: 7 días`, 140, 52);

  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('Detalles del Proyecto', 20, 70);
  doc.setLineWidth(0.5);
  doc.line(20, 72, 190, 72);

  doc.setFontSize(11);
  doc.setTextColor(50);
  
  let y = 80;
  const lineHeight = 7;
  
  doc.text(`Material:`, 20, y); doc.text(resultado.material.nombre, 80, y); y += lineHeight;
  doc.text(`Paneles por Hoja:`, 20, y); doc.text(`${resultado.panelesPorHoja.toFixed(1)}`, 80, y); y += lineHeight;
  doc.text(`Lienzo (Hoja):`, 20, y); doc.text(resultado.lienzo.piezas ? `${resultado.lienzo.piezas} pzas de ${resultado.lienzo.ancho} × ${resultado.lienzo.largo} cm` : `${resultado.lienzo.ancho} × ${resultado.lienzo.largo} cm`, 80, y); y += lineHeight;
  doc.text(`Dimensiones Diseño:`, 20, y); doc.text(`${resultado.ancho} × ${resultado.largo} cm`, 80, y); y += lineHeight;
  doc.text(`Área a Cobrar:`, 20, y); doc.text(`${resultado.areaPanelIndividual.toLocaleString()} cm²`, 80, y); y += lineHeight;
  doc.text(`Cantidad:`, 20, y); doc.text(`${resultado.cantidad}`, 80, y); y += lineHeight;
  doc.text(`Hoja(s) a Utilizar:`, 20, y); doc.text(`${resultado.hojasNecesarias}`, 80, y); y += lineHeight;
  doc.text(`Proporción Lienzo:`, 20, y); doc.text(`${(resultado.proporcionLienzo * 100).toFixed(1)}%`, 80, y); y += lineHeight;
  doc.text(`Tiempo Estimado:`, 20, y); doc.text(`${Math.round(resultado.tiempoTotalMinutos)} minutos`, 80, y); y += lineHeight;
  doc.text(`Aprovechamiento:`, 20, y); doc.text(`${resultado.aprovechamiento.toFixed(1)}%`, 80, y); y += lineHeight;

  y += 10;
  doc.setFontSize(14);
  doc.setTextColor(30, 58, 138);
  doc.text('Desglose de Costos', 20, y);
  doc.line(20, y + 2, 190, y + 2);
  
  y += 10;
  doc.setFontSize(11);
  doc.setTextColor(50);
  doc.text(`Material Base (Prop.):`, 20, y); doc.text(`$${resultado.costoMaterialBase.toFixed(2)}`, 190, y, { align: 'right' }); y += lineHeight;
  doc.text(`Recargo por Corte (25%):`, 20, y); doc.text(`$${resultado.margenMaterial.toFixed(2)}`, 190, y, { align: 'right' }); y += lineHeight;
  doc.text(`Total Material:`, 20, y); doc.text(`$${resultado.costoMaterial.toFixed(2)}`, 190, y, { align: 'right' }); y += lineHeight;
  doc.text(`Subtotal:`, 20, y); doc.text(`$${resultado.subtotal.toFixed(2)}`, 190, y, { align: 'right' }); y += lineHeight;
  doc.text(resultado.iva > 0 ? `IVA (16%):` : `IVA (0%):`, 20, y); doc.text(`$${resultado.iva.toFixed(2)}`, 190, y, { align: 'right' }); y += lineHeight;
  
  y += 5;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont('helvetica', 'bold');
  doc.text(`TOTAL:`, 20, y); doc.text(`$${resultado.total.toFixed(2)}`, 190, y, { align: 'right' });
  doc.setFont('helvetica', 'normal');

  if (resultado.notas) {
    y += 15;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text('Notas:', 20, y);
    const splitNotas = doc.splitTextToSize(resultado.notas, 170);
    doc.text(splitNotas, 20, y + 5);
  }

  doc.save(`Cotizacion_${cliente.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
}

export function exportarCSV(historial: Quote[]) {
  if (historial.length === 0) return;
  
  let csv = 'Fecha,Artículo,Material,Lienzo,Total (MXN)\n';
  historial.forEach(cot => {
    csv += `${new Date(cot.fecha).toLocaleDateString('es-MX')},"${cot.cliente}","${cot.material}","${cot.lienzo}",$${cot.total.toFixed(2)}\n`;
  });
  
  const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historial_cotizaciones_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportarJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
