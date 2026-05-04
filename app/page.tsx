'use client';

import { Wallet, Plus, Trash2, Zap, TrendingUp, TrendingDown, X, Pencil, Download, BarChart2, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from '@/lib/supabase';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

// ─── TIPOS ───────────────────────────────────────────────────────────────────

type TipoMovimiento = 'ingreso' | 'gasto';
type Vista = 'movimientos' | 'categorias' | 'grafico';

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

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const mesKey = (fecha: string) => fecha.slice(0, 7); // 'YYYY-MM'

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function ZenixDashboard() {

  // ── Estado ──────────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [editando, setEditando]           = useState<Movimiento | null>(null);
  const [formData, setFormData]           = useState<FormState>(FORM_INICIAL);
  const [movimientos, setMovimientos]     = useState<Movimiento[]>([]);
  const [loading, setLoading]             = useState(true);
  const [saving, setSaving]               = useState(false);
  const [deletingId, setDeletingId]       = useState<string | null>(null);
  const [filtro, setFiltro]               = useState<'todos' | TipoMovimiento>('todos');
  const [vista, setVista]                 = useState<Vista>('movimientos');

  // Mes actual como estado (navega con flechas)
  const hoy = new Date();
  const [mesSel, setMesSel] = useState<string>(
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  );

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

  // ── Movimientos del mes seleccionado ─────────────────────────────────────────
  const movimientosMes = useMemo(
    () => movimientos.filter(m => mesKey(m.fecha) === mesSel),
    [movimientos, mesSel]
  );

  // ── Métricas del mes ──────────────────────────────────────────────────────────
  const totalIngresos = movimientosMes.filter(m => m.type === 'ingreso').reduce((acc, m) => acc + Number(m.amount), 0);
  const totalGastos   = movimientosMes.filter(m => m.type === 'gasto').reduce((acc, m) => acc + Number(m.amount), 0);
  const balance       = totalIngresos - totalGastos;

  // ── Filtro tipo dentro del mes ────────────────────────────────────────────────
  const movimientosFiltrados = filtro === 'todos'
    ? movimientosMes
    : movimientosMes.filter(m => m.type === filtro);

  // ── Categorías del mes ────────────────────────────────────────────────────────
  const categoriasTotales = useMemo(() => {
    const map: Record<string, { ingreso: number; gasto: number }> = {};
    movimientosMes.forEach(m => {
      const cat = m.categoria || '(Sin categoría)';
      if (!map[cat]) map[cat] = { ingreso: 0, gasto: 0 };
      map[cat][m.type] += Number(m.amount);
    });
    return Object.entries(map)
      .map(([cat, totals]) => ({ cat, ...totals, neto: totals.ingreso - totals.gasto }))
      .sort((a, b) => Math.abs(b.gasto) - Math.abs(a.gasto));
  }, [movimientosMes]);

  // ── Datos gráfico (últimos 6 meses) ──────────────────────────────────────────
  const datosGrafico = useMemo(() => {
    const meses: string[] = [];
    const base = new Date(mesSel + '-01');
    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return meses.map(key => {
      const mvs = movimientos.filter(m => mesKey(m.fecha) === key);
      const ing = mvs.filter(m => m.type === 'ingreso').reduce((a, m) => a + Number(m.amount), 0);
      const gas = mvs.filter(m => m.type === 'gasto').reduce((a, m) => a + Number(m.amount), 0);
      const [yr, mo] = key.split('-');
      return { mes: MESES[parseInt(mo) - 1].slice(0, 3), ingreso: ing, gasto: gas, key, activo: key === mesSel };
    });
  }, [movimientos, mesSel]);

  // ── Categorías para datalist ──────────────────────────────────────────────────
  const categorias = useMemo(
    () => Array.from(new Set(movimientos.map(m => m.categoria).filter(Boolean))) as string[],
    [movimientos]
  );

  // ── Navegación de mes ─────────────────────────────────────────────────────────
  const cambiarMes = (delta: number) => {
    const [yr, mo] = mesSel.split('-').map(Number);
    const d = new Date(yr, mo - 1 + delta, 1);
    setMesSel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const mesLabel = (() => {
    const [yr, mo] = mesSel.split('-').map(Number);
    return `${MESES[mo - 1]} ${yr}`;
  })();

  // ── Abrir modal nuevo ─────────────────────────────────────────────────────────
  const abrirNuevo = () => {
    setEditando(null);
    setFormData(FORM_INICIAL);
    setIsModalOpen(true);
  };

  // ── Abrir modal edición ───────────────────────────────────────────────────────
  const abrirEdicion = (m: Movimiento) => {
    setEditando(m);
    setFormData({
      label:    m.label,
      amount:   String(m.amount),
      type:     m.type,
      detail:   m.detail || '',
      category: m.categoria || '',
    });
    setIsModalOpen(true);
  };

  // ── Guardar (create o update) ─────────────────────────────────────────────────
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim() || !formData.amount) return;

    setSaving(true);
    const payload = {
      label:     formData.label.trim(),
      amount:    parseFloat(formData.amount),
      type:      formData.type,
      categoria: formData.category.trim() || null,
      detail:    formData.detail.trim() || null,
    };

    let error;
    if (editando) {
      ({ error } = await supabase.from('movimientos').update(payload).eq('id', editando.id));
    } else {
      ({ error } = await supabase.from('movimientos').insert([payload]));
    }

    if (!error) {
      setIsModalOpen(false);
      setEditando(null);
      setFormData(FORM_INICIAL);
      await fetchMovimientos();
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
      setMovimientos(prev => prev.filter(m => m.id !== id));
    } else {
      alert('Error al eliminar: ' + error.message);
    }
    setDeletingId(null);
  };

  // ── Exportar CSV ──────────────────────────────────────────────────────────────
  const exportarCSV = () => {
    const filas = [
      ['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Monto', 'Detalle'],
      ...movimientosMes.map(m => [
        m.fecha,
        m.label,
        m.categoria || '',
        m.type,
        m.amount,
        m.detail || '',
      ]),
    ];
    const csv = filas.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zenix-${mesSel}.csv`;
    a.click();
    URL.revokeObjectURL(url);
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

      <div className="px-4 md:px-6 py-8 max-w-2xl mx-auto space-y-6 pb-28">

        {/* ── SELECTOR DE MES ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <button type="button" onClick={() => cambiarMes(-1)} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors">
            <ChevronLeft size={16} className="text-zinc-400" />
          </button>
          <span className="text-sm font-semibold text-zinc-300 tracking-wide">{mesLabel}</span>
          <button type="button" onClick={() => cambiarMes(1)} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors">
            <ChevronRight size={16} className="text-zinc-400" />
          </button>
        </div>

        {/* ── BALANCE PRINCIPAL ────────────────────────────────────────────── */}
        <section className="bg-zinc-900/50 border border-zinc-800/60 rounded-3xl p-7">
          <p className="text-xs text-zinc-500 uppercase tracking-widest mb-2 font-medium">Balance Neto</p>
          <p className={`text-5xl font-black tracking-tighter tabular-nums ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
            {balance >= 0 ? '' : '−'} ${formatARS(Math.abs(balance))}
          </p>

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

        {/* ── TABS DE VISTA ────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-1">
          {([
            { id: 'movimientos', icon: <TrendingDown size={14} />, label: 'Movimientos' },
            { id: 'categorias',  icon: <Tag size={14} />,          label: 'Categorías'  },
            { id: 'grafico',     icon: <BarChart2 size={14} />,     label: 'Gráfico'     },
          ] as const).map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setVista(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                vista === tab.id
                  ? 'bg-white text-black'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── VISTA: MOVIMIENTOS ───────────────────────────────────────────── */}
        {vista === 'movimientos' && (
          <>
            <div className="flex gap-2 items-center">
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
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-zinc-600 tabular-nums">{movimientosFiltrados.length} reg.</span>
                <button
                  type="button"
                  onClick={exportarCSV}
                  title="Exportar CSV"
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition-all"
                >
                  <Download size={14} />
                </button>
              </div>
            </div>

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
                    {filtro === 'todos' ? 'No hay movimientos en este mes.' : `No hay ${filtro}s en este mes.`}
                  </p>
                </div>
              ) : (
                movimientosFiltrados.map(m => (
                  <div
                    key={m.id}
                    className="group flex items-center gap-4 bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl hover:border-zinc-700/70 transition-all"
                  >
                    <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${m.type === 'ingreso' ? 'bg-emerald-500' : 'bg-rose-500'}`} />

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

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-base font-bold tabular-nums ${m.type === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {m.type === 'ingreso' ? '+' : '−'}${formatARS(Number(m.amount))}
                          </span>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              type="button"
                              onClick={() => abrirEdicion(m)}
                              className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
                              aria-label="Editar movimiento"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(m.id)}
                              disabled={deletingId === m.id}
                              className="text-zinc-600 hover:text-rose-400 transition-colors disabled:opacity-40 p-1"
                              aria-label="Eliminar movimiento"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </section>
          </>
        )}

        {/* ── VISTA: CATEGORÍAS ────────────────────────────────────────────── */}
        {vista === 'categorias' && (
          <section className="space-y-3">
            {categoriasTotales.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-zinc-600 text-sm">No hay movimientos en este mes.</p>
              </div>
            ) : (
              categoriasTotales.map(({ cat, ingreso, gasto, neto }) => (
                <div key={cat} className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Tag size={13} className="text-zinc-500" />
                      <span className="font-semibold text-zinc-200 text-sm">{cat}</span>
                    </div>
                    <span className={`font-bold tabular-nums text-sm ${neto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {neto >= 0 ? '+' : '−'}${formatARS(Math.abs(neto))}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {ingreso > 0 && (
                      <div className="flex items-center gap-1.5">
                        <TrendingUp size={11} className="text-emerald-500" />
                        <span className="text-[11px] text-zinc-500">Ingresos</span>
                        <span className="ml-auto text-[11px] text-emerald-400 font-medium tabular-nums">${formatARS(ingreso)}</span>
                      </div>
                    )}
                    {gasto > 0 && (
                      <div className="flex items-center gap-1.5">
                        <TrendingDown size={11} className="text-rose-500" />
                        <span className="text-[11px] text-zinc-500">Gastos</span>
                        <span className="ml-auto text-[11px] text-rose-400 font-medium tabular-nums">${formatARS(gasto)}</span>
                      </div>
                    )}
                  </div>
                  {/* Barra proporcional */}
                  {(ingreso + gasto) > 0 && (
                    <div className="mt-3 h-1 rounded-full bg-zinc-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${(ingreso / (ingreso + gasto)) * 100}%` }}
                      />
                    </div>
                  )}
                </div>
              ))
            )}
          </section>
        )}

        {/* ── VISTA: GRÁFICO ───────────────────────────────────────────────── */}
        {vista === 'grafico' && (
          <section className="space-y-4">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Últimos 6 meses</p>
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-5">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={datosGrafico} barCategoryGap="30%" barGap={4}>
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: '#52525b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: '#a1a1aa', marginBottom: 4 }}
                    formatter={(v: unknown, name: unknown) => [`$${formatARS(Number(v))}`, name === 'ingreso' ? 'Ingresos' : 'Gastos']}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="ingreso" radius={[4, 4, 0, 0]}>
                    {datosGrafico.map((entry, i) => (
                      <Cell key={i} fill={entry.activo ? '#10b981' : '#166534'} />
                    ))}
                  </Bar>
                  <Bar dataKey="gasto" radius={[4, 4, 0, 0]}>
                    {datosGrafico.map((entry, i) => (
                      <Cell key={i} fill={entry.activo ? '#f43f5e' : '#881337'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Leyenda */}
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                  <span className="text-[11px] text-zinc-500">Ingresos</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                  <span className="text-[11px] text-zinc-500">Gastos</span>
                </div>
              </div>
            </div>

            {/* Tabla resumen de los 6 meses */}
            <div className="space-y-2">
              {datosGrafico.map(({ mes, key, ingreso, gasto, activo }) => (
                <div
                  key={key}
                  onClick={() => { setMesSel(key); setVista('movimientos'); }}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border cursor-pointer transition-all ${
                    activo
                      ? 'bg-zinc-800/60 border-zinc-700'
                      : 'bg-zinc-900/30 border-zinc-800/40 hover:border-zinc-700'
                  }`}
                >
                  <span className={`text-sm font-medium ${activo ? 'text-white' : 'text-zinc-400'}`}>{mes} {key.split('-')[0]}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-emerald-400 tabular-nums">+${formatARS(ingreso)}</span>
                    <span className="text-xs text-rose-400 tabular-nums">−${formatARS(gasto)}</span>
                    <span className={`text-xs font-bold tabular-nums ${ingreso - gasto >= 0 ? 'text-zinc-300' : 'text-rose-400'}`}>
                      {ingreso - gasto >= 0 ? '+' : '−'}${formatARS(Math.abs(ingreso - gasto))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>

      {/* ── BOTÓN FLOTANTE ───────────────────────────────────────────────────── */}
      <button
        type="button"
        aria-label="Agregar movimiento"
        onClick={abrirNuevo}
        className="fixed bottom-8 right-6 w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all z-50"
      >
        <Plus color="black" size={28} strokeWidth={3} />
      </button>

      {/* ── MODAL (nuevo / editar) ────────────────────────────────────────────── */}
      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsModalOpen(false); setEditando(null); } }}
        >
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-3xl p-7 shadow-2xl">

            <div className="flex justify-between items-center mb-7">
              <h2 className="text-lg font-bold">{editando ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h2>
              <button
                type="button"
                onClick={() => { setIsModalOpen(false); setEditando(null); }}
                aria-label="Cerrar modal"
                className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">

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

              <button
                type="submit"
                disabled={saving}
                className={`w-full font-black py-4 rounded-2xl transition-all active:scale-95 text-sm tracking-wide ${
                  formData.type === 'ingreso'
                    ? 'bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-60'
                    : 'bg-white text-black hover:bg-zinc-200 disabled:opacity-60'
                }`}
              >
                {saving
                  ? 'GUARDANDO…'
                  : editando
                    ? `ACTUALIZAR ${formData.type === 'ingreso' ? 'INGRESO' : 'GASTO'}`
                    : `GUARDAR ${formData.type === 'ingreso' ? 'INGRESO' : 'GASTO'}`
                }
              </button>

            </form>
          </div>
        </div>
      )}
    </main>
  );
}
