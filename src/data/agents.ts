export interface Agent {
    id: string;
    name: string;
    shortName: string;
    status: 'active' | 'idle';
    description: string;
    x: number;
    y: number;
    connections: string[];
}

export const agents: Agent[] = [
    {
        id: 'orchestrator',
        name: 'Orchestrator Agent',
        shortName: 'Orchestrator',
        status: 'active',
        description: 'Coordinates agent workflows, task routing, and priority management',
        x: 50, y: 8,
        connections: ['commodity', 'bom'],
    },
    {
        id: 'commodity',
        name: 'Commodity Monitor Agent',
        shortName: 'Commodity Monitor',
        status: 'active',
        description: 'Tracks real-time commodity prices from Platts, ICIS, LME exchanges',
        x: 25, y: 35,
        connections: ['cleansheet'],
    },
    {
        id: 'bom',
        name: 'BOM Parser Agent',
        shortName: 'BOM Parser',
        status: 'idle',
        description: 'Extracts and normalizes bill-of-materials from Teamcenter PLM',
        x: 75, y: 35,
        connections: ['cleansheet'],
    },
    {
        id: 'cleansheet',
        name: 'Clean-Sheet Generator',
        shortName: 'Clean-Sheet',
        status: 'idle',
        description: 'Generates bottom-up should-cost models using aPriori process libraries',
        x: 25, y: 62,
        connections: ['risk'],
    },
    {
        id: 'risk',
        name: 'Risk Assessment Agent',
        shortName: 'Risk Assessment',
        status: 'active',
        description: 'Evaluates supply chain disruptions, geopolitical risks, and ESG compliance',
        x: 75, y: 62,
        connections: ['negotiation'],
    },
    {
        id: 'negotiation',
        name: 'Negotiation Strategy Agent',
        shortName: 'Negotiation Strategy',
        status: 'idle',
        description: 'Generates fact-based negotiation briefs, leverage points, and walk-away prices',
        x: 50, y: 88,
        connections: [],
    },
];

export const agentLogEntries = [
    { agent: 'Commodity Monitor', action: 'Detected Nylon 6 price +3.1%', detail: 'Triggered: Clean-sheet recalc for COMP-001, COMP-004' },
    { agent: 'Clean-Sheet Generator', action: 'Recalculated 4 toothbrush variants', detail: 'New should-cost range: $35.2M → $35.8M' },
    { agent: 'Risk Assessment', action: 'Updated LDPE supply chain risk', detail: 'Petrochemical feedstock volatility: Medium → High' },
    { agent: 'Orchestrator', action: 'Dispatched negotiation update', detail: 'Fact pack refresh for BristleCraft Ltd' },
    { agent: 'BOM Parser', action: 'Parsed Electric Toothbrush BOM', detail: '47 sub-components extracted from Teamcenter' },
    { agent: 'Negotiation Strategy', action: 'Generated leverage report', detail: 'PlastiFlex: 3 alternative suppliers identified' },
    { agent: 'Commodity Monitor', action: 'PET Resin stable at $1,240/ton', detail: 'No action required' },
    { agent: 'Risk Assessment', action: 'Taiwan Strait shipping: Normal', detail: 'No disruption to electronics supply' },
    { agent: 'Clean-Sheet Generator', action: 'Motor assembly model refreshed', detail: 'Confidence: 94% (+2%)' },
    { agent: 'Orchestrator', action: 'Savings report generated', detail: 'Q1 total: $2.1M attributed savings' },
];
