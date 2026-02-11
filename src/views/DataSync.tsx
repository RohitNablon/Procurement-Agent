import { useSimulation } from '../context/SimulationContext';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { navItems } from '../data/navItems';
import { dataSources, type SyncStage } from '../data/dataSources';
import {
    RefreshCw,
    Play,
    CheckCircle,
    AlertCircle,
    Loader2,
    Download,
    Database,
    HardDrive,
    ScrollText,
    Workflow,
    Zap,
    Factory,
    ShoppingCart,
    BarChart3,
    Settings,
    TrendingUp,
    ShieldCheck,
    BrainCircuit
} from 'lucide-react';



const STAGES: SyncStage[] = ['extracting', 'transforming', 'validating', 'loading', 'complete'];
const STAGE_LABELS: Record<SyncStage, string> = {
    idle: 'Idle',
    extracting: 'Extracting',
    transforming: 'Transforming',
    validating: 'Validating',
    loading: 'Loading',
    complete: 'Complete',
    error: 'Error',
};

const STAGE_COLORS: Record<SyncStage, string> = {
    idle: 'bg-gray-500/20 text-gray-400 border-gray-500/20',
    extracting: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    transforming: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    validating: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    loading: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    complete: 'bg-green-500/20 text-green-400 border-green-500/30',
    error: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const DataSync = () => {
    const {
        syncStates,
        isSyncingAll,
        syncLogs: logs,
        runSyncSimulation
    } = useSimulation();

    // Icon Mapping (Same as DataSources)
    const iconMap: Record<string, JSX.Element> = {
        'teamcenter': <Factory className="w-5 h-5 text-cyan-400" />,
        'sap-s4hana': <Database className="w-5 h-5 text-blue-400" />,
        'sap-ariba': <ShoppingCart className="w-5 h-5 text-purple-400" />,
        'powerbi': <BarChart3 className="w-5 h-5 text-green-400" />,
        'apriori': <Settings className="w-5 h-5 text-amber-400" />,
        'platts-icis-lme': <TrendingUp className="w-5 h-5 text-emerald-400" />,
        'dnb-ecovadis': <ShieldCheck className="w-5 h-5 text-rose-400" />
    };

    const handleSyncAll = () => runSyncSimulation();
    const handleSyncOne = (sourceId: string) => runSyncSimulation(sourceId);

    const getStageIcon = (stage: SyncStage) => {
        switch (stage) {
            case 'complete': return <CheckCircle className="w-4 h-4 text-green-400" />;
            case 'error': return <AlertCircle className="w-4 h-4 text-red-400" />;
            case 'idle': return <div className="w-4 h-4 rounded-full border border-gray-500" />;
            default: return <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />;
        }
    };

    const pipelineStages = [
        { name: 'Extract', icon: <Download className="w-5 h-5" /> },
        { name: 'Transform', icon: <RefreshCw className="w-5 h-5" /> },
        { name: 'Validate', icon: <CheckCircle className="w-5 h-5" /> },
        { name: 'Load', icon: <HardDrive className="w-5 h-5" /> }
    ];

    return (
        <div className="flex h-screen bg-[#09090b]">
            <Sidebar navItems={navItems} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header breadcrumbs={['Nablon Procurement Agent', 'Data Sync']} />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                                <Zap className="w-6 h-6 text-yellow-400" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-white">Data Sync Workflow</h1>
                                <p className="text-gray-500 text-sm mt-1">Trigger and monitor data synchronization across all connected sources</p>
                            </div>
                        </div>
                        <button
                            onClick={handleSyncAll}
                            disabled={isSyncingAll}
                            className={`px-5 py-2.5 rounded-lg font-medium text-sm flex items-center gap-2 transition-all duration-300 ${isSyncingAll
                                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 cursor-not-allowed'
                                : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.02]'
                                }`}
                        >
                            {isSyncingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            {isSyncingAll ? 'Syncing All...' : 'Sync All Sources'}
                        </button>
                    </div>

                    {/* Pipeline Stages Visualization */}
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                        <div className="flex items-center justify-center gap-2 mb-6">
                            <Workflow className="w-4 h-4 text-gray-400" />
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Agent-Powered ETL Pipeline</h3>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            {pipelineStages.map((stage, i) => {
                                const stageKey = stage.name.toLowerCase() as string;
                                const activeCount = syncStates.filter(s => {
                                    const stageMap: Record<string, string> = { extract: 'extracting', transform: 'transforming', validate: 'validating', load: 'loading' };
                                    return s.stage === stageMap[stageKey];
                                }).length;

                                return (
                                    <div key={stage.name} className="flex items-center gap-2">
                                        <div className={`relative flex flex-col items-center px-8 py-4 rounded-xl border transition-all duration-500 ${activeCount > 0
                                            ? 'bg-cyan-500/10 border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.2)]'
                                            : 'bg-white/5 border-white/10'
                                            }`}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all duration-500 ${activeCount > 0
                                                ? 'bg-cyan-500/20 text-cyan-400'
                                                : 'bg-white/5 text-gray-500'
                                                }`}>
                                                {stage.icon}
                                            </div>
                                            <span className={`text-xs font-semibold ${activeCount > 0 ? 'text-cyan-400' : 'text-gray-500'}`}>{stage.name}</span>
                                            {activeCount > 0 && (
                                                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-cyan-500 text-white text-xs flex items-center justify-center font-bold animate-bounce">
                                                    {activeCount}
                                                </span>
                                            )}
                                        </div>
                                        {i < pipelineStages.length - 1 && (
                                            <div className="flex items-center gap-1">
                                                <div className={`w-8 h-0.5 transition-colors duration-500 ${activeCount > 0 ? 'bg-cyan-500/50' : 'bg-white/10'
                                                    }`} />
                                                <div className={`w-0 h-0 border-t-4 border-b-4 border-l-6 border-transparent transition-colors duration-500 ${activeCount > 0 ? 'border-l-cyan-500/50' : 'border-l-white/10'
                                                    }`} />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Source Sync Cards */}
                        <div className="lg:col-span-2 space-y-3">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">Source Status</h3>
                            {dataSources.map(source => {
                                const sync = syncStates.find(s => s.sourceId === source.id)!;
                                const isActive = sync.stage !== 'idle' && sync.stage !== 'complete';
                                return (
                                    <div
                                        key={source.id}
                                        className={`bg-white/5 backdrop-blur-xl border rounded-xl p-4 transition-all duration-300 ${isActive ? 'border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : sync.stage === 'complete' ? 'border-green-500/20' : 'border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-white/5 rounded-lg border border-white/5">
                                                {iconMap[source.id] || <Database className="w-5 h-5 text-gray-400" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h4 className="text-white font-medium text-sm">{source.name}</h4>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium border ${STAGE_COLORS[sync.stage]}`}>
                                                        {STAGE_LABELS[sync.stage]}
                                                    </span>
                                                    <span className="text-xs text-gray-500 ml-auto">
                                                        {source.type === 'internal' ? '🔵 Internal' : '🟡 External'}
                                                    </span>
                                                </div>
                                                {/* Progress bar */}
                                                <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-300 ${sync.stage === 'complete' ? 'bg-green-500' :
                                                            sync.stage === 'error' ? 'bg-red-500' :
                                                                isActive ? 'bg-gradient-to-r from-cyan-500 to-blue-500' : 'bg-gray-700'
                                                            }`}
                                                        style={{
                                                            width: sync.stage === 'complete' ? '100%' :
                                                                sync.stage === 'idle' ? '0%' :
                                                                    `${(STAGES.indexOf(sync.stage) / STAGES.length) * 100 + (sync.progress / STAGES.length)}%`
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleSyncOne(source.id)}
                                                disabled={isActive || source.status === 'disconnected'}
                                                className={`p-2 rounded-lg transition-colors ${isActive ? 'text-cyan-400 cursor-not-allowed' :
                                                    source.status === 'disconnected' ? 'text-gray-600 cursor-not-allowed' :
                                                        'text-gray-400 hover:text-white hover:bg-white/5'
                                                    }`}
                                                title={source.status === 'disconnected' ? 'Source disconnected' : 'Sync this source'}
                                            >
                                                {isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Activity Log */}
                        <div className="space-y-4">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <ScrollText className="w-4 h-4" /> Sync Log
                                    {logs.length > 0 && <span className="text-green-400 animate-pulse text-xs">● Live</span>}
                                </h3>
                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                    {logs.length === 0 ? (
                                        <p className="text-gray-600 text-sm text-center py-8">No sync activity yet. Click "Sync All Sources" to begin.</p>
                                    ) : (
                                        logs.map((log, i) => (
                                            <div
                                                key={`${log.time}-${i}`}
                                                className={`p-2.5 rounded-lg text-xs transition-all ${i === 0 ? 'bg-cyan-500/10 border border-cyan-500/20' : 'bg-white/5'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-0.5">
                                                    <span className="text-gray-500 font-mono">{log.time}</span>
                                                    {log.type === 'success' ? <CheckCircle className="w-3 h-3 text-green-400" /> :
                                                        log.type === 'error' ? <AlertCircle className="w-3 h-3 text-red-400" /> : null}
                                                </div>
                                                <p className="text-white font-medium">{log.source}</p>
                                                <p className="text-gray-400">{log.message}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Workflow Diagram */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Data Flow</h3>
                                <div className="space-y-3">
                                    {dataSources.filter(s => s.status === 'connected').map(source => {
                                        const sync = syncStates.find(s => s.sourceId === source.id)!;
                                        return (
                                            <div key={source.id} className="flex items-center gap-2">
                                                <div className="scale-75 text-gray-400">{iconMap[source.id] || <Database />}</div>
                                                <div className={`flex-1 h-1 rounded-full overflow-hidden ${sync.stage === 'complete' ? 'bg-green-500/30' : sync.stage !== 'idle' ? 'bg-cyan-500/30' : 'bg-white/5'
                                                    }`}>
                                                    {sync.stage !== 'idle' && sync.stage !== 'complete' && (
                                                        <div className="h-full bg-cyan-400 rounded-full animate-pulse" style={{ width: `${sync.progress}%` }} />
                                                    )}
                                                    {sync.stage === 'complete' && <div className="h-full bg-green-400 rounded-full w-full" />}
                                                </div>
                                                <BrainCircuit className="w-4 h-4 text-gray-500" />
                                                {getStageIcon(sync.stage)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default DataSync;
