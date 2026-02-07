import React, { useState, useEffect } from 'react';
import { useStore } from '../context/StoreContext';
import { APP_CURRENCY } from '../constants';
// Added ShoppingCart to imports
import { Search, Plus, Minus, Trash2, User, CreditCard, Sparkles, Send, Mail, ShoppingCart, ShoppingBag, IdCard, Printer, Banknote, Landmark, HandCoins, X, NotepadText, CheckCircle} from 'lucide-react';
import { generateInvoiceEmail } from '../services/geminiService';
import { Sale, Product } from '../types';
import { generateReceiptPDF } from '../services/pdfservices';



const DEFAULT_CUSTOMER = {
  name: 'consumidor final',
  email: 'consumidorfinal@gmail.com',
  nit: '222222222'
};

export const POS: React.FC = () => {
  const { products, cart, addToCart, removeFromCart, updateCartQuantity, completeSale } = useStore();
  const [searchTerm, setSearchTerm] = useState('');

  // Mobile UI States
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });
  
  // Checkout State - como se llena el formulario automaticamente
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [customerName, setCustomerName] = useState(DEFAULT_CUSTOMER.name);
  const [customerEmail, setCustomerEmail] = useState(DEFAULT_CUSTOMER.email);
  const [customerNit, setCustomerNit] = useState(DEFAULT_CUSTOMER.nit);
  
  // Post-Sale Modal State
  const [lastSale, setLastSale] = useState<Sale | null>(null);
  const [emailContent, setEmailContent] = useState('');
  const [isGeneratingEmail, setIsGeneratingEmail] = useState(false);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (product: Product) => {
    addToCart(product);
    setToast({ message: `${product.name} añadido`, visible: true });
  };

    useEffect(() => {
     if (toast.visible) {
      const timer = setTimeout(() => {
        setToast({ ...toast, visible: false });
      }, 2000);
      return () => clearTimeout(timer);
    }
    }, [toast.visible]);

    const handleCheckout = async () => {
    if (!customerName || !customerEmail) {
      alert("Por favor ingrese nombre y correo del cliente.");
      return;
    }

    const sale = await completeSale({
      name: customerName,
      email: customerEmail,
      nit: customerNit
    });

    setLastSale(sale);
    setIsCheckingOut(false);
    setIsCartDrawerOpen(false);
    
    // Auto generate email draft
    setIsGeneratingEmail(true);
    const generatedEmail = await generateInvoiceEmail(sale);
    setEmailContent(generatedEmail);
    setIsGeneratingEmail(false);
    
    // Reset form to default customer
    setCustomerName(DEFAULT_CUSTOMER.name);
    setCustomerEmail(DEFAULT_CUSTOMER.email);
    setCustomerNit(DEFAULT_CUSTOMER.nit);
  };

  const closeSuccessModal = () => {
    setLastSale(null);
    setEmailContent('');
  };

  const handlePrintReceipt = () => {
    if (lastSale) {
      generateReceiptPDF(lastSale);
    }
  };

 const CartContent = () => (
    <div className="flex flex-col h-full bg-white">
      <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 z-10 bg-white">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
          <ShoppingBag size={24} className="text-orange-600" />
          Carrito {cartItemCount > 0 && <span className="text-sm bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">{cartItemCount}</span>}
        </h2>
        <button onClick={() => setIsCartDrawerOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-orange-100">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
            <div className="bg-gray-50 p-6 rounded-full">
              <ShoppingCart size={48} className="opacity-20" />
            </div>
            <p className="font-medium">El carrito está vacío</p>
          </div>
        ) : (
          cart.map(item => (
            <div key={item.id} className="flex gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100 items-center">
              <img src={item.image} alt={item.name} className="w-16 h-16 rounded-lg object-cover bg-white" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-gray-800 truncate text-sm">{item.name}</h4>
                <p className="text-orange-500 font-bold text-sm">{APP_CURRENCY}{item.price.toFixed(2)}</p>
                <div className="flex items-center gap-3 mt-2">
                  <button onClick={() => updateCartQuantity(item.id, item.quantity - 1)} className="p-1 hover:bg-white rounded border border-gray-200 shadow-sm"><Minus size={14} className="lg:hidden p-0 text-gray-600 hover:text-gray-600 square-full hover:bg-orange-100"/></button>
                  <span className="font-bold text-gray-700 text-sm">{item.quantity}</span>
                  <button onClick={() => updateCartQuantity(item.id, item.quantity + 1)} className="p-1 hover:bg-white rounded border border-gray-200 shadow-sm"><Plus size={14} className="lg:hidden p-0 text-gray-600 hover:text-gray-600 square-full hover:bg-green-100"/></button>
                </div>
              </div>
              <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 p-2"><Trash2 size={18}/></button>
            </div>
          ))
        )}
      </div>

      <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-4">
        <div className="flex justify-between items-center text-lg font-bold text-gray-800">
          <span>Total</span>
          <span className="text-blue-600">{APP_CURRENCY}{cartTotal.toFixed(2)}</span>
        </div>
        <button 
          disabled={cart.length === 0}
          onClick={() => setIsCheckingOut(true)}
          className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:shadow-none"
        >
          <NotepadText size={20} /> Cliente y facturacion
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-full relative">
      {/* Product List Section */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 lg:p-6 bg-white border-b border-gray-100 sticky top-0 z-20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 " size={20} />
            <input 
              type="text"
              placeholder="Busca productos..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 lg:gap-6">
            {filteredProducts.map(product => (
              <button
                key={product.id}
                onClick={() => handleAddToCart(product)}
                className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:border-orange-500 hover:shadow-md transition group text-left flex flex-col h-full"
              >
                <div className="relative aspect-square overflow-hidden bg-gray-100">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                  <div className="absolute top-2 right-2">
                    <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[10px] font-bold text-gray-600 shadow-sm">{product.category}</span>
                  </div>
                </div>
                <div className="p-3 lg:p-4 flex flex-col flex-1 justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm lg:text-base line-clamp-2 mb-1">{product.name}</h3>
                    <p className="text-xs text-gray-400 mb-2">Stock: {product.stock} unids.</p>
                  </div>
                  <div className="flex justify-between items-center mt-auto">
                    <span className="text-blue-600 font-black text-sm lg:text-lg">{APP_CURRENCY}{product.price.toFixed(2)}</span>
                    <div className="bg-blue-50 p-2 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition">
                      <Plus size={18} />
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Section (Desktop Sidebar) */}
      <div className="hidden lg:block w-96 border-l border-gray-200">
        <CartContent />
      </div>

      {/* Borbuja Flotante de carrito */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <button 
          onClick={() => setIsCartDrawerOpen(true)}
          className="relative bg-orange-600 text-white p-4 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
        >
          <ShoppingCart size={28} />
          {cartItemCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-green-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-md">
              {cartItemCount}
            </span>
          )}
        </button>
      </div>

      {/* Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom duration-300">
          <div className="bg-emerald-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-emerald-400/50">
            <CheckCircle size={20} className="text-white" />
            <span className="font-bold text-sm tracking-wide">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Cart Drawer Overlay (Mobile) */}
      {isCartDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsCartDrawerOpen(false)} />
          <div className="relative mt-auto h-[85vh] w-full bg-white rounded-t-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <CartContent />
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckingOut && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <User size={20} className="text-orange-600" /> Información del Cliente
              </h3>
              <button onClick={() => setIsCheckingOut(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-white transition"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Nombre Completo</label>
                <input 
                  type="text" 
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">NIT / CC</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={customerNit}
                    onChange={e => setCustomerNit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Teléfono (opcional)</label>
                  <input 
                    type="tel" 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Email</label>
                  <input 
                    type="email" 
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    value={customerEmail}
                    onChange={e => setCustomerEmail(e.target.value)}
                  />
                </div>
              </div>
              <div className="pt-4">
                <div className="flex justify-between items-center mb-4 text-xl font-bold">
                  <span className="text-gray-500">Total a pagar:</span>
                  <span className="text-green-600">{APP_CURRENCY}{cartTotal.toFixed(0)}</span>
                </div>
                <button 
                  onClick={handleCheckout}
                  className="w-full bg-green-600 text-white py-4 rounded-xl font-bold hover:bg-green-700 transition shadow-lg shadow-green-200 flex items-center justify-center gap-2"
                >
                  <CreditCard size={20} /> Confirmar Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {lastSale && (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 text-center bg-blue-600 text-white relative">
              <div className="absolute top-4 right-4">
                <button onClick={closeSuccessModal} className="text-blue-200 hover:text-white p-2">
                  <X size={24} />
                </button>
              </div>
              <div className="bg-white/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/30">
                <Plus size={40} className="rotate-45" />
              </div>
              <h3 className="text-2xl font-bold mb-1">¡Venta Exitosa!</h3>
              <p className="text-blue-100">Transacción #{lastSale.id}</p>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100">
                <h4 className="font-bold text-indigo-900 flex items-center gap-2 mb-3">
                  <Sparkles size={18} className="text-indigo-600" /> Enviada al email:
                </h4>
                {isGeneratingEmail ? (
                  <div className="flex items-center gap-3 text-indigo-400">
                    <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-sm font-medium">Redactando correo personalizado...</p>
                  </div>
                ) : (
                  <div className="text-indigo-800 text-sm leading-relaxed max-h-40 overflow-y-auto italic">
                    {emailContent}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handlePrintReceipt}
                  className="w-full bg-gray-800 text-white py-4 rounded-xl font-bold hover:bg-black transition flex items-center justify-center gap-2 shadow-lg"
                >
                  <Printer size={20} /> Imprimir factura
                </button>
                <button 
                  onClick={() => alert('Simulación: Correo enviado a ' + lastSale.customer.email)}
                  className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
                >
                  <Send size={20} /> Enviar por Email
                </button>
                <button 
                  onClick={closeSuccessModal}
                  className="w-full bg-white text-gray-500 py-3 rounded-xl font-bold hover:bg-gray-50 transition border border-gray-200"
                >
                  Nueva Venta
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};