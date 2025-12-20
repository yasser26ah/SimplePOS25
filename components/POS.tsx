import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { APP_CURRENCY } from '../constants';
// Added ShoppingCart to imports
import { Search, Plus, Minus, Trash2, User, CreditCard, Sparkles, Send, Mail, ShoppingCart } from 'lucide-react';
import { generateInvoiceEmail } from '../services/geminiService';
import { Sale } from '../types';

const DEFAULT_CUSTOMER = {
  name: 'consumidor final',
  email: 'consumidorfinal@gmail.com',
  nit: '222222222'
};

export const POS: React.FC = () => {
  const { products, cart, addToCart, removeFromCart, updateCartQuantity, completeSale } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  
  // Checkout State
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

  if (lastSale) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
          <div className="p-6 bg-green-50 border-b border-green-100 flex items-center space-x-3">
             <div className="bg-green-100 p-2 rounded-full">
               <Sparkles className="text-green-600" size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-green-800">¡Venta Exitosa!</h2>
               <p className="text-green-600 text-sm">Total: {APP_CURRENCY}{lastSale.total.toFixed(2)}</p>
             </div>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                <Mail size={16} /> Correo de Facturación (IA Generado)
              </label>
              {isGeneratingEmail ? (
                <div className="h-32 bg-gray-50 rounded-lg animate-pulse flex items-center justify-center text-gray-400">
                  Redactando correo inteligente...
                </div>
              ) : (
                <textarea 
                  className="w-full h-32 p-3 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                />
              )}
            </div>
            
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => {
                  alert(`Correo enviado a ${lastSale.customer.email}`);
                  closeSuccessModal();
                }}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition flex items-center justify-center gap-2"
                disabled={isGeneratingEmail}
              >
                <Send size={18} /> Enviar Factura
              </button>
              <button 
                onClick={closeSuccessModal}
                className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full">
      {/* Product Grid */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-white flex justify-between items-center sticky top-0 z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Productos</h2>
            <p className="text-gray-500 text-sm">Selecciona productos para añadir al carrito</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input 
              type="text"
              placeholder="Buscar producto..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <div 
                key={product.id} 
                onClick={() => product.stock > 0 && addToCart(product)}
                className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer transition-all hover:shadow-md hover:border-blue-200 group relative ${product.stock === 0 ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <div className="aspect-square bg-gray-100 rounded-lg mb-4 overflow-hidden">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-800 leading-tight mb-1">{product.name}</h3>
                    <p className="text-sm text-gray-500">{product.category}</p>
                  </div>
                  <span className="font-bold text-blue-600">{APP_CURRENCY}{product.price.toFixed(2)}</span>
                </div>
                <div className={`mt-2 text-xs font-medium px-2 py-1 rounded-full w-fit ${product.stock > 10 ? 'bg-green-100 text-green-700' : product.stock > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                  {product.stock === 0 ? 'Agotado' : `${product.stock} disponibles`}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Sidebar */}
      <div className="w-96 bg-white border-l border-gray-200 flex flex-col shadow-xl">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingCart size={24} className="text-blue-600" />
            Carrito Actual
          </h2>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-3">
              <ShoppingCart size={48} className="opacity-20" />
              <p>El carrito está vacío</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                <img src={item.image} alt={item.name} className="w-16 h-16 rounded-md object-cover bg-white" />
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium text-gray-800 text-sm line-clamp-1">{item.name}</h4>
                    <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="text-blue-600 font-bold text-sm mt-1">{APP_CURRENCY}{(item.price * item.quantity).toFixed(2)}</div>
                  <div className="flex items-center gap-3 mt-2">
                    <button 
                      onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => item.quantity < item.stock && updateCartQuantity(item.id, item.quantity + 1)}
                      className="p-1 hover:bg-gray-200 rounded text-gray-600"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-bold text-lg text-gray-900">{APP_CURRENCY}{cartTotal.toFixed(2)}</span>
          </div>
          
          {!isCheckingOut ? (
             <button 
              onClick={() => setIsCheckingOut(true)}
              disabled={cart.length === 0}
              className={`w-full py-3 rounded-lg font-bold shadow-sm flex items-center justify-center gap-2 ${cart.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-md transition-all'}`}
            >
              Procesar Pago
            </button>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="relative">
                <User size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Nombre Cliente" 
                  className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="email" 
                  placeholder="Correo Electrónico" 
                  className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />
              </div>
              <div className="relative">
                <CreditCard size={16} className="absolute left-3 top-3 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="NIT / ID Tributario" 
                  className="w-full pl-9 p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  value={customerNit}
                  onChange={(e) => setCustomerNit(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 mt-2">
                <button 
                  onClick={() => setIsCheckingOut(false)}
                  className="flex-1 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleCheckout}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Confirmar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};