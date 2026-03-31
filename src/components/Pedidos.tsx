import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Pedido, PedidoStatus, OperationType, Cliente, Quote } from '../types';
import { handleFirestoreError } from '../utils/errorHandler';
import { Package, Calendar, User as UserIcon, DollarSign, Tag, Clock, CheckCircle, Truck, XCircle, AlertCircle, Search, Edit2, Trash2, X, Save, FileText, Plus, List } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  user: User;
}

export default function Pedidos({ user }: Props) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);

  // Form state
  const [clienteId, setClienteId] = useState('');
  const [articuloNombre, setArticuloNombre] = useState('');
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState<PedidoStatus>(PedidoStatus.PENDIENTE);
  const [fechaEntrega, setFechaEntrega] = useState('');
  const [notas, setNotas] = useState('');
  const [quoteId, setQuoteId] = useState('');

  useEffect(() => {
    const qPedidos = collection(db, `users/${user.uid}/pedidos`);
    const unsubPedidos = onSnapshot(qPedidos, (snapshot) => {
      const loaded: Pedido[] = [];
      snapshot.forEach((doc) => {
        loaded.push({ id: doc.id, ...doc.data() } as Pedido);
      });
      // Sort in memory to handle documents missing the 'fecha' field
      loaded.sort((a, b) => new Date(b.fecha || 0).getTime() - new Date(a.fecha || 0).getTime());
      setPedidos(loaded);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/pedidos`);
      setLoading(false);
    });

    const qClientes = query(collection(db, `users/${user.uid}/clientes`), orderBy('nombre', 'asc'));
    const unsubClientes = onSnapshot(qClientes, (snapshot) => {
      const loaded: Cliente[] = [];
      snapshot.forEach((doc) => {
        loaded.push({ id: doc.id, ...doc.data() } as Cliente);
      });
      setClientes(loaded);
    });

    const qQuotes = query(collection(db, `users/${user.uid}/quotes`), orderBy('fecha', 'desc'));
    const unsubQuotes = onSnapshot(qQuotes, (snapshot) => {
      const loaded: Quote[] = [];
      snapshot.forEach((doc) => {
        loaded.push({ id: doc.id, ...doc.data() } as Quote);
      });
      setQuotes(loaded);
    });

    return () => {
      unsubPedidos();
      unsubClientes();
      unsubQuotes();
    };
  }, [user.uid]);

  const handleOpenModal = (pedido?: Pedido) => {
    if (pedido) {
      setEditingPedido(pedido);
      setClienteId(pedido.clienteId);
      setArticuloNombre(pedido.articuloNombre);
      setTotal(pedido.total);
      setStatus(pedido.status);
      setFechaEntrega(pedido.fechaEntrega || '');
      setNotas(pedido.notas || '');
      setQuoteId(pedido.quoteId || '');
    } else {
      setEditingPedido(null);
      setClienteId('');
      setArticuloNombre('');
      setTotal(0);
      setStatus(PedidoStatus.PENDIENTE);
      setFechaEntrega('');
      setNotas('');
      setQuoteId('');
    }
    setIsModalOpen(true);
  };

  const handleSelectQuote = (id: string) => {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
      setQuoteId(id);
      setArticuloNombre(quote.cliente); // quote.cliente is the article name
      setTotal(Math.round(quote.total));
      if (quote.clienteId) {
        setClienteId(quote.clienteId);
      }
    } else {
      setQuoteId('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || !articuloNombre) {
      toast.error('Cliente y Artículo son obligatorios');
      return;
    }

    const selectedCliente = clientes.find(c => c.id === clienteId);
    if (!selectedCliente) return;

    const pedidoData = {
      uid: user.uid,
      fecha: editingPedido ? editingPedido.fecha : new Date().toISOString(),
      clienteId,
      clienteNombre: selectedCliente.nombre,
      articuloNombre,
      total: Math.round(total),
      status,
      fechaEntrega,
      notas,
      quoteId: quoteId || undefined,
      datosQuote: editingPedido?.datosQuote || (quoteId ? (quotes.find(q => q.id === quoteId)?.datos || '') : '')
    };

    try {
      if (editingPedido?.id) {
        await updateDoc(doc(db, `users/${user.uid}/pedidos/${editingPedido.id}`), pedidoData);
        toast.success('Pedido actualizado');
      } else {
        await addDoc(collection(db, `users/${user.uid}/pedidos`), pedidoData);
        toast.success('Pedido creado');
      }
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingPedido ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/pedidos`);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Estás seguro de eliminar este pedido?')) {
      try {
        await deleteDoc(doc(db, `users/${user.uid}/pedidos/${id}`));
        toast.success('Pedido eliminado');
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/pedidos/${id}`);
      }
    }
  };

  const getStatusIcon = (s: PedidoStatus) => {
    switch (s) {
      case PedidoStatus.PENDIENTE: return <Clock size={16} className="text-amber-500" />;
      case PedidoStatus.EN_PROCESO: return <AlertCircle size={16} className="text-blue-500" />;
      case PedidoStatus.LISTO: return <CheckCircle size={16} className="text-indigo-500" />;
      case PedidoStatus.ENTREGADO: return <Truck size={16} className="text-emerald-500" />;
      case PedidoStatus.PAGADO: return <DollarSign size={16} className="text-green-500" />;
      case PedidoStatus.CANCELADO: return <XCircle size={16} className="text-red-500" />;
    }
  };

  const getStatusColor = (s: PedidoStatus) => {
    switch (s) {
      case PedidoStatus.PENDIENTE: return 'bg-amber-50 text-amber-700 border-amber-100';
      case PedidoStatus.EN_PROCESO: return 'bg-blue-50 text-blue-700 border-blue-100';
      case PedidoStatus.LISTO: return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      case PedidoStatus.ENTREGADO: return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case PedidoStatus.PAGADO: return 'bg-green-50 text-green-700 border-green-100';
      case PedidoStatus.CANCELADO: return 'bg-red-50 text-red-700 border-red-100';
    }
  };

  const filteredPedidos = pedidos.filter(p => {
    const clienteNombre = p.clienteNombre || '';
    const articuloNombre = p.articuloNombre || '';
    const status = p.status || '';
    const search = searchTerm.toLowerCase();
    
    return clienteNombre.toLowerCase().includes(search) ||
           articuloNombre.toLowerCase().includes(search) ||
           status.toLowerCase().includes(search);
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Pedidos</h2>
          <p className="text-gray-500">Administra el flujo de trabajo de tus cotizaciones aceptadas.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 px-6 rounded-xl shadow-md transition-all transform hover:scale-105"
        >
          <Plus size={20} /> Nuevo Pedido
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por cliente, artículo o estado..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : filteredPedidos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="text-gray-300" size={40} />
          </div>
          <h3 className="text-lg font-bold text-gray-800">No hay pedidos registrados</h3>
          <p className="text-gray-500 mt-1">
            {searchTerm ? 'No se encontraron resultados para tu búsqueda.' : 'Los pedidos aparecerán aquí cuando conviertas una cotización o crees uno nuevo.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredPedidos.map((pedido) => (
            <div key={pedido.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all group">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusColor(pedido.status)} border`}>
                    {getStatusIcon(pedido.status)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{pedido.articuloNombre || 'Sin nombre'}</h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
                      <span className="flex items-center gap-1">
                        <UserIcon size={14} /> 
                        {pedido.clienteNombre || clientes.find(c => c.id === pedido.clienteId)?.nombre || 'Cliente desconocido'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} /> 
                        {pedido.fecha ? new Date(pedido.fecha).toLocaleDateString('es-MX') : 'Sin fecha'}
                      </span>
                      {pedido.fechaEntrega && (
                        <span className="flex items-center gap-1 text-indigo-600 font-medium">
                          <Clock size={14} /> Entrega: {new Date(pedido.fechaEntrega).toLocaleDateString('es-MX')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6">
                  <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</p>
                    <p className="text-xl font-black text-gray-900">${pedido.total.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenModal(pedido)}
                      className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      title="Editar Pedido"
                    >
                      <Edit2 size={20} />
                    </button>
                    <button 
                      onClick={() => pedido.id && handleDelete(pedido.id)}
                      className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                      title="Eliminar Pedido"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              </div>
              
              {pedido.notas && (
                <div className="mt-4 pt-4 border-t border-gray-50 text-sm text-gray-600 italic">
                  <span className="font-bold text-gray-400 not-italic mr-2">Notas:</span>
                  {pedido.notas}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de Pedido */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-indigo-50/30">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Package className="text-indigo-600" />
                {editingPedido ? 'Editar Pedido' : 'Nuevo Pedido'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {!editingPedido && (
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-2">
                  <label className="block text-xs font-bold text-indigo-600 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <List size={14} /> Seleccionar de Cotización (Opcional)
                  </label>
                  <select 
                    value={quoteId} 
                    onChange={(e) => handleSelectQuote(e.target.value)} 
                    className="w-full px-3 py-2 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white text-sm"
                  >
                    <option value="">-- Manual (Sin Cotización) --</option>
                    {quotes.map(q => (
                      <option key={q.id} value={q.id}>
                        {new Date(q.fecha).toLocaleDateString('es-MX')} - {q.cliente} (${q.total.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-indigo-500 mt-1.5 leading-tight">
                    Al seleccionar una cotización, se cargarán automáticamente el nombre del artículo, el total y el cliente asociado.
                  </p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Cliente *</label>
                <select 
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">Selecciona un cliente...</option>
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre} {c.empresa ? `(${c.empresa})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del Artículo *</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    value={articuloNombre}
                    onChange={(e) => setArticuloNombre(e.target.value)}
                    placeholder="Ej. Letrero Neón"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Total ($) *</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="number" 
                      value={total}
                      onChange={(e) => setTotal(Math.round(Number(e.target.value)))}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Estado</label>
                  <select 
                    value={status}
                    onChange={(e) => setStatus(e.target.value as PedidoStatus)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    {Object.values(PedidoStatus).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Fecha de Entrega Prometida</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="date" 
                    value={fechaEntrega}
                    onChange={(e) => setFechaEntrega(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notas del Pedido</label>
                <textarea 
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Instrucciones especiales, detalles de producción, etc."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
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
                  className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-md transition-colors"
                >
                  <Save size={20} /> {editingPedido ? 'Actualizar' : 'Crear Pedido'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
