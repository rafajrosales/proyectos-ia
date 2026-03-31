import React from 'react';
import { X, FileText, Calendar, User, Layers, DollarSign, AlignLeft, Image as ImageIcon, FileArchive } from 'lucide-react';
import { Quote } from '../types';

interface Props {
  quote: Quote | null;
  onClose: () => void;
}

export default function ViewModal({ quote, onClose }: Props) {
  if (!quote) return null;

  let notas = '';
  let fotoUrl = '';
  let archivoUrl = '';
  try {
    const parsedData = JSON.parse(quote.datos);
    notas = parsedData?.inputs?.notas || '';
    fotoUrl = parsedData?.fotoUrl || '';
    archivoUrl = parsedData?.archivoUrl || '';
  } catch (e) {
    console.error('Error parsing quote data in ViewModal', e);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 shrink-0">
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <FileText className="text-blue-600" size={20} /> Detalles de Cotización
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-200 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="flex items-start gap-3">
            <User className="text-gray-400 mt-1" size={18} />
            <div>
              <p className="text-sm font-semibold text-gray-500">Nombre del Artículo</p>
              <p className="text-gray-900 font-medium">{quote.cliente}</p>
              {quote.clienteNombre && (
                <p className="text-xs text-indigo-600 font-bold mt-0.5">Cliente: {quote.clienteNombre}</p>
              )}
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Calendar className="text-gray-400 mt-1" size={18} />
            <div>
              <p className="text-sm font-semibold text-gray-500">Fecha</p>
              <p className="text-gray-900">{new Date(quote.fecha).toLocaleDateString('es-MX')}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Layers className="text-gray-400 mt-1" size={18} />
            <div>
              <p className="text-sm font-semibold text-gray-500">Material</p>
              <p className="text-gray-900">{quote.material}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <FileText className="text-gray-400 mt-1" size={18} />
            <div>
              <p className="text-sm font-semibold text-gray-500">Lienzo</p>
              <p className="text-gray-900">{quote.lienzo}</p>
            </div>
          </div>
          {notas && (
            <div className="flex items-start gap-3">
              <AlignLeft className="text-gray-400 mt-1" size={18} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500">Notas</p>
                <p className="text-gray-900 whitespace-pre-wrap text-sm mt-1 bg-gray-50 p-3 rounded-lg border border-gray-100">{notas}</p>
              </div>
            </div>
          )}
          {fotoUrl && (
            <div className="flex items-start gap-3">
              <ImageIcon className="text-gray-400 mt-1" size={18} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500">Foto del Trabajo</p>
                <img src={fotoUrl} alt="Foto del trabajo" className="mt-2 rounded-lg border border-gray-200 max-h-48 object-contain bg-gray-50 w-full" />
              </div>
            </div>
          )}
          {archivoUrl && (
            <div className="flex items-start gap-3">
              <FileArchive className="text-gray-400 mt-1" size={18} />
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-500">Archivo de Corte</p>
                <a href={archivoUrl} download="archivo_corte" className="inline-block mt-1 text-sm text-blue-600 hover:text-blue-800 hover:underline font-medium">
                  Descargar Archivo
                </a>
              </div>
            </div>
          )}
          <div className="flex items-start gap-3 pt-4 border-t border-gray-100">
            <DollarSign className="text-emerald-500 mt-1" size={24} />
            <div>
              <p className="text-sm font-semibold text-gray-500">Total</p>
              <p className="text-2xl font-bold text-emerald-600">${quote.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <div className="p-4 bg-gray-50 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
