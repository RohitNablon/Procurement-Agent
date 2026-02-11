import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { KPICard } from '../components/KPICard';
import { ActivityFeed } from '../components/ActivityFeed';
import {
    DollarSign,
    AlertCircle,
    Target,
} from 'lucide-react';
import { navItems } from '../data/navItems';
import componentsData from '../data/components.json';
import agentActivity from '../data/agent-activity.json';
import { useProduct } from '../context/ProductContext';
import { products } from '../data/products';

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
}

const CommandCenter: React.FC = () => {
    const navigate = useNavigate();
    const { selectedProductId } = useProduct();
    const [currentTime, setCurrentTime] = useState(new Date());
    const [sortField, setSortField] = useState<'variance' | 'spend' | 'name'>('variance');

    // Get selected product details
    const product = useMemo(() => products.find(p => p.id === selectedProductId) || products[0], [selectedProductId]);

    // Filter components based on the selected product
    const filteredComponents = useMemo(() => {
        return (componentsData as Component[]).filter(c => product.componentIds.includes(c.id));
    }, [product]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // KPIs based on filtered components
    const totalSpend = filteredComponents.reduce((sum, c) => sum + c.totalSpend, 0);
    const totalShouldCost = filteredComponents.reduce((sum, c) => sum + c.shouldCost, 0);
    const totalVariance = totalSpend - totalShouldCost;
    const variancePercent = totalShouldCost > 0 ? ((totalVariance / totalShouldCost) * 100).toFixed(1) : '0.0';
    const activeComponents = filteredComponents.filter(c => c.agentStatus === 'active').length;
    const highRiskComponents = filteredComponents.filter(c => c.riskLevel === 'High').length;

    const fmt = (v: number) => `$${(v / 1_000_000).toFixed(1)}M`;

    const sorted = [...filteredComponents].sort((a, b) => {
        if (sortField === 'variance') return b.variancePercent - a.variancePercent;
        if (sortField === 'spend') return b.totalSpend - a.totalSpend;
        return a.name.localeCompare(b.name);
    });

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
                        <KPICard title="Total Variance" value={fmt(totalVariance)} subtitle={`${variancePercent}% above should-cost`} change={-3.2} icon={AlertCircle} color="red" />
                        <KPICard title="Active Analyses" value={activeComponents.toString()} subtitle={`${filteredComponents.length} total components`} icon={Target} color="green" />
                        <KPICard title="High Risk Items" value={highRiskComponents.toString()} subtitle="Requires immediate action" icon={AlertCircle} color="yellow" />
                    </div>

                    {/* Activity + Table */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                                            <th className="text-center py-3 px-4 text-gray-500 text-xs font-medium uppercase tracking-wider">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sorted.length > 0 ? (
                                            sorted.map((comp) => (
                                                <tr
                                                    key={comp.id}
                                                    onClick={() => navigate(`/component-deep-dive/${comp.id}`)}
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
                                                    <td className="text-center py-3 px-4">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${comp.agentStatus === 'active' ? 'bg-green-500/20 text-green-400' :
                                                            comp.agentStatus === 'escalated' ? 'bg-red-500/20 text-red-400' :
                                                                'bg-cyan-500/20 text-cyan-400'
                                                            }`}>
                                                            {comp.agentStatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                                                    No components found for this product.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table >
                            </div >
                        </div >

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
        </div>
    );
};

export default CommandCenter;
