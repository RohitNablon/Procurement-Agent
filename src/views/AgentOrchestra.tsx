import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { navItems } from '../data/navItems';
import { motion, AnimatePresence } from 'framer-motion';
import {
    AlertTriangle,
    Play,
    CheckCircle2,
    Loader2,
    Cpu,
    Search,
    Database,
    Calculator,
    BarChart3,
    MessageSquare,
    ShieldCheck,
    Download,
    PauseCircle,
    ArrowRight,
    ArrowLeft,
    Bot,
    X
} from 'lucide-react';

// --- Types ---
type WorkflowStage = 'alert' | 'planning' | 'review' | 'result' | 'report';

interface AgentStep {
    id: string;
    title: string;
    agentName: string;
    icon: React.ElementType;
    status: 'idle' | 'running' | 'completed' | 'paused';
    progress: number; // 0-100
    currentLog?: string;
    allLogs: string[];
}

interface AgentCapability {
    id: string;
    name: string;
    role: string;
    icon: React.ElementType;
    status: 'active' | 'standby';
    specs: string[];
    lastRun: string;
}

// Detailed logs for each step to simulate ~20s duration
const stepLogs: Record<string, string[]> = {
    '1': [
        "Initializing Scope Curator Agent v2.4...",
        "Connecting to ERP Gateway (SAP S/4HANA)...",
        " Authenticating secure session... [OK]",
        "Querying SKU database for 'Wiring Harness' category...",
        " > Found 12,400 active SKUs.",
        "Applying volatility filter: Copper > 5% movement...",
        " > Filtered to 420 SKUs.",
        "Analyzing filtered SKUs for spend impact...",
        " > Identified High-Impact Target: Battery Pack - Li-Ion.",
        "Retrieving historical purchase orders for last 12 months...",
        "Calculating total spend volume...",
        "Priority confirmed: HIGH (Spend > $5M).",
        "Scope defined. Handing off to BOM Agent."
    ],
    '2': [
        "Initializing BOM Integration Agent...",
        "Connecting to PLM System (Teamcenter)...",
        "Fetching eBOM for Part #BP-LION-2024 (Rev C)...",
        "Parsing assembly hierarchy...",
        " > Detected 4 sub-assemblies.",
        " > Detected 148 components.",
        "Mapping raw materials to commodity indices...",
        " > Resolving taxonomy... 'Insulation' -> 'Polymer Resins'",
        " > Resolving taxonomy... 'Conductor' -> 'Copper Grade A'",
        "Validating weights and measures against spec sheet...",
        "Cross-referencing with supplier declarations...",
        "BOM Structure Verified. 100% Match.",
        "Data ready for market enrichment."
    ],
    '3': [
        "Initializing Market Data Agent...",
        "Connecting to London Metal Exchange (LME) API...",
        "Fetching T+1 closing prices for Copper Grade A...",
        " > Current Price: $8,450/mt",
        "Retrieving Platts Plastic indices for Polypropylene...",
        " > Current Price: $1,200/mt",
        "Analyzing 6-month price trend...",
        " > Detected -8.2% drop in Lithium Carbonate.",
        "Calculating material cost impact...",
        "Adjusting currency exchange rates (USD/CNY)...",
        "Applying regional logistics surcharges...",
        "Enrichment complete. Indices mapped to BOM."
    ],
    '4': [
        "Initializing Physics-Based Cost Engine...",
        "Loading geometry files (STEP/IGES)...",
        "Analyzing geometry for manufacturing features...",
        " > Recognition: Prismatic Cell form factor.",
        "Selecting manufacturing routing...",
        " > Scenario A: CNC Machining (Rejected - High Cost)",
        " > Scenario B: High-Speed Stamping (Selected)",
        "Calculating cycle times based on volume (50k/yr)...",
        "Estimating energy consumption...",
        "Computing labor overhead based on region: SE Asia...",
        "Synthesizing 'Should-Cost' model...",
        "Draft complete. Validating margins...",
        "Outlier detected. Requesting human validation."
    ],
    '5': [
        "Initializing Variance Analyst...",
        "Retrieving latest Invoice #INV-9982...",
        " > Invoice Unit Price: $122.50",
        "Retrieving calculated Should-Cost...",
        " > Should-Cost Unit Price: $112.40",
        "Calculating Variance...",
        " > Delta: $10.10 per unit (8.2%)",
        "Analyzing variance root cause...",
        " > Factor 1: Material Index Lag (High Confidence)",
        " > Factor 2: Overhead Allocation (Medium Confidence)",
        "Generating Variance Waterfall chart...",
        "Gap analysis finalized."
    ],
    '6': [
        "Initializing Strategy Director Agent...",
        "Compiling Negotiation Fact Pack...",
        "Drafting opening script...",
        "Selecting BATNA scenario...",
        " > Option: Switch to Dual Source (qualification needed)",
        "Generating objection handling for 'Raw Material Inventory'...",
        "Formatting email templates for supplier outreach...",
        "Validating strategy against corporate policy...",
        "Finalizing strategy document...",
        "Ready for review."
    ]
};

