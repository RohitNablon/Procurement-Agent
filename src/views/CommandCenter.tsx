import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { KPICard } from '../components/KPICard';
import { ActivityFeed } from '../components/ActivityFeed';
import { DollarSign, AlertCircle, Target, X, ChevronLeft, ChevronRight, Clock, ArrowRight } from 'lucide-react';
import { navItems } from '../data/navItems';
import componentsData from '../data/components.json';
import agentActivity from '../data/agent-activity.json';
import { useProduct } from '../context/ProductContext';
import { products } from '../data/products';
import type { Product } from '../data/products';
import {
    ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, LabelList, Cell,
} from 'recharts';

interface Component {
    id: string;
    name: string;
    totalSpend: number;
    shouldCost: number;
    variance: number;
    variancePercent: number;
    supplier: string;
    agentStatus: string;
    riskLevel: string;
    bomItemId?: string;
    primaryCommodity?: string;
    contractSignedDate?: string;
}

// ── Insight shape ──────────────────────────────────────────────────────────
interface Insight {
    id: string;
    compId: string;
    compName: string;
    supplier: string;
    savingsPct: string;
    savingsAbs: string;
    severity: 'red' | 'yellow' | 'cyan';
    severityLabel: string;
    summary: string;
    timestamp: Date;
    // Trace steps surfaced in the modal
    trace: { step: number; label: string; color: string; detail: string }[];
    // Data sources used (API mimicry)
    sources: string[];
}

