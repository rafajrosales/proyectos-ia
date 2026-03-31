import React, { useState, useEffect } from 'react';
import { auth, signInWithCredentials, logOut, db } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { UserConfig, DEFAULT_CONFIG, Quote, OperationType } from './types';
import { handleFirestoreError } from './utils/errorHandler';
import Cotizador from './components/Cotizador';
import Configuracion from './components/Configuracion';
import Historial from './components/Historial';
import Clientes from './components/Clientes';
import Pedidos from './components/Pedidos';
import Ayuda from './components/Ayuda';
import { Calculator, Settings, History, HelpCircle, LogOut, Zap, Users, Package } from 'lucide-react';
import { Toaster } from 'react-hot-toast';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'cotizador' | 'configuracion' | 'historial' | 'clientes' | 'pedidos' | 'ayuda'>('cotizador');
  const [config, setConfig] = useState<UserConfig>(DEFAULT_CONFIG as UserConfig);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loadedQuote, setLoadedQuote] = useState<Quote | null>(null);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    let unsubQuotes: (() => void) | undefined;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setAuthError(null);
        setUser(currentUser);
        
        // Load config
        try {
          const configRef = doc(db, `users/${currentUser.uid}/config/current`);
          const configSnap = await getDoc(configRef);
          if (configSnap.exists()) {
            setConfig(configSnap.data() as UserConfig);
          } else {
            // Create default config
            const newConfig: UserConfig = {
              ...DEFAULT_CONFIG,
              uid: currentUser.uid,
              updatedAt: new Date().toISOString()
            };
            await setDoc(configRef, newConfig);
            setConfig(newConfig);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/config/current`);
        }

        // Listen to quotes
        const q = query(collection(db, `users/${currentUser.uid}/quotes`), orderBy('fecha', 'desc'));
        unsubQuotes = onSnapshot(q, (snapshot) => {
          const loadedQuotes: Quote[] = [];
          snapshot.forEach((doc) => {
            loadedQuotes.push({ id: doc.id, ...doc.data() } as Quote);
          });
          setQuotes(loadedQuotes);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, `users/${currentUser.uid}/quotes`);
        });

        setLoading(false);
      } else {
        if (unsubQuotes) {
          unsubQuotes();
          unsubQuotes = undefined;
        }
        setUser(null);
        setQuotes([]);
        setUsername('');
        setPassword('');
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
      if (unsubQuotes) {
        unsubQuotes();
      }
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    
    if (username !== 'Admin') {
      setAuthError('Usuario no encontrado.');
      return;
    }

    try {
      await signInWithCredentials('admin@3gonica.com', password);
    } catch (error: any) {
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        setAuthError('Contraseña incorrecta.');
      } else if (error.code === 'auth/operation-not-allowed') {
        setAuthError('La autenticación por correo/contraseña no está habilitada en Firebase. Por favor, actívala en la consola de Firebase.');
      } else {
        setAuthError('Error al iniciar sesión. Verifica tus credenciales.');
      }
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Zap className="w-10 h-10 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Cotizador Láser R&G</h1>
          <p className="text-gray-500 mb-6">Sistema Profesional de Cotización. Inicia sesión para continuar.</p>
          
          {authError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Ingresa tu usuario"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-blue-700 transition-colors mt-6"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Toaster position="top-right" />
      <header className="bg-gradient-to-r from-blue-900 via-blue-700 to-cyan-600 text-white py-6 shadow-xl">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center border-2 border-white/30">
                <Zap className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Cotizador Láser R&G</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-blue-100 text-sm">Sistema Profesional</span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                    <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>Online
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <NavButton active={activeTab === 'cotizador'} onClick={() => setActiveTab('cotizador')} icon={<Calculator size={18} />} label="Cotizador" />
              <NavButton active={activeTab === 'pedidos'} onClick={() => setActiveTab('pedidos')} icon={<Package size={18} />} label="Pedidos" />
              <NavButton active={activeTab === 'clientes'} onClick={() => setActiveTab('clientes')} icon={<Users size={18} />} label="Clientes" />
              <NavButton active={activeTab === 'configuracion'} onClick={() => setActiveTab('configuracion')} icon={<Settings size={18} />} label="Configuración" />
              <NavButton active={activeTab === 'historial'} onClick={() => setActiveTab('historial')} icon={<History size={18} />} label="Historial" />
              <NavButton active={activeTab === 'ayuda'} onClick={() => setActiveTab('ayuda')} icon={<HelpCircle size={18} />} label="Ayuda" />
              <button 
                onClick={logOut}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/40 text-white transition-colors text-sm font-semibold backdrop-blur ml-2"
              >
                <LogOut size={18} /> Salir
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {activeTab === 'cotizador' && <Cotizador config={config} user={user} loadedQuote={loadedQuote} onQuoteLoaded={() => setLoadedQuote(null)} />}
        {activeTab === 'pedidos' && <Pedidos user={user} />}
        {activeTab === 'clientes' && <Clientes user={user} />}
        {activeTab === 'configuracion' && <Configuracion config={config} user={user} onUpdate={setConfig} />}
        {activeTab === 'historial' && <Historial quotes={quotes} user={user} onLoadQuote={(q) => { setLoadedQuote(q); setActiveTab('cotizador'); }} />}
        {activeTab === 'ayuda' && <Ayuda />}
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-semibold backdrop-blur ${
        active ? 'bg-white/30 text-white' : 'bg-white/10 text-blue-50 hover:bg-white/20'
      }`}
    >
      {icon} {label}
    </button>
  );
}