const initialSteps: AgentStep[] = [
    { id: '1', title: 'Auto-Scope & Priority', agentName: 'Scope Curator Agent', icon: Search, status: 'idle', progress: 0, allLogs: [], currentLog: '' },
    { id: '2', title: 'BOM Assembly & Map', agentName: 'BOM Integration Agent', icon: Database, status: 'idle', progress: 0, allLogs: [], currentLog: '' },
    { id: '3', title: 'Commodity Enrichment', agentName: 'Market Data Agent', icon: BarChart3, status: 'idle', progress: 0, allLogs: [], currentLog: '' },
    { id: '4', title: 'Clean Sheet Generation', agentName: 'Physics Costing Agent', icon: Calculator, status: 'idle', progress: 0, allLogs: [], currentLog: '' },
    { id: '5', title: 'Gap Cost Analysis', agentName: 'Variance Analyst', icon: ArrowRight, status: 'idle', progress: 0, allLogs: [], currentLog: '' },
    { id: '6', title: 'Negotiation Strategy', agentName: 'Strategy Director Agent', icon: MessageSquare, status: 'idle', progress: 0, allLogs: [], currentLog: '' },
];

const agentCapabilities: AgentCapability[] = [
    {
        id: '1',
        name: 'Auto-Scope & Priority',
        role: 'Scope Curator Agent',
        icon: Search,
        status: 'active',
        specs: ['Real-time SPEND analysis', 'SAP S/4HANA Integration', 'Predictive Volatility Modeling'],
        lastRun: '1h ago'
    },
    {
        id: '2',
        name: 'BOM Assembly & Map',
        role: 'BOM Integration Agent',
        icon: Database,
        status: 'active',
        specs: ['Teamcenter PLM Deep-Link', 'Recursive Hierarchy Parsing', 'Material-to-Commodity Logic'],
        lastRun: '1h ago'
    },
    {
        id: '3',
        name: 'Commodity Enrichment',
        role: 'Market Data Agent',
        icon: BarChart3,
        status: 'active',
        specs: ['LME/Platts API Stream', 'Forex Normalization', 'Global Surcharge Index'],
        lastRun: '1h ago'
    },
    {
        id: '4',
        name: 'Clean Sheet Generation',
        role: 'Physics Costing Agent',
        icon: Calculator,
        status: 'active',
        specs: ['Geometry Feature Recognition', 'Cycle Time Estimator', 'Multi-Regional Labor Rates'],
        lastRun: '1h ago'
    },
    {
        id: '5',
        name: 'Gap Cost Analysis',
        role: 'Variance Analyst',
        icon: ArrowRight,
        status: 'active',
        specs: ['Invoice-to-Should-Cost Gap', 'Root Cause Classifier', 'Margin Waterfall Gen'],
        lastRun: '1h ago'
    },
    {
        id: '6',
        name: 'Negotiation Strategy',
        role: 'Strategy Director Agent',
        icon: MessageSquare,
        status: 'active',
        specs: ['BATNA Scenario Engine', 'Objection Handling Script', 'Email Template Auto-Fill'],
        lastRun: '1h ago'
    }
];


