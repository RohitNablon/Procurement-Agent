import { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { type LucideIcon } from 'lucide-react';
import { type SyncStage, dataSources, type DataSource } from '../data/dataSources';

/** Should-Cost Types */
export type PipelineStage = 'idle' | 'bom' | 'materials' | 'conversion' | 'overhead' | 'logistics' | 'margin' | 'complete';

export interface CalculationResult {
    materialsCost: number;
    conversionCost: number;
    overheadCost: number;
    logisticsCost: number;
    marginCost: number;
    totalShouldCost: number;
    currentPrice: number;
    savings: number;
    savingsPercent: number;
    confidence: number;
    bomBreakdown: Array<{ name: string; cost: number }>;
    phaseBreakdown: Array<{ name: string; cost: number; type: string }>;
}

/** Data-Sync Types */
export interface SourceSync {
    sourceId: string;
    stage: SyncStage;
    progress: number;
}

export type LogType = 'info' | 'success' | 'error';
export interface LogEntry {
    time: string;
    source: string;
    message: string;
    type: LogType;
}

interface SimulationContextType {
    // Should-Cost Simulation State
    scPipelineStage: PipelineStage;
    scIsCalculating: boolean;
    scResult: CalculationResult | null;
    scPipelineCosts: Record<string, number>;
    runShouldCostSimulation: (
        product: any,
        choices: Record<string, string>,
        overheads: number,
        margins: number,
        region: string,
        toggles: Record<string, boolean>
    ) => void;

    // Data-Sync Simulation State
    syncStates: SourceSync[];
    isSyncingAll: boolean;
    syncLogs: LogEntry[];
    runSyncSimulation: (sourceId?: string) => void;
}

const SimulationContext = createContext<SimulationContextType>({} as SimulationContextType);

export function SimulationProvider({ children }: { children: ReactNode }) {
    // ── Should-Cost State ──
    const [scPipelineStage, setScPipelineStage] = useState<PipelineStage>('idle');
    const [scIsCalculating, setScIsCalculating] = useState(false);
    const [scResult, setScResult] = useState<CalculationResult | null>(null);
    const [scPipelineCosts, setScPipelineCosts] = useState<Record<string, number>>({});

    // Refs for simulation intervals to survive re-renders if needed, 
    // though state updates usually trigger re-renders anyway.
    const scIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // ── Data-Sync State ──
    const [syncStates, setSyncStates] = useState<SourceSync[]>(
        dataSources.map(s => ({ sourceId: s.id, stage: 'idle' as SyncStage, progress: 0 }))
    );
    const [isSyncingAll, setIsSyncingAll] = useState(false);
    const [syncLogs, setSyncLogs] = useState<LogEntry[]>([]);

    // Helper: Add Log
    const addSyncLog = useCallback((source: string, message: string, type: LogType = 'info') => {
        const now = new Date();
        const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        setSyncLogs(prev => [{ time, source, message, type }, ...prev].slice(0, 50));
    }, []);


    // ── Run Should-Cost Simulation ──
    const runShouldCostSimulation = useCallback((product: any, choices: any, overheadPct: number, marginPct: number, laborRegion: string, toggles: any) => {
        if (scIsCalculating) return; // Prevent double run
        setScIsCalculating(true);
        setScResult(null);
        setScPipelineCosts({});
        setScPipelineStage('idle');

        // 1. Calculate final results synchronously first to have them ready
        // (Copied logic from original ShouldCostSimulator calculate function)
        const stages: PipelineStage[] = ['bom', 'materials', 'conversion', 'overhead', 'logistics', 'margin', 'complete'];

        // ... (calculation logic) ...
        const bomBreakdown: Array<{ name: string; cost: number }> = [];
        let materialsCost = 0;
        product.bom.forEach((bom: any) => {
            const chosenSupplierId = choices[bom.id] || bom.defaultSupplierId;
            const supplier = bom.suppliers.find((s: any) => s.id === chosenSupplierId);
            const cost = supplier ? supplier.pricePerUnit * bom.scrapFactor : 0;
            materialsCost += cost;
            bomBreakdown.push({ name: bom.name, cost: +cost.toFixed(4) });
        });

        const phaseBreakdown: Array<{ name: string; cost: number; type: string }> = [];
        let conversionCost = 0;
        product.manufacturingPhases.forEach((phase: any) => {
            if (toggles[phase.id] !== false) {
                const mult = phase.laborMultipliers[laborRegion] || 1.0;
                const cost = phase.baseCostPerUnit * mult;
                conversionCost += cost;
                phaseBreakdown.push({ name: phase.name, cost: +cost.toFixed(4), type: phase.type });
            }
        });

        const directLabor = conversionCost * 0.35;
        const overheadFromLabor = directLabor * (overheadPct / 100);
        const scrapAllowance = (materialsCost + conversionCost) * (product.scrapPctDefault / 100);
        const overheadCost = overheadFromLabor + scrapAllowance + product.toolingFixtures;

        const logi = product.logistics;
        const subtotalBeforeLogistics = materialsCost + conversionCost + overheadCost;
        const dutyAmount = subtotalBeforeLogistics * (logi.importDutyPct / 100);
        const logisticsCost = logi.domestic + logi.oceanFreight + dutyAmount + logi.brokerage + logi.destination;

        const costBase = materialsCost + conversionCost + overheadCost + logisticsCost;
        const marginCost = costBase * (marginPct / 100);
        const totalShouldCost = costBase + marginCost;

        const savings = product.currentMarketPrice - totalShouldCost;
        const savingsPercent = (savings / product.currentMarketPrice) * 100;

        const finalResult: CalculationResult = {
            materialsCost, conversionCost, overheadCost, logisticsCost, marginCost,
            totalShouldCost, currentPrice: product.currentMarketPrice,
            savings, savingsPercent, confidence: product.confidenceScore,
            bomBreakdown, phaseBreakdown,
        };

        // 2. Start Animation Interval
        let idx = 0;
        const runningCosts: Record<string, number> = {};

        // Clear any existing interval
        if (scIntervalRef.current) clearInterval(scIntervalRef.current);

        scIntervalRef.current = setInterval(() => {
            if (idx >= stages.length) {
                if (scIntervalRef.current) clearInterval(scIntervalRef.current);
                setScIsCalculating(false);
                setScResult(finalResult);
                return;
            }

            const stage = stages[idx];
            setScPipelineStage(stage);

            if (stage === 'materials') runningCosts.materials = materialsCost;
            if (stage === 'conversion') runningCosts.conversion = conversionCost;
            if (stage === 'overhead') runningCosts.overhead = overheadCost;
            if (stage === 'logistics') runningCosts.logistics = logisticsCost;
            if (stage === 'margin') runningCosts.margin = marginCost;

            // We must update state functionally to avoid closure staleness if dependencies change
            setScPipelineCosts({ ...runningCosts }); // Create new object reference

            idx++;
        }, 30000); // 30s delay as requested

    }, [scIsCalculating]);


    // ── Run Data-Sync Simulation ──
    const simulateSingleSync = useCallback((sourceId: string) => {
        const source = dataSources.find(s => s.id === sourceId);
        if (!source) return;

        const STAGES: SyncStage[] = ['extracting', 'transforming', 'validating', 'loading', 'complete'];
        const STAGE_LABELS: Record<SyncStage, string> = {
            idle: 'Idle', extracting: 'Extracting', transforming: 'Transforming',
            validating: 'Validating', loading: 'Loading', complete: 'Complete', error: 'Error'
        };

        let stageIdx = 0;
        addSyncLog(source.name, 'Sync initiated — connecting to source...', 'info');

        const advanceStage = () => {
            if (stageIdx >= STAGES.length) return;

            const currentStage = STAGES[stageIdx];
            setSyncStates(prev => prev.map(s =>
                s.sourceId === sourceId ? { ...s, stage: currentStage, progress: 0 } : s
            ));
            addSyncLog(source.name, `${STAGE_LABELS[currentStage]} data...`, 'info');

            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 15 + 5;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(progressInterval);

                    if (currentStage === 'complete') {
                        addSyncLog(source.name, `✓ Sync complete — ${source.recordCount.toLocaleString()} records synced`, 'success');
                    }

                    stageIdx++;
                    if (stageIdx < STAGES.length) {
                        setTimeout(advanceStage, 30000); // 30s delay
                    }
                }
                setSyncStates(prev => prev.map(s =>
                    s.sourceId === sourceId ? { ...s, progress: Math.min(progress, 100) } : s
                ));
            }, 3000); // 3s update
        };

        advanceStage();
    }, [addSyncLog]);

    const runSyncSimulation = useCallback((sourceId?: string) => {
        if (sourceId) {
            simulateSingleSync(sourceId);
        } else {
            // Sync All
            if (isSyncingAll) return;
            setIsSyncingAll(true);
            addSyncLog('System', 'Full sync initiated for all connected sources', 'info');

            const connected = dataSources.filter(s => s.status === 'connected');
            connected.forEach((source, i) => {
                setTimeout(() => simulateSingleSync(source.id), i * 5000); // Stagger starts
            });

            // Reset 'isSyncingAll' after rough estimate of completion
            // 4 stages * 30s + buffer
            setTimeout(() => setIsSyncingAll(false), connected.length * 5000 + (130000));
        }
    }, [isSyncingAll, addSyncLog, simulateSingleSync]);


    return (
        <SimulationContext.Provider value={{
            scPipelineStage, scIsCalculating, scResult, scPipelineCosts, runShouldCostSimulation,
            syncStates, isSyncingAll, syncLogs, runSyncSimulation
        }}>
            {children}
        </SimulationContext.Provider>
    );
}

export function useSimulation() {
    return useContext(SimulationContext);
}