// Build a rich insight from a component — sources and tariff step are derived
// from real supplier data for that component's BOM item
function buildInsight(c: Component, now: Date, offsetMs = 0, product?: Product): Insight {
    const isHigh = c.variancePercent > 20;
    const isElev = c.variancePercent > 10;
    const severity = isHigh ? 'red' : isElev ? 'yellow' : 'cyan';
    const savingsAbs = ((c.totalSpend - c.shouldCost) / 1_000_000).toFixed(2);
    const savingsPct = Math.min(c.variancePercent, 30).toFixed(1);
    const ts = new Date(now.getTime() - offsetMs);

    // Look up the BOM item for this component to get real supplier data
    const bomItem = product?.bom.find(b => b.id === c.bomItemId);
    const defSupplier = bomItem?.suppliers.find(s => s.id === bomItem.defaultSupplierId)
        ?? bomItem?.suppliers[0];

    // Tariff-aware values
    const tariffPct = defSupplier?.importDutyPct ?? 0;
    const tariffReg = defSupplier?.region ?? 'the supplier region';
    const hasTariff = tariffPct > 0;
    const fxMove = defSupplier?.fxMovementPct ?? 0;
    const commodity = c.primaryCommodity ?? 'raw materials';

    // Component-specific data sources derived from supplier region + commodity
    const regionSourceMap: Record<string, string> = {
        'China': 'SHFE Commodity Exchange',
        'Japan': 'TOCOM / TSE Metals Index',
        'Korea': 'KITA Trade Intelligence',
        'Taiwan': 'TPEX Industrial Index',
        'Germany': 'Destatis Commodity Index',
        'Malaysia': 'MDTCC Import Data',
        'Saudi Arabia': 'Argus Petrochemicals Index',
        'US': 'CME Group Spot Prices',
        'Canada': 'NRCan Commodity Report',
    };
    const commoditySourceMap: Record<string, string> = {
        'Copper': 'LME Copper (Grade A)',
        'Nylon 6': 'ICIS Nylon 6 Asia',
        'Lithium': 'Fastmarkets Lithium Carbonate',
        'Aluminum': 'LME Aluminum',
        'Polypropylene': 'ICIS PP Asia CFR',
        'PET Resin': 'ICIS PET Asia',
        'LDPE': 'Platts LDPE NE Asia',
        'Neodymium': 'Platts Neodymium Oxide',
        'Steel': 'World Steel Association Index',
    };
    const regionSource = regionSourceMap[tariffReg] ?? 'Regional Trade Index';
    const commoditySrc = commoditySourceMap[commodity] ?? `${commodity} Spot Index`;

    const sources: string[] = [
        commoditySrc,
        regionSource,
        'Hackett Group 2024 Benchmark',
        "D&B Supplier Risk API",
        'Internal BOM v3.2',
    ];
    if (hasTariff) sources.splice(2, 0, 'USITC HTS Tariff Schedule');

    const rmDrop = (Math.random() * 6 + 4).toFixed(1);
    const ovhExcess = (defSupplier ? (defSupplier.overheadBenchmarkPct - 14).toFixed(1) : (Math.random() * 5 + 3).toFixed(1));
    const marginEx = (Math.random() * 4 + 2).toFixed(1);
    const landedUplift = (tariffPct * 0.6).toFixed(1); // rough landed cost impact

    const traceSteps: Insight['trace'] = [
        {
            step: 1,
            label: 'BOM & Market Data Ingested',
            color: 'cyan',
            detail: `${commodity} spot price has dropped ${rmDrop}% in ${tariffReg} since your contract for ${c.name} was signed (${c.contractSignedDate ?? 'Nov 2025'}). Your supplier's quoted rate does not reflect this market shift.`,
        },
        {
            step: 2,
            label: 'Overhead Benchmark Check',
            color: 'purple',
            detail: `${c.supplier}'s overhead allocation is ${Number(ovhExcess) > 0 ? `${ovhExcess}pp above` : 'within'} the 13–16% industry benchmark (Hackett Group 2024). ${Number(ovhExcess) > 0 ? 'Flagged as negotiable lever.' : 'Overhead is competitive — focus negotiation on raw material rate.'}`,
        },
        {
            step: 3,
            label: 'Supplier Margin Analysis',
            color: 'amber',
            detail: `Supplier margin is ${marginEx}% above the should-cost model. Combined with RM and overhead gaps, total recoverable gap = $${savingsAbs}M annually at current run rate.`,
        },
    ];

    // Step 4: Tariff & FX — always shown
    traceSteps.push({
        step: 4,
        label: hasTariff ? 'Tariff & FX Exposure Flagged' : 'Tariff & FX Assessment',
        color: hasTariff ? 'rose' : 'green',
        detail: hasTariff
            ? `${tariffReg}-origin supplier carries a ${tariffPct}% US import duty under the current HTS schedule (USITC). Landed cost is effectively ${landedUplift}% higher than the quoted unit price. ${fxMove < -3 ? `Additionally, the ${tariffReg} currency has depreciated ${Math.abs(fxMove).toFixed(1)}% YTD — further diluting the supplier's cost base and creating additional concession headroom.` : 'FX movement is minimal for this supplier.'}`
            : `${tariffReg}-origin supplier: no US import duties apply under the current HTS schedule. ${fxMove < -3 ? `Note: ${tariffReg} currency has depreciated ${Math.abs(fxMove).toFixed(1)}% YTD vs. USD — this reduces the supplier's real cost base and may create additional concession headroom.` : fxMove > 2 ? `Note: ${tariffReg} currency has appreciated ${Math.abs(fxMove).toFixed(1)}% YTD — supplier's USD costs are effectively higher; factor into pricing expectations.` : 'FX movement is minimal and not a material factor in this negotiation.'}`,
    });

    // Step 5: Supplier Financial Health — always shown
    const health = defSupplier?.financialHealth ?? 'Stable';
    const healthSignal = defSupplier?.financialSignal ?? 'No D\u0026B signal available.';
    const healthImplication: Record<string, string> = {
        Stable: 'Financially robust — focus negotiation on volume tiers, SLA terms, and index-linked escalators rather than unit price.',
        Watch: 'Revenue or margin under pressure. Open to a multi-year volume commitment in exchange for a price reduction — a credible re-opener.',
        Stressed: 'Under significant margin pressure. Highly likely to accept below-market pricing to secure volume and cash flow. Prime negotiation target.',
    };
    const healthColor = health === 'Stressed' ? 'rose' : health === 'Watch' ? 'amber' : 'green';
    traceSteps.push({
        step: 5,
        label: `Supplier Financial Health: ${health}`,
        color: healthColor,
        detail: `D\u0026B Signal — ${c.supplier}: "${healthSignal}" \n\nNegotiation implication: ${healthImplication[health]}`,
    });

    // Step 6: Recommendation
    traceSteps.push({
        step: 6,
        label: 'Autonomous Recommendation Generated',
        color: 'green',
        detail: `Agent recommends a targeted re-negotiation citing: (a) ${commodity} index decline (${commoditySrc}), (b) overhead vs. Hackett benchmark${hasTariff ? `, (c) tariff-adjusted landed cost at ${tariffPct}% import duty` : ', (c) zero tariff exposure confirms quoted price should fully reflect market rates'}, (d) supplier financial health: ${health}. Target price: $${((c.shouldCost / 1_000_000) * 1.02).toFixed(2)}M/yr. Maximum annual recovery: $${savingsAbs}M.`,
    });

    return {
        id: `${c.id}-${ts.getTime()}`,
        compId: c.id,
        compName: c.name,
        supplier: c.supplier,
        savingsPct,
        savingsAbs,
        severity,
        severityLabel: isHigh ? 'Critical' : isElev ? 'Elevated' : 'Watch',
        summary: isHigh
            ? `I identified ${savingsPct}% savings potential on ${c.name} based on current BOM, ${commodity} market index, and ${hasTariff ? `${tariffPct}% tariff-adjusted ` : ''}supplier margins.`
            : isElev
                ? `Overhead + margin gap detected on ${c.name}${hasTariff ? ` with ${tariffPct}% tariff exposure from ${tariffReg}` : ''} — re-opener window open.`
                : `Market index movement creates a re-opener window for ${c.name} pricing.`,
        timestamp: ts,
        trace: traceSteps,
        sources,
    };
}

