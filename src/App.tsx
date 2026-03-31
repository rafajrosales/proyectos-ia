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
import { Calculator, Settings, History, HelpCircle, LogOut, Zap, Users, Package, Menu as MenuIcon, X as XIcon, User as UserIcon, ChevronRight } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-gray-100"
        >
          <div className="w-20 h-20 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-6 rotate-3">
            <Zap className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-black text-gray-900 mb-2 tracking-tight">Cotizador Láser R&G</h1>
          <p className="text-gray-500 mb-8 font-medium">Sistema Profesional de Cotización. Inicia sesión para continuar.</p>
          
          {authError && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm font-semibold"
            >
              {authError}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5 text-left">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                placeholder="Tu usuario"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                placeholder="••••••••"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 text-white font-bold py-4 px-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 active:scale-95 mt-8"
            >
              Iniciar Sesión
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'cotizador', label: 'Cotizador', icon: <Calculator size={20} /> },
    { id: 'pedidos', label: 'Pedidos', icon: <Package size={20} /> },
    { id: 'clientes', label: 'Clientes', icon: <Users size={20} /> },
    { id: 'configuracion', label: 'Configuración', icon: <Settings size={20} /> },
    { id: 'historial', label: 'Historial', icon: <History size={20} /> },
    { id: 'ayuda', label: 'Ayuda', icon: <HelpCircle size={20} /> },
  ] as const;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans flex flex-col lg:flex-row overflow-hidden">
      <Toaster position="top-right" />
      
      {/* Mobile Header */}
      <header className="lg:hidden bg-white border-b border-gray-100 px-4 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-black text-gray-900 tracking-tight">R&G Láser</h1>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <MenuIcon size={24} />
        </button>
      </header>

      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-gray-100 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black text-gray-900 tracking-tight">R&G Láser</h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="lg:hidden p-2 text-gray-400 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <XIcon size={20} />
          </button>
        </div>

        <div className="px-4 py-2">
          <div className="bg-indigo-50/50 rounded-2xl p-4 flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-indigo-100">
              <UserIcon className="text-indigo-600" size={20} />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Administrador</p>
              <p className="text-sm font-bold text-gray-900 truncate">Rafa Rosales</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`
                w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all group
                ${activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'}
              `}
            >
              <div className="flex items-center gap-3">
                <span className={`${activeTab === item.id ? 'text-white' : 'text-gray-400 group-hover:text-indigo-600'} transition-colors`}>
                  {item.icon}
                </span>
                <span className="font-bold text-sm">{item.label}</span>
              </div>
              {activeTab === item.id && (
                <motion.div layoutId="active-nav" className="w-1.5 h-1.5 bg-white rounded-full" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-50">
          <button 
            onClick={logOut}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 font-bold text-sm transition-all group"
          >
            <LogOut size={20} className="group-hover:translate-x-1 transition-transform" />
            Salir del Sistema
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        <div className="container mx-auto px-4 py-6 lg:px-8 lg:py-10 max-w-7xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'cotizador' && <Cotizador config={config} user={user} loadedQuote={loadedQuote} onQuoteLoaded={() => setLoadedQuote(null)} />}
              {activeTab === 'pedidos' && <Pedidos user={user} />}
              {activeTab === 'clientes' && <Clientes user={user} />}
              {activeTab === 'configuracion' && <Configuracion config={config} user={user} onUpdate={setConfig} />}
              {activeTab === 'historial' && <Historial quotes={quotes} user={user} onLoadQuote={(q) => { setLoadedQuote(q); setActiveTab('cotizador'); }} />}
              {activeTab === 'ayuda' && <Ayuda />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return null; // Removed in favor of inline mapping
}
