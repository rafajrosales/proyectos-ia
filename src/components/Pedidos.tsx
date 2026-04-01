import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Pedido, PedidoStatus, OperationType, Cliente, Quote, PedidoArticulo } from '../types';
import { handleFirestoreError } from '../utils/errorHandler';
import { Package, Calendar, User as UserIcon, DollarSign, Tag, Clock, CheckCircle, Truck, XCircle, AlertCircle, Search, Edit2, Trash2, X, Save, FileText, Plus, List, Trash, Eye } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<PedidoStatus | 'Todos'>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingArticulo, setViewingArticulo] = useState<PedidoArticulo | null>(null);

  // Form state
  const [clienteId, setClienteId] = useState('');
  const [articulos, setArticulos] = useState<PedidoArticulo[]>([]);
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
      setArticulos(pedido.articulos || []);
      setStatus(pedido.status);
      setFechaEntrega(pedido.fechaEntrega || '');
      setNotas(pedido.notas || '');
      setQuoteId(''); // Reset quote selection on edit for now to avoid confusion
    } else {
      setEditingPedido(null);
      setClienteId('');
      setArticulos([{ nombre: '', cantidad: 1, precioUnitario: 0, total: 0 }]);
      setStatus(PedidoStatus.PENDIENTE);
      setFechaEntrega('');
      setNotas('');
      setQuoteId('');
    }
    setIsModalOpen(true);
  };

  const addArticulo = () => {
    setArticulos([...articulos, { nombre: '', cantidad: 1, precioUnitario: 0, total: 0 }]);
  };

  const removeArticulo = (index: number) => {
    if (articulos.length > 1) {
      setArticulos(articulos.filter((_, i) => i !== index));
    }
  };

  const updateArticulo = (index: number, field: keyof PedidoArticulo, value: any) => {
    const newArticulos = [...articulos];
    const art = { ...newArticulos[index], [field]: value };
    
    if (field === 'cantidad' || field === 'precioUnitario') {
      art.total = Math.round(art.cantidad * art.precioUnitario);
    }
    
    newArticulos[index] = art;
    setArticulos(newArticulos);
  };

  const handleSelectQuote = (id: string) => {
    const quote = quotes.find(q => q.id === id);
    if (quote) {
      setQuoteId(id);
      const newArticulo: PedidoArticulo = {
        nombre: quote.cliente,
        cantidad: 1,
        precioUnitario: Math.round(quote.total),
        total: Math.round(quote.total),
        quoteId: id,
        datosQuote: quote.datos
      };
      
      // If there's only one empty article, replace it. Otherwise append.
      if (articulos.length === 1 && !articulos[0].nombre && articulos[0].total === 0) {
        setArticulos([newArticulo]);
      } else {
        setArticulos([...articulos, newArticulo]);
      }

      if (quote.clienteId) {
        setClienteId(quote.clienteId);
      }
    } else {
      setQuoteId('');
    }
  };

  const calculateTotal = () => {
    return articulos.reduce((sum, art) => sum + art.total, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!clienteId) {
      toast.error('Debes seleccionar un cliente');
      return;
    }

    if (articulos.length === 0 || articulos.some(a => !a.nombre.trim())) {
      toast.error('Todos los artículos deben tener un nombre');
      return;
    }

    const selectedCliente = clientes.find(c => c.id === clienteId);
    if (!selectedCliente) {
      toast.error('Cliente no encontrado');
      return;
    }

    setIsSubmitting(true);
    
    const processedArticulos = articulos.map(a => {
      const cantidad = Number(a.cantidad) || 0;
      const precioUnitario = Number(a.precioUnitario) || 0;
      const total = Number((cantidad * precioUnitario).toFixed(2));
      return {
        ...a,
        nombre: a.nombre.trim(),
        cantidad,
        precioUnitario,
        total
      };
    });

    const totalGeneral = Number(processedArticulos.reduce((sum, art) => sum + art.total, 0).toFixed(2));

    const pedidoData = {
      uid: user.uid,
      fecha: editingPedido ? editingPedido.fecha : new Date().toISOString(),
      clienteId,
      clienteNombre: selectedCliente.nombre,
      articulos: processedArticulos,
      total: totalGeneral,
      status,
      fechaEntrega,
      notas
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
    } catch (error: any) {
      console.error("Error saving pedido:", error);
      toast.error(`Error al guardar: ${error.message || 'Error desconocido'}`);
      handleFirestoreError(error, editingPedido ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/pedidos`);
    } finally {
      setIsSubmitting(false);
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

  const getStatusCount = (status: string) => {
    if (status === 'Todos') return pedidos.length;
    return pedidos.filter(p => p.status === status).length;
  };

  const filteredPedidos = pedidos.filter(p => {
    const clienteNombre = p.clienteNombre || '';
    const statusStr = p.status || '';
    const search = searchTerm.toLowerCase();
    const articulosMatch = p.articulos?.some(a => a.nombre.toLowerCase().includes(search)) || false;
    
    const matchesSearch = clienteNombre.toLowerCase().includes(search) ||
                         articulosMatch ||
                         statusStr.toLowerCase().includes(search);
    
    const matchesStatus = statusFilter === 'Todos' || p.status === statusFilter;
    
    return matchesSearch && matchesStatus;
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

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
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

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => setStatusFilter('Todos')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
              statusFilter === 'Todos' 
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
            }`}
          >
            Todos
            <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === 'Todos' ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
              {getStatusCount('Todos')}
            </span>
          </button>
          {Object.values(PedidoStatus).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                statusFilter === s 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                  : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300'
              }`}
            >
              <span className={statusFilter === s ? 'text-white' : ''}>{getStatusIcon(s)}</span>
              {s}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${statusFilter === s ? 'bg-white/20' : 'bg-gray-100 text-gray-400'}`}>
                {getStatusCount(s)}
              </span>
            </button>
          ))}
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
                    <h3 className="font-bold text-gray-900 text-lg">
                      {pedido.articulos && pedido.articulos.length > 0 
                        ? (pedido.articulos.length === 1 
                            ? pedido.articulos[0].nombre 
                            : `${pedido.articulos[0].nombre} (+${pedido.articulos.length - 1} más)`)
                        : 'Sin artículos'}
                    </h3>
                    {pedido.articulos && pedido.articulos.length > 1 && (
                      <div className="mt-2 space-y-1">
                        {pedido.articulos.map((art, idx) => (
                          <div key={idx} className="text-[10px] text-gray-400 flex justify-between max-w-xs">
                            <span className="truncate mr-2">• {art.nombre} (x{art.cantidad})</span>
                            <span className="shrink-0">${art.total.toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
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

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-700">Artículos del Pedido *</label>
                  <button 
                    type="button" 
                    onClick={addArticulo}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    <Plus size={14} /> Agregar Artículo
                  </button>
                </div>
                
                <div className="overflow-hidden border border-gray-200 rounded-xl">
                  {/* Desktop View: Table */}
                  <div className="hidden md:block">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <tr>
                          <th className="px-3 py-2 border-b border-gray-200">Artículo</th>
                          <th className="px-3 py-2 border-b border-gray-200 w-16 text-center">Cant.</th>
                          <th className="px-3 py-2 border-b border-gray-200 w-24 text-right">P. Unit.</th>
                          <th className="px-3 py-2 border-b border-gray-200 w-24 text-right">Total</th>
                          <th className="px-3 py-2 border-b border-gray-200 w-20 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {articulos.map((art, index) => (
                          <tr key={index} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2">
                              <input 
                                type="text" 
                                value={art.nombre}
                                onChange={(e) => updateArticulo(index, 'nombre', e.target.value)}
                                placeholder="Nombre..."
                                className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 placeholder:text-gray-300"
                                required
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input 
                                type="number" 
                                value={art.cantidad || ''}
                                onChange={(e) => updateArticulo(index, 'cantidad', e.target.value === '' ? 0 : Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                min="1"
                                className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 text-center"
                                required
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input 
                                type="number" 
                                step="0.01"
                                value={art.precioUnitario || ''}
                                onChange={(e) => updateArticulo(index, 'precioUnitario', e.target.value === '' ? 0 : Number(e.target.value))}
                                onFocus={(e) => e.target.select()}
                                className="w-full bg-transparent border-none focus:ring-0 text-sm p-0 text-right font-mono"
                                required
                              />
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span className="text-sm font-bold text-gray-600 font-mono">
                                ${art.total.toLocaleString()}
                              </span>
                            </td>
                            <td className="px-3 py-2">
                              <div className="flex items-center justify-center gap-1">
                                {art.datosQuote && (
                                  <button
                                    type="button"
                                    onClick={() => setViewingArticulo(art)}
                                    className="p-1.5 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                                    title="Ver detalles"
                                  >
                                    <Eye size={14} />
                                  </button>
                                )}
                                {articulos.length > 1 && (
                                  <button 
                                    type="button" 
                                    onClick={() => removeArticulo(index)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash size={14} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile View: Cards */}
                  <div className="md:hidden divide-y divide-gray-100">
                    {articulos.map((art, index) => (
                      <div key={index} className="p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between gap-2">
                          <input 
                            type="text" 
                            value={art.nombre}
                            onChange={(e) => updateArticulo(index, 'nombre', e.target.value)}
                            placeholder="Nombre del artículo..."
                            className="flex-1 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm font-bold"
                            required
                          />
                          <div className="flex items-center gap-1">
                            {art.datosQuote && (
                              <button
                                type="button"
                                onClick={() => setViewingArticulo(art)}
                                className="p-2 text-indigo-500 bg-indigo-50 rounded-lg"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            {articulos.length > 1 && (
                              <button 
                                type="button" 
                                onClick={() => removeArticulo(index)}
                                className="p-2 text-red-500 bg-red-50 rounded-lg"
                              >
                                <Trash size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Cant.</label>
                            <input 
                              type="number" 
                              value={art.cantidad || ''}
                              onChange={(e) => updateArticulo(index, 'cantidad', e.target.value === '' ? 0 : Number(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-center"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">P. Unit.</label>
                            <input 
                              type="number" 
                              step="0.01"
                              value={art.precioUnitario || ''}
                              onChange={(e) => updateArticulo(index, 'precioUnitario', e.target.value === '' ? 0 : Number(e.target.value))}
                              onFocus={(e) => e.target.select()}
                              className="w-full bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-right"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 text-right">Total</label>
                            <div className="w-full px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold text-right">
                              ${art.total.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Total General ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <div className="w-full pl-10 pr-4 py-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-700 font-bold">
                      {calculateTotal().toLocaleString()}
                    </div>
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
                  disabled={isSubmitting}
                  className={`flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl shadow-md transition-colors ${isSubmitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Save size={20} />
                  )}
                  {isSubmitting ? 'Guardando...' : (editingPedido ? 'Actualizar' : 'Crear Pedido')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {viewingArticulo && (() => {
        let quoteData = null;
        try {
          quoteData = typeof viewingArticulo.datosQuote === 'string' 
            ? JSON.parse(viewingArticulo.datosQuote) 
            : viewingArticulo.datosQuote;
        } catch (e) {
          console.error("Error parsing quoteData:", e);
        }
        
        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <div 
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-indigo-50 shrink-0">
                <h3 className="text-lg font-bold text-indigo-900">Detalles del Producto</h3>
                <button 
                  onClick={() => setViewingArticulo(null)}
                  className="p-2 hover:bg-white rounded-full transition-colors text-indigo-400"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 space-y-6 overflow-y-auto">
                {/* Foto de Vista Previa */}
                {quoteData?.fotoUrl && (
                  <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shadow-inner">
                    <img 
                      src={quoteData.fotoUrl} 
                      alt={viewingArticulo.nombre}
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-2 right-2 bg-black/50 backdrop-blur-md text-white text-[10px] px-2 py-1 rounded-full font-bold">
                      Vista Previa
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Nombre</label>
                    <p className="text-gray-800 font-bold">{viewingArticulo.nombre}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Precio Unitario</label>
                    <p className="text-lg font-bold text-indigo-600">${viewingArticulo.precioUnitario.toLocaleString()}</p>
                  </div>
                </div>
                
                {quoteData && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-gray-400 uppercase">Especificaciones Técnicas</label>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase">Material</p>
                        <p className="text-xs font-bold text-gray-700">{quoteData.material?.nombre}</p>
                      </div>
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase">Dimensiones</p>
                        <p className="text-xs font-bold text-gray-700">{quoteData.ancho} × {quoteData.largo} cm</p>
                      </div>
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase">Lienzo</p>
                        <p className="text-xs font-bold text-gray-700">{quoteData.lienzo?.nombre}</p>
                      </div>
                      <div className="p-2.5 bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-[10px] text-gray-400 uppercase">Tiempo Est.</p>
                        <p className="text-xs font-bold text-gray-700">{quoteData.tiempoTotalMinutos?.toFixed(1)} min</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 shrink-0">
                <button
                  onClick={() => setViewingArticulo(null)}
                  className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 active:scale-[0.98] transition-all"
                >
                  Cerrar Detalles
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
