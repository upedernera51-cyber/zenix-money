'use client';

import {
  Wallet, Plus, Trash2, Zap, TrendingUp, TrendingDown, X,
  Pencil, Download, BarChart2, Tag, ChevronLeft, ChevronRight,
  Settings, Check,
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, LineChart, Line, CartesianGrid,
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

const FORM_INICIAL: FormState = { label: '', amount: '', type: 'gasto', detail: '', category: '' };
const STORAGE_KEY   = 'zenix_movimientos';
const CATS_KEY      = 'zenix_categorias';

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

const formatFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' });

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const mesKey = (f: string) => f.slice(0, 7);

const loadJSON = <T,>(key: string, fallback: T): T => {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback; } catch { return fallback; }
};
const saveJSON = (key: string, val: unknown) => localStorage.setItem(key, JSON.stringify(val));

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function ZenixDashboard() {

  const hoy = new Date();

  // ── Estado ───────────────────────────────────────────────────────────────────
  const [movimientos, setMovimientos]       = useState<Movimiento[]>([]);
  const [categorias, setCategorias]         = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen]       = useState(false);
  const [editando, setEditando]             = useState<Movimiento | null>(null);
  const [formData, setFormData]             = useState<FormState>(FORM_INICIAL);
  const [filtro, setFiltro]                 = useState<'todos' | TipoMovimiento>('todos');
  const [vista, setVista]                   = useState<Vista>('movimientos');
  const [showCatManager, setShowCatManager] = useState(false);
  const [nuevaCat, setNuevaCat]             = useState('');
  const [mesSel, setMesSel]                 = useState(
    `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  );

  useEffect(() => {
    setMovimientos(loadJSON(STORAGE_KEY, []));
    setCategorias(loadJSON(CATS_KEY, []));
  }, []);

  // ── Datos del mes ─────────────────────────────────────────────────────────────
  const movimientosMes = useMemo(
    () => movimientos.filter(m => mesKey(m.fecha) === mesSel),
    [movimientos, mesSel]
  );

  const totalIngresos = useMemo(() => movimientosMes.filter(m => m.type === 'ingreso').reduce((a, m) => a + Number(m.amount), 0), [movimientosMes]);
  const totalGastos   = useMemo(() => movimientosMes.filter(m => m.type === 'gasto').reduce((a, m) => a + Number(m.amount), 0),   [movimientosMes]);
  const balance       = totalIngresos - totalGastos;

  const movimientosFiltrados = filtro === 'todos' ? movimientosMes : movimientosMes.filter(m => m.type === filtro);

  // ── Categorías con totales ────────────────────────────────────────────────────
  const categoriasTotales = useMemo(() => {
    const map: Record<string, { ingreso: number; gasto: number }> = {};
    movimientosMes.forEach(m => {
      const cat = m.categoria || '(Sin categoría)';
      if (!map[cat]) map[cat] = { ingreso: 0, gasto: 0 };
      map[cat][m.type] += Number(m.amount);
    });
    return Object.entries(map)
      .map(([cat, t]) => ({ cat, ...t, neto: t.ingreso - t.gasto }))
      .sort((a, b) => b.gasto - a.gasto);
  }, [movimientosMes]);

  // ── Datos gráfico barras (6 meses) ────────────────────────────────────────────
  const datosBarras = useMemo(() => {
    const base = new Date(mesSel + '-01');
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(base.getFullYear(), base.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mvs = movimientos.filter(m => mesKey(m.fecha) === key);
      const ing = mvs.filter(m => m.type === 'ingreso').reduce((a, m) => a + Number(m.amount), 0);
      const gas = mvs.filter(m => m.type === 'gasto').reduce((a, m) => a + Number(m.amount), 0);
      return { mes: MESES[d.getMonth()].slice(0, 3), ingreso: ing, gasto: gas, balance: ing - gas, key, activo: key === mesSel };
    });
  }, [movimientos, mesSel]);

  // ── Métricas analytics ────────────────────────────────────────────────────────
  const analytics = useMemo(() => {
    const tasaAhorro = totalIngresos > 0 ? ((totalIngresos - totalGastos) / totalIngresos) * 100 : 0;
    const [yr, mo] = mesSel.split('-').map(Number);
    const diasMes = new Date(yr, mo, 0).getDate();
    const gastoDiario = totalGastos / diasMes;
    const topCat = categoriasTotales.find(c => c.cat !== '(Sin categoría)') ?? categoriasTotales[0];

    const mesPrev = (() => {
      const d = new Date(yr, mo - 2, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();
    const mvsPrev = movimientos.filter(m => mesKey(m.fecha) === mesPrev);
    const ingPrev = mvsPrev.filter(m => m.type === 'ingreso').reduce((a, m) => a + Number(m.amount), 0);
    const gasPrev = mvsPrev.filter(m => m.type === 'gasto').reduce((a, m) => a + Number(m.amount), 0);

    const deltaGasto   = gasPrev > 0 ? ((totalGastos - gasPrev) / gasPrev) * 100 : null;
    const deltaIngreso = ingPrev > 0 ? ((totalIngresos - ingPrev) / ingPrev) * 100 : null;

    return { tasaAhorro, gastoDiario, topCat, deltaGasto, deltaIngreso };
  }, [totalIngresos, totalGastos, mesSel, movimientos, categoriasTotales]);

  // ── Donut data ────────────────────────────────────────────────────────────────
  const donutData = useMemo(() => {
    if (totalIngresos + totalGastos === 0) return [{ value: 1, color: '#27272a' }];
    return [
      { value: totalIngresos, color: '#10b981' },
      { value: totalGastos,   color: '#f43f5e' },
    ];
  }, [totalIngresos, totalGastos]);

  // ── Navegación mes ────────────────────────────────────────────────────────────
  const cambiarMes = (delta: number) => {
    const [yr, mo] = mesSel.split('-').map(Number);
    const d = new Date(yr, mo - 1 + delta, 1);
    setMesSel(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };
  const mesLabel = (() => {
    const [yr, mo] = mesSel.split('-').map(Number);
    return `${MESES[mo - 1]} ${yr}`;
  })();

  // ── CRUD movimientos ──────────────────────────────────────────────────────────
  const abrirNuevo = () => { setEditando(null); setFormData(FORM_INICIAL); setIsModalOpen(true); };
  const abrirEdicion = (m: Movimiento) => {
    setEditando(m);
    setFormData({ label: m.label, amount: String(m.amount), type: m.type, detail: m.detail || '', category: m.categoria || '' });
    setIsModalOpen(true);
  };
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.label.trim() || !formData.amount) return;
    let nuevos: Movimiento[];
    if (editando) {
      nuevos = movimientos.map(m => m.id === editando.id
        ? { ...m, label: formData.label.trim(), amount: parseFloat(formData.amount), type: formData.type, categoria: formData.category.trim() || null, detail: formData.detail.trim() || null }
        : m);
    } else {
      nuevos = [{ id: crypto.randomUUID(), fecha: new Date().toISOString(), label: formData.label.trim(), amount: parseFloat(formData.amount), type: formData.type, categoria: formData.category.trim() || null, detail: formData.detail.trim() || null }, ...movimientos];
    }
    saveJSON(STORAGE_KEY, nuevos);
    setMovimientos(nuevos);
    setIsModalOpen(false); setEditando(null); setFormData(FORM_INICIAL);
  };
  const handleDelete = (id: string) => {
    const nuevos = movimientos.filter(m => m.id !== id);
    saveJSON(STORAGE_KEY, nuevos); setMovimientos(nuevos);
  };

  // ── Gestión categorías ────────────────────────────────────────────────────────
  const agregarCat = () => {
    const cat = nuevaCat.trim();
    if (!cat || categorias.includes(cat)) return;
    const nuevas = [...categorias, cat];
    saveJSON(CATS_KEY, nuevas); setCategorias(nuevas); setNuevaCat('');
  };
  const eliminarCat = (cat: string) => {
    const nuevas = categorias.filter(c => c !== cat);
    saveJSON(CATS_KEY, nuevas); setCategorias(nuevas);
  };

  // ── CSV ───────────────────────────────────────────────────────────────────────
  const exportarCSV = () => {
    const filas = [['Fecha','Concepto','Categoría','Tipo','Monto','Detalle'], ...movimientosMes.map(m => [m.fecha, m.label, m.categoria || '', m.type, m.amount, m.detail || ''])];
    const blob = new Blob([filas.map(r => r.map(c => `"${c}"`).join(',')).join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `zenix-${mesSel}.csv`; a.click();
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-[#080808] text-zinc-100 font-sans antialiased">

      {/* HEADER */}
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

        {/* SELECTOR MES */}
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Mes anterior" onClick={() => cambiarMes(-1)} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors">
            <ChevronLeft size={16} className="text-zinc-400" />
          </button>
          <span className="text-sm font-semibold text-zinc-300 tracking-wide">{mesLabel}</span>
          <button type="button" aria-label="Mes siguiente" onClick={() => cambiarMes(1)} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 transition-colors">
            <ChevronRight size={16} className="text-zinc-400" />
          </button>
        </div>

        {/* BALANCE CON DONUT */}
        <section className="bg-zinc-900/50 border border-zinc-800/60 rounded-3xl p-7">
          <div className="flex items-center gap-6">
            {/* Donut */}
            <div className="relative flex-shrink-0">
              <PieChart width={120} height={120}>
                <Pie data={donutData} cx={55} cy={55} innerRadius={38} outerRadius={52} dataKey="value" startAngle={90} endAngle={-270} stroke="none">
                  {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                </Pie>
              </PieChart>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-base font-black tabular-nums leading-none ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>
                  {balance >= 0 ? '' : '−'}${fmt(Math.abs(balance))}
                </span>
                <span className="text-[9px] text-zinc-600 uppercase tracking-wider mt-0.5">balance</span>
              </div>
            </div>

            {/* Métricas */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Ingresos</p>
                <div className="flex items-center gap-2">
                  <TrendingUp size={13} className="text-emerald-400" />
                  <span className="text-lg font-bold text-emerald-400 tabular-nums">${fmt(totalIngresos)}</span>
                </div>
              </div>
              <div className="h-px bg-zinc-800" />
              <div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Gastos</p>
                <div className="flex items-center gap-2">
                  <TrendingDown size={13} className="text-rose-400" />
                  <span className="text-lg font-bold text-rose-400 tabular-nums">${fmt(totalGastos)}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TABS */}
        <div className="flex gap-1 bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-1">
          {([
            { id: 'movimientos', icon: <TrendingDown size={14} />, label: 'Movimientos' },
            { id: 'categorias',  icon: <Tag size={14} />,          label: 'Categorías'  },
            { id: 'grafico',     icon: <BarChart2 size={14} />,    label: 'Análisis'    },
          ] as const).map(tab => (
            <button key={tab.id} type="button" onClick={() => setVista(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${vista === tab.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'}`}>
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* ── VISTA: MOVIMIENTOS ───────────────────────────────────────────── */}
        {vista === 'movimientos' && (
          <>
            <div className="flex gap-2 items-center">
              {(['todos', 'ingreso', 'gasto'] as const).map(f => (
                <button type="button" key={f} onClick={() => setFiltro(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all ${filtro === f ? 'bg-white text-black' : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                  {f === 'todos' ? 'Todos' : f === 'ingreso' ? 'Ingresos' : 'Gastos'}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs text-zinc-600 tabular-nums">{movimientosFiltrados.length} reg.</span>
                <button type="button" aria-label="Exportar CSV" title="Exportar CSV" onClick={exportarCSV}
                  className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-zinc-400 hover:text-zinc-200 transition-all">
                  <Download size={14} />
                </button>
              </div>
            </div>

            <section className="space-y-3">
              {movimientosFiltrados.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-zinc-600 text-sm">{filtro === 'todos' ? 'No hay movimientos en este mes.' : `No hay ${filtro}s en este mes.`}</p>
                </div>
              ) : movimientosFiltrados.map(m => (
                <div key={m.id} className="group flex items-center gap-4 bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl hover:border-zinc-700/70 transition-all">
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${m.type === 'ingreso' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-100 truncate">{m.label}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {m.categoria && <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full">{m.categoria}</span>}
                          <span className="text-[10px] text-zinc-600">{formatFecha(m.fecha)}</span>
                        </div>
                        {m.detail && <p className="text-xs text-zinc-600 mt-1 truncate">{m.detail}</p>}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-base font-bold tabular-nums ${m.type === 'ingreso' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {m.type === 'ingreso' ? '+' : '−'}${fmt(Number(m.amount))}
                        </span>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                          <button type="button" onClick={() => abrirEdicion(m)} className="text-zinc-600 hover:text-zinc-300 transition-colors p-1" aria-label="Editar movimiento"><Pencil size={14} /></button>
                          <button type="button" onClick={() => handleDelete(m.id)} className="text-zinc-600 hover:text-rose-400 transition-colors p-1" aria-label="Eliminar movimiento"><Trash2 size={14} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          </>
        )}

        {/* ── VISTA: CATEGORÍAS ───────────────────────────────────────────── */}
        {vista === 'categorias' && (
          <section className="space-y-4">

            {/* Gestor de categorías guardadas */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-zinc-400 font-semibold uppercase tracking-widest">Categorías guardadas</p>
                <button type="button" onClick={() => setShowCatManager(v => !v)} aria-label="Gestionar categorías"
                  className={`p-1.5 rounded-lg transition-colors ${showCatManager ? 'text-white bg-zinc-700' : 'text-zinc-500 hover:text-zinc-300'}`}>
                  <Settings size={14} />
                </button>
              </div>

              {showCatManager && (
                <div className="mb-3 space-y-2">
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-zinc-500 placeholder:text-zinc-600"
                      placeholder="Nueva categoría…"
                      value={nuevaCat}
                      onChange={e => setNuevaCat(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && agregarCat()}
                    />
                    <button type="button" onClick={agregarCat} aria-label="Agregar categoría"
                      className="px-3 py-2 bg-emerald-500 text-black rounded-xl text-sm font-bold hover:bg-emerald-400 transition-colors">
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              )}

              {categorias.length === 0 ? (
                <p className="text-xs text-zinc-600">Ninguna aún. Tocá el ícono ⚙ para agregar.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {categorias.map(cat => (
                    <div key={cat} className="flex items-center gap-1 bg-zinc-800 rounded-full px-3 py-1">
                      <span className="text-xs text-zinc-300">{cat}</span>
                      {showCatManager && (
                        <button type="button" onClick={() => eliminarCat(cat)} aria-label={`Eliminar ${cat}`}
                          className="text-zinc-600 hover:text-rose-400 transition-colors ml-1">
                          <X size={11} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Totales por categoría del mes */}
            {categoriasTotales.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-zinc-600 text-sm">No hay movimientos en este mes.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-zinc-500 uppercase tracking-widest">Movimientos del mes por categoría</p>
                {categoriasTotales.map(({ cat, ingreso, gasto, neto }) => (
                  <div key={cat} className="bg-zinc-900/40 border border-zinc-800/50 p-4 rounded-2xl">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Tag size={13} className="text-zinc-500" />
                        <span className="font-semibold text-zinc-200 text-sm">{cat}</span>
                      </div>
                      <span className={`font-bold tabular-nums text-sm ${neto >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {neto >= 0 ? '+' : '−'}${fmt(Math.abs(neto))}
                      </span>
                    </div>
                    <div className="flex gap-4">
                      {ingreso > 0 && <div className="flex items-center gap-1.5"><TrendingUp size={11} className="text-emerald-500" /><span className="text-[11px] text-zinc-500">Ing.</span><span className="text-[11px] text-emerald-400 font-medium tabular-nums">${fmt(ingreso)}</span></div>}
                      {gasto > 0   && <div className="flex items-center gap-1.5"><TrendingDown size={11} className="text-rose-500" /><span className="text-[11px] text-zinc-500">Gas.</span><span className="text-[11px] text-rose-400 font-medium tabular-nums">${fmt(gasto)}</span></div>}
                    </div>
                    {(ingreso + gasto) > 0 && (
                      <div className="mt-3 h-1 rounded-full bg-zinc-800 overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(ingreso / (ingreso + gasto)) * 100}%` }} />
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </section>
        )}

        {/* ── VISTA: ANÁLISIS ──────────────────────────────────────────────── */}
        {vista === 'grafico' && (
          <section className="space-y-4">

            {/* Métricas clave */}
            <div className="grid grid-cols-2 gap-3">

              {/* Tasa de ahorro */}
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 col-span-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Tasa de ahorro</p>
                <div className="flex items-end justify-between mb-2">
                  <span className={`text-3xl font-black tabular-nums ${analytics.tasaAhorro >= 0 ? 'text-white' : 'text-rose-400'}`}>
                    {analytics.tasaAhorro >= 0 ? '' : '−'}{Math.abs(analytics.tasaAhorro).toFixed(1)}%
                  </span>
                  <span className="text-xs text-zinc-600 mb-1">{analytics.tasaAhorro >= 20 ? '✓ Saludable' : analytics.tasaAhorro >= 0 ? 'Ajustado' : 'Déficit'}</span>
                </div>
                <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-700 ${analytics.tasaAhorro >= 20 ? 'bg-emerald-500' : analytics.tasaAhorro >= 0 ? 'bg-amber-400' : 'bg-rose-500'}`}
                    style={{ width: `${Math.min(Math.max(analytics.tasaAhorro, 0), 100)}%` }} />
                </div>
              </div>

              {/* Gasto diario promedio */}
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Gasto / día</p>
                <p className="text-xl font-bold text-rose-400 tabular-nums">${fmt(analytics.gastoDiario)}</p>
              </div>

              {/* Categoría top gasto */}
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-2">Mayor gasto</p>
                {analytics.topCat ? (
                  <>
                    <p className="text-sm font-bold text-zinc-200 truncate">{analytics.topCat.cat}</p>
                    <p className="text-xs text-rose-400 tabular-nums mt-0.5">${fmt(analytics.topCat.gasto)}</p>
                  </>
                ) : <p className="text-sm text-zinc-600">—</p>}
              </div>

              {/* vs mes anterior */}
              <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-2xl p-4 col-span-2">
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Vs. mes anterior</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1">Ingresos</p>
                    {analytics.deltaIngreso !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-lg font-bold tabular-nums ${analytics.deltaIngreso >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {analytics.deltaIngreso >= 0 ? '+' : ''}{analytics.deltaIngreso.toFixed(1)}%
                        </span>
                        <TrendingUp size={13} className={analytics.deltaIngreso >= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                      </div>
                    ) : <span className="text-sm text-zinc-600">Sin datos</span>}
                  </div>
                  <div>
                    <p className="text-[10px] text-zinc-600 mb-1">Gastos</p>
                    {analytics.deltaGasto !== null ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`text-lg font-bold tabular-nums ${analytics.deltaGasto <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {analytics.deltaGasto >= 0 ? '+' : ''}{analytics.deltaGasto.toFixed(1)}%
                        </span>
                        <TrendingDown size={13} className={analytics.deltaGasto <= 0 ? 'text-emerald-500' : 'text-rose-500'} />
                      </div>
                    ) : <span className="text-sm text-zinc-600">Sin datos</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico barras: ingresos vs gastos */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Ingresos vs Gastos · 6 meses</p>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={datosBarras} barCategoryGap="30%" barGap={4}>
                  <XAxis dataKey="mes" tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#a1a1aa', marginBottom: 4 }}
                    formatter={(v: unknown, name: unknown) => [`$${fmt(Number(v))}`, name === 'ingreso' ? 'Ingresos' : 'Gastos']} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                  <Bar dataKey="ingreso" radius={[4, 4, 0, 0]}>{datosBarras.map((e, i) => <Cell key={i} fill={e.activo ? '#10b981' : '#166534'} />)}</Bar>
                  <Bar dataKey="gasto"   radius={[4, 4, 0, 0]}>{datosBarras.map((e, i) => <Cell key={i} fill={e.activo ? '#f43f5e' : '#881337'} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" /><span className="text-[11px] text-zinc-500">Ingresos</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-rose-500"   /><span className="text-[11px] text-zinc-500">Gastos</span></div>
              </div>
            </div>

            {/* Gráfico línea: evolución del balance */}
            <div className="bg-zinc-900/40 border border-zinc-800/50 rounded-3xl p-5">
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Evolución del balance · 6 meses</p>
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={datosBarras}>
                  <CartesianGrid stroke="#27272a" strokeDasharray="4 4" vertical={false} />
                  <XAxis dataKey="mes" tick={{ fill: '#52525b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 12, fontSize: 12 }} labelStyle={{ color: '#a1a1aa' }}
                    formatter={(v: unknown) => [`$${fmt(Number(v))}`, 'Balance']} cursor={{ stroke: '#3f3f46' }} />
                  <Line type="monotone" dataKey="balance" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla resumen meses */}
            <div className="space-y-2">
              {datosBarras.map(({ mes, key, ingreso, gasto, activo }) => (
                <div key={key} onClick={() => { setMesSel(key); setVista('movimientos'); }}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border cursor-pointer transition-all ${activo ? 'bg-zinc-800/60 border-zinc-700' : 'bg-zinc-900/30 border-zinc-800/40 hover:border-zinc-700'}`}>
                  <span className={`text-sm font-medium ${activo ? 'text-white' : 'text-zinc-400'}`}>{mes} {key.split('-')[0]}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-emerald-400 tabular-nums">+${fmt(ingreso)}</span>
                    <span className="text-xs text-rose-400 tabular-nums">−${fmt(gasto)}</span>
                    <span className={`text-xs font-bold tabular-nums ${ingreso - gasto >= 0 ? 'text-zinc-300' : 'text-rose-400'}`}>
                      {ingreso - gasto >= 0 ? '+' : '−'}${fmt(Math.abs(ingreso - gasto))}
                    </span>
                  </div>
                </div>
              ))}
            </div>

          </section>
        )}
      </div>

      {/* BOTÓN FLOTANTE */}
      <button type="button" aria-label="Agregar movimiento" onClick={abrirNuevo}
        className="fixed bottom-8 right-6 w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all z-50">
        <Plus color="black" size={28} strokeWidth={3} />
      </button>

      {/* MODAL NUEVO / EDITAR */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-end sm:items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) { setIsModalOpen(false); setEditando(null); } }}>
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-md rounded-3xl p-7 shadow-2xl">
            <div className="flex justify-between items-center mb-7">
              <h2 className="text-lg font-bold">{editando ? 'Editar Movimiento' : 'Nuevo Movimiento'}</h2>
              <button type="button" onClick={() => { setIsModalOpen(false); setEditando(null); }} aria-label="Cerrar modal" className="text-zinc-600 hover:text-zinc-300 transition-colors p-1"><X size={20} /></button>
            </div>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-2 gap-2">
                {(['gasto', 'ingreso'] as const).map(tipo => (
                  <button key={tipo} type="button" onClick={() => setFormData(f => ({ ...f, type: tipo }))}
                    className={`py-3 rounded-2xl text-sm font-bold uppercase tracking-wider transition-all ${formData.type === tipo ? (tipo === 'ingreso' ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white') : 'bg-zinc-900 border border-zinc-800 text-zinc-500'}`}>
                    {tipo === 'ingreso' ? '↑ Ingreso' : '↓ Gasto'}
                  </button>
                ))}
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1 block mb-1.5">Concepto <span className="text-rose-500">*</span></label>
                <input required className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
                  placeholder="Ej: Sueldo, Alquiler, Supermercado…" value={formData.label} onChange={e => setFormData(f => ({ ...f, label: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1 block mb-1.5">Categoría</label>
                  <input list="categorias-list" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
                    placeholder="Ej: Auto" value={formData.category} onChange={e => setFormData(f => ({ ...f, category: e.target.value }))} />
                  <datalist id="categorias-list">{categorias.map(c => <option key={c} value={c} />)}</datalist>
                  {/* Chips de categorías guardadas */}
                  {categorias.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {categorias.map(cat => (
                        <button key={cat} type="button" onClick={() => setFormData(f => ({ ...f, category: cat }))}
                          className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full transition-all ${formData.category === cat ? 'bg-zinc-200 text-black' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>
                          {formData.category === cat && <Check size={10} />}
                          {cat}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1 block mb-1.5">Monto <span className="text-rose-500">*</span></label>
                  <input required type="number" min="0" step="0.01" className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white font-mono outline-none focus:border-zinc-600 transition-colors placeholder:text-zinc-700"
                    placeholder="0" value={formData.amount} onChange={e => setFormData(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-zinc-500 uppercase tracking-widest ml-1 block mb-1.5">Detalle (opcional)</label>
                <textarea rows={2} className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 text-white outline-none focus:border-zinc-600 transition-colors resize-none placeholder:text-zinc-700"
                  placeholder="Notas adicionales…" value={formData.detail} onChange={e => setFormData(f => ({ ...f, detail: e.target.value }))} />
              </div>

              <button type="submit"
                className={`w-full font-black py-4 rounded-2xl transition-all active:scale-95 text-sm tracking-wide ${formData.type === 'ingreso' ? 'bg-emerald-500 text-black hover:bg-emerald-400' : 'bg-white text-black hover:bg-zinc-200'}`}>
                {editando ? `ACTUALIZAR ${formData.type === 'ingreso' ? 'INGRESO' : 'GASTO'}` : `GUARDAR ${formData.type === 'ingreso' ? 'INGRESO' : 'GASTO'}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
