import React, { useState, useRef } from 'react';
import { Quote, OperationType } from '../types';
import { exportarCSV } from '../utils/export';
import { db, auth } from '../firebase';
import { doc, deleteDoc, writeBatch, collection } from 'firebase/firestore';
import { handleFirestoreError } from '../utils/errorHandler';
import { History, FileSpreadsheet, Trash2, Eye, Calendar, User as UserIcon, Layers, DollarSign, FolderOpen, Download, Upload } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import ViewModal from './ViewModal';

import { User } from 'firebase/auth';
import toast from 'react-hot-toast';

interface Props {
  quotes: Quote[];
  user: User;
  onLoadQuote: (quote: Quote) => void;
}

export default function Historial({ quotes, user, onLoadQuote }: Props) {
  const [quoteToDelete, setQuoteToDelete] = useState<string | null>(null);
  const [quoteToView, setQuoteToView] = useState<Quote | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDelete = async () => {
    if (!quoteToDelete) return;
    try {
      await deleteDoc(doc(db, `users/${user.uid}/quotes/${quoteToDelete}`));
      toast.success('Cotización eliminada exitosamente');
    } catch (error) {
      toast.error('Error al eliminar la cotización.');
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/quotes/${quoteToDelete}`);
    } finally {
      setQuoteToDelete(null);
    }
  };

  const handleView = (quote: Quote) => {
    setQuoteToView(quote);
  };

  const handleExportBackup = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(quotes, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `backup_cotizaciones_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      toast.success('¡Backup creado y descargado correctamente!');
    } catch (error) {
      console.error('Error exporting backup:', error);
      toast.error('Error al crear el backup');
    }
  };

  const handleImportBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const importPromise = new Promise<number>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target?.result as string;
          const importedQuotes = JSON.parse(content) as Quote[];

          if (!Array.isArray(importedQuotes)) {
            throw new Error("El archivo no tiene el formato correcto.");
          }

          const CHUNK_SIZE = 450;
          let count = 0;

          for (let i = 0; i < importedQuotes.length; i += CHUNK_SIZE) {
            const chunk = importedQuotes.slice(i, i + CHUNK_SIZE);
            const batch = writeBatch(db);
            
            for (const quote of chunk) {
              let quoteRef;
              if (quote.id) {
                quoteRef = doc(db, `users/${user.uid}/quotes/${quote.id}`);
              } else {
                quoteRef = doc(collection(db, `users/${user.uid}/quotes`));
              }

              // Removemos el id del objeto para no guardarlo duplicado en el documento
              const { id, ...quoteData } = quote;

              // Sanitizar datos para evitar crashes en el renderizado
              const safeQuoteData = {
                ...quoteData,
                total: Number(quoteData.total) || 0,
                fecha: quoteData.fecha || new Date().toISOString(),
                cliente: quoteData.cliente || 'Sin nombre',
                material: quoteData.material || 'Sin material'
              };

              batch.set(quoteRef, safeQuoteData);
              count++;
            }
            await batch.commit();
          }

          resolve(count);
        } catch (error) {
          console.error("Error importing backup:", error);
          reject(error);
        } finally {
          // Resetear el input para permitir volver a subir el mismo archivo si es necesario
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      };
      
      reader.onerror = () => reject(new Error("Error al leer el archivo"));
      reader.readAsText(file);
    });

    toast.promise(importPromise, {
      loading: 'Restaurando cotizaciones...',
      success: (count) => `¡Éxito! Se restauraron ${count} cotizaciones correctamente.`,
      error: 'Error al restaurar el backup. Verifica que el archivo sea válido.'
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-8 animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <History className="text-blue-600" /> Historial de Cotizaciones
        </h2>
        <div className="flex gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-50 text-blue-700 border border-blue-100">
            {quotes.length} cotizaciones
          </span>
        </div>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-r-xl">
        <p className="text-sm text-blue-800"><strong>Almacenamiento:</strong> Las cotizaciones se guardan de forma segura en la nube (Firestore).</p>
      </div>

      {quotes.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
          <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 text-lg font-medium">No hay cotizaciones guardadas</p>
          <p className="text-gray-400 text-sm mt-2">Crea tu primera cotización para comenzar</p>
        </div>
      ) : (
        <>
          {/* Vista Móvil (Tarjetas) */}
          <div className="grid gap-4 md:hidden">
            {quotes.map((quote) => (
              <div key={quote.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{quote.cliente}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Calendar size={14} /> {new Date(quote.fecha).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <p className="font-bold text-emerald-600 text-lg">${(Number(quote.total) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="text-sm text-gray-600 flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                  <Layers size={16} className="text-gray-400" />
                  <span className="font-medium">{quote.material}</span>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-100">
                  <button onClick={() => onLoadQuote(quote)} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors" title="Abrir y Editar">
                    <FolderOpen size={18} /> <span className="text-sm font-semibold">Abrir</span>
                  </button>
                  <button onClick={() => handleView(quote)} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors" title="Ver Detalles">
                    <Eye size={18} /> <span className="text-sm font-semibold">Ver</span>
                  </button>
                  <button onClick={() => setQuoteToDelete(quote.id || null)} className="flex-1 flex justify-center items-center gap-2 py-2.5 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors" title="Eliminar">
                    <Trash2 size={18} /> <span className="text-sm font-semibold">Borrar</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Vista Escritorio (Tabla) */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-sm font-bold text-gray-700"><div className="flex items-center gap-2"><Calendar size={16} className="text-gray-400" /> Fecha</div></th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700"><div className="flex items-center gap-2"><UserIcon size={16} className="text-gray-400" /> Artículo</div></th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700"><div className="flex items-center gap-2"><Layers size={16} className="text-gray-400" /> Material</div></th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700"><div className="flex items-center gap-2"><DollarSign size={16} className="text-gray-400" /> Total</div></th>
                  <th className="px-6 py-4 text-sm font-bold text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map((quote) => (
                  <tr key={quote.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm text-gray-600">{new Date(quote.fecha).toLocaleDateString('es-MX')}</td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">{quote.cliente}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{quote.material}</td>
                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">${(Number(quote.total) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-3">
                        <button onClick={() => onLoadQuote(quote)} className="text-emerald-600 hover:text-emerald-800 transition-colors" title="Abrir y Editar">
                          <FolderOpen size={18} />
                        </button>
                        <button onClick={() => handleView(quote)} className="text-blue-600 hover:text-blue-800 transition-colors" title="Ver Detalles">
                          <Eye size={18} />
                        </button>
                        <button onClick={() => setQuoteToDelete(quote.id || null)} className="text-red-500 hover:text-red-700 transition-colors" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {quotes.length > 0 && (
        <div className="mt-6 flex flex-col md:flex-row gap-4">
          <button onClick={() => exportarCSV(quotes)} className="w-full md:w-auto flex justify-center items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-colors">
            <FileSpreadsheet size={20} /> Exportar CSV
          </button>
          <button onClick={handleExportBackup} className="w-full md:w-auto flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-colors">
            <Download size={20} /> Descargar Backup
          </button>
        </div>
      )}

      {quotes.length === 0 && (
        <div className="mt-6 flex justify-center">
           <button onClick={() => fileInputRef.current?.click()} className="flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-colors">
            <Upload size={20} /> Restaurar Backup
          </button>
        </div>
      )}

      {quotes.length > 0 && (
        <div className="mt-4 flex justify-start">
           <button onClick={() => fileInputRef.current?.click()} className="w-full md:w-auto flex justify-center items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-xl font-semibold shadow-sm transition-colors">
            <Upload size={20} /> Restaurar Backup
          </button>
        </div>
      )}

      <input 
        type="file" 
        accept=".json" 
        ref={fileInputRef} 
        onChange={handleImportBackup} 
        className="hidden" 
      />

      <ConfirmModal
        isOpen={!!quoteToDelete}
        title="Eliminar Cotización"
        message="¿Estás seguro de que deseas eliminar esta cotización? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => setQuoteToDelete(null)}
        confirmText="Eliminar"
      />

      <ViewModal
        quote={quoteToView}
        onClose={() => setQuoteToView(null)}
      />
    </div>
  );
}
