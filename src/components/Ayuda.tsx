import React from 'react';
import { HelpCircle, Database, Shield, AlertTriangle, Calculator } from 'lucide-react';

export default function Ayuda() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-4xl mx-auto animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-3">
        <HelpCircle className="text-blue-600" /> Ayuda y Documentación
      </h2>
      
      <div className="space-y-6">
        <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
          <h3 className="font-bold text-blue-900 text-lg mb-3 flex items-center gap-2"><Database className="text-blue-600" /> ¿Dónde se guardan las cotizaciones?</h3>
          <p className="text-blue-800 mb-3">Las cotizaciones se almacenan de forma segura en la nube usando Firebase Firestore. Esto significa que:</p>
          <ul className="space-y-2 text-blue-800 ml-6 list-disc">
            <li>Tus datos están sincronizados en tiempo real.</li>
            <li>Puedes acceder a ellos desde cualquier dispositivo iniciando sesión con tu cuenta de Google.</li>
            <li>No perderás la información si limpias el caché del navegador.</li>
          </ul>
        </div>

        <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100">
          <h3 className="font-bold text-emerald-900 text-lg mb-3 flex items-center gap-2"><Shield className="text-emerald-600" /> Seguridad de Datos</h3>
          <p className="text-emerald-800">
            <strong>Recomendación:</strong> Aunque los datos están en la nube, siempre es buena práctica exportar un respaldo CSV semanalmente para tus registros contables y financieros.
          </p>
        </div>

        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100">
          <h3 className="font-bold text-amber-900 text-lg mb-3 flex items-center gap-2"><AlertTriangle className="text-amber-600" /> Errores de Conexión</h3>
          <p className="text-amber-800 mb-3">Si experimentas problemas para guardar o cargar datos:</p>
          <ul className="space-y-2 text-amber-800 ml-6 list-disc">
            <li>Verifica tu conexión a internet.</li>
            <li>Asegúrate de haber iniciado sesión correctamente.</li>
            <li>Si el problema persiste, intenta recargar la página.</li>
          </ul>
        </div>

        <div className="bg-purple-50 p-6 rounded-2xl border border-purple-100">
          <h3 className="font-bold text-purple-900 text-lg mb-3 flex items-center gap-2"><Calculator className="text-purple-600" /> Fórmulas de Cálculo</h3>
          <div className="space-y-3 text-purple-800 text-sm">
            <p><strong>Costo Fijo Hora:</strong> (Renta + Internet + Depreciación + Sueldo + Mantenimiento) ÷ Horas/Mes</p>
            <p><strong>Depreciación:</strong> Inversión ÷ (Vida Útil × 12 meses)</p>
            <p><strong>Tiempo Real:</strong> (Tiempo Simulado × 1.30) + Setup</p>
            <p><strong>Material:</strong> (Área Diseño × 1.20 merma) ÷ Área Hoja × Costo Hoja</p>
            <p><strong>Total:</strong> (Costos Directos + Utilidad) × 1.16 IVA</p>
          </div>
        </div>
      </div>
    </div>
  );
}
