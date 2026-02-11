export interface DataSource {
    id: string;
    name: string;
    type: 'internal' | 'external';
    role: string;
    keyData: string[];
    status: 'connected' | 'disconnected' | 'error';
    lastSync: string;
    recordCount: number;
    icon: string; // emoji
    color: string; // tailwind color key
}

export const dataSources: DataSource[] = [
    // Internal Sources
    {
        id: 'teamcenter',
        name: 'Siemens Teamcenter',
        type: 'internal',
        role: 'PLM — master BOM, 3D CAD, engineering change control',
        keyData: ['eBOM', 'mBOM', 'Material specs', 'Tolerances', '3D models'],
        status: 'connected',
        lastSync: '2 min ago',
        recordCount: 14820,
        icon: '🏭',
        color: 'cyan',
    },
    {
        id: 'sap-s4hana',
        name: 'SAP S/4HANA MM',
        type: 'internal',
        role: 'ERP — material master, PO history, vendor master, financials',
        keyData: ['Historical purchase prices', 'PO data', 'Vendor records', 'Condition types'],
        status: 'connected',
        lastSync: '5 min ago',
        recordCount: 248500,
        icon: '📊',
        color: 'blue',
    },
    {
        id: 'sap-ariba',
        name: 'SAP Ariba',
        type: 'internal',
        role: 'Source-to-Pay — strategic sourcing, RFx, contracts, supplier network',
        keyData: ['Supplier quotes', 'RFQ responses', 'Contract terms', 'Supplier performance'],
        status: 'connected',
        lastSync: '12 min ago',
        recordCount: 67200,
        icon: '🤝',
        color: 'purple',
    },
    {
        id: 'powerbi',
        name: 'Power BI / Tableau',
        type: 'internal',
        role: 'Visualization and analytics layer',
        keyData: ['Procurement dashboards', 'Trend analysis', 'KPI tracking'],
        status: 'connected',
        lastSync: '1 hr ago',
        recordCount: 3400,
        icon: '📈',
        color: 'green',
    },
    // External Sources
    {
        id: 'apriori',
        name: 'aPriori',
        type: 'external',
        role: 'Physics-based should-cost modeling — 440+ manufacturing process models',
        keyData: ['Should-cost estimates', 'Process-step breakdowns', 'Regional cost libraries'],
        status: 'connected',
        lastSync: '8 min ago',
        recordCount: 5200,
        icon: '⚙️',
        color: 'amber',
    },
    {
        id: 'platts-icis-lme',
        name: 'Platts / ICIS / LME',
        type: 'external',
        role: 'Commodity intelligence — real-time price assessments',
        keyData: ['Copper', 'Nickel', 'ABS', 'PP', 'Nylon', 'Lithium', 'Neodymium', 'Energy'],
        status: 'connected',
        lastSync: '30 sec ago',
        recordCount: 182400,
        icon: '💹',
        color: 'emerald',
    },
    {
        id: 'dnb-ecovadis',
        name: 'D&B / EcoVadis',
        type: 'external',
        role: 'Supplier risk and ESG intelligence',
        keyData: ['Financial health scores', 'ESG ratings', 'Compliance status'],
        status: 'disconnected',
        lastSync: '3 days ago',
        recordCount: 1240,
        icon: '🛡️',
        color: 'rose',
    },
];

export type SyncStage = 'idle' | 'extracting' | 'transforming' | 'validating' | 'loading' | 'complete' | 'error';

export interface SyncStatus {
    sourceId: string;
    stage: SyncStage;
    progress: number; // 0-100
    startedAt?: number;
}
