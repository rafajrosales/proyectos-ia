import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy, Timestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Cliente, OperationType } from '../types';
import { handleFirestoreError } from '../utils/errorHandler';
import { User as UserIcon, Phone, Mail, Building, Plus, Search, Edit2, Trash2, X, Save, AlignLeft } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  user: User;
}

export default function Clientes({ user }: Props) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  
  // Form state
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [notas, setNotas] = useState('');

  useEffect(() => {
    const q = query(collection(db, `users/${user.uid}/clientes`), orderBy('nombre', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedClientes: Cliente[] = [];
      snapshot.forEach((doc) => {
        loadedClientes.push({ id: doc.id, ...doc.data() } as Cliente);
      });
      setClientes(loadedClientes);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/clientes`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const resetForm = () => {
    setNombre('');
    setTelefono('');
    setEmail('');
    setEmpresa('');
    setNotas('');
    setEditingCliente(null);
  };

  const handleOpenModal = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setNombre(cliente.nombre);
      setTelefono(cliente.telefono || '');
      setEmail(cliente.email || '');
      setEmpresa(cliente.empresa || '');
      setNotas(cliente.notas || '');
    } else {
      resetForm();
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    const clienteData = {
      uid: user.uid,
      nombre: nombre.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      empresa: empresa.trim(),
      notas: notas.trim(),
      createdAt: editingCliente ? editingCliente.createdAt : new Date().toISOString()
    };

    try {
      if (editingCliente?.id) {
        await updateDoc(doc(db, `users/${user.uid}/clientes/${editingCliente.id}`), clienteData);
        toast.success('Cliente actualizado');
      } else {
        await addDoc(collection(db, `users/${user.uid}/clientes`), clienteData);
        toast.success('Cliente agregado');
      }
      setIsModalOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, editingCliente ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/clientes`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este cliente?')) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/clientes/${id}`));
        toast.success('Cliente eliminado');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/clientes/${id}`);
      }
    }
  };

  const filteredClientes = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.empresa?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.telefono?.includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Directorio de Clientes</h2>
          <p className="text-gray-500">Gestiona la información de contacto de tus clientes.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md transition-all transform hover:scale-105"
        >
          <Plus size={20} /> Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nombre, empresa, email o teléfono..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredClientes.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="text-gray-300" size={40} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No se encontraron clientes</h3>
          <p className="text-gray-500 mt-1">
            {searchTerm ? 'Intenta con otros términos de búsqueda.' : 'Comienza agregando tu primer cliente.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClientes.map((cliente) => (
            <div key={cliente.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-bold text-xl">
                  {cliente.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleOpenModal(cliente)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => cliente.id && handleDelete(cliente.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-1">{cliente.nombre}</h3>
              {cliente.empresa && (
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                  <Building size={14} />
                  <span>{cliente.empresa}</span>
                </div>
              )}

              <div className="space-y-2 mt-4 pt-4 border-t border-gray-50">
                {cliente.telefono && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Phone size={16} className="text-gray-400" />
                    <span className="text-sm">{cliente.telefono}</span>
                  </div>
                )}
                {cliente.email && (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Mail size={16} className="text-gray-400" />
                    <span className="text-sm truncate">{cliente.email}</span>
                  </div>
                )}
                {cliente.notas && (
                  <div className="flex items-start gap-3 text-gray-600">
                    <AlignLeft size={16} className="text-gray-400 mt-0.5" />
                    <p className="text-sm line-clamp-2 italic">{cliente.notas}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-xl font-bold text-gray-800">
                {editingCliente ? 'Editar Cliente' : 'Nuevo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre Completo *</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Empresa (Opcional)</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={empresa}
                    onChange={(e) => setEmpresa(e.target.value)}
                    placeholder="Nombre de la empresa"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Teléfono</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="tel" 
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="55 1234 5678"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notas Internas</label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 text-gray-400" size={18} />
                  <textarea 
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    placeholder="Detalles adicionales, preferencias, etc."
                    rows={3}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md transition-colors"
                >
                  <Save size={20} /> {editingCliente ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
