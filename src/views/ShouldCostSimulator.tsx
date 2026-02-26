import { useState, useCallback, useEffect, useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { navItems } from '../data/navItems';
import { products, laborRegions } from '../data/products';
import { useProduct } from '../context/ProductContext';
import { useSimulation } from '../context/SimulationContext';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from 'recharts';
import {
    FileText, Layers, Settings, Factory, Truck, TrendingUp, CheckCircle,
    Globe, Package, Sparkles, ShieldAlert
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import componentsData from '../data/components.json';
import commodityPrices from '../data/commodityPrices.json';

// ── Types ──
type PipelineStage = 'idle' | 'bom' | 'materials' | 'conversion' | 'overhead' | 'logistics' | 'tariffs' | 'margin' | 'complete';

const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(2)}K`;
    return `$${value.toFixed(2)}`;
};

const PIPELINE: { id: PipelineStage; label: string; icon: LucideIcon }[] = [
    { id: 'bom', label: 'BOM Parse', icon: FileText },
    { id: 'materials', label: 'Materials', icon: Layers },
    { id: 'conversion', label: 'Conversion', icon: Settings },
    { id: 'overhead', label: 'Overhead', icon: Factory },
    { id: 'logistics', label: 'Logistics', icon: Truck },
    { id: 'tariffs', label: 'Tariffs & FX', icon: ShieldAlert },
    { id: 'margin', label: 'Margin', icon: TrendingUp },
];

const ShouldCostSimulator = () => {
    const { selectedComponentId, setSelectedComponentId, selectedProductId } = useProduct();

    // Get the product first
    const product = useMemo(() => {
        return products.find(p => p.id === selectedProductId) || products[0];
    }, [selectedProductId]);

    // Get components for this product only
    const productComponents = useMemo(() => {
        return (componentsData as any[]).filter(c => product.componentIds.includes(c.id));
    }, [product]);

    // Find selected component (must be from current product)
    const selectedComponent = useMemo(() => {
        const comp = productComponents.find(c => c.id === selectedComponentId);
        return comp || productComponents[0];
    }, [selectedComponentId, productComponents]);

    // Get BOM item for this component
    const bomItem = useMemo(() => {
        if (!selectedComponent) return null;
        return product.bom.find(b => b.id === selectedComponent.bomItemId) || null;
    }, [selectedComponent, product]);

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

    // Reset selected component when product changes
    useEffect(() => {
        if (productComponents.length > 0) {
            setSelectedComponentId(productComponents[0].id);
        } else {
            setSelectedComponentId(null);
        }
    }, [selectedProductId, productComponents, setSelectedComponentId]);

    // Reset inputs when component changes (but don't reset simulation state!)
    useEffect(() => {
        const supplierDefaults: Record<string, string> = {};
        if (bomItem) {
            supplierDefaults[bomItem.id] = bomItem.defaultSupplierId;
        }
        setSupplierChoices(supplierDefaults);

        const phaseDefaults: Record<string, boolean> = {};
        product.manufacturingPhases.forEach(p => { phaseDefaults[p.id] = p.enabled; });
        setPhaseToggles(phaseDefaults);

        setOverheadPct(product.overheadPctDefault);
        setMarginPct(product.marginDefault);
        setLaborRegion('china');
    }, [product, bomItem]);

    // ── Calculate Should-Cost (Delegates to Global Context) ──
    const calculate = useCallback(() => {
        // Pass only the selected BOM item and component, not the entire product
        runShouldCostSimulation(product, bomItem, selectedComponent, supplierChoices, overheadPct, marginPct, laborRegion, phaseToggles);
    }, [runShouldCostSimulation, product, bomItem, selectedComponent, supplierChoices, overheadPct, marginPct, laborRegion, phaseToggles]);

    // ── Supplier-adjusted cost breakdown (same formula as NegotiationWorkspace) ──
    const activeSupplier = useMemo(() => {
        if (!bomItem) return null;
        const chosenId = supplierChoices[bomItem.id] || bomItem.defaultSupplierId;
        return bomItem.suppliers.find((s: any) => s.id === chosenId) || bomItem.suppliers[0];
    }, [bomItem, supplierChoices]);

    const defaultSupplier = useMemo(() => {
        if (!bomItem) return null;
        return bomItem.suppliers.find((s: any) => s.id === bomItem.defaultSupplierId) || bomItem.suppliers[0];
    }, [bomItem]);

    const supplierRmScaleFactor = useMemo(() => {
        if (!activeSupplier || !defaultSupplier || defaultSupplier.pricePerUnit === 0) return 1;
        return activeSupplier.pricePerUnit / defaultSupplier.pricePerUnit;
    }, [activeSupplier, defaultSupplier]);

    const adjustedCostBreakdown = useMemo(() => {
        if (!selectedComponent?.costBreakdown || !activeSupplier) return null;
        const bd = selectedComponent.costBreakdown;
        const f = supplierRmScaleFactor;
        const rmLeverage = activeSupplier.rmLeverageFactor ?? 1.0;
        const ohTargetScale = activeSupplier.overheadBenchmarkPct / 15;

        // When simulation result exists, use its values for the shouldCost column
        // so the breakdown table reflects the user's input choices (overhead %, margin %, labor region, phases)
        const useSim = !!result;
        return {
            rawMaterials: {
                clientPays: bd.rawMaterials.clientPays * f,
                shouldCost: useSim ? result!.materialsCost : bd.rawMaterials.shouldCost * rmLeverage,
            },
            conversion: {
                clientPays: bd.conversion.clientPays,
                shouldCost: useSim ? result!.conversionCost : bd.conversion.shouldCost,
            },
            overhead: {
                clientPays: bd.overhead.clientPays,
                shouldCost: useSim ? result!.overheadCost : bd.overhead.shouldCost * ohTargetScale,
            },
            logistics: {
                clientPays: bd.logistics.clientPays,
                shouldCost: useSim ? result!.logisticsCost : bd.logistics.shouldCost,
            },
            supplierMargin: {
                clientPays: bd.supplierMargin.clientPays,
                shouldCost: useSim ? result!.marginCost : bd.supplierMargin.shouldCost,
            },
        };
    }, [selectedComponent, activeSupplier, supplierRmScaleFactor, result]);

    // ── Unit-price waterfall data (McKinsey style — range-based, uses adjustedCostBreakdown) ──
    const unitWaterfallData = useMemo(() => {
        if (!result || !adjustedCostBreakdown || !activeSupplier) return [];
        const bd = adjustedCostBreakdown;

        // Use shouldCost values so all component bars fit under the green line
        const buckets = [
            { name: 'Raw Mats', label: 'Raw Materials', val: bd.rawMaterials.shouldCost, fill: '#3b82f6' },
            { name: 'Mfg', label: 'Manufacturing', val: bd.conversion.shouldCost, fill: '#6366f1' },
            { name: 'Overhead', label: 'Overhead', val: bd.overhead.shouldCost, fill: '#8b5cf6' },
            { name: 'Logistics', label: 'Logistics', val: bd.logistics.shouldCost, fill: '#a78bfa' },
            { name: 'Margin', label: 'Supplier Margin', val: bd.supplierMargin.shouldCost, fill: '#c4b5fd' },
            { name: 'Tariffs', label: 'Import Tariffs', val: bd.rawMaterials.shouldCost * (activeSupplier.importDutyPct / 100), fill: '#f59e0b' },
        ];

        let running = 0;
        const data: Array<{ name: string; label: string; range: [number, number]; value: number; fill: string; isTotal: boolean }> = [];

        for (const b of buckets) {
            if (b.val > 0) {
                data.push({ name: b.name, label: b.label, range: [running, running + b.val], value: b.val, fill: b.fill, isTotal: false });
                running += b.val;
            }
        }

        const totalSC = running;

        // Should-Cost total bar (green) — spans the full should-cost height
        data.push({ name: 'Should Cost', label: 'Should-Cost Total', range: [0, totalSC], value: totalSC, fill: '#10b981', isTotal: true });

        // Overpay bar (red) — sits ABOVE the green line
        // clientPays values already represent the landed cost the buyer pays, so no tariff multiplier needed
        const totalActual = bd.rawMaterials.clientPays + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays;
        const overpay = totalActual - totalSC;
        if (overpay > 0) {
            data.push({ name: 'Overpay', label: 'Overpay Gap', range: [totalSC, totalSC + overpay], value: overpay, fill: '#ef4444', isTotal: true });
        }

        return data;
    }, [result, adjustedCostBreakdown, activeSupplier]);

    // ── Cost breakdown waterfall data (Annual) ──
    const componentCostBreakdown = result && product ? (() => {
        const annualUnits = product.annualVolume;

        const elements = [
            { name: 'Raw Mats', val: result.materialsCost * annualUnits, fill: '#6366f1' },
            { name: 'Mfg', val: result.conversionCost * annualUnits, fill: '#8b5cf6' },
            { name: 'Overhead', val: result.overheadCost * annualUnits, fill: '#a855f7' },
            { name: 'Logistics', val: result.logisticsCost * annualUnits, fill: '#d946ef' },
            { name: 'Margin', val: result.marginCost * annualUnits, fill: '#8b5cf6' },
        ];

        let running = 0;
        const data: Array<{ name: string; range: [number, number]; value: number; fill: string; isTotal: boolean; delta?: number }> = elements.map(e => {
            const entry = { name: e.name, range: [running, running + e.val] as [number, number], value: e.val, fill: e.fill, isTotal: false };
            running += e.val;
            return entry;
        });

        const totalSC = elements.reduce((s, e) => s + e.val, 0);

        // Should Cost Total Bar
        data.push({ name: 'Should Cost', range: [0, totalSC], value: totalSC, fill: '#10b981', isTotal: true });

        // Overpay Gap (Actual - ShouldCost)
        // Recalculate actual based on supplier pricing
        const totalActual = result.currentPrice * annualUnits;
        const gap = totalActual - totalSC;
        if (gap > 0) {
            data.push({ name: 'Overpay', range: [totalSC, totalActual], value: gap, fill: '#ef4444', isTotal: false, delta: gap });
        }

        return data;
    })() : [];

    // ── Variance Waterfall (bridge from Quoted → Should-Cost) ──
    const varianceWaterfallData = result && result.savings > 0 ? (() => {
        const totalQuoted = result.currentPrice;
        const totalShouldCost = result.totalShouldCost;
        const gap = totalQuoted - totalShouldCost;

        // Derive proportions from actual model cost weights
        const totalModelCost = result.materialsCost + result.conversionCost + result.overheadCost + result.logisticsCost + result.tariffCost + result.marginCost;
        const pct = (v: number) => totalModelCost > 0 ? v / totalModelCost : 0;

        const variances = [
            { name: 'Raw Materials', amt: +(gap * pct(result.materialsCost)).toFixed(4), fill: '#10b981' },
            { name: 'Overhead', amt: +(gap * pct(result.overheadCost)).toFixed(4), fill: '#10b981' },
            { name: 'Supplier Margin', amt: +(gap * pct(result.marginCost)).toFixed(4), fill: '#10b981' },
            { name: 'Conversion', amt: +(gap * pct(result.conversionCost)).toFixed(4), fill: '#10b981' },
            { name: 'Logistics', amt: +(gap * pct(result.logisticsCost)).toFixed(4), fill: '#10b981' },
        ];
        if (result.tariffCost > 0) {
            variances.push({ name: 'Tariffs & FX', amt: +(gap * pct(result.tariffCost)).toFixed(4), fill: '#f43f5e' });
        }

        variances.sort((a, b) => b.amt - a.amt);

        let running = totalQuoted;
        const data: Array<{ name: string; range: [number, number]; value: number; fill: string; isTotal: boolean; delta?: number }> = [
            { name: 'Quoted Price', range: [0, totalQuoted], value: totalQuoted, fill: '#3b82f6', isTotal: true },
        ];
        variances.forEach(v => {
            const amt = Math.max(0, v.amt);
            const newRunning = +(running - amt).toFixed(4);
            data.push({ name: v.name, range: [newRunning, running], value: amt, fill: '#10b981', isTotal: false, delta: -amt });
            running = newRunning;
        });
        data.push({ name: 'Should Cost', range: [0, totalShouldCost], value: totalShouldCost, fill: '#6366f1', isTotal: true });
        return data;
    })() : [];

    const stageIndex = (s: PipelineStage) => PIPELINE.findIndex(p => p.id === s);
    const currentStageIdx = stageIndex(pipelineStage);

    // ── Agent Reasoning Trace Logic ──
    const reasoningData = useMemo(() => {
        if (!result || !product || !bomItem) return null;

        const selectedSupplierId = supplierChoices[bomItem.id] || bomItem.defaultSupplierId;
        const activeComponent = selectedComponent;
        const activeSupplier = bomItem.suppliers.find(s => s.id === selectedSupplierId) || bomItem.suppliers[0];

        if (!activeComponent || !activeSupplier) return null;

        const primaryCommodityData = (commodityPrices as any[]).find(cp => cp.commodity === activeComponent.primaryCommodity);
        const commPricePct = primaryCommodityData
            ? ((primaryCommodityData.history[primaryCommodityData.history.length - 1].price - primaryCommodityData.history[0].price) / primaryCommodityData.history[0].price * 100)
            : 0;
        const contractDate = new Date(activeComponent.contractSignedDate ?? activeComponent.lastNegotiation);

        const health = activeSupplier.financialHealth ?? 'Stable';
        const healthSignal = activeSupplier.financialSignal ?? 'No D&B signal available.';
        const healthImplication: Record<string, string> = {
            Stable: 'Financially robust — focus negotiation on volume tiers, SLA terms, and index-linked escalators rather than unit price.',
            Watch: 'Revenue or margin under pressure. Open to a multi-year volume commitment in exchange for a price reduction — a credible re-opener.',
            Stressed: 'Under significant margin pressure. Highly likely to accept below-market pricing to secure volume and cash flow. Prime negotiation target.',
        };
        const healthColorClass = health === 'Stressed' ? 'text-rose-400' : health === 'Watch' ? 'text-amber-400' : 'text-green-400';
        const healthBgClass = health === 'Stressed' ? 'bg-rose-500/20 border-rose-500/30' : health === 'Watch' ? 'bg-amber-500/20 border-amber-500/30' : 'bg-green-500/20 border-green-500/30';

        const hasTariff = activeSupplier.importDutyPct > 0;
        const tariffPct = activeSupplier.importDutyPct;
        const tariffReg = activeSupplier.region;
        const fxMove = activeSupplier.fxMovementPct;
        const landedUplift = (tariffPct * 0.6).toFixed(1);

        const ovhBenchmark = activeSupplier.overheadBenchmarkPct;
        const uc = activeComponent.unitCurrentCost ?? 1;
        const annualUnits = uc > 0 ? activeComponent.totalSpend / uc : 0;
        const bd = adjustedCostBreakdown || activeComponent.costBreakdown;
        const ovhGap = bd ? (bd.overhead.clientPays - bd.overhead.shouldCost) : 0;
        const annualOvhGap = ovhGap * annualUnits;
        const totalClientPays = bd ? (bd.rawMaterials.clientPays + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays) : activeComponent.currentCost;
        const tariffOnSC = bd ? bd.rawMaterials.shouldCost * (activeSupplier.importDutyPct / 100) : 0;
        const totalShouldCost = bd ? (bd.rawMaterials.shouldCost + bd.conversion.shouldCost + bd.overhead.shouldCost + bd.logistics.shouldCost + bd.supplierMargin.shouldCost + tariffOnSC) : activeComponent.shouldCost;
        const totalAnnualGap = (totalClientPays - totalShouldCost) * annualUnits;

        return {
            activeComponent,
            activeSupplier,
            primaryCommodityData,
            commPricePct,
            contractDate,
            health,
            healthSignal,
            healthImplication,
            healthColorClass,
            healthBgClass,
            hasTariff,
            tariffPct,
            tariffReg,
            fxMove,
            landedUplift,
            ovhBenchmark,
            annualOvhGap,
            totalAnnualGap
        };
    }, [result, product, bomItem, selectedComponent, supplierChoices, adjustedCostBreakdown]);

    return (
        <div className="flex h-screen bg-[#09090b]">
            <Sidebar navItems={navItems} />
            <div className="flex-1 flex flex-col relative">
                <Header breadcrumbs={['Nablon Procurement Agent', 'Should-Cost Simulator']} />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Title + Component Selector */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                                <Factory className="w-8 h-8 text-cyan-400" />
                                Should-Cost Simulator
                            </h1>
                            <p className="text-gray-500 text-sm mt-1">Component-level cost modelling with real commodity data</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="flex flex-col gap-2">
                                <select
                                    value={selectedComponentId || ''}
                                    onChange={(e) => setSelectedComponentId(e.target.value)}
                                    className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white font-medium focus:outline-none focus:border-cyan-500/50 transition-colors min-w-[300px] [&>option]:bg-[#18181b] [&>option]:text-white"
                                >
                                    {productComponents.map(comp => (
                                        <option key={comp.id} value={comp.id} className="bg-[#18181b] text-white py-2">
                                            {comp.name} — {comp.primaryCommodity}
                                        </option>
                                    ))}
                                </select>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <product.icon className="w-4 h-4 text-gray-400" />
                                    <span>{product.name}</span>
                                    <span>•</span>
                                    <span>{product.annualVolume.toLocaleString()} units/yr</span>
                                </div>
                            </div>
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
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Column 1: Component Material & Supplier Selection */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 space-y-4">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                <Package className="w-4 h-4" /> Component Material & Supplier
                            </h3>
                            {bomItem && (
                                <div className="space-y-4">
                                    <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Component</span>
                                            <span className="text-xs text-white font-medium">{selectedComponent?.name}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Material</span>
                                            <span className="text-xs text-cyan-400 font-medium">{bomItem.material}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Weight</span>
                                            <span className="text-xs text-gray-300">{bomItem.weightKg.toFixed(4)} kg</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Commodity</span>
                                            <span className="text-xs text-purple-400">{bomItem.commodityIndex}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-400">Index Price</span>
                                            <span className="text-xs text-green-400 font-mono">${bomItem.commodityPricePerKg.toFixed(2)}/kg</span>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs text-gray-400 block">Supplier Selection</label>
                                        <select
                                            value={supplierChoices[bomItem.id] || bomItem.defaultSupplierId}
                                            onChange={e => setSupplierChoices(prev => ({ ...prev, [bomItem.id]: e.target.value }))}
                                            className="w-full bg-white/[0.06] border border-white/10 rounded-lg py-2 px-3 text-white text-xs focus:outline-none focus:border-cyan-500/50 transition-colors [&>option]:bg-[#18181b] [&>option]:text-white"
                                        >
                                            {bomItem.suppliers.map(s => {
                                                const bd = selectedComponent?.costBreakdown;
                                                const defSup = bomItem.suppliers.find(ds => ds.id === bomItem.defaultSupplierId) || bomItem.suppliers[0];
                                                const sf = defSup.pricePerUnit > 0 ? s.pricePerUnit / defSup.pricePerUnit : 1;
                                                const fullUnitCost = bd
                                                    ? (bd.rawMaterials.clientPays * sf + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays)
                                                    : s.pricePerUnit;
                                                return (
                                                    <option key={s.id} value={s.id} className="bg-[#18181b] text-white">
                                                        {s.name} ({s.region}) — ${fullUnitCost.toFixed(3)}/unit
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>
                            )}
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
                            {(() => {
                                const bd = adjustedCostBreakdown;
                                const sup = activeSupplier;
                                // Compute from adjustedCostBreakdown if available, else fall back to result
                                const totalSC = bd && sup
                                    ? bd.rawMaterials.shouldCost + bd.conversion.shouldCost + bd.overhead.shouldCost + bd.logistics.shouldCost + bd.supplierMargin.shouldCost + bd.rawMaterials.shouldCost * (sup.importDutyPct / 100)
                                    : result.totalShouldCost;
                                const totalClientPays = bd && sup
                                    ? (bd.rawMaterials.clientPays + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays) * (1 + sup.importDutyPct / 100)
                                    : result.currentPrice;
                                const gap = totalClientPays - totalSC;
                                const gapPct = totalClientPays > 0 ? (gap / totalClientPays) * 100 : 0;
                                const tariff = bd && sup ? bd.rawMaterials.shouldCost * (sup.importDutyPct / 100) : result.tariffCost;
                                const annualOpp = Math.abs(gap) * product.annualVolume;

                                return (
                                    <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Should-Cost</p>
                                            <p className="text-2xl font-bold text-cyan-400">${totalSC.toFixed(3)}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">per unit</p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Market Price</p>
                                            <p className="text-2xl font-bold text-red-400">${totalClientPays.toFixed(3)}</p>
                                            <p className="text-[10px] text-gray-500 mt-1">per unit</p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Gap / Unit</p>
                                            <p className={`text-2xl font-bold ${gap > 0 ? 'text-green-400' : 'text-yellow-400'}`}>
                                                ${Math.abs(gap).toFixed(3)}
                                            </p>
                                            <p className="text-[10px] text-gray-500 mt-1">{Math.abs(gapPct).toFixed(1)}% {gap > 0 ? 'savings' : 'over'}</p>
                                        </div>
                                        <div className={`backdrop-blur-xl border rounded-xl p-5 text-center ${tariff > 0 ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white/5 border-white/10'}`}>
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Tariff Impact</p>
                                            <p className={`text-2xl font-bold ${tariff > 0 ? 'text-rose-400' : 'text-green-400'}`}>
                                                {tariff > 0 ? `+$${tariff.toFixed(3)}` : '$0.00'}
                                            </p>
                                            <p className="text-[10px] text-gray-500 mt-1">
                                                {tariff > 0
                                                    ? `${((tariff / totalSC) * 100).toFixed(1)}% of SC`
                                                    : 'No tariff exposure'}
                                            </p>
                                        </div>
                                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 text-center">
                                            <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Annual Opportunity</p>
                                            <p className="text-2xl font-bold text-emerald-400">
                                                ${(annualOpp / 1_000_000).toFixed(1)}M
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
                                );
                            })()}

                            {/* ═══ WHAT WE PAY vs SHOULD-COST TABLE ═══ */}
                            {adjustedCostBreakdown && (() => {
                                const bd = adjustedCostBreakdown;
                                const rows = [
                                    { label: 'Raw Materials', fill: '#64748b', ...bd.rawMaterials },
                                    { label: 'Conversion', fill: '#94a3b8', ...bd.conversion },
                                    { label: 'Overhead', fill: '#cbd5e1', ...bd.overhead },
                                    { label: 'Logistics', fill: '#94a3b8', ...bd.logistics },
                                    { label: 'Supplier Margin', fill: '#64748b', ...bd.supplierMargin },
                                ].sort((a, b) => (b.clientPays - b.shouldCost) - (a.clientPays - a.shouldCost));
                                const totalGapUnit = rows.reduce((s, r) => s + (r.clientPays - r.shouldCost), 0);
                                return (
                                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                                    What You Pay vs. Should-Cost — Sorted by Impact
                                                </h3>
                                                <p className="text-[11px] text-gray-500 mt-1">
                                                    Per-unit breakdown across cost elements. Largest gaps = priority negotiation levers.
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Gap / Unit</div>
                                                <div className="text-xl font-bold text-green-400">${totalGapUnit.toFixed(3)}<span className="text-xs font-normal text-gray-500 ml-1">/ unit</span></div>
                                            </div>
                                        </div>

                                        {/* Column header */}
                                        <div className="grid grid-cols-[1fr_100px_100px_90px_130px] gap-3 text-[10px] text-gray-600 uppercase tracking-wider pb-2 mb-1 border-b border-white/5 px-2">
                                            <span>Cost Element</span>
                                            <span className="text-right">You Pay</span>
                                            <span className="text-right">Should-Cost</span>
                                            <span className="text-right">Gap</span>
                                            <span>% of Total Gap</span>
                                        </div>

                                        <div className="space-y-1">
                                            {rows.map((row, i) => {
                                                const delta = row.clientPays - row.shouldCost;
                                                const pctOfGap = totalGapUnit > 0 ? (delta / totalGapUnit) * 100 : 0;
                                                const isTopLever = i === 0;
                                                return (
                                                    <div
                                                        key={row.label}
                                                        className={`grid grid-cols-[1fr_100px_100px_90px_130px] gap-3 items-center px-3 py-2.5 rounded-lg transition-all ${isTopLever ? 'bg-white/[0.07] border border-white/10' : 'hover:bg-white/[0.04]'}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.fill }} />
                                                            <span className="text-sm font-medium text-white">{row.label}</span>
                                                            {isTopLever && <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">Top Lever</span>}
                                                        </div>
                                                        <div className="text-right font-mono text-sm text-red-300">${row.clientPays.toFixed(3)}</div>
                                                        <div className="text-right font-mono text-sm text-cyan-400">${row.shouldCost.toFixed(3)}</div>
                                                        <div className="text-right font-mono text-sm font-bold text-green-400">
                                                            {delta > 0.001 ? `+$${delta.toFixed(3)}` : <span className="text-gray-500">—</span>}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-white/10 rounded-full h-1.5 overflow-hidden">
                                                                <div
                                                                    className="h-full rounded-full transition-all duration-700"
                                                                    style={{ width: `${Math.max(0, Math.min(100, pctOfGap))}%`, backgroundColor: row.fill }}
                                                                />
                                                            </div>
                                                            <span className="text-[11px] text-gray-400 font-mono w-9 text-right shrink-0">
                                                                {pctOfGap > 0.5 ? `${pctOfGap.toFixed(0)}%` : '—'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Totals row */}
                                        <div className="grid grid-cols-[1fr_100px_100px_90px_130px] gap-3 items-center px-3 py-2.5 mt-2 pt-3 border-t border-white/10">
                                            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Total / Unit</span>
                                            <div className="text-right font-mono text-sm font-bold text-red-300">
                                                ${rows.reduce((s, r) => s + r.clientPays, 0).toFixed(3)}
                                            </div>
                                            <div className="text-right font-mono text-sm font-bold text-cyan-400">
                                                ${rows.reduce((s, r) => s + r.shouldCost, 0).toFixed(3)}
                                            </div>
                                            <div className="text-right font-mono text-sm font-bold text-green-400">
                                                +${totalGapUnit.toFixed(3)}
                                            </div>
                                            <div className="text-[10px] text-gray-500 italic">← per unit impact</div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ═══ UNIT PRICE WATERFALL (FULL WIDTH) ═══ */}
                            {unitWaterfallData.length > 0 && adjustedCostBreakdown && activeSupplier && (() => {
                                const bd = adjustedCostBreakdown;
                                const scEntry = unitWaterfallData.find(d => d.name === 'Should Cost');
                                const totalSC = scEntry ? scEntry.value : 0;
                                const totalActual = bd.rawMaterials.clientPays + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays;
                                const landedActual = totalActual * (1 + activeSupplier.importDutyPct / 100);
                                const gap = landedActual - totalSC;

                                return (
                                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h2 className="text-sm font-semibold text-white">{selectedComponent?.name} — Unit Price Build-Up</h2>
                                                <p className="text-[11px] text-gray-500 mt-0.5">Waterfall breakdown: what drives per-unit cost and where the overpay sits</p>
                                            </div>
                                            <div className="flex items-center gap-4 text-[10px]">
                                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />Cost components</span>
                                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Should-cost</span>
                                                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" />Overpay gap</span>
                                            </div>
                                        </div>

                                        <ResponsiveContainer width="100%" height={300}>
                                            <ComposedChart data={unitWaterfallData} barSize={48} margin={{ top: 24, right: 16, left: 8, bottom: 0 }}>
                                                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                                                <XAxis
                                                    dataKey="name"
                                                    tick={{ fill: '#9ca3af', fontSize: 11 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis
                                                    tickFormatter={(v: number) => `$${v.toFixed(2)}`}
                                                    tick={{ fill: '#6b7280', fontSize: 10 }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                    width={60}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                                                    content={({ active, payload }: any) => {
                                                        if (!active || !payload?.length) return null;
                                                        const d = payload[0]?.payload;
                                                        if (!d) return null;
                                                        return (
                                                            <div className="bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 shadow-xl text-xs">
                                                                <p className="font-semibold text-white mb-1">{d.label}</p>
                                                                <p style={{ color: d.fill }}>${d.value.toFixed(3)}/unit</p>
                                                                {!d.isTotal && <p className="text-gray-500 mt-0.5">Running total: ${d.range[1].toFixed(3)}/unit</p>}
                                                            </div>
                                                        );
                                                    }}
                                                />
                                                <Bar dataKey="range" radius={[4, 4, 0, 0]}>
                                                    {unitWaterfallData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                                                    <LabelList
                                                        dataKey="value"
                                                        position="top"
                                                        content={({ x, y, width, index }: any) => {
                                                            const entry = unitWaterfallData[index];
                                                            return (
                                                                <text x={(x as number) + (width as number) / 2} y={(y as number) - 10} fill="#e5e7eb" fontSize={11} fontWeight="700" textAnchor="middle">
                                                                    ${entry.value.toFixed(3)}
                                                                </text>
                                                            );
                                                        }}
                                                    />
                                                </Bar>
                                                <ReferenceLine
                                                    y={totalSC}
                                                    stroke="#10b981"
                                                    strokeDasharray="5 5"
                                                    strokeWidth={1.5}
                                                    label={{ value: 'Should-Cost ceiling', position: 'right', fill: '#10b981', fontSize: 9, fontWeight: '700' }}
                                                />
                                            </ComposedChart>
                                        </ResponsiveContainer>

                                        <div className="mt-2 flex items-center gap-6 text-[10px] text-gray-500 px-1">
                                            <span>Landed unit price: <span className="text-white font-semibold">${landedActual.toFixed(3)}</span></span>
                                            <span>Should-cost unit: <span className="text-emerald-400 font-semibold">${totalSC.toFixed(3)}</span></span>
                                            <span>Overpay gap: <span className="text-red-400 font-semibold">${gap.toFixed(3)}</span></span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* ═══ WATERFALLS GRID (COST BREAKDOWN & VARIANCE) — HIDDEN ═══ */}                         {/* <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">\r\n                                {varianceWaterfallData.length > 0 && (\r\n                                    ... Variance Bridge Waterfall ...\r\n                                )}\r\n                            </div> */}

                            {/* ═══ TARIFF & FX IMPACT PANEL ═══ */}
                            {result.tariffBreakdown.some(t => t.dutyPct > 0 || Math.abs(t.fxPct) > 1) && (
                                <div className="bg-gradient-to-br from-rose-500/5 to-amber-500/5 border border-rose-500/20 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                                <ShieldAlert className="w-4 h-4 text-rose-400" />
                                                Tariff & FX Exposure — by BOM Item
                                            </h3>
                                            <p className="text-[11px] text-gray-500 mt-1">
                                                Supplier-specific import duties and currency movements impacting landed cost
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Tariff Cost</div>
                                            <div className="text-xl font-bold text-rose-400">+${result.tariffCost.toFixed(3)}<span className="text-xs font-normal text-gray-500 ml-1">/ unit</span></div>
                                            <div className="text-[10px] text-gray-500">{formatCurrency(result.tariffCost * product.annualVolume)} annual</div>
                                        </div>
                                    </div>

                                    {/* Table header */}
                                    <div className="grid grid-cols-[1fr_100px_80px_90px_80px_90px] gap-2 text-[10px] text-gray-600 uppercase tracking-wider pb-2 mb-1 border-b border-white/5 px-2">
                                        <span>BOM Item</span>
                                        <span>Supplier</span>
                                        <span className="text-right">Duty %</span>
                                        <span className="text-right">Duty Cost</span>
                                        <span className="text-right">FX Move</span>
                                        <span className="text-right">FX Impact</span>
                                    </div>

                                    <div className="space-y-1">
                                        {result.tariffBreakdown.map((t, i) => (
                                            <div key={i} className={`grid grid-cols-[1fr_100px_80px_90px_80px_90px] gap-2 items-center px-3 py-2 rounded-lg ${t.dutyPct > 100 ? 'bg-rose-500/10 border border-rose-500/20' : t.dutyPct > 0 ? 'bg-white/[0.04]' : 'hover:bg-white/[0.03]'}`}>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-white font-medium truncate">{t.name}</span>
                                                </div>
                                                <div className="text-xs text-gray-300 truncate">{t.supplier}</div>
                                                <div className={`text-right text-xs font-mono font-bold ${t.dutyPct >= 100 ? 'text-rose-400' : t.dutyPct > 0 ? 'text-amber-400' : 'text-green-400'}`}>
                                                    {t.dutyPct > 0 ? `${t.dutyPct}%` : '0%'}
                                                    {t.dutyPct >= 100 && <span className="text-[8px] ml-0.5">⚠</span>}
                                                </div>
                                                <div className={`text-right text-xs font-mono ${t.cost > 0 ? 'text-rose-300' : 'text-gray-500'}`}>
                                                    {t.cost > 0 ? `+$${t.cost.toFixed(4)}` : '—'}
                                                </div>
                                                <div className={`text-right text-xs font-mono ${t.fxPct < -2 ? 'text-green-400' : t.fxPct > 2 ? 'text-red-300' : 'text-gray-500'}`}>
                                                    {t.fxPct !== 0 ? `${t.fxPct > 0 ? '+' : ''}${t.fxPct.toFixed(1)}%` : '—'}
                                                </div>
                                                <div className={`text-right text-xs font-mono ${t.fxImpact < 0 ? 'text-green-400' : t.fxImpact > 0 ? 'text-red-300' : 'text-gray-500'}`}>
                                                    {t.fxImpact !== 0 ? `${t.fxImpact < 0 ? '' : '+'}$${t.fxImpact.toFixed(4)}` : '—'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Totals */}
                                    <div className="grid grid-cols-[1fr_100px_80px_90px_80px_90px] gap-2 items-center px-3 py-2.5 mt-2 pt-3 border-t border-white/10">
                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Total / Unit</span>
                                        <span></span>
                                        <span></span>
                                        <div className="text-right font-mono text-xs font-bold text-rose-400">+${result.tariffCost.toFixed(3)}</div>
                                        <span></span>
                                        <div className={`text-right font-mono text-xs font-bold ${result.fxAdjustment < 0 ? 'text-green-400' : 'text-red-300'}`}>
                                            {result.fxAdjustment < 0 ? '' : '+'}${result.fxAdjustment.toFixed(4)}
                                        </div>
                                    </div>

                                    {/* Insight callout */}
                                    {result.tariffCost > 0.5 && (
                                        <div className="mt-4 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-3">
                                            <p className="text-xs text-rose-200 leading-relaxed flex items-start gap-2">
                                                <Sparkles className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                                <span>
                                                    <span className="text-white font-semibold">Agent Insight:</span> Tariffs add <span className="text-rose-400 font-bold">${result.tariffCost.toFixed(3)}/unit</span> ({((result.tariffCost / result.totalShouldCost) * 100).toFixed(1)}% of should-cost). Switching to zero-tariff origin suppliers for high-duty items could save up to <span className="text-green-400 font-bold">{formatCurrency(result.tariffCost * product.annualVolume)}</span> annually. Review the BOM Supplier Selection panel to compare alternatives.
                                                </span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Agent Reasoning Trace */}
                            {reasoningData && (
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-purple-400" />
                                            Agent Reasoning Trace — Supplier Intelligence
                                        </h3>
                                        <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-1 rounded-full flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                                            Scale-Aware Mode · {reasoningData.activeSupplier.name}
                                        </span>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Step 1: BOM & Market Data */}
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[11px] font-bold flex items-center justify-center shrink-0">1</div>
                                                <div className="w-px flex-1 bg-white/10 mt-1" />
                                            </div>
                                            <div className="pb-3">
                                                <div className="text-xs font-semibold text-cyan-400 mb-1 flex items-center gap-2">
                                                    BOM & Market Data Ingested
                                                    <span className="text-[8px] px-1 bg-cyan-500/20 border border-cyan-500/30 rounded text-cyan-300">Scale Aware</span>
                                                </div>
                                                {reasoningData.primaryCommodityData ? (
                                                    <p className="text-sm text-gray-300 leading-relaxed">
                                                        <span className="text-white font-medium">{reasoningData.activeComponent.primaryCommodity} spot price</span> has <span className={reasoningData.commPricePct < 0 ? 'text-green-400' : 'text-red-400'}>{reasoningData.commPricePct < 0 ? 'decreased' : 'increased'} {Math.abs(reasoningData.commPricePct).toFixed(1)}%</span> since contract signing — strengthening our negotiation position on raw material costs. Additionally, bulk order volumes qualify for volume-tier discounts, providing further leverage to push unit pricing down.
                                                    </p>
                                                ) : (
                                                    <p className="text-sm text-gray-300">No commodity index data found. Using structural gap analysis based on current market benchmarks.</p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Step 2: Overhead Benchmark */}
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-400 text-[11px] font-bold flex items-center justify-center shrink-0">2</div>
                                                <div className="w-px flex-1 bg-white/10 mt-1" />
                                            </div>
                                            <div className="pb-3">
                                                <div className="text-xs font-semibold text-purple-400 mb-1">Overhead Benchmark Check</div>
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    {reasoningData.activeSupplier.name}'s overhead benchmark ({reasoningData.ovhBenchmark}%) is{' '}
                                                    {reasoningData.ovhBenchmark > 16 ? (
                                                        <>above the <span className="text-white font-medium">scale-adjusted target</span> of <span className="text-green-400">13%</span>. Excess ≈ <span className="text-orange-400 font-bold">{formatCurrency(reasoningData.annualOvhGap)}/yr</span>. Flagged as negotiable lever.</>
                                                    ) : (
                                                        <>competitive relative to <span className="text-white font-medium">scale-adjusted benchmark</span> ({reasoningData.ovhBenchmark}%). Focus negotiation on RM and margin gaps.</>
                                                    )}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 3: Supplier EBITDA */}
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[11px] font-bold flex items-center justify-center shrink-0">3</div>
                                                <div className="w-px flex-1 bg-white/10 mt-1" />
                                            </div>
                                            <div className="pb-3">
                                                <div className="text-xs font-semibold text-amber-400 mb-1">Supplier EBITDA Analysis</div>
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    D&B reports <span className="text-white font-medium">{reasoningData.activeSupplier.name}</span> operating margin at <span className="text-cyan-400 font-bold">11.8%</span>, yet at our current pricing they earn an implied{' '}
                                                    <span className="text-orange-400 font-bold">{(() => { const bd = adjustedCostBreakdown; if (!bd) return '—'; const rev = bd.rawMaterials.clientPays + bd.conversion.clientPays + bd.overhead.clientPays + bd.supplierMargin.clientPays; const cogs = bd.rawMaterials.shouldCost + bd.conversion.shouldCost + bd.overhead.shouldCost; return rev > 0 ? ((rev - cogs) / rev * 100).toFixed(0) : '—'; })()}%</span>{' '}
                                                    margin on our account — roughly 3–4× their reported norm.{' '}
                                                    Current quoted pricing is <span className="text-orange-400 font-bold">{((result.currentPrice - result.totalShouldCost) / result.totalShouldCost * 100).toFixed(1)}%</span> above should-cost.{' '}
                                                    Total annual overpay = <span className="text-orange-400 font-bold">{formatCurrency(reasoningData.totalAnnualGap)}</span>.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 4: Tariff & FX */}
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-7 h-7 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0 ${reasoningData.hasTariff ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-green-500/20 border-green-500/30 text-green-400'}`}>4</div>
                                                <div className="w-px flex-1 bg-white/10 mt-1" />
                                            </div>
                                            <div className="pb-3">
                                                <div className={`text-xs font-semibold mb-1 ${reasoningData.hasTariff ? 'text-rose-400' : 'text-green-400'}`}>{reasoningData.hasTariff ? 'Tariff & FX Exposure Flagged' : 'Tariff & FX Assessment'}</div>
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    {reasoningData.hasTariff
                                                        ? `${reasoningData.tariffReg}-origin supplier carries a ${reasoningData.tariffPct}% US import duty. Landed cost is effectively ${reasoningData.landedUplift}% higher than unit price. ${reasoningData.fxMove < -3 ? `Additionally, ${reasoningData.tariffReg} currency depreciated ${Math.abs(reasoningData.fxMove).toFixed(1)}% YTD — creating more headroom.` : 'FX movement is minimal.'}`
                                                        : `${reasoningData.tariffReg}-origin supplier: no US import duties apply. ${reasoningData.fxMove < -3 ? `Note: ${reasoningData.tariffReg} currency depreciated ${Math.abs(reasoningData.fxMove).toFixed(1)}% YTD — this reduces supplier's real cost base.` : 'FX movement is minimal.'}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 5: Financial Health */}
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-7 h-7 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0 ${reasoningData.healthBgClass} ${reasoningData.healthColorClass}`}>5</div>
                                                <div className="w-px flex-1 bg-white/10 mt-1" />
                                            </div>
                                            <div className="pb-3">
                                                <div className={`text-xs font-semibold mb-1 ${reasoningData.healthColorClass}`}>Supplier Financial Health: {reasoningData.health}</div>
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    {reasoningData.activeSupplier.name} is rated <span className={`font-bold ${reasoningData.healthColorClass}`}>{reasoningData.health}</span> with a well-diversified customer base and solid cash flow.{' '}
                                                    {reasoningData.health === 'Stable' && 'No immediate financial distress signals — supplier is unlikely to concede on price without structured leverage (volume commitments, multi-year terms).'}
                                                    {reasoningData.health === 'Watch' && 'Revenue or margin under pressure — open to multi-year volume commitment in exchange for a price reduction.'}
                                                    {reasoningData.health === 'Stressed' && 'Under significant margin pressure — highly likely to accept below-market pricing to secure volume and cash flow.'}
                                                </p>
                                                <p className="text-sm text-gray-300 leading-relaxed mt-2">
                                                    <span className="text-white font-medium">Negotiation implication:</span> {reasoningData.healthImplication[reasoningData.health]}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 6: Recommendation */}
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className="w-7 h-7 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[11px] font-bold flex items-center justify-center shrink-0">6</div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-semibold text-green-400 mb-1">Autonomous Recommendation</div>
                                                <div className="bg-green-500/5 border border-green-500/20 rounded-lg px-4 py-3">
                                                    {(() => {
                                                        const targetUnit = result.totalShouldCost;
                                                        const walkAway = targetUnit * 1.05;
                                                        return result.savings > 0 ? (
                                                            <p className="text-sm text-gray-200 leading-relaxed">
                                                                <span className="text-white font-semibold">Open targeted re-negotiation</span> citing commodity index decline + overhead benchmark.{' '}
                                                                Target: <span className="text-green-400 font-bold">${targetUnit.toFixed(3)}/unit</span>.{' '}
                                                                Walk-away: <span className="text-yellow-400 font-bold">${walkAway.toFixed(3)}/unit</span>.
                                                            </p>
                                                        ) : (
                                                            <p className="text-sm text-gray-200 leading-relaxed">
                                                                <span className="text-white font-semibold">Lock in current pricing</span> with a volume commitment. Market price is favorable compared to should-cost. Prioritize supply security over further price pressure.
                                                            </p>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
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