const AgentOrchestra = () => {
    const [viewStage, setViewStage] = useState<WorkflowStage>('alert');
    const [steps, setSteps] = useState<AgentStep[]>(initialSteps);
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isPrintMode, setIsPrintMode] = useState(false);

    // --- Workflow Engine ---
    useEffect(() => {
        if (viewStage !== 'planning' || isPaused) return;

        // If all steps are completed, transition to result stage
        if (currentStepIndex >= steps.length) {
            setTimeout(() => setViewStage('result'), 1000);
            return;
        }

        const currentStep = steps[currentStepIndex];
        const logs = stepLogs[currentStep.id];

        // If the current step is already completed or paused, do nothing (wait for user action if paused)
        if (currentStep.status === 'completed' || currentStep.status === 'paused') {
            return;
        }

        // Set current step to running if it's idle
        if (currentStep.status === 'idle') {
            setSteps(prev => prev.map((s, i) => i === currentStepIndex ? { ...s, status: 'running' } : s));
        }

        let logIndex = 0;
        // If resuming a step (e.g., after a pause that wasn't step 4), we might want to continue from where we left off.
        // For this implementation, we'll restart the logs for the current step if it's set to 'running'
        // and the effect re-runs (e.g., after `isPaused` changes).
        // A more robust solution would store `logIndex` in state.

        // Duration per log to hit ~20s total per step
        const totalStepDuration = 20000; // 20 seconds
        const logDuration = logs.length > 0 ? totalStepDuration / logs.length : totalStepDuration;


        const interval = setInterval(() => {
            // Re-check isPaused inside interval, as it can change asynchronously
            if (isPaused) {
                clearInterval(interval);
                return;
            }

            if (logIndex >= logs.length) {
                clearInterval(interval);

                // Special handling for Human-in-the-Loop pause at step 4
                if (currentStep.id === '4') {
                    setIsPaused(true);
                    setSteps(prev => prev.map((s, i) => i === currentStepIndex ? { ...s, status: 'paused', currentLog: "Waiting for validation..." } : s));
                    return;
                }

                // Mark step as completed and move to next
                setSteps(prev => prev.map((s, i) => i === currentStepIndex ? { ...s, status: 'completed', progress: 100, currentLog: "Completed." } : s));
                setCurrentStepIndex(prev => prev + 1); // This will trigger the effect again for the next step
                return;
            }

            const currentLogMessage = logs[logIndex];
            const progress = ((logIndex + 1) / logs.length) * 100;

            setSteps(prev => prev.map((s, i) => {
                if (i === currentStepIndex) {
                    return {
                        ...s,
                        currentLog: currentLogMessage,
                        allLogs: [...s.allLogs, currentLogMessage],
                        progress: progress
                    };
                }
                return s;
            }));

            logIndex++;

        }, logDuration);

        return () => clearInterval(interval);

    }, [viewStage, currentStepIndex, isPaused]); // Removed steps from dep to avoid re-triggering interval on state update


    const handleStartWorkflow = () => {
        setViewStage('planning');
        setCurrentStepIndex(0);
        setSteps(initialSteps); // Reset steps to initial state
        setIsPaused(false); // Ensure not paused
    };

    const handleApproveCleanSheet = () => {
        setIsPaused(false);
        // Step 4 is currently paused. We need to mark it as completed to move on.
        setSteps(prev => prev.map((s, i) => i === currentStepIndex ? { ...s, status: 'completed', progress: 100, currentLog: "Validation Approved." } : s));

        // Move to the next step
        setCurrentStepIndex(prev => prev + 1);
    };

    const handleDownloadPdf = () => {
        window.print();
    };


    return (
        <div className="flex h-screen bg-[#09090b] text-white overflow-hidden font-['Jost'] print:h-auto print:overflow-visible">
            <div className="print:hidden">
                <Sidebar navItems={navItems} />
            </div>
            <div className="flex-1 flex flex-col relative w-full h-full overflow-hidden print:h-auto print:overflow-visible print:block">
                <div className="print:hidden">
                    <Header breadcrumbs={['Nablon Procurement Agent', 'Agent Orchestrator']} />
                </div>

                <div className="flex-1 p-8 overflow-y-auto relative scroll-smooth print:p-0 print:overflow-visible">
                    {/* Background Tech Elements */}
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none opacity-20 print:hidden">
                        <div className="absolute top-10 right-10 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]" />
                        <div className="absolute bottom-10 left-10 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
                    </div>

                    <div className="max-w-5xl mx-auto relative z-10 w-full print:max-w-none print:w-full">

                        {/* Header Section */}
                        {viewStage !== 'report' && (
                            <div className="flex items-center gap-4 mb-12">
                                <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-xl border border-cyan-500/30 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                                    <Cpu className="w-8 h-8 text-cyan-400" />
                                </div>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Agentic Intelligence Hub</h1>
                                    <p className="text-gray-400">Autonomous supply chain monitoring & negotiation preparation</p>
                                </div>

                                {viewStage === 'planning' && (
                                    <div className="ml-auto flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                        <span className="text-sm font-medium text-blue-400 uppercase tracking-wider">Agents Active</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* --- VIEW: ALERT --- */}
                        <AnimatePresence mode="wait">
                            {viewStage === 'alert' && (
                                <motion.div
                                    key="alert"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    className="w-full"
                                >
                                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6 relative overflow-hidden">

                                        <div className="flex flex-col gap-6 relative z-10">
                                            <div className="w-full space-y-6">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className="p-2 bg-red-500/10 rounded-lg border border-red-500/20">
                                                        <AlertTriangle className="w-5 h-5 text-red-500" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-lg font-semibold text-white">Commodity Volatility Detected</h2>
                                                        <span className="text-sm text-gray-500 flex items-center gap-2">
                                                            2 mins ago • Source: LME Main Feed
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                                                        <div className="text-sm text-gray-500 mb-1">Target Commodity</div>
                                                        <div className="text-base font-medium text-white flex items-center gap-2">
                                                            Lithium Carbonate <span className="text-xs text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">-8.2%</span>
                                                        </div>
                                                    </div>
                                                    <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                                                        <div className="text-sm text-gray-500 mb-1">Impacted Category</div>
                                                        <div className="text-base font-medium text-white">Battery Pack - Li-Ion</div>
                                                    </div>
                                                    <div className="p-4 bg-black/20 rounded-lg border border-white/5">
                                                        <div className="text-sm text-gray-500 mb-1">Est. Savings Opportunity</div>
                                                        <div className="text-xl font-mono text-green-400">~$385,000</div>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    <span className="px-2 py-1 rounded border border-white/10 bg-white/5">Confidence: 98.5%</span>
                                                    <span className="px-2 py-1 rounded border border-white/10 bg-white/5">12 SKUs Affected</span>
                                                </div>
                                            </div>

                                            <div className="flex justify-end">
                                                <button
                                                    onClick={handleStartWorkflow}
                                                    className="flex items-center gap-2 px-6 py-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 rounded-lg transition-all font-medium group"
                                                >
                                                    <Play className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                                                    Initialize Agent Swarm
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Passive Monitoring Footer */}
                                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {['Polymer Resins', 'Aluminum Alloy 6061', 'Ocean Freight - PAC'].map((item, i) => (
                                            <div key={i} className="p-3 rounded-lg bg-white/5 border border-white/5 flex justify-between items-center opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                                                <span className="text-sm font-medium text-gray-400">{item}</span>
                                                <span className="text-xs text-green-500/50 flex items-center gap-1">Stable <CheckCircle2 className="w-3 h-3" /></span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Agent Swarm Capabilities Grid */}
                                    <div className="mt-12">
                                        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                                            <Bot className="w-5 h-5 text-purple-400" />
                                            Active Agent Swarm
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                            {agentCapabilities.map((agent) => (
                                                <div key={agent.id} className="group relative bg-[#18181b] border border-white/10 rounded-xl p-5 hover:border-purple-500/30 transition-all duration-300 hover:shadow-[0_0_20px_rgba(168,85,247,0.1)]">
                                                    <div className="flex items-start justify-between mb-4">
                                                        <div className="p-2.5 bg-white/5 rounded-lg border border-white/5 group-hover:bg-purple-500/10 group-hover:border-purple-500/20 transition-colors">
                                                            <agent.icon className="w-6 h-6 text-gray-400 group-hover:text-purple-400 transition-colors" />
                                                        </div>
                                                        <span className={`text-xs px-2 py-1 rounded-full border ${agent.status === 'active'
                                                            ? 'bg-green-500/10 border-green-500/20 text-green-400'
                                                            : 'bg-gray-800 border-gray-700 text-gray-400'
                                                            }`}>
                                                            {agent.status === 'active' ? 'Idle' : 'Offline'}
                                                        </span>
                                                    </div>

                                                    <h4 className="text-white font-medium text-base mb-1">{agent.name}</h4>
                                                    <p className="text-sm text-gray-500 mb-4 h-10">{agent.role}</p>

                                                    <div className="space-y-2 mb-4">
                                                        {agent.specs.map((spec, i) => (
                                                            <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                                                                <div className="w-1 h-1 rounded-full bg-purple-500/50" />
                                                                {spec}
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                                                        <span className="text-gray-600">Last Run</span>
                                                        <span className="text-gray-300 font-mono">{agent.lastRun}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* --- VIEW: WORKFLOW PLANNER --- */}
                        <AnimatePresence>
                            {(viewStage === 'planning' || viewStage === 'result') && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="w-full max-w-4xl mx-auto print:hidden"
                                >
                                    <div className="bg-[#18181b]/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
                                        {/* Header */}
                                        <div className="bg-white/5 px-6 py-4 border-b border-white/10 flex justify-between items-center">
                                            <h3 className="font-semibold text-lg flex items-center gap-2">
                                                <Bot className="w-5 h-5 text-cyan-400" />
                                                Investigation Planner
                                            </h3>
                                            <div className="text-xs font-mono text-gray-500">
                                                ID: #AG-8829-COP
                                            </div>
                                        </div>

                                        {/* Steps List */}
                                        <div className="p-8 space-y-6 relative">
                                            {/* Vertical Connector Line */}
                                            <div className="absolute left-[59px] top-12 bottom-12 w-0.5 bg-gradient-to-b from-cyan-500/50 via-gray-700/30 to-gray-800/10" />

                                            {steps.map((step, index) => (
                                                <motion.div
                                                    key={step.id}
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: index * 0.1 }}
                                                    className={`relative flex items-start gap-6 group ${step.status === 'idle' ? 'opacity-40 grayscale' : 'opacity-100'}`}
                                                >
                                                    {/* Icon Bubble */}
                                                    <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 shrink-0
                                                         ${step.status === 'completed' ? 'bg-green-500/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)]' :
                                                            step.status === 'running' ? 'bg-cyan-500/20 border-cyan-400 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-110' :
                                                                step.status === 'paused' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-500 animate-pulse' :
                                                                    'bg-[#09090b] border-gray-700 text-gray-600'}
                                                     `}>
                                                        {step.status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> :
                                                            step.status === 'running' ? <Loader2 className="w-6 h-6 animate-spin" /> :
                                                                <step.icon className="w-5 h-5" />}
                                                    </div>

                                                    {/* Content */}
                                                    <div className={`flex-1 pt-1 rounded-xl transition-all duration-300 ${step.status === 'running' ? 'bg-black/40 border border-cyan-500/30 shadow-lg p-6' : 'bg-black/20 border border-white/5 p-4'}`}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <div>
                                                                <h4 className={`text-base font-bold ${step.status === 'running' ? 'text-cyan-400' : 'text-gray-200'}`}>
                                                                    {step.title}
                                                                </h4>
                                                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
                                                                    <Bot className="w-3 h-3" />
                                                                    {step.agentName}
                                                                </div>
                                                            </div>
                                                            <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded
                                                                ${step.status === 'running' ? 'bg-cyan-500/20 text-cyan-400' :
                                                                    step.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                                                                        step.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-white/5 text-gray-500'}
                                                            `}>
                                                                {step.status}
                                                            </span>
                                                        </div>


                                                        {/* Active Process Viewer (Terminal Style) */}
                                                        {step.status === 'running' && (
                                                            <motion.div
                                                                initial={{ opacity: 0, height: 0 }}
                                                                animate={{ opacity: 1, height: 'auto' }}
                                                                className="mt-4"
                                                            >
                                                                {/* Progress Bar */}
                                                                <div className="w-full h-1 bg-gray-800 rounded-full mb-3 overflow-hidden">
                                                                    <motion.div
                                                                        className="h-full bg-cyan-500"
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${step.progress}%` }}
                                                                        transition={{ ease: "linear" }}
                                                                    />
                                                                </div>

                                                                {/* Terminal Window */}
                                                                <div className="bg-black/60 rounded-lg p-4 font-mono text-sm h-32 overflow-hidden flex flex-col justify-end border border-white/10 shadow-inner">
                                                                    <div className="flex flex-col gap-1">
                                                                        {step.allLogs.slice(-4).map((log, i) => (
                                                                            <motion.span
                                                                                key={i}
                                                                                initial={{ opacity: 0, x: -10 }}
                                                                                animate={{ opacity: 1, x: 0 }}
                                                                                className={`${i === step.allLogs.slice(-4).length - 1 ? 'text-cyan-400' : 'text-gray-500'}`}
                                                                            >
                                                                                {'>'} {log}
                                                                            </motion.span>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        )}

                                                        {/* Completed Summary */}
                                                        {step.status === 'completed' && (
                                                            <motion.p
                                                                initial={{ opacity: 0 }}
                                                                animate={{ opacity: 1 }}
                                                                className="text-xs text-green-400/80 font-mono mt-2 flex items-center gap-2"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" /> Process verified. Findings logged.
                                                            </motion.p>
                                                        )}
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* --- MODAL: HUMAN REVIEW (Step 4) --- */}
                        <AnimatePresence>
                            {isPaused && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:hidden"
                                >
                                    <motion.div
                                        initial={{ scale: 0.9, y: 20 }}
                                        animate={{ scale: 1, y: 0 }}
                                        className="bg-[#18181b] w-full max-w-2xl border border-white/20 rounded-2xl shadow-2xl overflow-hidden"
                                    >
                                        <div className="p-6 bg-gradient-to-r from-yellow-500/10 to-transparent border-b border-white/10 flex items-center gap-4">
                                            <div className="p-3 bg-yellow-500/20 rounded-full text-yellow-500">
                                                <PauseCircle className="w-8 h-8" />
                                            </div>
                                            <div>
                                                <h2 className="text-xl font-bold text-white">Review & Validate Clean Sheet</h2>
                                                <p className="text-sm text-gray-400">Agent requires human confirmation for calculated margins.</p>
                                            </div>
                                        </div>

                                        <div className="p-8 space-y-6">
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                                                    <p className="text-xs text-gray-500 uppercase">Calculated Should-Cost</p>
                                                    <p className="text-3xl font-bold text-green-400 mt-1">$42.85</p>
                                                    <p className="text-xs text-green-500/70 mt-1">-12% vs Invoice</p>
                                                </div>
                                                <div className="p-4 bg-white/5 rounded-xl border border-white/10 text-center">
                                                    <p className="text-xs text-gray-500 uppercase">Assumed Supplier Margin</p>
                                                    <p className="text-3xl font-bold text-white mt-1">12.5%</p>
                                                    <p className="text-xs text-gray-500 mt-1">Industry Avg: 10-14%</p>
                                                </div>
                                            </div>

                                            <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20 flex gap-4 items-start">
                                                <Search className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                                                <div>
                                                    <h4 className="text-sm font-bold text-blue-300">Validation Note</h4>
                                                    <p className="text-sm text-blue-200/80 mt-1">
                                                        The agent applied a <strong className="text-white">High-Speed Stamping</strong> routing instead of CNC based on volume (50k/yr). This significantly reduced the cycle time estimate.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-6 bg-white/5 border-t border-white/10 flex justify-end gap-3">
                                            <button
                                                onClick={handleApproveCleanSheet}
                                                className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-lg shadow-lg shadow-green-900/20 transition-all flex items-center gap-2"
                                            >
                                                <CheckCircle2 className="w-4 h-4" />
                                                Validate & Continue
                                            </button>
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>


                        {/* --- VIEW: INVESTIGATION COMPLETE (TRANSITION) --- */}
                        <AnimatePresence>
                            {viewStage === 'result' && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="fixed inset-0 z-40 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 print:hidden"
                                >
                                    <div className="bg-[#09090b] border border-white/20 rounded-2xl w-full max-w-2xl shadow-2xl relative overflow-hidden text-center p-12">
                                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-cyan-500 via-purple-500 to-blue-500" />

                                        <button
                                            onClick={() => setViewStage('alert')}
                                            className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white rounded-full hover:bg-white/10 transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>

                                        <div className="w-40 h-40 mx-auto rounded-full border-4 border-red-500 flex flex-col items-center justify-center mb-8 relative shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                                            <div className="absolute inset-0 rounded-full border-4 border-red-500/20 animate-pulse" />
                                            <span className="text-5xl font-bold text-white">88</span>
                                            <span className="text-sm text-gray-400 mt-1">Overall Risk</span>
                                        </div>

                                        <h2 className="text-3xl font-bold text-white mb-4">Investigation Complete</h2>
                                        <p className="text-gray-300 text-lg mb-2">Negotiation Fact Pack Ready.</p>
                                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                                            Potential Savings: <strong className="text-green-400">$142,000</strong>. Pattern matches confirmed vendor overcharging regarding commodity index movements.
                                        </p>

                                        <div className="flex gap-4 justify-center">
                                            <button
                                                onClick={() => setViewStage('report')}
                                                className="px-8 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl font-medium transition-all"
                                            >
                                                View Full Report
                                            </button>
                                            <button
                                                onClick={() => setViewStage('report')}
                                                className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-900/20 transition-all flex items-center gap-2"
                                            >
                                                <Download className="w-5 h-5" /> Approve & Generate PDF
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* --- VIEW: REPORT PDF PREVIEW --- */}
                        <AnimatePresence>
                            {viewStage === 'report' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`w-full bg-[#0F172A] rounded-xl overflow-hidden shadow-2xl transition-colors duration-500 ${isPrintMode ? 'bg-white text-black' : 'text-gray-200'} print:absolute print:inset-0 print:w-full print:h-full print:m-0 print:rounded-none print:shadow-none print:overflow-visible`}
                                >
                                    {/* Toolbar */}
                                    <div className="bg-black/40 p-4 flex justify-between items-center border-b border-white/10 print:hidden">
                                        <div className="flex items-center gap-4">
                                            <button onClick={() => setViewStage('result')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white">
                                                <ArrowLeft className="w-4 h-4" /> Back
                                            </button>
                                            <div className="h-6 w-px bg-white/10" />
                                            <span className="text-sm font-medium text-white">Document Preview</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                                <span>Print Layout</span>
                                                <button
                                                    onClick={() => setIsPrintMode(!isPrintMode)}
                                                    className={`w-12 h-6 rounded-full transition-colors relative ${isPrintMode ? 'bg-cyan-500' : 'bg-gray-700'}`}
                                                >
                                                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-300 ${isPrintMode ? 'left-7' : 'left-1'}`} />
                                                </button>
                                            </div>
                                            <button
                                                onClick={handleDownloadPdf}
                                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg flex items-center gap-2"
                                            >
                                                <Download className="w-4 h-4" /> Download PDF
                                            </button>
                                        </div>
                                    </div>

                                    {/* REPORT CONTENT */}
                                    <div className={`p-12 space-y-8 ${isPrintMode ? 'text-black' : 'text-gray-300'} print:p-0 print:text-black`}>

                                        {/* Report Header */}
                                        <div className="flex justify-between items-start border-b border-gray-700/30 pb-8">
                                            <div>
                                                <h1 className={`text-3xl font-bold mb-2 ${isPrintMode ? 'text-slate-900' : 'text-white'}`}>SHOULD-COST & NEGOTIATION STRATEGY</h1>
                                                <p className={`text-sm tracking-widest uppercase ${isPrintMode ? 'text-slate-500' : 'text-gray-500'}`}>CONFIDENTIAL • AUTOMATED INTELLIGENCE REPORT</p>
                                            </div>
                                            <div className="text-right text-sm">
                                                <table className={`text-left border-collapse ${isPrintMode ? 'text-slate-600' : 'text-gray-400'}`}>
                                                    <tbody>
                                                        <tr><td className="pr-4 py-1 font-semibold">Risk Rating:</td><td className="text-red-500 font-bold">HIGH</td></tr>
                                                        <tr><td className="pr-4 py-1 font-semibold">Date:</td><td>{new Date().toLocaleDateString()}</td></tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Executive Summary */}
                                        <div className={`p-6 rounded-xl border ${isPrintMode ? 'bg-slate-50 border-slate-200' : 'bg-white/5 border-white/10'}`}>
                                            <h3 className={`text-sm font-bold uppercase tracking-wider mb-3 ${isPrintMode ? 'text-slate-900' : 'text-white'}`}>Executive Summary</h3>
                                            <div className="flex gap-4">
                                                <div className="w-1 bg-red-500 shrink-0" />
                                                <div>
                                                    <p className={`font-bold mb-2 ${isPrintMode ? 'text-slate-800' : 'text-gray-200'}`}>
                                                        Recommendation: File Negotiation Claim with Supplier and move to Tier-2 pricing.
                                                    </p>
                                                    <p className={`text-sm leading-relaxed ${isPrintMode ? 'text-slate-600' : 'text-gray-400'}`}>
                                                        Automated analysis detected a 5.4% drop in LME Copper indices. Current PO pricing ($122.50/unit) reflects peak commodity prices.
                                                        Agentic modeling suggests a target price of <strong className={isPrintMode ? 'text-slate-900' : 'text-white'}>$112.40/unit</strong> based on raw material enrichment.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Risk Grid */}
                                        <div>
                                            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isPrintMode ? 'text-slate-900' : 'text-white'}`}>Risk Assessment</h3>
                                            <div className="grid grid-cols-4 gap-4">
                                                {[
                                                    { label: 'Strategic Risk', score: 85, color: 'bg-red-500' },
                                                    { label: 'Geographic Risk', score: 90, color: 'bg-orange-500' },
                                                    { label: 'Commodity Risk', score: 92, color: 'bg-red-600' },
                                                    { label: 'External Intel', score: 95, color: 'bg-purple-500' },
                                                ].map((risk, i) => (
                                                    <div key={i} className={`p-4 rounded-lg border text-center ${isPrintMode ? 'bg-white border-slate-200 shadow-sm' : 'bg-white/5 border-white/10'}`}>
                                                        <div className={`text-2xl font-bold mb-1 ${isPrintMode ? 'text-slate-900' : 'text-white'}`}>{risk.score}/100</div>
                                                        <div className={`text-xs uppercase font-medium ${isPrintMode ? 'text-slate-500' : 'text-gray-500'}`}>{risk.label}</div>
                                                        <div className="w-full h-1 bg-gray-200/20 mt-3 rounded-full overflow-hidden">
                                                            <div className={`h-full ${risk.color}`} style={{ width: `${risk.score}%` }} />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Detailed Findings */}
                                        <div>
                                            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 ${isPrintMode ? 'text-slate-900' : 'text-white'}`}>Detailed Findings</h3>
                                            <div className="space-y-4">
                                                <div className={`p-4 rounded-lg border flex gap-4 items-start ${isPrintMode ? 'border-slate-200' : 'border-white/10'}`}>
                                                    <div className="p-2 bg-blue-500/10 rounded text-blue-500"><Database className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className={`font-bold text-sm mb-1 ${isPrintMode ? 'text-slate-900' : 'text-white'}`}>STRUCTURING PATTERN (Confidence: 89%)</h4>
                                                        <p className={`text-sm ${isPrintMode ? 'text-slate-600' : 'text-gray-400'}`}>Analysis of 14-month history revealed 14 raw material price adjustments that did not align with market indices.</p>
                                                    </div>
                                                </div>
                                                <div className={`p-4 rounded-lg border flex gap-4 items-start ${isPrintMode ? 'border-slate-200' : 'border-white/10'}`}>
                                                    <div className="p-2 bg-purple-500/10 rounded text-purple-500"><AlertTriangle className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className={`font-bold text-sm mb-1 ${isPrintMode ? 'text-slate-900' : 'text-white'}`}>ATYPICAL HIGH VALUE TRANSFER (Confidence: 94%)</h4>
                                                        <p className={`text-sm ${isPrintMode ? 'text-slate-600' : 'text-gray-400'}`}>Current purchase price is 11% higher than the 'Clean Sheet' baseline generated via aPriori API.</p>
                                                    </div>
                                                </div>
                                                <div className={`p-4 rounded-lg border flex gap-4 items-start ${isPrintMode ? 'border-slate-200' : 'border-white/10'}`}>
                                                    <div className="p-2 bg-red-500/10 rounded text-red-500"><ShieldCheck className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className={`font-bold text-sm mb-1 ${isPrintMode ? 'text-slate-900' : 'text-white'}`}>SHELL ENTITY INDICATORS (Confidence: 91%)</h4>
                                                        <p className={`text-sm ${isPrintMode ? 'text-slate-600' : 'text-gray-400'}`}>Supplier 'Global Trading LLC' lacks physical manufacturing footprints in recorded zones; matches offshore high-risk profiles.</p>
                                                    </div>
                                                </div>
                                                <div className={`p-4 rounded-lg border flex gap-4 items-start ${isPrintMode ? 'border-slate-200' : 'border-white/10'}`}>
                                                    <div className="p-2 bg-green-500/10 rounded text-green-500"><Search className="w-5 h-5" /></div>
                                                    <div>
                                                        <h4 className={`font-bold text-sm mb-1 ${isPrintMode ? 'text-slate-900' : 'text-white'}`}>ADVERSE MARKET INTELLIGENCE (Confirmed)</h4>
                                                        <p className={`text-sm ${isPrintMode ? 'text-slate-600' : 'text-gray-400'}`}>EXIM data confirms this supplier has shipped comparable wiring harnesses to competitors at 8% lower rates.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Footer / Analyst Notes */}
                                        <div className={`mt-8 pt-8 border-t ${isPrintMode ? 'border-slate-200' : 'border-white/10'}`}>
                                            <h4 className={`text-xs font-bold uppercase mb-2 ${isPrintMode ? 'text-slate-500' : 'text-gray-500'}`}>Analyst Notes</h4>
                                            <p className={`text-sm italic mb-6 ${isPrintMode ? 'text-slate-600' : 'text-gray-400'}`}>
                                                "Investigation completed in 2 min 34 sec. Human-in-the-loop approved the clean-sheet model. Recommended next step: Execute BATNA scenario modeled in Step 7."
                                            </p>

                                            <div className="flex justify-end items-end">

                                                <div className={`text-xs ${isPrintMode ? 'text-slate-400' : 'text-gray-500'}`}>
                                                    Generated: {new Date().toLocaleString()}
                                                </div>
                                            </div>
                                        </div>

                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentOrchestra;
