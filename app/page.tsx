'use client'; 
import { Wallet, Plus, ArrowUpCircle, ArrowDownCircle, DollarSign, Zap } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from '@/lib/supabase';

export default function ZenixDashboard() {
  // --- 1. ESTADOS (HOOKS) ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ label: '', amount: '', type: 'gasto', detail: '' });
  const [movimientos, setMovimientos] = useState<any[]>([]);

  // --- 2. CONEXIÓN INICIAL ---
  useEffect(() => {
    const fetchMovimientos = async () => {
      const { data, error } = await supabase
        .from('movimientos')
        .select('*')
        .order('fecha', { ascending: false });
      
      if (error) console.error('Error al traer datos:', error.message);
      else setMovimientos(data || []);
    };
    fetchMovimientos();
  }, []);

  // --- 3. FUNCIONES DE INTERACCIÓN ---
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('movimientos').insert([
      { 
        label: formData.label, 
        amount: parseFloat(formData.amount), 
        type: formData.type, 
        detail: formData.detail 
      }
    ]);

    if (!error) {
      setIsModalOpen(false);
      setFormData({ label: '', amount: '', type: 'gasto', detail: '' });
      window.location.reload(); // Recarga simple para ver el nuevo dato
    } else {
      alert("Error: " + error.message);
    }
  };

  // --- 4. RENDERIZADO (EL "DIBUJO") ---
  return (
    <main className="min-h-screen bg-[#050505] text-zinc-100 p-4 md:p-8 font-sans antialiased">
      
      {/* HEADER */}
      <header className="flex justify-between items-center mb-10 pb-4 border-b border-zinc-800/50">
        <div>
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-blue-500 animate-pulse" />
            <h1 className="text-3xl font-black tracking-tighter text-white">ZENIX</h1>
          </div>
          <p className="text-[10px] text-zinc-600 tracking-[0.3em] uppercase ml-7">Inteligencia Operativa</p>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 px-5 py-2.5 rounded-2xl flex items-center gap-2.5">
          <Wallet size={16} className="text-zinc-500" />
          <span className="text-sm font-medium text-zinc-200">Principal</span>
        </div>
      </header>

      {/* BALANCE CENTRAL */}
      <section className="relative flex flex-col items-center justify-center mb-16">
        <div className="w-72 h-72 rounded-full border-[16px] border-zinc-900 border-t-emerald-500 border-l-rose-500 shadow-[0_0_60px_-15px_rgba(59,130,246,0.3)] flex flex-col items-center justify-center">
          <span className="text-xs text-zinc-500 uppercase tracking-widest mb-1.5 font-medium">Gastos Totales</span>
          <span className="text-4xl font-extrabold tracking-tight text-white tabular-nums">
            {movimientos.filter(m => m.type === 'gasto').reduce((acc, curr) => acc + Number(curr.amount), 0).toLocaleString('es-AR')} $
          </span>
        </div>
      </section>

      {/* LISTA DE MOVIMIENTOS (Desde Supabase) */}
      <section className="space-y-4 pb-24">
        <h3 className="text-sm font-semibold text-zinc-500 uppercase tracking-widest mb-6 pl-2">Movimientos Reales</h3>
        {movimientos.length === 0 ? (
          <p className="text-center text-zinc-700 py-10">No hay datos en la base. ¡Cargá el primero!</p>
        ) : (
          movimientos.map((m) => (
            <div key={m.id} className="flex justify-between items-center bg-zinc-900/30 border border-zinc-800/60 p-5 rounded-[1.5rem]">
              <div>
                <p className="font-semibold text-zinc-100">{m.label}</p>
                <p className="text-xs text-zinc-600">{m.detail || 'Sin detalle'}</p>
              </div>
              <span className={`text-lg font-bold font-mono ${m.type === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {m.type === 'ingreso' ? '+' : '-'} {Number(m.amount).toLocaleString('es-AR')} $
              </span>
            </div>
          ))
        )}
      </section>

      {/* BOTÓN FLOTANTE */}
      <button
        type="button"
        aria-label="Agregar movimiento"
        title="Agregar movimiento"
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-8 w-16 h-16 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-lg shadow-emerald-500/20 hover:scale-110 active:scale-95 transition-all z-50"
      >
        <Plus color="black" size={32} strokeWidth={3} />
      </button>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-[2.5rem] p-8">
            <h2 className="text-xl font-bold mb-6">Nuevo Registro</h2>
            <form onSubmit={handleSave} className="space-y-5">
              <input 
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white"
                placeholder="Concepto (ej: Inversión GGAL)"
                onChange={(e) => setFormData({...formData, label: e.target.value})}
              />
              <input 
                required
                type="number"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white font-mono"
                placeholder="Monto $"
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
              />
              <select
                aria-label="Tipo de movimiento"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 text-white"
                onChange={(e) => setFormData({...formData, type: e.target.value as any})}
              >
                <option value="gasto">Gasto</option>
                <option value="ingreso">Ingreso</option>
              </select>
              <button type="submit" className="w-full bg-emerald-500 text-black font-bold py-4 rounded-2xl">Confirmar</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="w-full text-zinc-500 text-sm">Cancelar</button>
            </form>
          </div>
        </div>
      )}
      {/* CAPA DEL MODAL */}
{isModalOpen && (
  <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 transition-all">
    
    {/* CONTENEDOR DEL FORMULARIO */}
    <div className="bg-[#0D0D0D] border-t sm:border border-zinc-800 w-full max-w-md rounded-t-[2.5rem] sm:rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom duration-300">
      
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Plus className="text-emerald-500" /> Nuevo Registro
        </h2>
        <button 
          onClick={() => setIsModalOpen(false)}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>
      
      <form className="space-y-6">
        {/* Campo Concepto */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1">Concepto</label>
          <input 
            className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mt-1 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            placeholder="Ej: Inversión CEDEAR GGAL"
            onChange={(e) => setFormData({...formData, label: e.target.value})}
          />
        </div>

        {/* Campos Monto y Tipo */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1">Monto ($)</label>
            <input 
              type="number"
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mt-1 text-white font-mono outline-none focus:border-emerald-500"
              placeholder="0.00"
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
            />
          </div>
          <div>
            <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1">Tipo</label>
            <select 
              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 mt-1 text-white appearance-none outline-none focus:border-blue-500"
              title="Tipo de movimiento"
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="gasto">Gasto 🔻</option>
              <option value="ingreso">Ingreso 🔺</option>
            </select>
          </div>
        </div>

        {/* Botón de Acción */}
        <button 
          type="button" 
          onClick={() => console.log("Datos listos para enviar:", formData)} // Probaremos el envío en el siguiente paso
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-black font-black py-4 rounded-2xl shadow-[0_10px_30px_-10px_rgba(16,185,129,0.4)] transition-all active:scale-95"
        >
          CONFIRMAR OPERACIÓN
        </button>
      </form>
    </div>
  </div>
)}
    </main>
  );
}