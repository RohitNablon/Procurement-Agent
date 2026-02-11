import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ArrowLeft } from 'lucide-react';
import { navItems } from '../data/navItems';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import componentsData from '../data/components.json';

const ComponentDeepDive = () => {
    const { componentId } = useParams();

    // Find component or default to first if not found (or handle 404)
    const componentData = useMemo(() => {
        return componentsData.find(c => c.id === componentId) || componentsData[0];
    }, [componentId]);

    // augment with mock details that aren't in json
    const component = useMemo(() => ({
        ...componentData,
        location: componentData.supplier === 'PlastiFlex Industries' ? 'Shenzhen, China' : 'Monterrey, Mexico', // Mock location
        qualityScore: 4.8,
        riskAdjustedCost: componentData.shouldCost * 1.05,
        annualVolume: Math.round(componentData.totalSpend / componentData.currentCost * 100000) / 100, // rough calc
        paymentTerms: 'Net-60',
    }), [componentData]);

    const opportunity = component.variance;

    // Dynamic Cost Breakdown
    const costBreakdown = useMemo(() => [
        { name: 'Raw Materials', value: +(component.shouldCost * 0.65 / 1000000).toFixed(2), pct: 65, color: '#06b6d4' },
        { name: 'Processing', value: +(component.shouldCost * 0.25 / 1000000).toFixed(2), pct: 25, color: '#8b5cf6' },
        { name: 'Overhead', value: +(component.shouldCost * 0.10 / 1000000).toFixed(2), pct: 10, color: '#f59e0b' },
    ], [component]);

    // Dynamic Commodity History (Simulated from trend)
    const commodityHistory = useMemo(() => {
        const base = 100000;
        return componentData.monthlyTrend.map((val, i) => ({
            date: ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'][i] || 'Mar',
            price: base * (val / 40) // scaling mock
        }));
    }, [componentData]);

    return (
        <div className="flex h-screen bg-[#09090b]">
            <Sidebar navItems={navItems} />
            <div className="flex-1 flex flex-col relative">
                <Header breadcrumbs={['Nablon Procurement Agent', 'Component Analysis', component.name]} />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Back + Title */}
                    <div className="flex items-center gap-4">
                        <Link to="/command-center" className="text-gray-400 hover:text-white transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold text-white">{component.name}</h1>
                            <p className="text-gray-400 text-sm">{component.supplier} • {component.location}</p>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${component.confidence === 'High' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                                component.confidence === 'Medium' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                    'bg-red-500/20 text-red-400 border-red-500/30'
                                }`}>
                                {component.confidence} Confidence
                            </span>
                        </div>
                    </div>

                    {/* Top Row: Cost Intel + Metadata + Agent Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Cost Intelligence */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Cost Intelligence</h3>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs text-gray-500">Total Spend</p>
                                    <p className="text-3xl font-bold text-white">${(component.totalSpend / 1_000_000).toFixed(1)}M<span className="text-sm text-gray-400">/yr</span></p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500">Should-Cost</p>
                                    <p className="text-2xl font-bold text-cyan-400">${(component.shouldCost / 1_000_000).toFixed(1)}M<span className="text-sm text-gray-400">/yr</span></p>
                                </div>
                                <div className="pt-3 border-t border-white/10">
                                    <p className="text-xs text-gray-500">💰 Variance / Opportunity</p>
                                    <p className={`text-2xl font-bold ${component.variancePercent > 10 ? 'text-green-400' : 'text-yellow-400'}`}>
                                        ${(component.variance / 1_000_000).toFixed(1)}M
                                        <span className="text-sm font-normal ml-2">({component.variancePercent}%)</span>
                                    </p>
                                </div>
                                <div className="pt-3 border-t border-white/10">
                                    <p className="text-xs text-gray-500">⚖️ Negotiation Leverage</p>
                                    <p className="text-lg font-bold text-amber-400">HIGH</p>
                                    <p className="text-xs text-gray-500">Material cost provides transparency</p>
                                </div>
                            </div>
                        </div>

                        {/* Metadata */}
                        <div className="space-y-4">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">📍 Component Metadata</h3>
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="text-gray-500">Supplier</span><p className="text-white font-medium">{component.supplier}</p></div>
                                    <div><span className="text-gray-500">Geography</span><p className="text-white font-medium">{component.location}</p></div>
                                    <div><span className="text-gray-500">Category</span><p className="text-white font-medium">{component.category}</p></div>
                                    <div><span className="text-gray-500">Last Negotiated</span><p className="text-white font-medium">{component.lastNegotiation}</p></div>
                                    <div><span className="text-gray-500">Quality Score</span><p className="text-white font-medium">{component.qualityScore}/5.0</p></div>
                                    <div><span className="text-gray-500">Risk Level</span><p className={`font-medium ${component.riskLevel === 'High' ? 'text-red-400' : 'text-white'}`}>{component.riskLevel}</p></div>
                                </div>
                            </div>
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Est. Supplier Margin</h3>
                                <p className="text-2xl font-bold text-purple-400">18-22%</p>
                                <div className="w-full bg-white/10 rounded-full h-2 mt-2">
                                    <div className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full" style={{ width: '20%' }} />
                                </div>
                            </div>
                        </div>

                        {/* Agent Activity */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">🤖 Agent Activity <span className="text-green-400 animate-pulse">● Live</span></h3>
                            <div className="flex flex-col items-center justify-center h-[200px] text-gray-500 text-sm">
                                <p>Analysis agents active for this component.</p>
                                <div className="flex gap-2 mt-4">
                                    <span className="px-2 py-1 bg-white/5 rounded text-xs">Cost Intel</span>
                                    <span className="px-2 py-1 bg-white/5 rounded text-xs">Market Monitor</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Row: Cost Breakdown + Commodity Intelligence */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Cost Breakdown */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Cost Breakdown</h3>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={costBreakdown} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis type="number" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis dataKey="name" type="category" tick={{ fill: '#9ca3af', fontSize: 12 }} width={100} />
                                    <Tooltip contentStyle={{ background: '#1f1f23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                        {costBreakdown.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Commodity Intelligence */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Commodity Intelligence</h3>
                            <div className="flex items-baseline gap-3 mb-4">
                                <span className="text-lg font-bold text-white">{component.commodities[0]}</span>
                                <span className="ml-auto text-lg font-bold text-red-400">High Volatility</span>
                            </div>
                            <ResponsiveContainer width="100%" height={200}>
                                <AreaChart data={commodityHistory}>
                                    <defs>
                                        <linearGradient id="commodityGrad" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                    <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                    <Tooltip contentStyle={{ background: '#1f1f23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                    <Area type="monotone" dataKey="price" stroke="#06b6d4" fill="url(#commodityGrad)" strokeWidth={2} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComponentDeepDive;
