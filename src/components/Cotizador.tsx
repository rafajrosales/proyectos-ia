import React, { useState, useEffect } from 'react';
import { UserConfig, MATERIALES, LIENZOS, DetailedQuoteData, Quote, OperationType } from '../types';
import { calcularCotizacion } from '../utils/calculations';
import { generarPDF, exportarJSON } from '../utils/export';
import { db } from '../firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { handleFirestoreError } from '../utils/errorHandler';
import { Layers, Maximize, Crop, Clock, Tags, Calculator, FileText, Save, Download, FileSpreadsheet, Lightbulb, CheckCircle, AlertTriangle, Info, Copy, Trash2, Plus, Upload, Image as ImageIcon, FileArchive, Camera } from 'lucide-react';
import toast from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (file.size > 500 * 1024) {
      reject(new Error("El archivo es demasiado grande (máx 500KB)"));
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

interface Props {
  config: UserConfig;
  user: User;
  loadedQuote?: Quote | null;
  onQuoteLoaded?: () => void;
}

export default function Cotizador({ config, user, loadedQuote, onQuoteLoaded }: Props) {
  const [materialKey, setMaterialKey] = useState('mdf3');
  const [lienzoKey, setLienzoKey] = useState('std120x240');
  const [customLienzo, setCustomLienzo] = useState({ ancho: 120, largo: 240 });
  const [ancho, setAncho] = useState(40);
  const [largo, setLargo] = useState(40);
  const [cantidad, setCantidad] = useState(1);
  const [redondeo, setRedondeo] = useState(0);
  const [tiempoSimulado, setTiempoSimulado] = useState(30);
  const [setup, setSetup] = useState(15);
  const [minutosDiseno, setMinutosDiseno] = useState(0);
  const [margen, setMargen] = useState(0.30);
  const [urgencia, setUrgencia] = useState(1);
  const [veta, setVeta] = useState(false);
  const [proceso, setProceso] = useState('corte');
  const [complejidad, setComplejidad] = useState('sencillo');
  const [aplicarIva, setAplicarIva] = useState(true);
  const [cliente, setCliente] = useState('');
  const [notas, setNotas] = useState('');
  
  const [fotoFile, setFotoFile] = useState<File | null>(null);
  const [archivoFile, setArchivoFile] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | undefined>(undefined);
  const [archivoUrl, setArchivoUrl] = useState<string | undefined>(undefined);

  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [resultado, setResultado] = useState<DetailedQuoteData | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (loadedQuote) {
      setCurrentQuoteId(loadedQuote.id || null);
      try {
        const parsed = JSON.parse(loadedQuote.datos);
        if (parsed.inputs) {
          setMaterialKey(parsed.inputs.materialKey ?? 'mdf3');
          setLienzoKey(parsed.inputs.lienzoKey ?? 'std120x240');
          setCustomLienzo(parsed.inputs.customLienzo ?? { ancho: 120, largo: 240 });
          setAncho(parsed.inputs.ancho ?? 40);
          setLargo(parsed.inputs.largo ?? 40);
          setCantidad(parsed.inputs.cantidad ?? 1);
          setRedondeo(parsed.inputs.redondeo ?? 0);
          setTiempoSimulado(parsed.inputs.tiempoSimulado ?? 30);
          setSetup(parsed.inputs.setup ?? 15);
          setMinutosDiseno(parsed.inputs.minutosDiseno ?? 0);
          setMargen(parsed.inputs.margen ?? 0.30);
          setUrgencia(parsed.inputs.urgencia ?? 1);
          setVeta(parsed.inputs.veta ?? false);
          setProceso(parsed.inputs.proceso ?? 'corte');
          setComplejidad(parsed.inputs.complejidad ?? 'sencillo');
          setAplicarIva(parsed.inputs.aplicarIva ?? true);
          setCliente(parsed.inputs.cliente ?? '');
          setNotas(parsed.inputs.notas ?? '');
          setFotoUrl(parsed.fotoUrl);
          setArchivoUrl(parsed.archivoUrl);
          setFotoFile(null);
          setArchivoFile(null);
        } else {
          toast.error('Esta cotización antigua no contiene los datos de entrada para ser editada.');
        }
      } catch (e) {
        console.error('Error parsing loaded quote', e);
      }
      if (onQuoteLoaded) onQuoteLoaded();
    }
  }, [loadedQuote, onQuoteLoaded]);

  useEffect(() => {
    const res = calcularCotizacion(
      config, materialKey, lienzoKey, customLienzo, ancho, largo, cantidad, redondeo,
      tiempoSimulado, setup, minutosDiseno, margen, urgencia, veta, proceso, complejidad, aplicarIva, notas
    );
    setResultado(res);
  }, [config, materialKey, lienzoKey, customLienzo, ancho, largo, cantidad, redondeo, tiempoSimulado, setup, minutosDiseno, margen, urgencia, veta, proceso, complejidad, aplicarIva, notas]);

  const getQuoteDataToSave = async () => {
    if (!resultado) return null;

    let finalFotoUrl = fotoUrl;
    let finalArchivoUrl = archivoUrl;

    if (fotoFile) {
      try {
        finalFotoUrl = await compressImage(fotoFile);
      } catch (error) {
        console.error("Error procesando foto", error);
        toast.error("No se pudo procesar la foto");
      }
    }

    if (archivoFile) {
      try {
        finalArchivoUrl = await readFileAsBase64(archivoFile);
      } catch (error) {
        console.error("Error procesando archivo", error);
        toast.error(error instanceof Error ? error.message : "No se pudo procesar el archivo de corte");
      }
    }

    return {
      cliente: cliente || 'Sin nombre',
      material: resultado.material.nombre,
      lienzo: resultado.lienzo.piezas ? `${resultado.lienzo.piezas} pzas de ${resultado.lienzo.ancho}x${resultado.lienzo.largo}cm` : `${resultado.lienzo.ancho}x${resultado.lienzo.largo}cm`,
      total: resultado.total,
      datos: JSON.stringify({
        ...resultado,
        fotoUrl: finalFotoUrl,
        archivoUrl: finalArchivoUrl,
        inputs: {
          materialKey,
          lienzoKey,
          customLienzo,
          ancho,
          largo,
          cantidad,
          redondeo,
          tiempoSimulado,
          setup,
          minutosDiseno,
          margen,
          urgencia,
          veta,
          proceso,
          complejidad,
          aplicarIva,
          cliente,
          notas
        }
      })
    };
  };

  const handleUpdate = async () => {
    setSaving(true);
    const data = await getQuoteDataToSave();
    if (!data || !currentQuoteId) {
      setSaving(false);
      return;
    }
    try {
      await updateDoc(doc(db, `users/${user.uid}/quotes/${currentQuoteId}`), data);
      toast.success('Cambios guardados exitosamente');
      if (fotoFile) setFotoUrl(JSON.parse(data.datos).fotoUrl);
      if (archivoFile) setArchivoUrl(JSON.parse(data.datos).archivoUrl);
      setFotoFile(null);
      setArchivoFile(null);
    } catch (error) {
      toast.error('Error al guardar los cambios.');
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/quotes/${currentQuoteId}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsNew = async () => {
    setSaving(true);
    const data = await getQuoteDataToSave();
    if (!data) {
      setSaving(false);
      return;
    }
    try {
      const quoteData: Omit<Quote, 'id'> = {
        ...data,
        uid: user.uid,
        fecha: new Date().toISOString(),
      };
      const docRef = await addDoc(collection(db, `users/${user.uid}/quotes`), quoteData);
      setCurrentQuoteId(docRef.id);
      toast.success('Cotización guardada exitosamente');
      if (fotoFile) setFotoUrl(JSON.parse(data.datos).fotoUrl);
      if (archivoFile) setArchivoUrl(JSON.parse(data.datos).archivoUrl);
      setFotoFile(null);
      setArchivoFile(null);
    } catch (error) {
      toast.error('Error al guardar la cotización.');
      handleFirestoreError(error, OperationType.CREATE, `users/${user.uid}/quotes`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentQuoteId) return;
    setSaving(true);
    try {
      await deleteDoc(doc(db, `users/${user.uid}/quotes/${currentQuoteId}`));
      toast.success('Cotización eliminada exitosamente');
      handleNew();
    } catch (error) {
      toast.error('Error al eliminar la cotización.');
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/quotes/${currentQuoteId}`);
    } finally {
      setSaving(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleNew = () => {
    setCurrentQuoteId(null);
    setCliente('');
    setNotas('');
    setCantidad(1);
    setAncho(40);
    setLargo(40);
    setFotoFile(null);
    setArchivoFile(null);
    setFotoUrl(undefined);
    setArchivoUrl(undefined);
  };

  const formatCurrency = (num: number) => `$${num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNumber = (num: number) => num.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (!resultado) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Left Panel */}
      <div className="lg:col-span-2 space-y-6">
        {/* Material */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center text-sm">1</span>
              <Layers className="text-amber-600" /> Tipo de Material
            </h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">Ground Truth México</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(MATERIALES).map(([key, mat]) => {
              const costoActual = config.materiales?.[key] ?? mat.costo;
              return (
              <button
                key={key}
                onClick={() => {
                  setMaterialKey(key);
                  if (key === 'espejo') setLienzoKey('espejo120x180');
                }}
                className={`p-4 rounded-xl border-2 transition-all text-center ${materialKey === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300'}`}
              >
                <div className={`w-10 h-10 mx-auto rounded mb-2 ${key.includes('mdf') ? 'bg-amber-700' : key === 'espejo' ? 'bg-purple-400' : 'bg-cyan-400'}`}></div>
                <p className="font-semibold text-sm text-gray-800">{mat.nombre}</p>
                <p className="text-xs text-gray-500 mt-1">${costoActual}/hoja</p>
              </button>
            )})}
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={veta} onChange={(e) => setVeta(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm text-gray-700">Respetar dirección de veta (+35% merma)</span>
            </label>
          </div>
        </div>

        {/* Canvas */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center text-sm">2</span>
              <Maximize className="text-emerald-600" /> Tamaño de Lienzo (Hoja)
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.entries(LIENZOS).map(([key, l]) => (
              <button
                key={key}
                onClick={() => setLienzoKey(key)}
                className={`p-4 rounded-xl border-2 transition-all text-center ${lienzoKey === key ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-emerald-300'}`}
              >
                <p className="font-semibold text-sm text-gray-800">{l.nombre}</p>
                <p className="text-xl font-bold text-gray-900">{key === 'custom' ? 'Configurar' : l.piezas ? `${l.piezas} pzas de ${l.ancho}×${l.largo}cm` : `${l.ancho} × ${l.largo} cm`}</p>
              </button>
            ))}
          </div>
          {lienzoKey === 'custom' && (
            <div className="mt-4 grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Ancho (cm)</label>
                <input type="number" value={customLienzo.ancho} onFocus={(e) => e.target.select()} onChange={(e) => setCustomLienzo({...customLienzo, ancho: e.target.value === '' ? 0 : Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Largo (cm)</label>
                <input type="number" value={customLienzo.largo} onFocus={(e) => e.target.select()} onChange={(e) => setCustomLienzo({...customLienzo, largo: e.target.value === '' ? 0 : Number(e.target.value)})} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}
        </div>

        {/* Design */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-sm">3</span>
              <Crop className="text-blue-600" /> Tamaño de Diseño
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Ancho (cm)</label>
              <input type="number" value={ancho} onFocus={(e) => e.target.select()} onChange={(e) => setAncho(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Largo (cm)</label>
              <input type="number" value={largo} onFocus={(e) => e.target.select()} onChange={(e) => setLargo(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Cantidad</label>
              <input type="number" value={cantidad} min="0.1" step="any" onFocus={(e) => e.target.select()} onChange={(e) => setCantidad(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Redondeo</label>
              <select value={redondeo} onChange={(e) => setRedondeo(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value={0}>Sin redondeo</option>
                <option value={5}>A 5cm</option>
                <option value={10}>A 10cm</option>
                <option value={20}>A 20cm</option>
              </select>
            </div>
          </div>
        </div>

        {/* Time */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center text-sm">4</span>
              <Clock className="text-orange-600" /> Tiempo de Proceso
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Corte (min)</label>
              <input type="number" value={tiempoSimulado} onFocus={(e) => e.target.select()} onChange={(e) => setTiempoSimulado(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Setup (min)</label>
              <input type="number" value={setup} onFocus={(e) => e.target.select()} onChange={(e) => setSetup(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Diseño (min)</label>
              <input type="number" value={minutosDiseno} onFocus={(e) => e.target.select()} onChange={(e) => setMinutosDiseno(e.target.value === '' ? 0 : Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Proporción Lienzo</label>
              <input type="text" value={`${(resultado.proporcionLienzo * 100).toFixed(1)}%`} readOnly className="w-full px-4 py-2 border border-gray-200 bg-gray-100 rounded-lg text-gray-600" />
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Tipo de Trabajo</label>
              <div className="flex gap-4">
                {['corte', 'grabado', 'mixto'].map((p) => (
                  <label key={p} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="proceso" value={p} checked={proceso === p} onChange={(e) => setProceso(e.target.value)} className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium capitalize">{p}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-2">Complejidad (Multiplicador de Costo)</label>
              <div className="flex gap-4">
                {[
                  { id: 'sencillo', label: 'Sencillo (1x)' },
                  { id: 'estandar', label: 'Estándar (1.5x)' },
                  { id: 'complejo', label: 'Complejo (2x)' }
                ].map((c) => (
                  <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="complejidad" value={c.id} checked={complejidad === c.id} onChange={(e) => setComplejidad(e.target.value)} className="w-4 h-4 text-orange-600" />
                    <span className="text-sm font-medium">{c.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-sm">5</span>
              <Tags className="text-purple-600" /> Precio y Cliente
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Margen</label>
              <select value={margen} onChange={(e) => setMargen(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value={0.30}>30%</option>
                <option value={0.40}>40%</option>
                <option value={0.50}>50%</option>
                <option value={0.60}>60%</option>
                <option value={0.70}>70%</option>
                <option value={0.80}>80%</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Urgencia</label>
              <select value={urgencia} onChange={(e) => setUrgencia(Number(e.target.value))} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500">
                <option value={1}>Normal</option>
                <option value={1.25}>Para hoy (+25%)</option>
                <option value={1.50}>Express 2hrs (+50%)</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={aplicarIva} onChange={(e) => setAplicarIva(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
              <span className="text-sm font-semibold text-gray-700">Aplicar IVA (16%)</span>
            </label>
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Cliente</label>
            <input type="text" value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Nombre del cliente" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="mt-4">
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notas</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"></textarea>
          </div>
        </div>

        {/* Archivos Adjuntos */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-8 h-8 bg-teal-100 text-teal-600 rounded-lg flex items-center justify-center text-sm">6</span>
              <Upload className="text-teal-600" /> Archivos Adjuntos
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Foto del Trabajo */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
              <ImageIcon className="text-gray-400 mb-2" size={32} />
              <p className="text-sm font-semibold text-gray-700 mb-1">Foto del Trabajo</p>
              <p className="text-xs text-gray-500 mb-3">Sube una imagen o usa la cámara</p>
              
              <div className="flex gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  id="foto-upload"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFotoFile(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="foto-upload" className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1">
                  <Upload size={16} /> Subir
                </label>

                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  id="foto-camera"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFotoFile(e.target.files[0]);
                    }
                  }}
                />
                <label htmlFor="foto-camera" className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-1">
                  <Camera size={16} /> Cámara
                </label>
              </div>

              {fotoFile && <p className="text-xs text-emerald-600 mt-2 font-medium truncate w-full px-2">{fotoFile.name}</p>}
              {!fotoFile && fotoUrl && (
                <a href={fotoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 mt-2 font-medium hover:underline">
                  Ver foto actual
                </a>
              )}
            </div>

            {/* Archivo de Corte */}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors">
              <FileArchive className="text-gray-400 mb-2" size={32} />
              <p className="text-sm font-semibold text-gray-700 mb-1">Archivo de Corte</p>
              <p className="text-xs text-gray-500 mb-3">Vectores (SVG, DXF, AI, PDF)</p>
              <input 
                type="file" 
                className="hidden" 
                id="archivo-upload"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setArchivoFile(e.target.files[0]);
                  }
                }}
              />
              <label htmlFor="archivo-upload" className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50">
                Seleccionar Archivo
              </label>
              {archivoFile && <p className="text-xs text-emerald-600 mt-2 font-medium truncate w-full px-2">{archivoFile.name}</p>}
              {!archivoFile && archivoUrl && (
                <a href={archivoUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 mt-2 font-medium hover:underline">
                  Descargar archivo actual
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="space-y-6">
        {/* Summary */}
        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl shadow-lg p-6 text-white">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calculator size={20} /> Resumen Rápido</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Material:</span> <span className="font-semibold">{resultado.material.nombre}</span>
            </div>
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Paneles por Hoja:</span> <span className="font-semibold">{resultado.panelesPorHoja.toFixed(1)}</span>
            </div>
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Lienzo:</span> <span className="font-semibold">{resultado.lienzo.ancho}x{resultado.lienzo.largo}</span>
            </div>
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Área Cobrable:</span> <span className="font-semibold">{formatNumber(resultado.areaPanelIndividual)} cm² {cantidad > 1 ? `(Total: ${formatNumber(resultado.areaCobrar)} cm²)` : ''}</span>
            </div>
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Tiempo Real:</span> <span className="font-semibold">{Math.round(resultado.tiempoTotalMinutos)} min</span>
            </div>
            <div className="flex justify-between border-b border-gray-700 pb-2">
              <span className="text-gray-400">Precio Unitario:</span> <span className="font-semibold text-blue-400">{formatCurrency(resultado.precioUnitario)}</span>
            </div>
            <div className="flex justify-between pt-1">
              <span className="text-gray-400">Aprovechamiento:</span> <span className="font-semibold text-emerald-400">{resultado.aprovechamiento.toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Financials */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2"><FileText className="text-blue-600" size={20} /> Desglose Financiero</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-100">
                  <th className="text-left py-2 font-medium">Concepto</th>
                  <th className="text-right py-2 font-medium">Lote</th>
                  <th className="text-right py-2 font-medium">Unitario</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr>
                  <td className="py-2 text-gray-600">Mano de Obra</td>
                  <td className="text-right font-medium">{formatCurrency(resultado.costoMaquina + resultado.costoEnergia)}</td>
                  <td className="text-right text-gray-400">{formatCurrency((resultado.costoMaquina + resultado.costoEnergia) / cantidad)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Material Base (Prop.)</td>
                  <td className="text-right font-medium">{formatCurrency(resultado.costoMaterialBase)}</td>
                  <td className="text-right text-gray-400">{formatCurrency(resultado.costoMaterialBase / cantidad)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Recargo por Corte (25%)</td>
                  <td className="text-right font-medium">{formatCurrency(resultado.margenMaterial)}</td>
                  <td className="text-right text-gray-400">{formatCurrency(resultado.margenMaterial / cantidad)}</td>
                </tr>
                <tr className="bg-gray-50/50">
                  <td className="py-2 font-medium text-gray-700">Total Material</td>
                  <td className="text-right font-semibold text-gray-900">{formatCurrency(resultado.costoMaterial)}</td>
                  <td className="text-right text-gray-500">{formatCurrency(resultado.costoMaterial / cantidad)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Diseño</td>
                  <td className="text-right font-medium">{formatCurrency(resultado.costoDiseno)}</td>
                  <td className="text-right text-gray-400">{formatCurrency(resultado.costoDiseno / cantidad)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">Utilidad</td>
                  <td className="text-right font-medium text-emerald-600">{formatCurrency(resultado.utilidadBruta)}</td>
                  <td className="text-right text-emerald-400">{formatCurrency(resultado.utilidadBruta / cantidad)}</td>
                </tr>
                {resultado.descuento > 0 && (
                  <tr className="text-emerald-600 italic">
                    <td className="py-2">Descuento por volumen (10%)</td>
                    <td className="text-right">-{formatCurrency(resultado.descuento)}</td>
                    <td className="text-right">-{formatCurrency(resultado.descuento / cantidad)}</td>
                  </tr>
                )}
                <tr className="border-t border-gray-200">
                  <td className="py-2 font-bold text-gray-800">Subtotal</td>
                  <td className="text-right font-bold text-gray-800">{formatCurrency(resultado.subtotal)}</td>
                  <td className="text-right font-bold text-gray-800">{formatCurrency(resultado.subtotal / cantidad)}</td>
                </tr>
                <tr>
                  <td className="py-2 text-gray-600">IVA {aplicarIva ? '(16%)' : '(0%)'}</td>
                  <td className="text-right font-medium">{formatCurrency(resultado.iva)}</td>
                  <td className="text-right text-gray-400">{formatCurrency(resultado.iva / cantidad)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex justify-between py-3 px-4 bg-blue-50 rounded-xl mt-4 border border-blue-100">
            <div>
              <span className="block font-bold text-gray-800 text-lg">TOTAL</span>
              <span className="text-xs text-blue-600 font-medium">{cantidad > 1 ? `${cantidad} piezas` : '1 pieza'}</span>
            </div>
            <div className="text-right">
              <span className="block font-bold text-2xl text-blue-600">{formatCurrency(resultado.total)}</span>
              <span className="text-xs text-blue-500 font-medium">Unitario: {formatCurrency(resultado.precioUnitario)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          {currentQuoteId ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={handleUpdate} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors">
                  <Save size={18} /> Guardar Cambios
                </button>
                <button onClick={handleSaveAsNew} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors">
                  <Copy size={18} /> Guardar Copia
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowDeleteConfirm(true)} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors">
                  <Trash2 size={18} /> Eliminar
                </button>
                <button onClick={handleNew} className="w-full flex items-center justify-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors">
                  <Plus size={18} /> Nueva
                </button>
              </div>
            </>
          ) : (
            <button onClick={handleSaveAsNew} disabled={saving} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md transition-colors">
              <Save size={20} /> {saving ? 'Guardando...' : 'Guardar Cotización'}
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => generarPDF(cliente || 'Cliente', resultado)} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-xl shadow-sm transition-colors">
              <FileText size={18} /> PDF
            </button>
            <button onClick={() => exportarJSON(resultado, `Cotizacion_${cliente || 'Cliente'}_${Date.now()}.json`)} className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-sm transition-colors">
              <Download size={18} /> JSON
            </button>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><Lightbulb className="text-amber-500" size={18} /> Recomendaciones</h3>
          <ul className="space-y-2 text-sm text-gray-600">
            {margen < 0.30 && <li className="flex gap-2"><AlertTriangle className="text-red-500 shrink-0" size={16} /> Margen bajo (&lt;30%). Riesgo de rentabilidad.</li>}
            {cantidad >= 10 && <li className="flex gap-2"><CheckCircle className="text-emerald-500 shrink-0" size={16} /> Descuento por volumen aplicado (10%).</li>}
            {veta && <li className="flex gap-2"><Info className="text-blue-500 shrink-0" size={16} /> Dirección de veta activa. Merma incrementada.</li>}
            {urgencia > 1 && <li className="flex gap-2"><Clock className="text-orange-500 shrink-0" size={16} /> Tarifa de urgencia aplicada.</li>}
            {resultado.hojasNecesarias > 1 && <li className="flex gap-2"><Layers className="text-purple-500 shrink-0" size={16} /> {resultado.hojasNecesarias} hojas requeridas. Verificar inventario.</li>}
            {resultado.panelesPorHoja > 0 && <li className="flex gap-2"><Crop className="text-blue-500 shrink-0" size={16} /> Se cobrará la proporción del área utilizada más un 25% de recargo por el corte.</li>}
            {resultado.aprovechamiento < 50 && <li className="flex gap-2"><AlertTriangle className="text-amber-500 shrink-0" size={16} /> Aprovechamiento bajo. Optimizar nesting.</li>}
          </ul>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Eliminar Cotización"
        message="¿Estás seguro de que deseas eliminar esta cotización? Esta acción no se puede deshacer."
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Eliminar"
      />
    </div>
  );
}
