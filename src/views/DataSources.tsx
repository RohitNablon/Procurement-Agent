import { useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { navItems } from '../data/navItems';
import { dataSources } from '../data/dataSources';
import { Link } from 'react-router-dom';
import {
    Factory,
    Database,
    ShoppingCart,
    BarChart3,
    Settings,
    TrendingUp,
    ShieldCheck,
    Cable,
    RefreshCw,
    Server,
    BrainCircuit
} from 'lucide-react';

const DataSources = () => {
    const [hoveredSource, setHoveredSource] = useState<string | null>(null);

    const internal = dataSources.filter(s => s.type === 'internal');
    const external = dataSources.filter(s => s.type === 'external');

    // Icon Mapping
    const iconMap: Record<string, JSX.Element> = {
        'teamcenter': <Factory className="w-6 h-6 text-cyan-400" />,
        'sap-s4hana': <Database className="w-6 h-6 text-blue-400" />,
        'sap-ariba': <ShoppingCart className="w-6 h-6 text-purple-400" />,
        'powerbi': <BarChart3 className="w-6 h-6 text-green-400" />,
        'apriori': <Settings className="w-6 h-6 text-amber-400" />,
        'platts-icis-lme': <TrendingUp className="w-6 h-6 text-emerald-400" />,
        'dnb-ecovadis': <ShieldCheck className="w-6 h-6 text-rose-400" />
    };

    const statusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'bg-green-500';
            case 'disconnected': return 'bg-gray-500';
            case 'error': return 'bg-red-500';
            default: return 'bg-gray-500';
        }
    };

    const statusText = (status: string) => {
        switch (status) {
            case 'connected': return 'text-green-400';
            case 'disconnected': return 'text-gray-400';
            case 'error': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const cardBorder = (status: string) => {
        switch (status) {
            case 'connected': return 'border-green-500/20 hover:border-green-500/40';
            case 'disconnected': return 'border-gray-500/20 hover:border-gray-500/40';
            case 'error': return 'border-red-500/20 hover:border-red-500/40';
            default: return 'border-white/10';
        }
    };

    const SourceCard = ({ source }: { source: typeof dataSources[0] }) => (
        <div
            className={`bg-white/5 backdrop-blur-xl border rounded-xl p-5 transition-all duration-300 cursor-pointer group ${cardBorder(source.status)} ${hoveredSource === source.id ? 'scale-[1.02] shadow-lg' : ''}`}
            onMouseEnter={() => setHoveredSource(source.id)}
            onMouseLeave={() => setHoveredSource(null)}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <span className="p-2 bg-white/5 rounded-lg border border-white/5">{iconMap[source.id] || <Database className="w-6 h-6 text-gray-400" />}</span>
                    <div>
                        <h4 className="text-white font-semibold text-sm">{source.name}</h4>
                        <p className="text-gray-500 text-xs mt-0.5">{source.role}</p>
                    </div>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${statusColor(source.status)} ${source.status === 'connected' ? 'animate-pulse' : ''}`} />
                    <span className={`text-xs font-medium ${statusText(source.status)}`}>
                        {source.status.charAt(0).toUpperCase() + source.status.slice(1)}
                    </span>
                </div>
            </div>

            <div className="flex flex-wrap gap-1.5 mb-3">
                {source.keyData.slice(0, 4).map((d, i) => (
                    <span key={i} className="px-2 py-0.5 text-xs rounded-full bg-white/5 text-gray-400 border border-white/5">
                        {d}
                    </span>
                ))}
                {source.keyData.length > 4 && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-white/5 text-gray-500">
                        +{source.keyData.length - 4} more
                    </span>
                )}
            </div>

            <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Last sync: <span className="text-gray-300">{source.lastSync}</span></span>
                <span className="text-gray-500">{source.recordCount.toLocaleString()} records</span>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-[#09090b]">
            <Sidebar navItems={navItems} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header breadcrumbs={['Nablon Procurement Agent', 'Data Sources']} />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                <Cable className="w-6 h-6 text-blue-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Data Source Connector</h1>
                                <p className="text-gray-500 text-sm mt-1">Manage internal and external data integrations for the procurement intelligence platform</p>
                            </div>
                        </div>
                        <Link
                            to="/data-sync"
                            className="px-4 py-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition-colors text-sm font-medium flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" /> Sync Data
                        </Link>
                    </div>

                    {/* Architecture Overview */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                        <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-6 text-center">Data Architecture</h3>
                        <div className="relative flex items-center justify-center gap-8" style={{ minHeight: 280 }}>
                            {/* Internal Sources Column */}
                            <div className="flex flex-col items-center gap-3 w-1/3">
                                <div className="px-4 py-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
                                    Internal Systems
                                </div>
                                {internal.map(s => (
                                    <div
                                        key={s.id}
                                        className={`w-full px-3 py-2 rounded-lg border text-xs transition-all duration-300 flex items-center gap-2 ${s.status === 'connected'
                                            ? 'bg-blue-500/5 border-blue-500/20 text-blue-300'
                                            : 'bg-white/5 border-white/10 text-gray-500'
                                            }`}
                                    >
                                        <div className="scale-75 origin-left">{iconMap[s.id]}</div>
                                        <span className="font-medium truncate">{s.name}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ml-auto shrink-0 ${statusColor(s.status)}`} />
                                    </div>
                                ))}
                            </div>

                            {/* Central Data Lake */}
                            <div className="flex flex-col items-center gap-2 w-1/3">
                                {/* Arrows from left */}
                                <div className="relative w-full flex items-center justify-center">
                                    <div className="absolute left-0 top-1/2 w-1/4 h-px bg-gradient-to-r from-blue-500/50 to-transparent" />
                                    <div className="absolute right-0 top-1/2 w-1/4 h-px bg-gradient-to-l from-amber-500/50 to-transparent" />
                                </div>
                                <div className="relative">
                                    <div className="w-40 h-40 rounded-full border-2 border-cyan-500/30 bg-cyan-500/5 flex flex-col items-center justify-center shadow-[0_0_40px_rgba(6,182,212,0.15)]">
                                        <BrainCircuit className="w-12 h-12 text-cyan-400 mb-2" />
                                        <span className="text-cyan-400 font-bold text-sm">Centralized</span>
                                        <span className="text-cyan-400 font-bold text-sm">Data Lake</span>
                                        <span className="text-gray-500 text-xs mt-1">AI-Ready</span>
                                    </div>
                                    {/* Animated ring */}
                                    <div className="absolute inset-0 w-40 h-40 rounded-full border border-cyan-500/20 animate-ping" style={{ animationDuration: '3s' }} />
                                </div>
                                <div className="flex items-center gap-4 mt-2">
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-white">{dataSources.reduce((s, d) => s + d.recordCount, 0).toLocaleString()}</p>
                                        <p className="text-xs text-gray-500">Total Records</p>
                                    </div>
                                    <div className="w-px h-8 bg-white/10" />
                                    <div className="text-center">
                                        <p className="text-lg font-bold text-green-400">{dataSources.filter(d => d.status === 'connected').length}/{dataSources.length}</p>
                                        <p className="text-xs text-gray-500">Connected</p>
                                    </div>
                                </div>
                            </div>

                            {/* External Sources Column */}
                            <div className="flex flex-col items-center gap-3 w-1/3">
                                <div className="px-4 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
                                    External Systems
                                </div>
                                {external.map(s => (
                                    <div
                                        key={s.id}
                                        className={`w-full px-3 py-2 rounded-lg border text-xs transition-all duration-300 flex items-center gap-2 ${s.status === 'connected'
                                            ? 'bg-amber-500/5 border-amber-500/20 text-amber-300'
                                            : 'bg-white/5 border-white/10 text-gray-500'
                                            }`}
                                    >
                                        <div className="scale-75 origin-left">{iconMap[s.id]}</div>
                                        <span className="font-medium truncate">{s.name}</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ml-auto shrink-0 ${statusColor(s.status)}`} />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Animated flow lines */}
                        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                            <defs>
                                <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="rgba(59,130,246,0.5)" />
                                    <stop offset="50%" stopColor="rgba(6,182,212,0.8)" />
                                    <stop offset="100%" stopColor="rgba(245,158,11,0.5)" />
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>

                    {/* Source Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Internal */}
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500" />
                                Internal Systems
                                <span className="text-xs text-gray-500 font-normal ml-1">{internal.length} sources</span>
                            </h2>
                            <div className="space-y-4">
                                {internal.map(s => <SourceCard key={s.id} source={s} />)}
                            </div>
                        </div>

                        {/* External */}
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                External Systems
                                <span className="text-xs text-gray-500 font-normal ml-1">{external.length} sources</span>
                            </h2>
                            <div className="space-y-4">
                                {external.map(s => <SourceCard key={s.id} source={s} />)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default DataSources;
