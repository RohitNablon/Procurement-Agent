import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ChevronDown, ChevronRight, Copy, Check, AlertCircle, X, Printer, Download, FileText, MessageSquare, ShieldAlert, Handshake, ArrowRight, BookOpen, Quote, Sparkles, TrendingUp } from 'lucide-react';
import { navItems } from '../data/navItems';
import { useProduct } from '../context/ProductContext';
import { products } from '../data/products';
import type { Supplier } from '../data/products';
import componentsData from '../data/components.json';
import commodityPrices from '../data/commodityPrices.json';
import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine } from 'recharts';



const objections = [
    {
        q: '"Raw material prices have spiked"',
        a: 'We monitor commodity indices daily. While there was a short-term spike last month, the 6-month trend for this material grade is actually flat to slightly down. Your pricing should reflect this long-term stability, not temporary volatility.'
    },
    {
        q: '"Our manufacturing overhead has increased"',
        a: 'We understand energy and labor variances, but our should-cost model accounts for regional inflation. The 15% overhead allocation in your quote exceeds the industry benchmark of 10-12% for this process type. Can you breakdown the specific cost drivers?'
    },
    {
        q: '"Volume is too low for this price"',
        a: 'We are projecting a 20% volume increase over the next 18 months across this product line. We are willing to structure a tiered pricing agreement that locks in this lower rate now in exchange for that committed future volume.'
    },
];

