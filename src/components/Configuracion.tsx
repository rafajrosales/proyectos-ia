import React, { useState } from 'react';
import { UserConfig, OperationType } from '../types';
import { db } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { handleFirestoreError } from '../utils/errorHandler';
import { Settings, Save, Upload, RotateCcw, Factory, Calendar, Home, User as UserIcon, Wifi, Wrench, Zap, Clock, Layers } from 'lucide-react';
import { MATERIALES, DEFAULT_CONFIG } from '../types';
import toast from 'react-hot-toast';

interface Props {
  config: UserConfig;
  user: User;
  onUpdate: (config: UserConfig) => void;
}

export default function Configuracion({ config, user, onUpdate }: Props) {
  const [localConfig, setLocalConfig] = useState<UserConfig>(() => ({
    ...config,
    materiales: config.materiales || DEFAULT_CONFIG.materiales
  }));
  const [saving, setSaving] = useState(false);

  const handleChange = (key: keyof UserConfig, value: number) => {
    setLocalConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleMaterialChange = (key: string, value: number) => {
    setLocalConfig(prev => ({
      ...prev,
      materiales: {
        ...prev.materiales,
        [key]: value
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updatedConfig = { ...localConfig, updatedAt: new Date().toISOString() };
      await setDoc(doc(db, `users/${user.uid}/config/current`), updatedConfig);
      onUpdate(updatedConfig);
      toast.success('Configuración guardada exitosamente');
    } catch (error) {
      toast.error('Error al guardar la configuración.');
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/config/current`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Settings className="text-blue-600" /> Configuración de Costos Fijos
        </h2>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800">
          <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>Activo
        </span>
      </div>
      <p className="text-gray-600 mb-8 text-lg">Ground Truth México - Basado en indicadores de mercado CDMX</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ConfigInput icon={<Factory className="text-blue-600" />} label="Inversión en Equipo ($)" value={localConfig.inversion} onChange={(v) => handleChange('inversion', v)} desc="Inversión inicial total (Equipo + Instalación)" color="blue" />
        <ConfigInput icon={<Calendar className="text-emerald-600" />} label="Vida Útil (años)" value={localConfig.vidaUtil} onChange={(v) => handleChange('vidaUtil', v)} desc="Ciclo de recuperación de inversión tecnológica" color="emerald" />
        <ConfigInput icon={<Home className="text-purple-600" />} label="Renta Local Mensual ($)" value={localConfig.renta} onChange={(v) => handleChange('renta', v)} desc="Variable según zona CDMX" color="purple" />
        <ConfigInput icon={<UserIcon className="text-amber-600" />} label="Sueldo Operador Semanal ($)" value={localConfig.sueldoSemanal} onChange={(v) => handleChange('sueldoSemanal', v)} desc="Incluye sueldo de dueño/operador" color="amber" />
        <ConfigInput icon={<Wifi className="text-cyan-600" />} label="Internet Mensual ($)" value={localConfig.internet} onChange={(v) => handleChange('internet', v)} desc="Servicios de conectividad y gestión" color="cyan" />
        <ConfigInput icon={<Wrench className="text-red-600" />} label="Mantenimiento Anual ($)" value={localConfig.mantenimientoAnual} onChange={(v) => handleChange('mantenimientoAnual', v)} desc="Fondo para lentes, espejos y consumibles" color="red" />
        <ConfigInput icon={<Zap className="text-yellow-600" />} label="Costo kWh ($)" value={localConfig.kwh} onChange={(v) => handleChange('kwh', v)} desc="Tarifa promedio comercial/industrial México" color="yellow" step={0.01} />
        <ConfigInput icon={<Clock className="text-indigo-600" />} label="Horas Máquina/Mes" value={localConfig.horasMes} onChange={(v) => handleChange('horasMes', v)} desc="Capacidad productiva mensual" color="indigo" />
      </div>

      <div className="mt-8 bg-blue-50 border-l-4 border-blue-500 p-6 rounded-r-xl">
        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">Información Importante</h4>
        <p className="text-sm text-blue-700 leading-relaxed">Estos valores se utilizan para calcular la tasa de depreciación y el costo fijo por hora de máquina. <strong>Actualice mensualmente</strong> según sus recibos reales de CFE y gastos operativos. Una configuración precisa garantiza rentabilidad real.</p>
      </div>

      <div className="mt-10 mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Layers className="text-amber-600" /> Costos de Materiales (por hoja)
        </h2>
        <p className="text-gray-600 mt-2">Ajuste los costos de los materiales según sus proveedores locales.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(MATERIALES).map(([key, mat]) => (
          <ConfigInput
            key={key}
            icon={<Layers className="text-amber-600" />}
            label={mat.nombre}
            value={localConfig.materiales[key] || 0}
            onChange={(v: number) => handleMaterialChange(key, v)}
            desc={`Costo por hoja completa`}
            color="amber"
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-4 mt-8">
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-md transition-colors">
          <Save size={20} /> {saving ? 'Guardando...' : 'Guardar Configuración'}
        </button>
      </div>
    </div>
  );
}

function ConfigInput({ icon, label, value, onChange, desc, color, step = 1 }: any) {
  const colorClasses: any = {
    blue: 'border-blue-200 bg-blue-50/50 focus-within:border-blue-400',
    emerald: 'border-emerald-200 bg-emerald-50/50 focus-within:border-emerald-400',
    purple: 'border-purple-200 bg-purple-50/50 focus-within:border-purple-400',
    amber: 'border-amber-200 bg-amber-50/50 focus-within:border-amber-400',
    cyan: 'border-cyan-200 bg-cyan-50/50 focus-within:border-cyan-400',
    red: 'border-red-200 bg-red-50/50 focus-within:border-red-400',
    yellow: 'border-yellow-200 bg-yellow-50/50 focus-within:border-yellow-400',
    indigo: 'border-indigo-200 bg-indigo-50/50 focus-within:border-indigo-400',
  };

  return (
    <div className={`p-4 rounded-xl border-2 transition-colors ${colorClasses[color]}`}>
      <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-2">
        {icon} {label}
      </label>
      <input
        type="number"
        value={value}
        step={step}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full px-4 py-3 border-2 border-white rounded-lg font-semibold text-lg bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
      />
      <p className="text-xs text-gray-500 mt-2">{desc}</p>
    </div>
  );
}
