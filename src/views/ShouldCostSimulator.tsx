import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { navItems } from '../data/navItems';
import { products, laborRegions } from '../data/products';
import { useProduct } from '../context/ProductContext';
import { useSimulation } from '../context/SimulationContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import {
    FileText, Layers, Settings, Factory, Truck, TrendingUp, CheckCircle,
    Globe, Cpu, User, Package, Lightbulb
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// ── Types ──
type PipelineStage = 'idle' | 'bom' | 'materials' | 'conversion' | 'overhead' | 'logistics' | 'margin' | 'complete';

const PIPELINE: { id: PipelineStage; label: string; icon: LucideIcon }[] = [
    { id: 'bom', label: 'BOM Parse', icon: FileText },
    { id: 'materials', label: 'Materials', icon: Layers },
    { id: 'conversion', label: 'Conversion', icon: Settings },
    { id: 'overhead', label: 'Overhead', icon: Factory },
    { id: 'logistics', label: 'Logistics', icon: Truck },
    { id: 'margin', label: 'Margin', icon: TrendingUp },
];

const ShouldCostSimulator = () => {
    const { selectedProductId } = useProduct();
    const product = useMemo(() => products.find(p => p.id === selectedProductId) || products[0], [selectedProductId]);

    // ── User Inputs ──
    const [supplierChoices, setSupplierChoices] = useState<Record<string, string>>({});
    const [phaseToggles, setPhaseToggles] = useState<Record<string, boolean>>({});
    const [laborRegion, setLaborRegion] = useState('china');
    const [overheadPct, setOverheadPct] = useState(product.overheadPctDefault);
    const [marginPct, setMarginPct] = useState(product.marginDefault);

    // ── Global Simulation State ──
    const {
        scPipelineStage: pipelineStage,
        scIsCalculating: isCalculating,
        scResult: result,
        scPipelineCosts: pipelineCosts,
        runShouldCostSimulation
    } = useSimulation();

    // Reset inputs when product changes (but don't reset simulation state!)
    useEffect(() => {
        const supplierDefaults: Record<string, string> = {};
        product.bom.forEach(b => { supplierDefaults[b.id] = b.defaultSupplierId; });
        setSupplierChoices(supplierDefaults);

        const phaseDefaults: Record<string, boolean> = {};
        product.manufacturingPhases.forEach(p => { phaseDefaults[p.id] = p.enabled; });
        setPhaseToggles(phaseDefaults);

        setOverheadPct(product.overheadPctDefault);
        setMarginPct(product.marginDefault);
        setLaborRegion('china');
    }, [product]);

    // ── Calculate Should-Cost (Delegates to Global Context) ──
    const calculate = useCallback(() => {
        runShouldCostSimulation(product, supplierChoices, overheadPct, marginPct, laborRegion, phaseToggles);
    }, [runShouldCostSimulation, product, supplierChoices, overheadPct, marginPct, laborRegion, phaseToggles]);

    // ── Waterfall chart data ──
    const waterfallData = result ? [
        { name: 'Materials', value: +result.materialsCost.toFixed(3), fill: '#06b6d4' },
        { name: 'Conversion', value: +result.conversionCost.toFixed(3), fill: '#8b5cf6' },
        { name: 'Overhead', value: +result.overheadCost.toFixed(3), fill: '#f59e0b' },
        { name: 'Logistics', value: +result.logisticsCost.toFixed(3), fill: '#10b981' },
        { name: 'Margin', value: +result.marginCost.toFixed(3), fill: '#ec4899' },
        { name: 'Should-Cost', value: +result.totalShouldCost.toFixed(3), fill: '#3b82f6' },
        { name: 'Market Price', value: result.currentPrice, fill: '#ef4444' },
    ] : [];

    const stageIndex = (s: PipelineStage) => PIPELINE.findIndex(p => p.id === s);
    const currentStageIdx = stageIndex(pipelineStage);

    return (
        <div className="flex h-screen bg-[#09090b]">
            <Sidebar navItems={navItems} />
            <div className="flex-1 flex flex-col relative">
                <Header breadcrumbs={['Nablon Procurement Agent', 'Should-Cost Simulator']} />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Title + Product Badge */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Factory className="w-8 h-8 text-cyan-400" />
                                Should-Cost Simulator
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">Bottom-up cost modelling with real commodity data</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm flex items-center gap-2">
                                <product.icon className="w-5 h-5 text-cyan-400" />
                                <span className="text-white font-medium">{product.name}</span>
                            </span>
                            <span className="text-xs text-gray-500">{product.annualVolume.toLocaleString()} units/yr</span>
                        </div>
                    </div>

                    {/* ═══ ANIMATED PIPELINE ═══ */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-widest mb-6 text-center">Agent-Powered Cost Calculation Pipeline</h3>
                        <div className="flex items-center justify-center gap-1.5">
                            {PIPELINE.map((stage, i) => {
                                const isActive = pipelineStage === stage.id;
                                const isDone = currentStageIdx > i || pipelineStage === 'complete';
                                const costVal = pipelineCosts[stage.id];

                                return (
                                    <div key={stage.id} className="flex items-center gap-1.5">
                                        <div className={`relative flex flex-col items-center px-5 py-3.5 rounded-xl border transition-all duration-500 min-w-[110px]
                                            ${isActive ? 'bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.25)] scale-105' :
                                                isDone ? 'bg-green-500/10 border-green-500/30' :
                                                    'bg-white/[0.03] border-white/10'}`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-1.5 transition-all duration-500
                                                ${isActive ? 'bg-cyan-500/25 animate-pulse' :
                                                    isDone ? 'bg-green-500/20' : 'bg-white/5'}`}>
                                                {isDone && !isActive ? (
                                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                                ) : (
                                                    <stage.icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                                                )}
                                            </div>
                                            <span className={`text-[11px] font-semibold ${isActive ? 'text-cyan-400' : isDone ? 'text-green-400' : 'text-gray-500'}`}>{stage.label}</span>
                                            {costVal !== undefined && (
                                                <span className="text-[10px] text-cyan-400/70 mt-0.5 font-mono">
                                                    ${costVal.toFixed(3)}
                                                </span>
                                            )}
                                            {isActive && (
                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-pulse" />
                                            )}
                                        </div>
                                        {i < PIPELINE.length - 1 && (
                                            <div className="flex items-center">
                                                <div className={`w-6 h-[2px] transition-colors duration-500 ${isDone ? 'bg-green-500/50' : isActive ? 'bg-cyan-500/50' : 'bg-white/10'}`} />
                                                <div className={`w-0 h-0 border-t-[4px] border-b-[4px] border-l-[5px] border-transparent transition-colors duration-500 ${isDone ? 'border-l-green-500/50' : 'border-l-white/10'}`} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ═══ INPUT CONTROLS ═══ */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Column 1: BOM Supplier Selection */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 space-y-4">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Package className="w-4 h-4" /> BOM Supplier Selection
                                <span className="text-[10px] text-gray-600 normal-case font-normal">({product.bom.length} items)</span>
                            </h3>
                            <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                                {product.bom.map(bom => (
                                    <div key={bom.id} className="space-y-1">
                                        <label className="text-xs text-gray-400 block truncate" title={bom.name}>{bom.name}</label>
                                        <select
                                            value={supplierChoices[bom.id] || bom.defaultSupplierId}
                                            onChange={e => setSupplierChoices(prev => ({ ...prev, [bom.id]: e.target.value }))}
                                            className="w-full bg-white/[0.06] border border-white/10 rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-cyan-500/50 transition-colors"
                                        >
                                            {bom.suppliers.map(s => (
                                                <option key={s.id} value={s.id}>
                                                    {s.name} ({s.region}) — ${s.pricePerUnit.toFixed(3)}/unit
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Column 2: Manufacturing Phases */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 space-y-4">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Settings className="w-4 h-4" /> Manufacturing Phases
                            </h3>
                            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                                {product.manufacturingPhases.map(phase => (
                                    <label key={phase.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group">
                                        <div className="relative">
                                            <input
                                                type="checkbox"
                                                checked={phaseToggles[phase.id] !== false}
                                                onChange={e => setPhaseToggles(prev => ({ ...prev, [phase.id]: e.target.checked }))}
                                                className="sr-only peer"
                                            />
                                            <div className="w-9 h-5 bg-white/10 rounded-full peer-checked:bg-cyan-500/30 transition-colors border border-white/10 peer-checked:border-cyan-500/30" />
                                            <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-gray-400 rounded-full transition-transform peer-checked:translate-x-4 peer-checked:bg-cyan-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <span className="text-xs text-white block truncate">{phase.name}</span>
                                            <div className="flex items-center gap-1 text-[10px] text-gray-500 mt-0.5">
                                                {phase.type === 'automated' ? <Cpu className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                <span>{phase.type} · {phase.cycleTimeSec}s · ${phase.baseCostPerUnit.toFixed(3)}</span>
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Column 3: Parameters */}
                        <div className="space-y-4">
                            {/* Labor Region */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> Labor Region
                                </h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(laborRegions).map(([key, region]) => (
                                        <button
                                            key={key}
                                            onClick={() => setLaborRegion(key)}
                                            className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all duration-200
                                                ${laborRegion === key
                                                    ? 'bg-cyan-500/15 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                                                    : 'bg-white/[0.03] border-white/10 hover:bg-white/5'}`}
                                        >
                                            <span className="text-lg font-bold text-gray-300">{region.code}</span>
                                            <span className={`text-[10px] font-medium leading-tight ${laborRegion === key ? 'text-cyan-400' : 'text-gray-400'}`}>
                                                {region.label.split('(')[0]}
                                            </span>
                                            <span className="text-[10px] text-gray-500">${region.rate}/hr</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Overhead % */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Factory className="w-4 h-4" /> Factory Overhead
                                </h3>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400">% of direct labor</span>
                                    <span className="text-cyan-400 font-mono font-bold">{overheadPct}%</span>
                                </div>
                                <input
                                    type="range" min={30} max={80} value={overheadPct}
                                    onChange={e => setOverheadPct(+e.target.value)}
                                    className="w-full accent-cyan-400"
                                />
                                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                                    <span>30%</span><span>80%</span>
                                </div>
                            </div>

                            {/* Margin % */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> Supplier Margin
                                </h3>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="text-gray-400">Target margin</span>
                                    <span className="text-emerald-400 font-mono font-bold">{marginPct}%</span>
                                </div>
                                <input
                                    type="range" min={5} max={25} value={marginPct}
                                    onChange={e => setMarginPct(+e.target.value)}
                                    className="w-full accent-emerald-400"
                                />
                                <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                                    <span>5%</span><span>25%</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ CALCULATE BUTTON ═══ */}
                    <div className="flex justify-center">
                        <button
                            onClick={calculate}
                            disabled={isCalculating}
                            className={`px-10 py-3.5 rounded-2xl font-semibold text-sm flex items-center gap-3 transition-all duration-300
                                ${isCalculating
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-600 text-white hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:scale-[1.03] active:scale-100'}`}
                        >
                            {isCalculating ? (
                                <>
                                    <Loader className="animate-spin w-5 h-5" />
                                    Calculating…
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-5 h-5" /> Calculate Should-Cost
                                    </div>
                                </>
                            )}
                        </button>
                    </div>

                    {/* ═══ RESULTS ═══ */}
                    {result && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {/* KPI Row */}
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Should-Cost</p>
                                    <p className="text-2xl font-bold text-cyan-400">${result.totalShouldCost.toFixed(3)}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">per unit</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Market Price</p>
                                    <p className="text-2xl font-bold text-red-400">${result.currentPrice.toFixed(2)}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">per unit</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Gap / Unit</p>
                                    <p className={`text-2xl font-bold ${result.savings > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                        ${Math.abs(result.savings).toFixed(3)}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">{result.savingsPercent.toFixed(1)}% {result.savings > 0 ? 'savings' : 'over'}</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Annual Opportunity</p>
                                    <p className="text-2xl font-bold text-emerald-400">
                                        ${((Math.abs(result.savings) * product.annualVolume) / 1_000_000).toFixed(1)}M
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-1">at {product.annualVolume.toLocaleString()} units</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                                    <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Confidence</p>
                                    <p className="text-2xl font-bold text-purple-400">{result.confidence}%</p>
                                    <div className="w-full bg-white/10 rounded-full h-1.5 mt-2">
                                        <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-full rounded-full" style={{ width: `${result.confidence}%` }} />
                                    </div>
                                </div>
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Waterfall Chart */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4" /> Cost Waterfall
                                    </h3>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <BarChart data={waterfallData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                                            <Tooltip
                                                contentStyle={{ background: '#1f1f23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                                                formatter={(v: number) => [`$${v.toFixed(3)}`, 'Cost']}
                                            />
                                            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                                                {waterfallData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Detailed Breakdown */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Detailed Breakdown
                                    </h3>
                                    <div className="space-y-2 text-sm font-mono max-h-[240px] overflow-y-auto">
                                        <div className="pb-2 mb-2 border-b border-white/10">
                                            <p className="text-[10px] text-cyan-400 uppercase font-sans font-semibold mb-1">Materials (${result.materialsCost.toFixed(3)})</p>
                                            {result.bomBreakdown.map((b, i) => (
                                                <div key={i} className="flex justify-between text-xs py-0.5">
                                                    <span className="text-gray-400 truncate mr-2">{b.name}</span>
                                                    <span className="text-white shrink-0">${b.cost.toFixed(4)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="pb-2 mb-2 border-b border-white/10">
                                            <p className="text-[10px] text-purple-400 uppercase font-sans font-semibold mb-1">Conversion (${result.conversionCost.toFixed(3)})</p>
                                            {result.phaseBreakdown.map((p, i) => (
                                                <div key={i} className="flex justify-between text-xs py-0.5">
                                                    <span className="text-gray-400 truncate mr-2 flex items-center gap-1">
                                                        {p.type === 'automated' ? <Cpu className="w-3 h-3" /> : <User className="w-3 h-3" />}
                                                        {p.name}
                                                    </span>
                                                    <span className="text-white shrink-0">${p.cost.toFixed(4)}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-between text-xs py-0.5"><span className="text-gray-400">Overhead</span><span className="text-white">${result.overheadCost.toFixed(3)}</span></div>
                                        <div className="flex justify-between text-xs py-0.5"><span className="text-gray-400">Logistics</span><span className="text-white">${result.logisticsCost.toFixed(3)}</span></div>
                                        <div className="flex justify-between text-xs py-0.5"><span className="text-gray-400">Margin ({marginPct}%)</span><span className="text-white">${result.marginCost.toFixed(3)}</span></div>
                                        <div className="flex justify-between text-sm pt-2 border-t border-white/10 font-bold">
                                            <span className="text-white font-sans">Total Should-Cost</span>
                                            <span className="text-cyan-400">${result.totalShouldCost.toFixed(3)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Insight */}
                            <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-6">
                                <h3 className="text-sm font-medium text-cyan-400 mb-3 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4" /> AI Strategic Insight
                                </h3>
                                <div className="text-sm text-gray-300 space-y-2">
                                    {result.savings > 0 ? (
                                        <>
                                            <p>
                                                The current market price of <strong className="text-white">${result.currentPrice.toFixed(2)}</strong> is{' '}
                                                <strong className="text-red-400">{result.savingsPercent.toFixed(1)}% above</strong> the calculated should-cost of{' '}
                                                <strong className="text-cyan-400">${result.totalShouldCost.toFixed(3)}</strong>.
                                                This represents a <strong className="text-green-400">${((result.savings * product.annualVolume) / 1_000_000).toFixed(1)}M annual savings opportunity</strong>.
                                            </p>
                                            <p>
                                                Recommendation: <strong className="text-white">Open re-negotiation</strong> leveraging clean-sheet cost transparency.
                                                Target settlement range: <strong className="text-cyan-400">${(result.totalShouldCost * 1.05).toFixed(3)} – ${(result.totalShouldCost * 1.08).toFixed(3)}</strong>.
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p>
                                                Current pricing of <strong className="text-white">${result.currentPrice.toFixed(2)}</strong> is{' '}
                                                <strong className="text-green-400">favorable</strong> compared to the should-cost of{' '}
                                                <strong className="text-cyan-400">${result.totalShouldCost.toFixed(3)}</strong>.
                                            </p>
                                            <p>
                                                Recommendation: <strong className="text-white">Lock in current pricing</strong> with a volume commitment before market correction.
                                            </p>
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors border border-cyan-500/30 flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Generate Negotiation Brief
                                    </button>
                                    <button className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-sm hover:bg-white/10 transition-colors flex items-center gap-2">
                                        <FileText className="w-4 h-4" /> Export Model PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper component since 'Loader' is not standard in Lucide, using 'Loader2' usually, or just simple svg
const Loader = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
);

export default ShouldCostSimulator;
