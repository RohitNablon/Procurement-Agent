import { useState, useMemo, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ChevronDown, ChevronRight, Copy, Check, AlertCircle, X, Printer, Download, FileText, MessageSquare, ShieldAlert, Handshake, ArrowRight, BookOpen, Quote, Sparkles } from 'lucide-react';
import { navItems } from '../data/navItems';
import { useProduct } from '../context/ProductContext';
import { products } from '../data/products';
import componentsData from '../data/components.json';

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

    // Reset selected component when product changes
    useEffect(() => {
        if (productComponents.length > 0) {
            setSelectedComponentId(productComponents[0].id);
        } else {
            setSelectedComponentId(null);
        }
    }, [selectedProductId, productComponents]);

    const activeComponent = useMemo(() => {
        return productComponents.find(c => c.id === selectedComponentId) || productComponents[0];
    }, [selectedComponentId, productComponents]);

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

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Fact Pack */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">📋 Component Fact Pack</h3>

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
                                            <div className="flex justify-between text-sm mb-2">
                                                <span className="text-gray-400">Market Price Range:</span>
                                                <span className="text-white font-medium">{formatCurrency(activeComponent.shouldCost * 0.98)} - {formatCurrency(activeComponent.shouldCost * 1.05)}</span>
                                            </div>

                                            <div className="bg-white/5 rounded-lg p-3 space-y-3">
                                                {[
                                                    { name: "TechMould Industries", location: "Vietnam", quote: activeComponent.shouldCost * 1.03, score: "96% (A)", trend: "down" },
                                                    { name: "PolyForm Global", location: "Mexico", quote: activeComponent.shouldCost * 1.08, score: "94% (A-)", trend: "stable" },
                                                    { name: "Apex Precision", location: "Thailand", quote: activeComponent.shouldCost * 1.01, score: "88% (B+)", trend: "up" }
                                                ].map((supp, i) => (
                                                    <div key={i} className="flex items-center justify-between text-xs border-b border-white/5 last:border-0 pb-2 last:pb-0">
                                                        <div>
                                                            <div className="text-white font-medium">{supp.name}</div>
                                                            <div className="text-gray-500">{supp.location} • Qual: {supp.score}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-cyan-400 font-medium">{formatCurrency(supp.quote)}</div>
                                                            <div className="text-gray-500">
                                                                {((supp.quote - activeComponent.shouldCost) / activeComponent.shouldCost * 100).toFixed(1)}% vs Should-Cost
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="text-xs text-gray-400 italic mt-2">
                                                *Quotes valid for 30 days. TechMould offer includes logistical rebate.
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Strategy + Objections */}
                            <div className="space-y-6">
                                {/* Strategy */}
                                <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-6">
                                    <h3 className="text-sm font-medium text-cyan-400 uppercase tracking-wider mb-4">🎯 Negotiation Strategy</h3>

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
                                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">⚔️ Objection Playbook</h3>
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