const formatCurrency = (value: number) => {
    if (value >= 1000000) {
        return `$${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
        return `$${(value / 1000).toFixed(2)}K`;
    }
    return `$${value.toFixed(2)}`;
};

const NegotiationWorkspace = () => {
    const { selectedProductId } = useProduct();
    const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
    const [expandedObjections, setExpandedObjections] = useState<number[]>([0]);
    const [copied, setCopied] = useState<string | null>(null);
    const [showScript, setShowScript] = useState(false);

    const product = useMemo(() => {
        return products.find(p => p.id === selectedProductId) || products[0];
    }, [selectedProductId]);

    // Get components for this product
    const productComponents = useMemo(() => {
        return componentsData.filter(c => product.componentIds.includes(c.id));
    }, [product]);

    const location = useLocation();

    // Reset selected component when product changes, OR when arriving via deep-link
    useEffect(() => {
        const deepLinkedId = (location.state as { componentId?: string } | null)?.componentId;
        if (deepLinkedId && productComponents.some(c => c.id === deepLinkedId)) {
            setSelectedComponentId(deepLinkedId);
        } else if (productComponents.length > 0) {
            setSelectedComponentId(productComponents[0].id);
        } else {
            setSelectedComponentId(null);
        }
        setSelectedSupplierId(null);
    }, [selectedProductId, productComponents, location.state]);


    const activeComponent = useMemo(() => {
        return productComponents.find(c => c.id === selectedComponentId) || productComponents[0];
    }, [selectedComponentId, productComponents]);

    // ── BOM item for this component (supplier dropdown) ──
    const bomItem = useMemo(() => {
        if (!activeComponent) return null;
        return product.bom.find(b => b.id === activeComponent.bomItemId) || null;
    }, [activeComponent, product]);

    // When component changes, reset to default supplier
    useEffect(() => {
        if (bomItem) setSelectedSupplierId(bomItem.defaultSupplierId);
    }, [bomItem]);

    const activeSupplier: Supplier | null = useMemo(() => {
        if (!bomItem) return null;
        return bomItem.suppliers.find(s => s.id === selectedSupplierId) || bomItem.suppliers[0];
    }, [bomItem, selectedSupplierId]);

    const defaultSupplier: Supplier | null = useMemo(() => {
        if (!bomItem) return null;
        return bomItem.suppliers.find(s => s.id === bomItem.defaultSupplierId) || bomItem.suppliers[0];
    }, [bomItem]);

    // Scale factor: how does selected supplier price compare to default?
    const supplierRmScaleFactor = useMemo(() => {
        if (!activeSupplier || !defaultSupplier || defaultSupplier.pricePerUnit === 0) return 1;
        return activeSupplier.pricePerUnit / defaultSupplier.pricePerUnit;
    }, [activeSupplier, defaultSupplier]);

    // Adjusted costBreakdown for selected supplier 
    // - RM scales with supplier price AND RM leverage factor
    // - Overhead target is now benchmarked based on supplier's scale profile
    const adjustedCostBreakdown = useMemo(() => {
        if (!activeComponent?.costBreakdown || !activeSupplier) return activeComponent?.costBreakdown;
        const bd = activeComponent.costBreakdown;
        const f = supplierRmScaleFactor;
        const rmLeverage = activeSupplier.rmLeverageFactor ?? 1.0;

        // Scale the overhead should-cost based on supplier's specific benchmark vs a standard 15%
        const ohTargetScale = activeSupplier.overheadBenchmarkPct / 15;

        return {
            rawMaterials: {
                clientPays: bd.rawMaterials.clientPays * f,
                shouldCost: bd.rawMaterials.shouldCost * rmLeverage
            },
            conversion: {
                clientPays: bd.conversion.clientPays,
                shouldCost: bd.conversion.shouldCost
            },
            overhead: {
                clientPays: bd.overhead.clientPays,
                shouldCost: bd.overhead.shouldCost * ohTargetScale
            },
            logistics: {
                clientPays: bd.logistics.clientPays,
                shouldCost: bd.logistics.shouldCost
            },
            supplierMargin: {
                clientPays: bd.supplierMargin.clientPays,
                shouldCost: bd.supplierMargin.shouldCost
            },
        };
    }, [activeComponent, activeSupplier, supplierRmScaleFactor]);


    // Commodity data for primary commodity of active component
    const primaryCommodityData = useMemo(() => {
        if (!activeComponent) return null;
        return commodityPrices.find(c => c.commodity === activeComponent.primaryCommodity) || null;
    }, [activeComponent]);

    // ── Unit-price waterfall data (McKinsey style — range-based) ──
    const unitWaterfallData = useMemo(() => {
        if (!activeComponent || !adjustedCostBreakdown || !activeSupplier) return [];
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
            data.push({ name: b.name, label: b.label, range: [running, running + b.val], value: b.val, fill: b.fill, isTotal: false });
            running += b.val;
        }

        const totalSC = running; // should-cost total = top of all component bars

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
    }, [activeComponent, adjustedCostBreakdown, activeSupplier]);


    // ── Cost breakdown waterfall data — derived from adjusted supplier-specific data ──
    const componentCostBreakdown = useMemo(() => {
        if (!activeComponent || !adjustedCostBreakdown) return [];
        const bd = adjustedCostBreakdown;
        const uc = activeComponent.unitCurrentCost ?? 1;
        const annualUnits = uc > 0 ? activeComponent.totalSpend / uc : 0;

        const elements = [
            { name: 'Raw Mats', val: (bd.rawMaterials.shouldCost ?? 0) * annualUnits, fill: '#6366f1' },
            { name: 'Mfg', val: (bd.conversion.shouldCost ?? 0) * annualUnits, fill: '#8b5cf6' },
            { name: 'Overhead', val: (bd.overhead.shouldCost ?? 0) * annualUnits, fill: '#a855f7' },
            { name: 'Logistics', val: (bd.logistics.shouldCost ?? 0) * annualUnits, fill: '#d946ef' },
            { name: 'Margin', val: (bd.supplierMargin.shouldCost ?? 0) * annualUnits, fill: '#8b5cf6' },
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
        const totalActual = (bd.rawMaterials.clientPays + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays) * annualUnits;
        const gap = totalActual - totalSC;
        if (gap > 0) {
            data.push({ name: 'Overpay', range: [totalSC, totalActual], value: gap, fill: '#ef4444', isTotal: false, delta: gap });
        }

        return data;
    }, [activeComponent, adjustedCostBreakdown]);

    // ── Variance waterfall data — bridge from quoted total spend → should-cost total spend ──
    const componentVarianceData = useMemo(() => {
        if (!activeComponent || !adjustedCostBreakdown) return [];
        const bd = adjustedCostBreakdown;
        const uc = activeComponent.unitCurrentCost ?? 0;
        const annualUnits = uc > 0 ? activeComponent.totalSpend / uc : 1;

        const totalQuoted = (bd.rawMaterials.clientPays + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays) * annualUnits;
        const totalShouldCost = (bd.rawMaterials.shouldCost + bd.conversion.shouldCost + bd.overhead.shouldCost + bd.logistics.shouldCost + bd.supplierMargin.shouldCost) * annualUnits;

        const variances = [
            { name: 'Raw Materials', amt: (bd.rawMaterials.clientPays - bd.rawMaterials.shouldCost) * annualUnits, fill: '#10b981' },
            { name: 'Overhead', amt: (bd.overhead.clientPays - bd.overhead.shouldCost) * annualUnits, fill: '#10b981' },
            { name: 'Supplier Margin', amt: (bd.supplierMargin.clientPays - bd.supplierMargin.shouldCost) * annualUnits, fill: '#10b981' },
            { name: 'Conversion', amt: (bd.conversion.clientPays - bd.conversion.shouldCost) * annualUnits, fill: '#10b981' },
            { name: 'Logistics', amt: (bd.logistics.clientPays - bd.logistics.shouldCost) * annualUnits, fill: '#10b981' },
        ];

        variances.sort((a, b) => b.amt - a.amt);

        let running = totalQuoted;
        const data: Array<{ name: string; range: [number, number]; value: number; fill: string; isTotal: boolean; delta?: number }> = [
            { name: 'Quoted Price', range: [0, totalQuoted], value: totalQuoted, fill: '#3b82f6', isTotal: true },
        ];
        variances.forEach(v => {
            const amt = Math.max(0, v.amt);
            const newRunning = running - amt;
            data.push({ name: v.name, range: [newRunning, running], value: amt, fill: '#10b981', isTotal: false, delta: -amt });
            running = newRunning;
        });
        data.push({ name: 'Should Cost', range: [0, totalShouldCost], value: totalShouldCost, fill: '#6366f1', isTotal: true });
        return data;
    }, [activeComponent, adjustedCostBreakdown]);



    const toggleObjection = (idx: number) => {
        setExpandedObjections(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]);
    };

    const copyText = (text: string, id: string) => {
        navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleExportPDF = () => {
        window.print();
    };

    if (!activeComponent) {
        return (
            <div className="flex h-screen bg-[#09090b]">
                <Sidebar navItems={navItems} />
                <div className="flex-1 flex flex-col relative">
                    <Header breadcrumbs={['Nablon Procurement Agent', 'Negotiation Workspace']} />
                    <div className="flex-1 p-6 text-gray-400">No components found for this product.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-[#09090b]">
            <div className="print:hidden">
                <Sidebar navItems={navItems} />
            </div>
            <div className="flex-1 flex flex-col relative overflow-hidden">
                <div className="print:hidden">
                    <Header breadcrumbs={['Nablon Procurement Agent', 'Negotiation Workspace']} />
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left Sidebar: Component List */}
                    <div className="w-80 border-r border-white/10 flex flex-col bg-black/20 print:hidden">
                        <div className="p-4 border-b border-white/10">
                            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Components</h2>
                            <p className="text-xs text-gray-500 mt-1">{product.name}</p>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {productComponents.map(comp => (
                                <button
                                    key={comp.id}
                                    onClick={() => setSelectedComponentId(comp.id)}
                                    className={`w-full text-left p-4 border-b border-white/5 transition-colors hover:bg-white/5 ${selectedComponentId === comp.id ? 'bg-white/10 border-l-2 border-l-cyan-400' : 'border-l-2 border-l-transparent'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-medium text-sm truncate pr-2 ${selectedComponentId === comp.id ? 'text-white' : 'text-gray-400'}`}>{comp.name}</span>
                                        {comp.variancePercent > 15 && <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />}
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-gray-500">{comp.supplier}</span>
                                        <span className={comp.variancePercent > 0 ? "text-red-400" : "text-green-400"}>
                                            {comp.variancePercent > 0 ? '+' : ''}{comp.variancePercent}%
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Main Content: Negotiation Workspace for Active Component */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 print:hidden">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <h1 className="text-2xl font-bold text-white">{activeComponent.name}</h1>
                                    <span className={`px-2 py-0.5 rounded text-xs border ${activeComponent.variancePercent > 10 ? 'border-red-500/30 text-red-400 bg-red-500/10' : 'border-green-500/30 text-green-400 bg-green-500/10'}`}>
                                        {activeComponent.variancePercent > 10 ? 'High Variance' : 'On Target'}
                                    </span>
                                </div>
                                <p className="text-gray-400 text-sm flex items-center gap-2">
                                    <span>Supplier: {activeComponent.supplier}</span>
                                    <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                                    <span>ID: {activeComponent.id}</span>
                                </p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleExportPDF} className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-sm hover:bg-white/10 transition-colors border border-white/10 flex items-center gap-2">
                                    <Download className="w-4 h-4" /> Export PDF
                                </button>
                                <button
                                    onClick={() => setShowScript(true)}
                                    className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors border border-cyan-500/30 flex items-center gap-2"
                                >
                                    <FileText className="w-4 h-4" /> View Negotiation Script
                                </button>
                            </div>
                        </div>

                        {/* ══════════════════════════════════════════════
                            SUPPLIER COMPARISON PANEL
                        ══════════════════════════════════════════════ */}
                        {bomItem && (
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                        <span className="w-5 h-5 bg-cyan-500/20 border border-cyan-500/30 rounded flex items-center justify-center text-cyan-400 text-[10px]">↔</span>
                                        Supplier Comparison
                                    </h3>
                                    <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded border border-white/10">
                                        {bomItem.material} · {bomItem.commodityIndex}
                                    </span>
                                </div>

                                {/* Supplier Cards */}
                                <div className="grid gap-2 mb-4" style={{ gridTemplateColumns: `repeat(${bomItem.suppliers.length}, 1fr)` }}>
                                    {bomItem.suppliers.map(sup => {
                                        const isActive = sup.id === (activeSupplier?.id ?? bomItem.defaultSupplierId);
                                        const healthColor = sup.financialHealth === 'Stable' ? 'text-green-400 bg-green-500/10 border-green-500/20'
                                            : sup.financialHealth === 'Watch' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'
                                                : 'text-red-400 bg-red-500/10 border-red-500/20';
                                        const healthIcon = '';
                                        const tariffLabel = sup.importDutyPct > 0 ? `+${sup.importDutyPct}% tariff` : 'No tariff';
                                        const tariffColor = sup.importDutyPct >= 100 ? 'text-red-400' : sup.importDutyPct > 0 ? 'text-yellow-400' : 'text-green-400';
                                        const fxLabel = sup.fxMovementPct > 0 ? `FX +${sup.fxMovementPct.toFixed(1)}% unfav` : sup.fxMovementPct < 0 ? `FX ${sup.fxMovementPct.toFixed(1)}% fav` : 'FX neutral';
                                        const fxColor = sup.fxMovementPct > 2 ? 'text-red-400' : sup.fxMovementPct < -1 ? 'text-green-400' : 'text-gray-400';
                                        const landedCost = sup.pricePerUnit * (1 + sup.importDutyPct / 100);
                                        return (
                                            <button
                                                key={sup.id}
                                                onClick={() => setSelectedSupplierId(sup.id)}
                                                className={`text-left p-3 rounded-xl border transition-all duration-200 ${isActive
                                                    ? 'border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30'
                                                    : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06]'}`}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <div className="text-sm font-semibold text-white leading-tight">{sup.name}</div>
                                                        <div className="text-[10px] text-gray-400">{sup.region}</div>
                                                    </div>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${healthColor}`}>
                                                        {healthIcon} {sup.financialHealth}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1 mb-2">
                                                    <span className="text-xl font-bold text-white">${(() => {
                                                        const bd = activeComponent.costBreakdown;
                                                        const defaultSup = bomItem.suppliers.find(s => s.id === bomItem.defaultSupplierId) || bomItem.suppliers[0];
                                                        const scaleFactor = defaultSup.pricePerUnit > 0 ? sup.pricePerUnit / defaultSup.pricePerUnit : 1;
                                                        return (bd.rawMaterials.clientPays * scaleFactor + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays).toFixed(3);
                                                    })()}</span>
                                                    <span className="text-[10px] text-gray-400">/unit quoted</span>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-[10px]">
                                                        <span className="text-gray-400">Target SC</span>
                                                        <span className="text-green-400 font-bold">${(() => {
                                                            const rmSC = activeComponent.costBreakdown.rawMaterials.shouldCost * (sup.rmLeverageFactor ?? 1);
                                                            // Target SC includes tariff on raw materials
                                                            const tariffOnSC = rmSC * (sup.importDutyPct / 100);
                                                            return (
                                                                rmSC +
                                                                activeComponent.costBreakdown.conversion.shouldCost +
                                                                activeComponent.costBreakdown.overhead.shouldCost * (sup.overheadBenchmarkPct / 15) +
                                                                activeComponent.costBreakdown.logistics.shouldCost +
                                                                activeComponent.costBreakdown.supplierMargin.shouldCost +
                                                                tariffOnSC
                                                            ).toFixed(3);
                                                        })()}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <div className={`text-[9px] font-medium ${tariffColor}`}>{tariffLabel}</div>
                                                        <div className={`text-[9px] ${fxColor}`}>{fxLabel}</div>
                                                    </div>
                                                    <div className="flex items-center gap-1 mt-1">
                                                        <div className="flex-1 h-1 bg-white/10 rounded-full">
                                                            <div className="h-1 rounded-full bg-cyan-500/60" style={{ width: `${sup.scaleScore * 100}%` }} />
                                                        </div>
                                                        <span className="text-[9px] text-gray-500">Scale {Math.round(sup.scaleScore * 100)}%</span>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Financial Signal for active supplier */}
                                {activeSupplier && (
                                    <div className={`rounded-lg p-3 border text-xs ${activeSupplier.financialHealth === 'Stable' ? 'bg-green-500/5 border-green-500/20 text-green-300'
                                        : activeSupplier.financialHealth === 'Watch' ? 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300'
                                            : 'bg-red-500/5 border-red-500/20 text-red-300'
                                        }`}>
                                        <span className="font-semibold text-white mr-2">D&B Signal — {activeSupplier.name}:</span>
                                        {activeSupplier.financialSignal}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ══════════════════════════════════════════════
                            UNIT PRICE WATERFALL
                        ══════════════════════════════════════════════ */}
                        {adjustedCostBreakdown && unitWaterfallData.length > 0 && activeSupplier && (() => {
                            const bd = adjustedCostBreakdown;
                            // clientPays values already represent the landed cost the buyer pays, so no tariff multiplier needed
                            const totalActual = bd.rawMaterials.clientPays + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays;
                            // Should-cost total = sum of all component bars (shouldCost values + tariff on shouldCost)
                            const scEntry = unitWaterfallData.find(d => d.name === 'Should Cost');
                            const totalSC = scEntry ? scEntry.value : 0;
                            const gap = totalActual - totalSC;
                            const fmtUnit = (v: number) => `$${v.toFixed(3)}`;
                            return (
                                <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h2 className="text-sm font-semibold text-white">{activeComponent.name} — Unit Price Build-Up</h2>
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
                                                            <p style={{ color: d.fill }}>{fmtUnit(d.value)}/unit</p>
                                                            {!d.isTotal && <p className="text-gray-500 mt-0.5">Running total: {fmtUnit(d.range[1])}/unit</p>}
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
                                                                {fmtUnit(entry.value)}
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
                                        <span>Landed unit price: <span className="text-white font-semibold">{fmtUnit(totalActual)}</span></span>
                                        <span>Should-cost unit: <span className="text-emerald-400 font-semibold">{fmtUnit(totalSC)}</span></span>
                                        <span>Overpay gap: <span className="text-red-400 font-semibold">{fmtUnit(gap)}</span></span>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ══════════════════════════════════════════════
                            AGENT REASONING CHAIN
                        ══════════════════════════════════════════════ */}
                        {activeComponent && activeComponent.costBreakdown && activeSupplier && (() => {
                            const bd = adjustedCostBreakdown ?? activeComponent.costBreakdown;
                            const uc = activeComponent.unitCurrentCost ?? 1;
                            const annualUnits = uc > 0 ? activeComponent.totalSpend / uc : 0;

                            // Supplier-adjusted totals (include tariff in should-cost so overpay = current quote − full landed SC)
                            const adjUnitActual = bd.rawMaterials.clientPays + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays;
                            const tariffOnSC = bd.rawMaterials.shouldCost * (activeSupplier.importDutyPct / 100);
                            const adjUnitSC = bd.rawMaterials.shouldCost + bd.conversion.shouldCost + bd.overhead.shouldCost + bd.logistics.shouldCost + bd.supplierMargin.shouldCost + tariffOnSC;
                            const adjVariancePct = adjUnitSC > 0 ? ((adjUnitActual - adjUnitSC) / adjUnitSC * 100) : 0;
                            const adjTotalAnnualGap = (adjUnitActual - adjUnitSC) * annualUnits;

                            const commPricePct = primaryCommodityData
                                ? ((primaryCommodityData.history[primaryCommodityData.history.length - 1].price - primaryCommodityData.history[0].price) / primaryCommodityData.history[0].price * 100)
                                : 0;
                            const ovhBenchmark = activeSupplier.overheadBenchmarkPct;

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

                            return (
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5 shadow-lg">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                                            <Sparkles className="w-4 h-4 text-purple-400" />
                                            Agent Reasoning Trace — Supplier Intelligence
                                        </h3>
                                        <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 px-2 py-1 rounded-full flex items-center gap-1">
                                            <div className="w-1 h-1 rounded-full bg-purple-400 animate-pulse" />
                                            Scale-Aware Mode · {activeSupplier.name}
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
                                                {primaryCommodityData ? (
                                                    <p className="text-sm text-gray-300 leading-relaxed">
                                                        <span className="text-white font-medium">{activeComponent.primaryCommodity} spot price</span> has <span className="text-green-400">decreased {Math.abs(commPricePct).toFixed(1)}%</span> since contract signing — strengthening our negotiation position on raw material costs. Additionally, bulk order volumes qualify for volume-tier discounts, providing further leverage to push unit pricing down.
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
                                                <div className="text-xs font-semibold text-purple-400 mb-1">
                                                    <span>Overhead Benchmark Check</span>
                                                </div>
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    {activeSupplier.name}'s overhead benchmark ({ovhBenchmark}%) is{' '}
                                                    {ovhBenchmark > 16 ? (
                                                        <>above the <span className="text-white font-medium">scale-adjusted target</span> of <span className="text-green-400">13%</span>. Excess ≈ <span className="text-orange-400 font-bold">{formatCurrency((bd.overhead.clientPays - bd.overhead.shouldCost) * annualUnits)}/yr</span>. Flagged as negotiable lever.</>
                                                    ) : (
                                                        <>competitive relative to <span className="text-white font-medium">scale-adjusted benchmark</span> ({ovhBenchmark}%). Focus negotiation on RM and margin gaps.</>
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
                                                    D&B reports <span className="text-white font-medium">{activeSupplier.name}</span> operating margin at <span className="text-cyan-400 font-bold">11.8%</span>, yet at our current pricing they earn an implied{' '}
                                                    <span className="text-orange-400 font-bold">{(() => { const rev = adjUnitActual - bd.logistics.clientPays; const cogs = bd.rawMaterials.shouldCost + bd.conversion.shouldCost + bd.overhead.shouldCost; return rev > 0 ? ((rev - cogs) / rev * 100).toFixed(0) : '—'; })()}%</span>{' '}
                                                    margin on our account — roughly 3–4× their reported norm.{' '}
                                                    Current quoted pricing is <span className="text-orange-400 font-bold">{adjVariancePct.toFixed(1)}%</span> above should-cost.{' '}
                                                    Total annual overpay = <span className="text-orange-400 font-bold">{formatCurrency(adjTotalAnnualGap)}</span>.
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 4: Tariff & FX */}
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-7 h-7 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0 ${hasTariff ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : 'bg-green-500/20 border-green-500/30 text-green-400'}`}>4</div>
                                                <div className="w-px flex-1 bg-white/10 mt-1" />
                                            </div>
                                            <div className="pb-3">
                                                <div className={`text-xs font-semibold mb-1 ${hasTariff ? 'text-rose-400' : 'text-green-400'}`}>{hasTariff ? 'Tariff & FX Exposure Flagged' : 'Tariff & FX Assessment'}</div>
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    {hasTariff
                                                        ? `${tariffReg}-origin supplier carries a ${tariffPct}% US import duty. Landed cost is effectively ${landedUplift}% higher than unit price. ${fxMove < -3 ? `Additionally, ${tariffReg} currency depreciated ${Math.abs(fxMove).toFixed(1)}% YTD — creating more headroom.` : 'FX movement is minimal.'}`
                                                        : `${tariffReg}-origin supplier: no US import duties apply. ${fxMove < -3 ? `Note: ${tariffReg} currency depreciated ${Math.abs(fxMove).toFixed(1)}% YTD — this reduces supplier's real cost base.` : 'FX movement is minimal.'}`}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Step 5: Financial Health */}
                                        <div className="flex gap-3">
                                            <div className="flex flex-col items-center">
                                                <div className={`w-7 h-7 rounded-full border text-[11px] font-bold flex items-center justify-center shrink-0 ${healthBgClass} ${healthColorClass}`}>5</div>
                                                <div className="w-px flex-1 bg-white/10 mt-1" />
                                            </div>
                                            <div className="pb-3">
                                                <div className={`text-xs font-semibold mb-1 ${healthColorClass}`}>Supplier Financial Health: {health}</div>
                                                <p className="text-sm text-gray-300 leading-relaxed">
                                                    {activeSupplier.name} is rated <span className={`font-bold ${healthColorClass}`}>{health}</span> with a well-diversified customer base and solid cash flow.{' '}
                                                    {health === 'Stable' && 'No immediate financial distress signals — supplier is unlikely to concede on price without structured leverage (volume commitments, multi-year terms).'}
                                                    {health === 'Watch' && 'Revenue or margin under pressure — open to multi-year volume commitment in exchange for a price reduction.'}
                                                    {health === 'Stressed' && 'Under significant margin pressure — highly likely to accept below-market pricing to secure volume and cash flow.'}
                                                </p>
                                                <p className="text-sm text-gray-300 leading-relaxed mt-2">
                                                    <span className="text-white font-medium">Negotiation implication:</span> {healthImplication[health]}
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
                                                        const adjBd = adjustedCostBreakdown ?? activeComponent.costBreakdown;
                                                        const targetUnit = adjBd.rawMaterials.shouldCost + adjBd.conversion.shouldCost + adjBd.overhead.shouldCost + adjBd.logistics.shouldCost + adjBd.supplierMargin.shouldCost;
                                                        const walkAway = targetUnit * 1.05;
                                                        return (
                                                            <p className="text-sm text-gray-200 leading-relaxed">
                                                                <span className="text-white font-semibold">Open targeted re-negotiation</span> citing commodity index decline + overhead benchmark.{' '}
                                                                {/* Target: <span className="text-green-400 font-bold">${targetUnit.toFixed(3)}/unit</span>.{' '} */}
                                                                {/* Walk-away: <span className="text-yellow-400 font-bold">${walkAway.toFixed(3)}/unit</span>. */}
                                                            </p>
                                                        );
                                                    })()}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}

                        {/* ═══ WATERFALL CHARTS ═══ */}
                        <div className="hidden grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Cost Breakdown Waterfall */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> Cost Breakdown
                                </h3>
                                <p className="text-[11px] text-gray-500 mb-3">Should-cost element build-up for {activeComponent.name}</p>
                                <ResponsiveContainer width="100%" height={260}>
                                    <ComposedChart data={componentCostBreakdown} barSize={42} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} interval={0} height={60} />
                                        <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
                                        <Tooltip
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            content={({ payload, label }: any) => {
                                                if (!payload?.length) return null;
                                                const entry = componentCostBreakdown.find(d => d.name === label);
                                                if (!entry) return null;
                                                const total = entry.range[1];
                                                return (
                                                    <div className="bg-[#1f1f23] border border-white/10 rounded-lg px-3 py-2 shadow-2xl backdrop-blur-md">
                                                        <p className="text-gray-400 text-[10px] uppercase font-bold mb-1 tracking-wider">{label}</p>
                                                        <p className="text-white font-bold text-sm">{formatCurrency(total)}</p>
                                                        {!entry.isTotal && entry.name !== 'Overpay' && <p className="text-cyan-400 text-[10px]">Component increment</p>}
                                                        {entry.name === 'Overpay' && <p className="text-red-400 text-[10px]">Inefficiency gap</p>}
                                                    </div>
                                                );
                                            }}
                                        />
                                        <Bar dataKey="range" radius={[4, 4, 0, 0]}>
                                            {componentCostBreakdown.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                            <LabelList
                                                dataKey="value"
                                                position="top"
                                                content={({ x, y, width, index }: any) => {
                                                    const entry = componentCostBreakdown[index];
                                                    return (
                                                        <text x={(x as number) + (width as number) / 2} y={(y as number) - 10} fill="#ffffff" fontSize={11} fontWeight="700" textAnchor="middle">
                                                            {formatCurrency(entry.value)}
                                                        </text>
                                                    );
                                                }}
                                            />
                                        </Bar>
                                        {(() => {
                                            const scEntry = componentCostBreakdown.find(d => d.name === 'Should Cost');
                                            return scEntry ? (
                                                <ReferenceLine
                                                    y={scEntry.value}
                                                    stroke="#10b981"
                                                    strokeDasharray="5 5"
                                                    strokeWidth={1.5}
                                                    label={{ position: 'right', value: 'Should-Cost Target', fill: '#10b981', fontSize: 10, fontWeight: '700' }}
                                                />
                                            ) : null;
                                        })()}
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Variance Bridge Waterfall */}
                            {componentVarianceData.length > 0 && (
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                                            <TrendingUp className="w-4 h-4 text-green-400" /> Negotiation Variance
                                        </h3>
                                        <span className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-full font-medium">
                                            {formatCurrency(activeComponent.currentCost - activeComponent.shouldCost)} gap
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-gray-500 mb-3">Bridge from quoted price to should-cost &mdash; key levers to negotiate</p>
                                    <ResponsiveContainer width="100%" height={260}>
                                        <ComposedChart data={componentVarianceData} barSize={42} margin={{ top: 30, right: 30, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 500 }} axisLine={false} tickLine={false} interval={0} height={60} />
                                            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCurrency(v)} />
                                            <Tooltip
                                                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                                content={({ payload, label }: any) => {
                                                    if (!payload?.length) return null;
                                                    const entry = componentVarianceData.find(d => d.name === label);
                                                    if (!entry) return null;
                                                    return (
                                                        <div className="bg-[#1f1f23] border border-white/10 rounded-lg px-3 py-2 shadow-2xl backdrop-blur-md">
                                                            <p className="text-gray-400 text-[10px] uppercase font-bold mb-1 tracking-wider">{label}</p>
                                                            {entry.delta && <p className="text-green-400 text-xs font-bold">↓ {formatCurrency(Math.abs(entry.delta))}</p>}
                                                            <p className="text-white font-bold text-sm">{formatCurrency(entry.range[1])}</p>
                                                        </div>
                                                    );
                                                }}
                                            />
                                            <Bar dataKey="range" radius={[4, 4, 0, 0]}>
                                                {componentVarianceData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                                <LabelList
                                                    dataKey="value"
                                                    position="top"
                                                    content={({ x, y, width, index }: any) => {
                                                        const entry = componentVarianceData[index];
                                                        return (
                                                            <text x={(x as number) + (width as number) / 2} y={(y as number) - 10} fill={entry.isTotal ? "#ffffff" : "#10b981"} fontSize={10} fontStyle={entry.isTotal ? "normal" : "italic"} fontWeight="700" textAnchor="middle">
                                                                {entry.isTotal ? formatCurrency(entry.value) : `-${formatCurrency(entry.value)}`}
                                                            </text>
                                                        );
                                                    }}
                                                />
                                            </Bar>
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                    {/* Variance legend */}
                                    <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t border-white/10">
                                        {componentVarianceData.filter(d => d.name !== 'Quoted Price' && d.name !== 'Should-Cost').map((item, i) => (
                                            <div key={i} className="text-center p-1.5 rounded-lg bg-white/[0.03]">
                                                <div className="w-2.5 h-2.5 rounded-full mx-auto mb-1" style={{ backgroundColor: item.fill }} />
                                                <div className="text-[9px] text-gray-500">{item.name}</div>
                                                <div className="text-xs font-bold text-green-400">-{formatCurrency(item.value)}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* ═══ NEGOTIATION LEVERS TABLE ═══ */}
                        {activeComponent && adjustedCostBreakdown && (() => {
                            const bd = adjustedCostBreakdown;
                            const uc = activeComponent.unitCurrentCost ?? 1;
                            const annualUnits = uc > 0 ? activeComponent.totalSpend / uc : 0;
                            const rows = [
                                { label: 'Raw Materials', fill: '#64748b', ...bd.rawMaterials },
                                { label: 'Conversion', fill: '#94a3b8', ...bd.conversion },
                                { label: 'Overhead', fill: '#cbd5e1', ...bd.overhead },
                                { label: 'Logistics', fill: '#94a3b8', ...bd.logistics },
                                { label: 'Supplier Margin', fill: '#64748b', ...bd.supplierMargin },
                            ].sort((a, b) => (b.clientPays - b.shouldCost) - (a.clientPays - a.shouldCost));
                            const totalGapUnit = rows.reduce((s, r) => s + (r.clientPays - r.shouldCost), 0);
                            const annualSavings = totalGapUnit * annualUnits;
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
                                            <div className="text-xl font-bold text-green-400">
                                                {formatCurrency(totalGapUnit)}
                                                <span className="text-xs font-normal text-gray-500 ml-1">/ unit</span>
                                            </div>
                                            <div className="text-[10px] text-gray-500">
                                                ≈ {formatCurrency(annualSavings)} annual at volume
                                            </div>
                                        </div>
                                    </div>

                                    {/* Headers */}
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
                                                    className={`grid grid-cols-[1fr_100px_100px_90px_130px] gap-3 items-center px-3 py-2.5 rounded-lg transition-all ${isTopLever ? 'bg-white/[0.07] border border-white/10' : 'hover:bg-white/[0.04]'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: row.fill }} />
                                                        <span className="text-sm font-medium text-white">{row.label}</span>
                                                        {isTopLever && (
                                                            <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                                                                Top Lever
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-right font-mono text-sm text-red-300">{formatCurrency(row.clientPays)}</div>
                                                    <div className="text-right font-mono text-sm text-cyan-400">{formatCurrency(row.shouldCost)}</div>
                                                    <div className="text-right font-mono text-sm font-bold text-green-400">
                                                        {delta > 0.001 ? `+${formatCurrency(delta)}` : <span className="text-gray-500">—</span>}
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

                                    {/* Totals */}
                                    <div className="grid grid-cols-[1fr_100px_100px_90px_130px] gap-3 items-center px-3 py-2.5 mt-2 pt-3 border-t border-white/10">
                                        <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Total / Unit</span>
                                        <div className="text-right font-mono text-sm font-bold text-red-300">
                                            {formatCurrency(rows.reduce((s, r) => s + r.clientPays, 0))}
                                        </div>
                                        <div className="text-right font-mono text-sm font-bold text-cyan-400">
                                            {formatCurrency(rows.reduce((s, r) => s + r.shouldCost, 0))}
                                        </div>
                                        <div className="text-right font-mono text-sm font-bold text-green-400">
                                            +{formatCurrency(totalGapUnit)}
                                        </div>
                                        <div className="text-[10px] text-gray-500 italic">← per unit impact</div>
                                    </div>
                                </div>
                            );
                        })()}

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Fact Pack */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Component Fact Pack</h3>

                                <div className="space-y-5">
                                    <div>
                                        <h4 className="text-xs font-bold text-cyan-400 uppercase mb-2">Cost Breakdown</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-400">Current Price (Quoted):</span><span className="text-white font-medium">{formatCurrency(activeComponent.currentCost)}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-400">Should-Cost Model:</span><span className="text-green-400 font-medium">{formatCurrency(activeComponent.shouldCost)}</span></div>
                                            <div className="flex justify-between"><span className="text-gray-400">Gap / Savings Opp:</span><span className="text-red-400 font-medium">{formatCurrency(activeComponent.currentCost - activeComponent.shouldCost)} ({activeComponent.variancePercent}%)</span></div>
                                        </div>
                                    </div>

                                    <div className="border-t border-white/10 pt-4">
                                        <h4 className="text-xs font-bold text-cyan-400 uppercase mb-2">Supplier Performance</h4>
                                        <div className="space-y-1 text-sm">
                                            <div className="flex justify-between"><span className="text-gray-400">Quality Score:</span><span className="text-white font-medium">98.5% (A)</span></div>
                                            <div className="flex justify-between"><span className="text-gray-400">On-Time Delivery:</span><span className="text-yellow-400 font-medium">92% (Risk)</span></div>
                                            <div className="flex justify-between"><span className="text-gray-400">Spend Category:</span><span className="text-white font-medium">{activeComponent.category || 'Direct Material'}</span></div>
                                        </div>
                                    </div>

                                    <div className="border-t border-white/10 pt-4">
                                        <h4 className="text-xs font-bold text-cyan-400 uppercase mb-3">Market Intelligence & Alternates</h4>
                                        <div className="space-y-3">
                                            {(() => {
                                                // Get all alternative suppliers (exclude the currently active one)
                                                const alternativeSuppliers = bomItem?.suppliers.filter(s => s.id !== activeSupplier?.id) || [];
                                                
                                                // Calculate price range from all suppliers
                                                const allPrices = bomItem?.suppliers.map(sup => {
                                                    const bd = activeComponent.costBreakdown;
                                                    const defaultSup = bomItem.suppliers.find(s => s.id === bomItem.defaultSupplierId) || bomItem.suppliers[0];
                                                    const scaleFactor = defaultSup.pricePerUnit > 0 ? sup.pricePerUnit / defaultSup.pricePerUnit : 1;
                                                    return bd.rawMaterials.clientPays * scaleFactor + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays;
                                                }) || [];
                                                
                                                const minPrice = Math.min(...allPrices);
                                                const maxPrice = Math.max(...allPrices);
                                                
                                                return (
                                                    <>
                                                        <div className="flex justify-between text-sm mb-2">
                                                            <span className="text-gray-400">Market Price Range:</span>
                                                            <span className="text-white font-medium">{formatCurrency(minPrice * activeComponent.totalSpend / activeComponent.unitCurrentCost)} - {formatCurrency(maxPrice * activeComponent.totalSpend / activeComponent.unitCurrentCost)}</span>
                                                        </div>

                                                        <div className="bg-white/5 rounded-lg p-3 space-y-3">
                                                            {alternativeSuppliers.map((sup, i) => {
                                                                const bd = activeComponent.costBreakdown;
                                                                const defaultSup = bomItem.suppliers.find(s => s.id === bomItem.defaultSupplierId) || bomItem.suppliers[0];
                                                                const scaleFactor = defaultSup.pricePerUnit > 0 ? sup.pricePerUnit / defaultSup.pricePerUnit : 1;
                                                                const unitQuote = bd.rawMaterials.clientPays * scaleFactor + bd.conversion.clientPays + bd.overhead.clientPays + bd.logistics.clientPays + bd.supplierMargin.clientPays;
                                                                const annualQuote = unitQuote * (activeComponent.totalSpend / activeComponent.unitCurrentCost);
                                                                
                                                                // Calculate quality score based on scale score and financial health
                                                                const healthScore = sup.financialHealth === 'Stable' ? 100 : sup.financialHealth === 'Watch' ? 94 : 88;
                                                                const qualScore = Math.round((sup.scaleScore * 0.7 + (healthScore / 100) * 0.3) * 100);
                                                                const qualGrade = qualScore >= 95 ? 'A' : qualScore >= 90 ? 'A-' : qualScore >= 85 ? 'B+' : 'B';
                                                                
                                                                return (
                                                                    <div key={sup.id} className="flex items-center justify-between text-xs border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                                                        <div>
                                                                            <div className="text-white font-medium">{sup.name}</div>
                                                                            <div className="text-gray-500">{sup.region} • Qual: {qualScore}% ({qualGrade})</div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <div className="text-cyan-400 font-medium">{formatCurrency(annualQuote)}</div>
                                                                            <div className="text-gray-500">
                                                                                {((annualQuote - activeComponent.shouldCost) / activeComponent.shouldCost * 100).toFixed(1)}% vs Should-Cost
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="text-xs text-gray-400 italic mt-2">
                                                            *Quotes valid for 30 days. {alternativeSuppliers[0]?.importDutyPct === 0 ? `${alternativeSuppliers[0]?.name} has no import duty advantage.` : 'Price includes applicable import duties.'}
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Strategy + Objections */}
                            <div className="space-y-6">
                                {/* Strategy */}
                                <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-6">
                                    <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-wider mb-4">Negotiation Strategy</h3>

                                    <div className="grid grid-cols-3 gap-3 mb-5">
                                        <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                                            <p className="text-xs text-gray-500 mb-1">Opening</p>
                                            <p className="text-xl font-bold text-green-400">{formatCurrency(activeComponent.shouldCost * 1.02)}</p>
                                        </div>
                                        <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                                            <p className="text-xs text-gray-500 mb-1">Target</p>
                                            <p className="text-xl font-bold text-cyan-400">{formatCurrency(activeComponent.shouldCost * 1.05)}</p>
                                        </div>
                                        <div className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                                            <p className="text-xs text-gray-500 mb-1">Walk-Away</p>
                                            <p className="text-xl font-bold text-red-400">{formatCurrency(activeComponent.currentCost * 0.98)}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 text-sm text-gray-300">
                                        <div>
                                            <h4 className="text-xs font-bold text-white uppercase mb-1">Key Leverage</h4>
                                            <ul className="list-disc list-inside space-y-1 text-gray-400">
                                                <li>Should-cost analysis highlights <span className="text-white">materials</span> as main variance driver.</li>
                                                <li>Supplier has <span className="text-yellow-400">delivery risks</span> (92% OTD); use annual volume as leverage for priority.</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                {/* Objection Playbook */}
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Objection Playbook</h3>
                                    <div className="space-y-2">
                                        {objections.map((obj, idx) => (
                                            <div key={idx} className="border border-white/10 rounded-lg overflow-hidden">
                                                <button onClick={() => toggleObjection(idx)} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-left text-white hover:bg-white/5 transition-colors">
                                                    {expandedObjections.includes(idx) ? <ChevronDown className="w-4 h-4 text-cyan-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />}
                                                    <span>{obj.q}</span>
                                                </button>
                                                {expandedObjections.includes(idx) && (
                                                    <div className="px-4 pb-4 pt-0">
                                                        <p className="text-sm text-gray-300 bg-white/5 p-3 rounded-lg">{obj.a}</p>
                                                        <button
                                                            onClick={() => copyText(obj.a, `obj-${idx}`)}
                                                            className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-cyan-400 transition-colors"
                                                        >
                                                            {copied === `obj-${idx}` ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy response</>}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Script Modal */}
                    {showScript && (
                        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 print:p-0 print:bg-white print:fixed print:inset-0 print:z-[100] print:block">
                            <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl print:shadow-none print:border-none print:w-full print:max-w-none print:max-h-none print:h-auto print:bg-white print:text-black overflow-hidden hover:shadow-[0_0_50px_rgba(34,211,238,0.1)] transition-shadow duration-500">
                                {/* Header */}
                                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/[0.02] print:hidden">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/20">
                                            <BookOpen className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                                Negotiation Playbook
                                                <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 font-medium uppercase tracking-wider">
                                                    Generated by AI
                                                </span>
                                            </h2>
                                            <p className="text-sm text-gray-400 flex items-center gap-2">
                                                <span>Strategy: <span className="text-gray-300">Collaborative Partnership</span></span>
                                                <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                                <span>Focus: <span className="text-gray-300">Data-Backed Leverage</span></span>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleExportPDF}
                                            className="px-4 py-2 bg-white/5 text-gray-300 rounded-lg text-sm hover:bg-white/10 hover:text-white transition-colors flex items-center gap-2 border border-white/5"
                                        >
                                            <Printer className="w-4 h-4" /> Export Plan
                                        </button>
                                        <button
                                            onClick={() => setShowScript(false)}
                                            className="p-2 bg-white/5 text-gray-400 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors border border-white/5"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Print Header (only visible when printing) */}
                                <div className="hidden print:block p-8 border-b border-gray-200 mb-6">
                                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Negotiation Playbook</h1>
                                    <h2 className="text-xl text-gray-600">{activeComponent.name} — {activeComponent.supplier}</h2>
                                    <p className="text-sm text-gray-500 mt-2">Generated by Nablon Procurement Agent • {new Date().toLocaleDateString()}</p>
                                </div>

                                <div className="flex-1 overflow-y-auto font-['Jost'] text-base print:text-black print:overflow-visible">
                                    <div className="p-8 max-w-4xl mx-auto space-y-12">

                                        {/* Phase 1: Opening */}
                                        <div className="relative pl-8 border-l-2 border-cyan-500/20 print:border-l-gray-300">
                                            <div className="absolute -left-[25px] top-0 w-12 h-12 rounded-full bg-[#18181b] border-4 border-[#18181b] flex items-center justify-center print:bg-white">
                                                <div className="w-10 h-10 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 print:border-gray-300 print:text-gray-700">
                                                    <MessageSquare className="w-5 h-5" />
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2 print:text-black">
                                                    Phase 1: The Opening
                                                    <span className="text-xs font-normal text-cyan-400 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">Est. 5 mins</span>
                                                </h3>
                                                <p className="text-sm text-gray-400 mt-1 print:text-gray-600">Establish professional tone and anchor the conversation with data.</p>
                                            </div>

                                            <div className="bg-gradient-to-br from-cyan-500/5 to-blue-500/5 border border-cyan-500/20 rounded-xl p-6 relative group hover:border-cyan-500/40 transition-colors print:bg-gray-50 print:border-gray-200">
                                                <Quote className="absolute top-4 right-4 w-10 h-10 text-cyan-500/10 rotate-180 print:text-gray-200" />
                                                <div className="space-y-4 relative z-10">
                                                    <p className="text-gray-300 leading-relaxed print:text-gray-800">
                                                        "Good morning, [Name]. We value our partnership on the <strong className="text-white font-medium print:text-black">{product.name}</strong> line. However, in reviewing our category spend, we see a disconnection on the <strong className="text-white font-medium print:text-black">{activeComponent.name}</strong> pricing."
                                                    </p>
                                                    <p className="text-gray-300 leading-relaxed print:text-gray-800">
                                                        "Your quote sits at <strong className="text-white font-medium print:text-black">{formatCurrency(activeComponent.currentCost)}</strong>, but our clean-sheet analysis—based on current commodity indices—indicates a fair market value closer to <strong className="text-cyan-400 font-bold print:text-black">{formatCurrency(activeComponent.shouldCost)}</strong>."
                                                    </p>
                                                </div>
                                                <div className="mt-4 pt-4 border-t border-cyan-500/10 flex items-center gap-2 text-xs text-cyan-400/80 font-medium print:hidden">
                                                    <Sparkles className="w-3 h-3" /> Tip: Pause here. Let them fill the silence.
                                                </div>
                                            </div>
                                        </div>

                                        {/* Phase 2: Counter & Defend */}
                                        <div className="relative pl-8 border-l-2 border-yellow-500/20 print:border-l-gray-300">
                                            <div className="absolute -left-[25px] top-0 w-12 h-12 rounded-full bg-[#18181b] border-4 border-[#18181b] flex items-center justify-center print:bg-white">
                                                <div className="w-10 h-10 rounded-full bg-yellow-500/20 border border-yellow-500/40 flex items-center justify-center text-yellow-400 print:border-gray-300 print:text-gray-700">
                                                    <ShieldAlert className="w-5 h-5" />
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2 print:text-black">
                                                    Phase 2: Objection Handling
                                                    <span className="text-xs font-normal text-yellow-400 px-2 py-0.5 rounded-full bg-yellow-500/10 border border-yellow-500/20">Dynamic</span>
                                                </h3>
                                                <p className="text-sm text-gray-400 mt-1 print:text-gray-600">Anticipate pushback and pivot back to value.</p>
                                            </div>

                                            <div className="grid grid-cols-1 gap-4">
                                                {objections.map((obj, i) => (
                                                    <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/[0.07] transition-colors print:border-gray-200">
                                                        <div className="flex items-start gap-3">
                                                            <div className="mt-1 w-1.5 h-1.5 rounded-full bg-red-400 shrink-0" />
                                                            <div>
                                                                <p className="text-sm font-medium text-red-300 mb-2 print:text-red-700">They Say: {obj.q}</p>
                                                                <div className="flex items-start gap-3">
                                                                    <ArrowRight className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                                                                    <p className="text-sm text-gray-300 leading-relaxed print:text-gray-800">{obj.a}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Phase 3: The Close */}
                                        <div className="relative pl-8 border-l-2 border-green-500/20 print:border-l-gray-300">
                                            <div className="absolute -left-[25px] top-0 w-12 h-12 rounded-full bg-[#18181b] border-4 border-[#18181b] flex items-center justify-center print:bg-white">
                                                <div className="w-10 h-10 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center text-green-400 print:border-gray-300 print:text-gray-700">
                                                    <Handshake className="w-5 h-5" />
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h3 className="text-lg font-bold text-white flex items-center gap-2 print:text-black">
                                                    Phase 3: The Close
                                                    <span className="text-xs font-normal text-green-400 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">Action</span>
                                                </h3>
                                                <p className="text-sm text-gray-400 mt-1 print:text-gray-600">Lock in the agreement with mutual benefit.</p>
                                            </div>

                                            <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-6 print:bg-gray-50 print:border-gray-200">
                                                <p className="text-lg text-white font-medium mb-4 print:text-black">The Proposal:</p>
                                                <p className="text-gray-300 leading-relaxed mb-6 print:text-gray-800">
                                                    "We can agree to <strong className="text-white print:text-black">{formatCurrency(activeComponent.shouldCost * 1.05)}</strong> today. This ensures a healthy margin for you, and we commit to full volume for 12 months."
                                                </p>
                                                <div className="flex items-center gap-4 pt-4 border-t border-green-500/10">
                                                    <div className="flex-1">
                                                        <p className="text-xs text-green-400 uppercase tracking-wider font-bold mb-1">Target Price</p>
                                                        <p className="text-2xl font-bold text-white print:text-black">{formatCurrency(activeComponent.shouldCost * 1.05)}</p>
                                                    </div>
                                                    <div className="w-px h-10 bg-green-500/20" />
                                                    <div className="flex-1">
                                                        <p className="text-xs text-gray-400 uppercase tracking-wider font-bold mb-1">Volume Commitment</p>
                                                        <p className="text-xl font-bold text-white print:text-black">100% Share</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="h-8" /> {/* Spacer */}
                                    </div>
                                </div>

                                <div className="p-6 border-t border-white/10 flex justify-end bg-white/[0.02] print:hidden">
                                    <button
                                        onClick={() => setShowScript(false)}
                                        className="px-6 py-2.5 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors shadow-lg shadow-white/5"
                                    >
                                        Close Playbook
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

export default NegotiationWorkspace;