// ── Relative time helper ───────────────────────────────────────────────────
function relativeTime(ts: Date, now: Date): string {
    const diffSec = Math.floor((now.getTime() - ts.getTime()) / 1000);
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return `${Math.floor(diffMin / 60)}h ago`;
}

// ── Trace Modal ────────────────────────────────────────────────────────────
// Receives onNavigate so the CTA can deep-link to the right component
const TraceModal = ({ insight, now, onClose, onNavigate }: {
    insight: Insight; now: Date; onClose: () => void; onNavigate: (compId: string) => void;
}) => {
    const colorMap: Record<string, string> = {
        cyan: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
        purple: 'bg-purple-500/20 border-purple-500/30 text-purple-400',
        amber: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
        rose: 'bg-rose-500/20 border-rose-500/30 text-rose-400',
        green: 'bg-green-500/20 border-green-500/30 text-green-400',
    };
    const lineMap: Record<string, string> = {
        cyan: 'bg-cyan-500/20', purple: 'bg-purple-500/20',
        amber: 'bg-amber-500/20', rose: 'bg-rose-500/20', green: 'bg-green-500/20',
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
            onClick={onClose}
        >
            <div
                className="bg-[#111115] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-white/10">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                            <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider">Agent Reasoning Trace</span>
                        </div>
                        <h2 className="text-lg font-bold text-white">{insight.compName}</h2>
                        <p className="text-sm text-gray-400 mt-0.5">{insight.supplier} · {relativeTime(insight.timestamp, now)}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors mt-0.5">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Summary banner */}
                <div className={`mx-5 mt-4 px-4 py-3 rounded-lg border text-sm ${insight.severity === 'red' ? 'bg-red-500/10 border-red-500/20 text-red-200'
                    : insight.severity === 'yellow' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-200'
                        : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-200'
                    }`}>
                    {insight.summary}
                </div>

                {/* Scrollable body — trace steps + sources */}
                <div className="overflow-y-auto flex-1 min-h-0">

                    {/* Trace steps */}
                    <div className="p-5 space-y-3">
                        {insight.trace.map((t, i) => (
                            <div key={t.step} className="flex gap-3">
                                <div className="flex flex-col items-center">
                                    <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${colorMap[t.color]}`}>
                                        {t.step}
                                    </div>
                                    {i < insight.trace.length - 1 && (
                                        <div className={`w-0.5 flex-1 mt-1 ${lineMap[t.color]} opacity-50`} />
                                    )}
                                </div>
                                <div className="pb-3">
                                    <div className={`text-xs font-semibold mb-1 ${colorMap[t.color].split(' ').find(c => c.startsWith('text-'))}`}>
                                        {t.label}
                                    </div>
                                    <p className="text-sm text-gray-300 leading-relaxed">{t.detail}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Data sources */}
                    <div className="px-5 pb-4">
                        <div className="border-t border-white/10 pt-3">
                            <p className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">Data sources used</p>
                            <div className="flex flex-wrap gap-1.5">
                                {insight.sources.map(s => (
                                    <span key={s} className="text-[10px] bg-white/5 border border-white/10 text-gray-400 px-2 py-0.5 rounded-full">{s}</span>
                                ))}
                            </div>
                        </div>
                    </div>{/* /data sources */}
                </div>{/* /scrollable body */}

                {/* Footer CTA — pinned outside scroll area */}
                <div className="px-5 pb-5 border-t border-white/10">
                    <button
                        onClick={() => { onClose(); onNavigate(insight.compId); }}
                        className="w-full py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/30 text-cyan-400 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                    >
                        Open in Negotiation Workspace <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── McKinsey-style Cost Waterfall Chart ───────────────────────────────────
// Data shape for the recharts waterfall trick:
//   invisible "base" bar (transparent) + coloured "value" bar stacked on top
interface WaterfallBar {
    label: string;
    shortLabel: string;
    base: number;    // invisible offset
    value: number;   // visible height
    color: string;
    isTotal: boolean;
    shouldCostLine?: number;
}

type ComponentWithBreakdown = {
    costBreakdown?: {
        rawMaterials?: { clientPays: number; shouldCost: number };
        conversion?: { clientPays: number; shouldCost: number };
        overhead?: { clientPays: number; shouldCost: number };
        logistics?: { clientPays: number; shouldCost: number };
        supplierMargin?: { clientPays: number; shouldCost: number };
    };
    totalSpend: number;
    shouldCost: number;
};

function buildWaterfallData(comps: ComponentWithBreakdown[]): WaterfallBar[] {
    // Aggregate each cost bucket from components.json costBreakdown
    const sum = (key: keyof NonNullable<ComponentWithBreakdown['costBreakdown']>, field: 'clientPays' | 'shouldCost') =>
        comps.reduce((acc, c) => acc + (c.costBreakdown?.[key]?.[field] ?? 0), 0);

    // Scale up from per-unit to total spend ($M)
    const scaleFactor = comps.reduce((s, c) => s + c.totalSpend, 0) /
        Math.max(comps.reduce((s, c) => s + (c.costBreakdown?.rawMaterials?.clientPays ?? 0)
            + (c.costBreakdown?.conversion?.clientPays ?? 0)
            + (c.costBreakdown?.overhead?.clientPays ?? 0)
            + (c.costBreakdown?.logistics?.clientPays ?? 0)
            + (c.costBreakdown?.supplierMargin?.clientPays ?? 0), 0), 1);

    const buckets = [
        { key: 'rawMaterials' as const, label: 'Raw Materials', shortLabel: 'Raw Mats', color: '#3b82f6' },
        { key: 'conversion' as const, label: 'Manufacturing', shortLabel: 'Mfg', color: '#6366f1' },
        { key: 'overhead' as const, label: 'Overhead', shortLabel: 'Overhead', color: '#8b5cf6' },
        { key: 'logistics' as const, label: 'Logistics', shortLabel: 'Logistics', color: '#a78bfa' },
        { key: 'supplierMargin' as const, label: 'Supplier Margin', shortLabel: 'Margin', color: '#c4b5fd' },
    ];

    const totalShouldCost = comps.reduce((s, c) => s + c.shouldCost, 0) / 1_000_000;
    const totalSpend = comps.reduce((s, c) => s + c.totalSpend, 0) / 1_000_000;

    const bars: WaterfallBar[] = [];
    let running = 0;

    for (const b of buckets) {
        const rawVal = sum(b.key, 'clientPays') * scaleFactor / 1_000_000;
        bars.push({ label: b.label, shortLabel: b.shortLabel, base: running, value: rawVal, color: b.color, isTotal: false });
        running += rawVal;
    }

    // Should-Cost total bar (green)
    bars.push({ label: 'Should-Cost Total', shortLabel: 'Should Cost', base: 0, value: totalShouldCost, color: '#10b981', isTotal: true });

    // Overpay bar (red) stacked on top of should-cost
    const overpay = totalSpend - totalShouldCost;
    bars.push({ label: 'Overpay Gap', shortLabel: 'Overpay', base: totalShouldCost, value: overpay, color: '#ef4444', isTotal: true });

    return bars;
}

const WaterfallTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: WaterfallBar }[] }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    const total = d.base + d.value;
    return (
        <div className="bg-[#18181b] border border-white/10 rounded-lg px-3 py-2 shadow-xl text-xs">
            <p className="font-semibold text-white mb-1">{d.label}</p>
            <p style={{ color: d.color }}>${d.value.toFixed(1)}M</p>
            {!d.isTotal && <p className="text-gray-500 mt-0.5">Running total: ${total.toFixed(1)}M</p>}
        </div>
    );
};

const CostWaterfallChart = ({ components, productName }: { components: ComponentWithBreakdown[]; productName: string }) => {
    const data = useMemo(() => buildWaterfallData(components), [components]);
    const totalSpend = components.reduce((s, c) => s + c.totalSpend, 0) / 1_000_000;
    const maxY = Math.ceil(totalSpend * 1.05);

    return (
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5">
            {/* Title row */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-sm font-semibold text-white">{productName} — Cost Build-Up</h2>
                    <p className="text-[11px] text-gray-500 mt-0.5">Waterfall breakdown: what drives total spend and where the overpay sits</p>
                </div>
                <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />Cost components</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />Should-cost</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" />Overpay gap</span>
                </div>
            </div>

            <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={data} margin={{ top: 24, right: 16, left: 8, bottom: 0 }} barCategoryGap="28%">
                    <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        dataKey="shortLabel"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, maxY]}
                        tickFormatter={v => `$${v}M`}
                        tick={{ fill: '#6b7280', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={52}
                    />
                    <Tooltip content={<WaterfallTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />

                    {/* Invisible base — offsets the value bar up */}
                    <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
                    {/* Visible value bar */}
                    <Bar dataKey="value" stackId="wf" radius={[3, 3, 0, 0]} isAnimationActive={true}>
                        {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                        <LabelList
                            dataKey="value"
                            position="top"
                            formatter={(v: number) => `$${v.toFixed(1)}M`}
                            style={{ fill: '#e5e7eb', fontSize: 10, fontWeight: 600 }}
                        />
                    </Bar>

                    {/* Should-cost ceiling reference line */}
                    <ReferenceLine
                        y={components.reduce((s, c) => s + c.shouldCost, 0) / 1_000_000}
                        stroke="#10b981"
                        strokeDasharray="4 3"
                        strokeWidth={1.5}
                        label={{ value: 'Should-Cost ceiling', position: 'insideTopRight', fill: '#10b981', fontSize: 9, dy: -4 }}
                    />
                </ComposedChart>
            </ResponsiveContainer>

            {/* Bottom annotation */}
            <div className="mt-2 flex items-center gap-6 text-[10px] text-gray-500 px-1">
                <span>Total actual spend: <span className="text-white font-semibold">${totalSpend.toFixed(1)}M</span></span>
                <span>Should-cost total: <span className="text-emerald-400 font-semibold">${(components.reduce((s, c) => s + c.shouldCost, 0) / 1_000_000).toFixed(1)}M</span></span>
                <span>Recoverable gap: <span className="text-red-400 font-semibold">${((components.reduce((s, c) => s + c.totalSpend, 0) - components.reduce((s, c) => s + c.shouldCost, 0)) / 1_000_000).toFixed(1)}M</span></span>
            </div>
        </div>
    );
};


// ═══════════════════════════════════════════════════════════════════════════
const CommandCenter: React.FC = () => {
    const navigate = useNavigate();
    const { selectedProductId } = useProduct();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [sortField, setSortField] = useState<'variance' | 'spend' | 'name'>('variance');
    const [activeSlide, setActiveSlide] = useState(0);
    const [traceInsight, setTraceInsight] = useState<Insight | null>(null);
    const [insights, setInsights] = useState<Insight[]>([]);
    const autoSlideRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const product = useMemo(() => products.find(p => p.id === selectedProductId) || products[0], [selectedProductId]);

    const filteredComponents = useMemo(() =>
        (componentsData as Component[]).filter(c => product.componentIds.includes(c.id)),
        [product]);

    const sorted = useMemo(() => [...filteredComponents].sort((a, b) => {
        if (sortField === 'variance') return b.variancePercent - a.variancePercent;
        if (sortField === 'spend') return b.totalSpend - a.totalSpend;
        return a.name.localeCompare(b.name);
    }), [filteredComponents, sortField]);

    // KPIs
    const totalSpend = filteredComponents.reduce((s, c) => s + c.totalSpend, 0);
    const totalShouldCost = filteredComponents.reduce((s, c) => s + c.shouldCost, 0);
    const totalVariance = totalSpend - totalShouldCost;
    const variancePercent = totalShouldCost > 0 ? ((totalVariance / totalShouldCost) * 100).toFixed(1) : '0.0';
    const activeComponents = filteredComponents.filter(c => c.agentStatus === 'active').length;
    const highRiskComponents = filteredComponents.filter(c => c.riskLevel === 'High').length;
    const fmt = (v: number) => `$${(v / 1_000_000).toFixed(1)}M`;

    // ── Seed all component insights on mount / product change ────────────
    useEffect(() => {
        const now = new Date();
        const base = sorted.filter(c => c.variancePercent > 0);
        setInsights(base.map((c, i) => buildInsight(c, now, i * 4 * 60_000, product)));
        setActiveSlide(0);
    }, [selectedProductId]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Auto-advance carousel every 5s ───────────────────────────────────
    const startAutoSlide = useCallback(() => {
        if (autoSlideRef.current) clearInterval(autoSlideRef.current);
        autoSlideRef.current = setInterval(() => {
            setActiveSlide(prev => {
                const next = (prev + 1) % Math.max(insights.length, 1);
                return next;
            });
        }, 5000);
    }, [insights.length]);

    useEffect(() => {
        startAutoSlide();
        return () => { if (autoSlideRef.current) clearInterval(autoSlideRef.current); };
    }, [startAutoSlide]);

    // ── Clock tick ───────────────────────────────────────────────────────
    useEffect(() => {
        const t = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(t);
    }, []);

    const goTo = (i: number) => {
        setActiveSlide(i);
        startAutoSlide();
    };

    const insight = insights[activeSlide] ?? null;

    return (
        <div className="flex h-screen bg-[#09090b]">
            <Sidebar navItems={navItems} />

            <div className="flex-1 flex flex-col relative">
                <Header breadcrumbs={['Nablon Procurement Agent', 'Command Center']}>
                    <div className="flex items-center gap-4">
                        <span className="text-xs text-gray-500">
                            Live as of <span className="text-cyan-400">{currentTime.toLocaleTimeString()}</span>
                        </span>
                    </div>
                </Header>

                <div className="flex-1 overflow-y-auto p-6 pt-6 space-y-6">
                    {/* Product Context */}
                    <div className="flex items-center gap-3 px-1">
                        <span className="text-sm text-gray-500">Product Line:</span>
                        <span className="px-3 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 text-sm font-medium border border-cyan-500/20 flex items-center gap-2">
                            <product.icon className="w-4 h-4" /> {product.name}
                        </span>
                        <span className="text-xs text-gray-600">{filteredComponents.length} components tracked</span>
                    </div>

                    {/* KPI Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <KPICard title="Total Vital Spend" value={fmt(totalSpend)} change={12.5} icon={DollarSign} color="cyan" />
                        <KPICard title="Total Variance" value={fmt(totalVariance)} subtitle={`${variancePercent}% above should-cost`} change={-3.2} icon={AlertCircle} color="red" onClick={() => document.getElementById('component-overview-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
                        <KPICard title="Active Analyses" value={activeComponents.toString()} subtitle={`${filteredComponents.length} total components`} icon={Target} color="green" />
                        <KPICard title="High Risk Items" value={highRiskComponents.toString()} subtitle="Requires immediate action" icon={AlertCircle} color="yellow" />
                    </div>

                    {/* ═══ AGENT INSIGHTS ═══ */}
                    {insights.length > 0 && insight && (
                        <div>
                            {/* Header row */}
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                                    <h2 className="text-sm font-semibold text-white">Agent Insights</h2>
                                    <span className="text-[10px] text-gray-500 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full">
                                        {insights.length} opportunit{insights.length !== 1 ? 'ies' : 'y'} surfaced autonomously
                                    </span>
                                </div>
                                {/* Carousel arrows */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => goTo((activeSlide - 1 + insights.length) % insights.length)}
                                        className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <ChevronLeft className="w-3.5 h-3.5" />
                                    </button>
                                    <span className="text-[10px] text-gray-500 tabular-nums">{activeSlide + 1} / {insights.length}</span>
                                    <button
                                        onClick={() => goTo((activeSlide + 1) % insights.length)}
                                        className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
                                    >
                                        <ChevronRight className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>

                            {/* Carousel card */}
                            {(() => {
                                const s = insight.severity;
                                const borderColor = s === 'red' ? 'border-red-500/30' : s === 'yellow' ? 'border-yellow-500/30' : 'border-cyan-500/30';
                                const bgGlow = s === 'red' ? 'from-red-900/15' : s === 'yellow' ? 'from-yellow-900/15' : 'from-cyan-900/15';
                                const tagColor = s === 'red' ? 'text-red-400 bg-red-500/10 border-red-500/20' : s === 'yellow' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20';
                                const savColor = s === 'red' ? 'text-red-300' : s === 'yellow' ? 'text-yellow-300' : 'text-cyan-300';

                                return (
                                    <div
                                        className={`bg-gradient-to-br ${bgGlow} to-transparent border ${borderColor} rounded-xl p-5 cursor-pointer hover:bg-white/[0.03] transition-all duration-300 group`}
                                        onClick={() => setTraceInsight(insight)}
                                    >
                                        {/* Top meta row */}
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${tagColor}`}>
                                                    {insight.severityLabel}
                                                </span>
                                                <span className="text-[10px] text-gray-500">
                                                    ${insight.savingsAbs}M recoverable · {insight.savingsPct}% gap
                                                </span>
                                            </div>
                                            <span className="flex items-center gap-1 text-[10px] text-gray-500">
                                                <Clock className="w-3 h-3" />
                                                {relativeTime(insight.timestamp, currentTime)}
                                            </span>
                                        </div>

                                        {/* Component + supplier */}
                                        <div className="mb-2">
                                            <div className="text-base font-semibold text-white leading-tight mb-0.5">{insight.compName}</div>
                                            <div className="text-[11px] text-gray-400">{insight.supplier} · {insight.savingsPct}% above should-cost</div>
                                        </div>

                                        {/* Summary */}
                                        <p className="text-sm text-gray-300 leading-relaxed mb-4">{insight.summary}</p>

                                        {/* Footer */}
                                        <div className="flex items-center justify-between border-t border-white/10 pt-3">
                                            <div className="flex flex-wrap gap-1">
                                                {insight.sources.slice(0, 3).map(s => (
                                                    <span key={s} className="text-[9px] bg-white/5 border border-white/10 text-gray-500 px-1.5 py-0.5 rounded-full">{s}</span>
                                                ))}
                                                {insight.sources.length > 3 && (
                                                    <span className="text-[9px] text-gray-600">+{insight.sources.length - 3} more</span>
                                                )}
                                            </div>
                                            <span className={`text-[11px] font-medium flex items-center gap-1 group-hover:underline ${savColor}`}>
                                                View agent trace <ArrowRight className="w-3 h-3" />
                                            </span>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Dot indicators */}
                            <div className="flex justify-center gap-1.5 mt-3">
                                {insights.map((_, i) => (
                                    <button
                                        key={i}
                                        onClick={() => goTo(i)}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === activeSlide ? 'w-5 bg-purple-400' : 'w-1.5 bg-white/20 hover:bg-white/40'}`}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ═══ COST WATERFALL ═══ */}
                    {/* <CostWaterfallChart
                        components={filteredComponents as unknown as ComponentWithBreakdown[]}
                        productName={product.name}
                    /> */}

                    {/* Activity + Table */}
                    <div id="component-overview-table" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold text-cyan-400">Component Overview</h3>
                                <div className="flex gap-1">
                                    {(['variance', 'spend', 'name'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setSortField(f)}
                                            className={`px-3 py-1 rounded text-xs transition-colors ${sortField === f ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'text-gray-500 hover:text-white hover:bg-white/5'}`}
                                        >
                                            {f.charAt(0).toUpperCase() + f.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b border-gray-700/50">
                                            <th className="text-left py-3 px-4 text-gray-500 text-xs font-medium uppercase tracking-wider">Component</th>
                                            <th className="text-right py-3 px-4 text-gray-500 text-xs font-medium uppercase tracking-wider">Spend</th>
                                            <th className="text-right py-3 px-4 text-gray-500 text-xs font-medium uppercase tracking-wider">Should-Cost</th>
                                            <th className="text-right py-3 px-4 text-gray-500 text-xs font-medium uppercase tracking-wider">Variance</th>
                                            <th className="text-right py-3 px-4 text-gray-500 text-xs font-medium uppercase tracking-wider">Variance ($)</th>
                                            <th className="text-center py-3 px-4 text-gray-500 text-xs font-medium uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sorted.length > 0 ? (
                                            sorted.map(comp => (
                                                <tr
                                                    key={comp.id}
                                                    onClick={() => navigate('/negotiation', { state: { componentId: comp.id } })}
                                                    className="border-b border-gray-800/50 hover:bg-white/5 cursor-pointer transition-colors group"
                                                >
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-white group-hover:text-cyan-400 transition-colors">{comp.name}</div>
                                                        <div className="text-xs text-gray-500">{comp.supplier}</div>
                                                    </td>
                                                    <td className="text-right py-3 px-4 text-white tabular-nums">{fmt(comp.totalSpend)}</td>
                                                    <td className="text-right py-3 px-4 text-gray-400 tabular-nums">{fmt(comp.shouldCost)}</td>
                                                    <td className="text-right py-3 px-4">
                                                        <span className={comp.variancePercent > 15 ? 'text-red-400' : comp.variancePercent > 10 ? 'text-yellow-400' : 'text-green-400'}>
                                                            +{comp.variancePercent.toFixed(1)}%
                                                        </span>
                                                    </td>
                                                    <td className="text-right py-3 px-4">
                                                        <span className={comp.variancePercent > 15 ? 'text-red-400' : comp.variancePercent > 10 ? 'text-yellow-400' : 'text-green-400'}>
                                                            {fmt(comp.totalSpend - comp.shouldCost)}
                                                        </span>
                                                    </td>
                                                    <td className="text-center py-3 px-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${comp.agentStatus === 'active' ? 'bg-green-500/20 text-green-400'
                                                            : comp.agentStatus === 'escalated' ? 'bg-red-500/20 text-red-400'
                                                                : 'bg-cyan-500/20 text-cyan-400'
                                                            }`}>
                                                            {comp.agentStatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">
                                                    No components found for this product.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <ActivityFeed
                            title="Agent Activity"
                            items={agentActivity.map(a => ({
                                id: a.id,
                                agent: a.agent,
                                action: a.action,
                                timestamp: a.timestamp,
                                status: a.status as 'success' | 'in-progress' | 'alert' | 'pending',
                                details: a.details,
                            }))}
                        />
                    </div>
                </div>
            </div>

            {/* Trace Modal */}
            {
                traceInsight && (
                    <TraceModal
                        insight={traceInsight as Insight}
                        now={currentTime}
                        onClose={() => setTraceInsight(null)}
                        onNavigate={(compId) => navigate('/negotiation', { state: { componentId: compId } })}
                    />
                )
            }
        </div>
    );
};

export default CommandCenter;
