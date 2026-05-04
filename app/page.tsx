'use client';

import { Wallet, Plus, Trash2, Zap, TrendingUp, TrendingDown, X } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { supabase } from '@/lib/supabase';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

type TipoMovimiento = 'ingreso' | 'gasto';

interface Movimiento {
  id: string;
  fecha: string;
  label: string;
  detail: string | null;
  amount: number;
  type: TipoMovimiento;
  categoria: string | null;
}

interface FormState {
  label: string;
  amount: string;
  type: TipoMovimiento;
  detail: string;
  category: string;
}

const FORM_INICIAL: FormState = {
  label: '',
  amount: '',
  type: 'gasto',
  detail: '',
  category: '',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const formatARS = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatFecha = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function ZenixDashboard() {

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [formData, setFormData]         = useState<FormState>(FORM_INICIAL);
  const [movimientos, setMovimientos]   = useState<Movimiento[]>([]);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [deletingId, setDeletingId]     = useState<string | null>(null);
  const [filtro, setFiltro]             = useState<'todos' | TipoMovimiento>('todos');

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchMovimientos = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('movimientos')
      .select('*')
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error al traer datos:', error.message);
    } else {
      setMovimientos((data as Movimiento[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMovimientos();
  }, [fetchMovimientos]);

  // ── Métricas calculadas ──────────────────────────────────────────────────────
  const totalIngresos = movimientos
    .filter(m => m.type === 'ingreso')
    .reduce((acc, m) => acc + Number(m.amount), 0);

  const totalGastos = movimientos
    .filter(m => m.type === 'gasto')
    .reduce((acc, m) => acc + Number(m.amount), 0);

  const balance = totalIngresos - totalGastos;

  const ingresosRatio = totalIngresos + totalGastos > 0
    ? totalIngresos / (totalIngresos + totalGastos)
    : 0;

  const progressWidthClasses = [
    'w-0',
    'w-[10%]',
    'w-[20%]',
    'w-[30%]',
    'w-[40%]',
    'w-[50%]',
    'w-[60%]',
    'w-[70%]',
    'w-[80%]',
    'w-[90%]',
    'w-full',
  ];

  // @ts-ignore
  const progressWidthClass = progressWidthClasses[Math.round(ingresosRatio * 10)];

  const categorias = [...new Set(movimientos.map(m => m.categoria).filter(Boolean))] as string[];

  const movimientosFiltrados = filtro === 'todos'
    ? movimientos
    : movimientos.filter(m => m.type === filtro);

  // ── Guardar ──────────────────────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim() || !formData.amount) return;

    setSaving(true);
    const { error } = await supabase.from('movimientos').insert([{
      label:     formData.label.trim(),
      amount:    parseFloat(formData.amount),
      type:      formData.type,
      categoria: formData.category.trim() || null,
      detail:    formData.detail.trim() || null,
    }]);

    if (!error) {
      setIsModalOpen(false);
      setFormData(FORM_INICIAL);
      await fetchMovimientos(); // ✅ Refresh sin reload
    } else {
      alert('Error al guardar: ' + error.message);
    }
    setSaving(false);
  };

  // ── Eliminar ─────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('movimientos').delete().eq('id', id);

    if (!error) {
      setMovimientos(prev => prev.filter(m => m.id !== id)); // ✅ Optimistic update
    } else {
      alert('Error al eliminar: ' + error.message);
    }
    setDeletingId(null);
  };

  // ─── RENDER ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#080808] text-zinc-100 font-sans antialiased">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-xl border-b border-zinc-800/40 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Zap size={16} color="black" strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter text-white leading-none">ZENIX</h1>
            <p className="text-[9px] text-zinc-600 tracking-[0.25em] uppercase">Money Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl">
          <Wallet size={14} className="text-zinc-500" />
          <span className="text-xs font-medium text-zinc-300">Principal</span>
        </div>
      </header>

      <div className="px-4 md:px-6 py-8 max-w-2xl mx-auto space-y-8 pb-28">

        {/* ── BALANCE PRINCIPAL ────────────────────────────────────────────── */}
        <section className="bg-zinc-900/50 border border-zinc-800/60 rounded-3xl p-7">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2 font-medium">Balance Neto</p>
          <p className={`text-5xl font-black tracking-tighter tabular-nums ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {balance >= 0 ? '' : '−'} ${formatARS(Math.abs(balance))}
          </p>

          {/* Barra visual ingresos vs gastos */}
          {(totalIngresos + totalGastos) > 0 && (
            <div className="mt-6">
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                  style={{ width: `${(totalIngresos / (totalIngresos + totalGastos)) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Ingresos y Gastos */}
          <div className="grid grid-cols-2 gap-4 mt-5">
            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingUp size={14} className="text-emerald-400" />
                <span className="text-[10px] text-emerald-500 uppercase tracking-widest font-medium">Ingresos</span>
              </div>
              <p className="text-xl font-bold text-emerald-400 tabular-nums">${formatARS(totalIngresos)}</p>
            </div>
            <div className="bg-rose-500/5 border border-rose-500/15 rounded-2xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendingDown size={14} className="text-rose-400" />
                <span className="text-[10px] text-rose-500 uppercase tracking-widest font-medium">Gastos</span>
              </div>
              <p className="text-xl font-bold text-rose-400 tabular-nums">${formatARS(totalGastos)}</p>
            </div>
          </div>
        </section>

        {/* ── FILTROS ──────────────────────────────────────────────────────── */}
        <div className="flex gap-2">
          {(['todos', 'ingreso', 'gasto'] as const).map(f => (
            <button
              type="button"
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${
                filtro === f
                  ? 'bg-white text-black'
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-600'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'ingreso' ? 'Ingresos' : 'Gastos'}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-zinc-600 tabular-nums">
            {movimientosFiltrados.length} registros
          </span>
        </div>

        {/* ── LISTA DE MOVIMIENTOS ─────────────────────────────────────────── */}
        <section className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-zinc-900/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : movimientosFiltrados.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-zinc-600 text-sm">
                {filtro === 'todos' ? 'No hay movimientos. ¡Cargá el primero!' : `No hay ${filtro}s registrados.`}
              </p>
            </div>
          ) : (
            movimientosFiltrados.map(m => (
              <div
                key={m.id}
                className="group flex items-center gap-4 bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl hover:border-zinc-700/70 transition-all"
              >
                {/* Indicador de tipo */}
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${m.type === 'ingreso' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-100 truncate">{m.label}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {m.categoria && (
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">
                            {m.categoria}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-600">{formatFecha(m.fecha)}</span>
                      </div>
                      {m.detail && (
                        <p className="text-xs text-zinc-600 mt-1 truncate">{m.detail}</p>
                      )}
                    </div>

                    {/* Monto + eliminar */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <span className={`text-base font-bold tabular-nums ${m.type === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {m.type === 'ingreso' ? '+' : '−'}${formatARS(Number(m.amount))}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDelete(m.id)}
                        disabled={deletingId === m.id}
                        className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-rose-400 transition-all disabled:opacity-40 p-1"
                        aria-label="Eliminar movimiento"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

      </div>

      {/* ── BOTÓN FLOTANTE ───────────────────────────────────────────────────── */}
      <button
        type="button"
        aria-label="Agregar movimiento"
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-8 right-6 w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all z-50"
      >
        <Plus color="black" size={28} strokeWidth={3} />
      </button>

      {/* ── MODAL ────────────────────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}
        >
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-3xl p-7 shadow-2xl">

            {/* Header modal */}
            <div className="flex justify-between items-center mb-7">
              <h2 className="text-lg font-bold">Nuevo Movimiento</h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                aria-label="Cerrar modal"
                className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">

              {/* ── TIPO: Ingreso / Gasto ── */}
              <div className="grid grid-cols-2 gap-2">
                {(['gasto', 'ingreso'] as const).map(tipo => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setFormData(f => ({ ...f, type: tipo }))}
                    className={`py-3 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all ${
                      formData.type === tipo
                        ? tipo === 'ingreso'
                          ? 'bg-emerald-500 text-black'
                          : 'bg-rose-500 text-white'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-500'
                    }`}
                  >
                    {tipo === 'ingreso' ? '↑ Ingreso' : '↓ Gasto'}
                  </button>
                ))}
              </div>

              {/* ── CONCEPTO ── */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1 block mb-1.5">
                  Concepto <span className="text-rose-500">*</span>
                </label>
                <input
                  required
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
                  placeholder="Ej: Sueldo, Alquiler, Supermercado…"
                  value={formData.label}
                  onChange={e => setFormData(f => ({ ...f, label: e.target.value }))}
                />
              </div>

              {/* ── CATEGORÍA + MONTO ── */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1 block mb-1.5">Categoría</label>
                  <input
                    list="categorias-list"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
                    placeholder="Ej: Auto"
                    value={formData.category}
                    onChange={e => setFormData(f => ({ ...f, category: e.target.value }))}
                  />
                  <datalist id="categorias-list">
                    {categorias.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1 block mb-1.5">
                    Monto <span className="text-rose-500">*</span>
                  </label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white font-mono outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
                    placeholder="0"
                    value={formData.amount}
                    onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))}
                  />
                </div>
              </div>

              {/* ── DETALLE ── */}
              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1 block mb-1.5">Detalle (opcional)</label>
                <textarea
                  rows={2}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-zinc-600 transition-colors resize-none placeholder:text-zinc-700"
                  placeholder="Notas adicionales…"
                  value={formData.detail}
                  onChange={e => setFormData(f => ({ ...f, detail: e.target.value }))}
                />
              </div>

              {/* ── SUBMIT ── */}
              <button
                type="submit"
                disabled={saving}
                className={`w-full font-black py-4 rounded-2xl transition-all active:scale-95 text-sm tracking-wide ${
                  formData.type === 'ingreso'
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-60'
                    : 'bg-white text-black hover:bg-zinc-200 disabled:opacity-60'
                }`}
              >
                {saving ? 'GUARDANDO…' : `GUARDAR ${formData.type === 'ingreso' ? 'INGRESO' : 'GASTO'}`}
              </button>

            </form>
          </div>
        </div>
      )}
    </main>
  );
}
