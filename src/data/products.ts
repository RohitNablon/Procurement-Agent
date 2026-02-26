import { Zap, Package, Droplets } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Supplier {
    id: string;
    name: string;
    region: string;
    pricePerUnit: number; // USD
    // ── Agentic enrichment fields ──
    financialHealth: 'Stable' | 'Watch' | 'Stressed';
    financialSignal: string;        // D&B-style one-liner
    importDutyPct: number;          // US import tariff %
    fxMovementPct: number;          // YTD local currency vs USD (negative = depreciated)
    scaleScore: number;             // 0-1, higher = better economies of scale
    rmLeverageFactor: number;       // 0.8 - 1.2, <1 = better leverage (lower cost)
    overheadBenchmarkPct: number;   // this supplier's actual overhead %
}

export interface BOMItem {
    id: string;
    name: string;
    material: string;
    weightKg: number;
    commodityIndex: string;      // e.g. "LME Copper"
    commodityPricePerKg: number; // current index $/kg
    suppliers: Supplier[];
    defaultSupplierId: string;
    scrapFactor: number;         // e.g. 1.10 = 10% scrap
}

export interface ManufacturingPhase {
    id: string;
    name: string;
    type: 'automated' | 'manual';
    cycleTimeSec: number;
    baseCostPerUnit: number;    // base at China labor
    laborMultipliers: Record<string, number>; // region → multiplier
    enabled: boolean;            // user can toggle
}

export interface LogisticsCost {
    domestic: number;
    oceanFreight: number;
    importDutyPct: number;
    brokerage: number;
    destination: number;
}

export interface Product {
    id: string;
    name: string;
    icon: LucideIcon;
    description: string;
    annualVolume: number;
    componentIds: string[];  // maps to components.json
    bom: BOMItem[];
    manufacturingPhases: ManufacturingPhase[];
    logistics: LogisticsCost;
    overheadPctDefault: number;   // 50
    scrapPctDefault: number;      // 2
    toolingFixtures: number;      // flat $/unit
    marginDefault: number;        // 12%
    currentMarketPrice: number;   // $/unit
    confidenceScore: number;      // 0-100
}

// ─── Labor rates by region ($/hr) ───
export const laborRegions: Record<string, { label: string; rate: number; code: string }> = {
    china: { label: 'China (Shenzhen)', rate: 8.00, code: 'CN' },
    mexico: { label: 'Mexico (Monterrey)', rate: 11.20, code: 'MX' },
    us: { label: 'United States', rate: 22.00, code: 'US' },
};


// ═══════════════════════════════════════════════════════════════
// Product 1: Premium Electric Toothbrush
// ═══════════════════════════════════════════════════════════════
const electricToothbrush: Product = {
    id: 'PROD-001',
    name: 'Premium Electric Toothbrush',
    icon: Zap,
    description: 'Sonic motor assembly with Li-ion battery, IPX7 waterproof',
    annualVolume: 22_700_000,
    componentIds: ['COMP-001', 'COMP-003', 'COMP-004', 'COMP-009', 'COMP-010'],
    bom: [
        {
            id: 'BOM-001', name: 'Neodymium Ring Magnets (×2)', material: 'N42 Neodymium',
            weightKg: 0.0024, commodityIndex: 'Platts Neodymium Oxide',
            commodityPricePerKg: 952,
            suppliers: [
                { id: 'S-101', name: 'Baotou Rare Earth', region: 'China', pricePerUnit: 1.50, financialHealth: 'Watch', financialSignal: 'Revenue down 12% YoY on reduced EV demand. Aggressively seeking long-term offtake agreements — price concessions available for volume commitments.', importDutyPct: 145, fxMovementPct: -2.1, scaleScore: 0.88, rmLeverageFactor: 0.94, overheadBenchmarkPct: 14 },
                { id: 'S-102', name: 'Shin-Etsu Chemical', region: 'Japan', pricePerUnit: 1.12, financialHealth: 'Stable', financialSignal: 'Operating margin stable at 18.4%. Premium pricing reflects process IP and quality consistency. Limited room for concession without volume step-up.', importDutyPct: 0, fxMovementPct: -8.2, scaleScore: 0.95, rmLeverageFactor: 0.92, overheadBenchmarkPct: 11 },
                { id: 'S-103', name: 'Neo Performance', region: 'Canada', pricePerUnit: 1.38, financialHealth: 'Stable', financialSignal: 'Well-capitalised with diversified customer base. Margin at 14.2%. Open to multi-year pricing with CPI escalator clause.', importDutyPct: 0, fxMovementPct: -1.4, scaleScore: 0.72, rmLeverageFactor: 1.05, overheadBenchmarkPct: 16 },
            ],
            defaultSupplierId: 'S-101', scrapFactor: 1.02,
        },
        {
            id: 'BOM-002', name: 'Copper Winding Wire', material: 'Enameled Copper 0.08mm',
            weightKg: 0.015, commodityIndex: 'LME Copper',
            commodityPricePerKg: 9.15,
            suppliers: [
                { id: 'S-201', name: 'Sumitomo Electric', region: 'Japan', pricePerUnit: 0.24, financialHealth: 'Stable', financialSignal: 'Strong balance sheet, 17.1% operating margin. Wire division growing on EV/infra demand. Standard commercial terms apply.', importDutyPct: 0, fxMovementPct: -8.2, scaleScore: 0.92, rmLeverageFactor: 0.90, overheadBenchmarkPct: 12 },
                { id: 'S-202', name: 'Elektrisola', region: 'Germany', pricePerUnit: 0.35, financialHealth: 'Watch', financialSignal: 'Energy cost increases impacted FY25 margins (down to 6.8%). Willing to discount 4–6% for 18-month volume lock-in to stabilise plant utilisation.', importDutyPct: 0, fxMovementPct: 3.1, scaleScore: 0.78, rmLeverageFactor: 1.10, overheadBenchmarkPct: 18 },
            ],
            defaultSupplierId: 'S-201', scrapFactor: 1.10,
        },
        {
            id: 'BOM-003', name: 'Steel Shaft', material: '416 Stainless Steel',
            weightKg: 0.012, commodityIndex: 'Steel Index',
            commodityPricePerKg: 2.80,
            suppliers: [
                { id: 'S-301', name: 'Nippon Steel', region: 'Japan', pricePerUnit: 0.15, financialHealth: 'Stable', financialSignal: 'World-class manufacturer, margin 9.2%. Capacity fully allocated through Q3. Limited negotiation leverage on price; focus on delivery terms and quality SLAs.', importDutyPct: 0, fxMovementPct: -8.2, scaleScore: 0.97, rmLeverageFactor: 0.88, overheadBenchmarkPct: 10 },
                { id: 'S-302', name: 'POSCO', region: 'Korea', pricePerUnit: 0.14, financialHealth: 'Watch', financialSignal: 'Margin compressed to 4.1% amid global steel oversupply. Open to rebate structures tied to annual volume. D&B score shows mild credit tightening.', importDutyPct: 0, fxMovementPct: -5.6, scaleScore: 0.94, rmLeverageFactor: 0.95, overheadBenchmarkPct: 12 },
            ],
            defaultSupplierId: 'S-301', scrapFactor: 1.05,
        },
        {
            id: 'BOM-004', name: 'ABS Housings (Stator + Rotor)', material: 'ABS Injection Molded',
            weightKg: 0.008, commodityIndex: 'Platts ABS Asia',
            commodityPricePerKg: 1.65,
            suppliers: [
                { id: 'S-401', name: 'Chi Mei Corp', region: 'Taiwan', pricePerUnit: 0.27, financialHealth: 'Stable', financialSignal: 'Solid operating margin at 11.8%, well-diversified customer base. Minor capacity constraints in H1. Recommend multi-year agreement with volume escalator.', importDutyPct: 32, fxMovementPct: -3.2, scaleScore: 0.85, rmLeverageFactor: 0.95, overheadBenchmarkPct: 13 },
                { id: 'S-402', name: 'SABIC', region: 'Saudi Arabia', pricePerUnit: 0.31, financialHealth: 'Stable', financialSignal: 'Backed by Saudi Aramco. Near-unlimited feedstock advantage. Premium priced but financially rock-solid. Lower risk, higher cost — suitable for critical SKUs.', importDutyPct: 0, fxMovementPct: 0.1, scaleScore: 0.99, rmLeverageFactor: 0.82, overheadBenchmarkPct: 9 },
                { id: 'S-403', name: 'LG Chem', region: 'South Korea', pricePerUnit: 0.25, financialHealth: 'Stable', financialSignal: 'Diversified giant. Scale in ABS allows for aggressive pricing on multi-year offtake. Internal \'Learning\' suggests 4% OH reduction possible via better absorption.', importDutyPct: 0, fxMovementPct: -5.1, scaleScore: 0.96, rmLeverageFactor: 0.88, overheadBenchmarkPct: 10 },
                { id: 'S-404', name: 'PlastiFlex (Local)', region: 'China', pricePerUnit: 0.62, financialHealth: 'Watch', financialSignal: 'Struggling with feedstock volatility. High OH (18%) reflects poor absorption. Significant negotiation lever: benchmarking against SABIC scale.', importDutyPct: 145, fxMovementPct: -2.1, scaleScore: 0.45, rmLeverageFactor: 1.15, overheadBenchmarkPct: 18 },
            ],
            defaultSupplierId: 'S-401', scrapFactor: 1.03,
        },
        {
            id: 'BOM-005', name: 'PCB Controller Assembly', material: 'Custom 4-layer PCB',
            weightKg: 0.005, commodityIndex: 'PCB Fab Index',
            commodityPricePerKg: 0,
            suppliers: [
                { id: 'S-501', name: 'Jabil Circuit', region: 'China', pricePerUnit: 1.40, financialHealth: 'Stable', financialSignal: 'Strong balance sheet ($1.8B cash). Margin 4.2% typical for EMS. Competitive on China-based volumes; watch tariff exposure on US shipments.', importDutyPct: 145, fxMovementPct: -2.1, scaleScore: 0.93, rmLeverageFactor: 0.90, overheadBenchmarkPct: 11 },
                { id: 'S-502', name: 'Flex Ltd', region: 'Malaysia', pricePerUnit: 0.92, financialHealth: 'Watch', financialSignal: 'Margin declined from 5.1% to 3.6% due to component cost headwinds. Seeking volume to restore plant utilisation — price flexibility available on 12-month commits.', importDutyPct: 46, fxMovementPct: -4.1, scaleScore: 0.89, rmLeverageFactor: 0.98, overheadBenchmarkPct: 13 },
            ],
            defaultSupplierId: 'S-501', scrapFactor: 1.01,
        },
        {
            id: 'BOM-006', name: 'Ball Bearings (×2)', material: 'Miniature 682ZZ',
            weightKg: 0.002, commodityIndex: 'Catalog',
            commodityPricePerKg: 0,
            suppliers: [
                { id: 'S-601', name: 'NMB Minebea', region: 'Japan', pricePerUnit: 0.12, financialHealth: 'Stable', financialSignal: 'Highly profitable globally (margin 15%+). Miniature bearing leader. Price is best-in-class; focus negotiation on JIT delivery terms and warranty extension.', importDutyPct: 0, fxMovementPct: -8.2, scaleScore: 0.96, rmLeverageFactor: 0.85, overheadBenchmarkPct: 10 },
                { id: 'S-602', name: 'NTN Corp', region: 'Japan', pricePerUnit: 0.16, financialHealth: 'Watch', financialSignal: 'Restructuring ongoing following automotive downturn. Margin at 2.8%. Willing to offer 5–7% price reduction to retain precision-parts customers through transition.', importDutyPct: 0, fxMovementPct: -8.2, scaleScore: 0.88, rmLeverageFactor: 1.02, overheadBenchmarkPct: 15 },
            ],
            defaultSupplierId: 'S-601', scrapFactor: 1.01,
        },
        {
            id: 'BOM-007', name: 'Electronics (Caps + Resistors + Pins)', material: 'SMD Components',
            weightKg: 0.001, commodityIndex: 'Catalog',
            commodityPricePerKg: 0,
            suppliers: [
                { id: 'S-701', name: 'Digikey/Mouser', region: 'US', pricePerUnit: 0.24, financialHealth: 'Stable', financialSignal: 'Distributor model — healthy. No single-supplier risk. Pricing at catalog; negotiate bill-of-materials NRE for custom-sourced parts at volume.', importDutyPct: 0, fxMovementPct: 0.0, scaleScore: 0.70, rmLeverageFactor: 1.20, overheadBenchmarkPct: 20 },
                { id: 'S-702', name: 'LCSC Electronics', region: 'China', pricePerUnit: 0.22, financialHealth: 'Stressed', financialSignal: 'Rapid growth but thin margins (1.8%). Credit facilities tightening per D&B report. Significant tariff exposure (145%) on US-destined shipments — total landed cost may exceed Digikey.', importDutyPct: 145, fxMovementPct: -2.1, scaleScore: 0.65, rmLeverageFactor: 1.10, overheadBenchmarkPct: 22 },
            ],
            defaultSupplierId: 'S-701', scrapFactor: 1.01,
        },
        {
            id: 'BOM-008', name: 'Epoxy + Silicone Seal', material: 'Structural Adhesive + O-ring',
            weightKg: 0.003, commodityIndex: 'Commodity Chemical',
            commodityPricePerKg: 0,
            suppliers: [
                { id: 'S-801', name: 'Henkel Loctite', region: 'Germany', pricePerUnit: 0.20, financialHealth: 'Stable', financialSignal: 'Strong specialty chemicals margins (11.4%). EUR appreciation creates FX headwind — negotiate USD-denominated pricing for forward certainty.', importDutyPct: 0, fxMovementPct: 3.1, scaleScore: 0.91, rmLeverageFactor: 0.88, overheadBenchmarkPct: 13 },
                { id: 'S-802', name: '3M Industrial', region: 'US', pricePerUnit: 0.22, financialHealth: 'Stable', financialSignal: 'Domestic US supplier — zero tariff risk. Margin stable at 18%. Premium priced; negotiate on order consolidation and VMI terms rather than unit price.', importDutyPct: 0, fxMovementPct: 0.0, scaleScore: 0.87, rmLeverageFactor: 0.95, overheadBenchmarkPct: 15 },
            ],
            defaultSupplierId: 'S-801', scrapFactor: 1.02,
        },
    ],
    manufacturingPhases: [
        { id: 'MFG-01', name: 'Automated Winding', type: 'automated', cycleTimeSec: 90, baseCostPerUnit: 0.195, laborMultipliers: { china: 1.0, mexico: 1.15, us: 1.65 }, enabled: true },
        { id: 'MFG-02', name: 'Magnet Insertion', type: 'manual', cycleTimeSec: 15, baseCostPerUnit: 0.042, laborMultipliers: { china: 1.0, mexico: 1.40, us: 2.75 }, enabled: true },
        { id: 'MFG-03', name: 'Housing Assembly', type: 'manual', cycleTimeSec: 25, baseCostPerUnit: 0.056, laborMultipliers: { china: 1.0, mexico: 1.40, us: 2.75 }, enabled: true },
        { id: 'MFG-04', name: 'PCB Soldering (SMT)', type: 'automated', cycleTimeSec: 8, baseCostPerUnit: 0.057, laborMultipliers: { china: 1.0, mexico: 1.10, us: 1.40 }, enabled: true },
        { id: 'MFG-05', name: 'Bearing + Shaft Install', type: 'manual', cycleTimeSec: 30, baseCostPerUnit: 0.074, laborMultipliers: { china: 1.0, mexico: 1.40, us: 2.75 }, enabled: true },
        { id: 'MFG-06', name: 'Ultrasonic Sealing', type: 'automated', cycleTimeSec: 12, baseCostPerUnit: 0.046, laborMultipliers: { china: 1.0, mexico: 1.10, us: 1.40 }, enabled: true },
        { id: 'MFG-07', name: 'Functional Testing', type: 'automated', cycleTimeSec: 30, baseCostPerUnit: 0.097, laborMultipliers: { china: 1.0, mexico: 1.05, us: 1.30 }, enabled: true },
        { id: 'MFG-08', name: 'Packaging', type: 'manual', cycleTimeSec: 20, baseCostPerUnit: 0.112, laborMultipliers: { china: 1.0, mexico: 1.30, us: 2.50 }, enabled: true },
    ],
    logistics: { domestic: 0.06, oceanFreight: 0.05, importDutyPct: 2.5, brokerage: 0.025, destination: 0.04 },
    overheadPctDefault: 50,
    scrapPctDefault: 2,
    toolingFixtures: 0.03,
    marginDefault: 12,
    currentMarketPrice: 8.50,
    confidenceScore: 75,
};


// ═══════════════════════════════════════════════════════════════
// Product 2: Toothpaste Tube Assembly
// ═══════════════════════════════════════════════════════════════
const toothpasteTube: Product = {
    id: 'PROD-002',
    name: 'Toothpaste Tube Assembly',
    icon: Package,
    description: 'Multi-layer LDPE tube with HDPE flip-top cap',
    annualVolume: 50_000_000,
    componentIds: ['COMP-002', 'COMP-007'],
    bom: [
        {
            id: 'BOM-T01', name: 'LDPE Tube Body', material: 'Low-Density Polyethylene',
            weightKg: 0.012, commodityIndex: 'ICIS LDPE Asia',
            commodityPricePerKg: 1.42,
            suppliers: [
                { id: 'S-T101', name: 'FlexiPack Solutions', region: 'India', pricePerUnit: 0.075, financialHealth: 'Watch', financialSignal: 'Margin pressure (4.1%) from rising LDPE feedstock costs. Seeking volume to improve absorption. Price concession of 5–8% available on 18-month commit.', importDutyPct: 0, fxMovementPct: 1.2, scaleScore: 0.72, rmLeverageFactor: 1.05, overheadBenchmarkPct: 18 },
                { id: 'S-T102', name: 'Albea Group', region: 'France', pricePerUnit: 0.082, financialHealth: 'Stable', financialSignal: 'Global packaging leader, healthy margin 9.8%. EUR hardening creates ~3% FX tailwind for USD contracts. Solid choice for premium cosmetic-grade tubes.', importDutyPct: 0, fxMovementPct: 3.1, scaleScore: 0.91, rmLeverageFactor: 0.92, overheadBenchmarkPct: 12 },
                { id: 'S-T103', name: 'Essel Propack', region: 'India', pricePerUnit: 0.058, financialHealth: 'Stable', financialSignal: 'Largest laminated tube maker globally. Stable 12.4% EBITDA margin. Lowest cost option; INR depreciation provides additional ~1.2% cost benefit vs. prior year.', importDutyPct: 0, fxMovementPct: 1.2, scaleScore: 0.95, rmLeverageFactor: 0.90, overheadBenchmarkPct: 10 },
            ],
            defaultSupplierId: 'S-T101', scrapFactor: 1.05,
        },
        {
            id: 'BOM-T02', name: 'Aluminum Barrier Layer', material: 'Aluminum Foil 12μm',
            weightKg: 0.003, commodityIndex: 'LME Aluminum',
            commodityPricePerKg: 2.45,
            suppliers: [
                { id: 'S-T201', name: 'Novelis', region: 'US', pricePerUnit: 0.018, financialHealth: 'Stable', financialSignal: 'Owned by Hindalco; strong $2B+ EBITDA. US domestic = zero tariff risk. Premium priced for aerospace-grade foil; negotiate on gauge and alloy specification.', importDutyPct: 0, fxMovementPct: 0.0, scaleScore: 0.96, rmLeverageFactor: 0.88, overheadBenchmarkPct: 10 },
                { id: 'S-T202', name: 'Hindalco', region: 'India', pricePerUnit: 0.014, financialHealth: 'Stable', financialSignal: 'Parent co. of Novelis; vertically integrated from bauxite. Lowest-cost option. INR depreciation provides ongoing cost advantage. Strong D&B rating.', importDutyPct: 0, fxMovementPct: 1.2, scaleScore: 0.94, rmLeverageFactor: 0.92, overheadBenchmarkPct: 11 },
            ],
            defaultSupplierId: 'S-T202', scrapFactor: 1.08,
        },
        {
            id: 'BOM-T03', name: 'HDPE Flip-Top Cap', material: 'High-Density Polyethylene',
            weightKg: 0.006, commodityIndex: 'ICIS HDPE SEA',
            commodityPricePerKg: 1.28,
            suppliers: [
                { id: 'S-T301', name: 'CapMasters Inc', region: 'China', pricePerUnit: 0.052, financialHealth: 'Stressed', financialSignal: 'Thin margins (2.1%) and slowing orders post domestic demand correction. Under pressure. 145% US tariff on China origin significantly impacts landed cost — total ≈ $0.127 vs. quoted.', importDutyPct: 145, fxMovementPct: -2.1, scaleScore: 0.68, rmLeverageFactor: 1.12, overheadBenchmarkPct: 22 },
                { id: 'S-T302', name: 'Berry Global', region: 'US', pricePerUnit: 0.045, financialHealth: 'Stable', financialSignal: 'US domestic — zero tariff risk. Solid 14% EBITDA margin. Premium priced but best total-cost option when China tariffs are factored in. Negotiate on consolidation of cap + disc SKUs.', importDutyPct: 0, fxMovementPct: 0.0, scaleScore: 0.92, rmLeverageFactor: 0.90, overheadBenchmarkPct: 12 },
            ],
            defaultSupplierId: 'S-T301', scrapFactor: 1.03,
        },
        {
            id: 'BOM-T04', name: 'Shoulder Disc', material: 'HDPE + Pigment',
            weightKg: 0.004, commodityIndex: 'ICIS HDPE SEA',
            commodityPricePerKg: 1.28,
            suppliers: [
                { id: 'S-T401', name: 'CapMasters Inc', region: 'China', pricePerUnit: 0.026, financialHealth: 'Stressed', financialSignal: 'Same supplier as HDPE Cap — combined order leverage possible. Tariff exposure is critical: 145% duty means landed cost ~$0.064. Re-evaluate vs. US domestic.', importDutyPct: 145, fxMovementPct: -2.1, scaleScore: 0.68, rmLeverageFactor: 1.12, overheadBenchmarkPct: 22 },
                { id: 'S-T402', name: 'Silgan Closures', region: 'US', pricePerUnit: 0.022, financialHealth: 'Stable', financialSignal: 'Market leader in US closures, 12% EBITDA. Consolidating shoulder disc + flip cap orders could unlock 6–9% volume discount. Zero tariff risk.', importDutyPct: 0, fxMovementPct: 0.0, scaleScore: 0.93, rmLeverageFactor: 0.94, overheadBenchmarkPct: 11 },
            ],
            defaultSupplierId: 'S-T401', scrapFactor: 1.04,
        },
        {
            id: 'BOM-T05', name: 'Printing Ink (6-color)', material: 'UV Flexo Ink',
            weightKg: 0.001, commodityIndex: 'Specialty Chemical',
            commodityPricePerKg: 18.0,
            suppliers: [
                { id: 'S-T501', name: 'Sun Chemical', region: 'US', pricePerUnit: 0.025, financialHealth: 'Stable', financialSignal: 'Part of DIC Corp (Japan). US-based supply — zero tariff risk. Ink formulation IP gives negotiation floor. Focus on colour-matching SLA and reformulation costs.', importDutyPct: 0, fxMovementPct: 0.0, scaleScore: 0.88, rmLeverageFactor: 0.95, overheadBenchmarkPct: 14 },
                { id: 'S-T502', name: 'Siegwerk', region: 'Germany', pricePerUnit: 0.032, financialHealth: 'Watch', financialSignal: 'EUR strengthening has raised USD-equivalent cost 3.1% vs. prior year. Margins at 7.2% and under pressure. Request USD-denominated contract to lock in FX risk.', importDutyPct: 0, fxMovementPct: 3.1, scaleScore: 0.82, rmLeverageFactor: 1.02, overheadBenchmarkPct: 16 },
            ],
            defaultSupplierId: 'S-T501', scrapFactor: 1.02,
        },
    ],
    manufacturingPhases: [
        { id: 'MFG-T01', name: 'Tube Extrusion', type: 'automated', cycleTimeSec: 4, baseCostPerUnit: 0.018, laborMultipliers: { china: 1.0, mexico: 1.10, us: 1.50 }, enabled: true },
        { id: 'MFG-T02', name: 'Lamination', type: 'automated', cycleTimeSec: 3, baseCostPerUnit: 0.012, laborMultipliers: { china: 1.0, mexico: 1.10, us: 1.45 }, enabled: true },
        { id: 'MFG-T03', name: 'Printing (6-color flexo)', type: 'automated', cycleTimeSec: 5, baseCostPerUnit: 0.022, laborMultipliers: { china: 1.0, mexico: 1.15, us: 1.55 }, enabled: true },
        { id: 'MFG-T04', name: 'Tube Forming + Side Seam', type: 'automated', cycleTimeSec: 6, baseCostPerUnit: 0.015, laborMultipliers: { china: 1.0, mexico: 1.10, us: 1.45 }, enabled: true },
        { id: 'MFG-T05', name: 'Shoulder Molding + Assembly', type: 'automated', cycleTimeSec: 8, baseCostPerUnit: 0.020, laborMultipliers: { china: 1.0, mexico: 1.12, us: 1.50 }, enabled: true },
        { id: 'MFG-T06', name: 'Cap Application', type: 'manual', cycleTimeSec: 3, baseCostPerUnit: 0.008, laborMultipliers: { china: 1.0, mexico: 1.40, us: 2.75 }, enabled: true },
        { id: 'MFG-T07', name: 'Quality Inspection', type: 'automated', cycleTimeSec: 2, baseCostPerUnit: 0.006, laborMultipliers: { china: 1.0, mexico: 1.05, us: 1.25 }, enabled: true },
        { id: 'MFG-T08', name: 'Cartoning', type: 'manual', cycleTimeSec: 5, baseCostPerUnit: 0.010, laborMultipliers: { china: 1.0, mexico: 1.30, us: 2.50 }, enabled: true },
    ],
    logistics: { domestic: 0.02, oceanFreight: 0.01, importDutyPct: 3.0, brokerage: 0.008, destination: 0.015 },
    overheadPctDefault: 45,
    scrapPctDefault: 3,
    toolingFixtures: 0.01,
    marginDefault: 10,
    currentMarketPrice: 0.38,
    confidenceScore: 82,
};


// ═══════════════════════════════════════════════════════════════
// Product 3: Mouthwash Bottle
// ═══════════════════════════════════════════════════════════════
const mouthwashBottle: Product = {
    id: 'PROD-003',
    name: 'Mouthwash PET Bottle',
    icon: Droplets,
    description: '500ml PET blow-molded bottle with PP dosing cap',
    annualVolume: 40_000_000,
    componentIds: ['COMP-005', 'COMP-006', 'COMP-008'],
    bom: [
        {
            id: 'BOM-M01', name: 'PET Preform', material: 'Polyethylene Terephthalate',
            weightKg: 0.028, commodityIndex: 'ICIS PET Asia',
            commodityPricePerKg: 1.24,
            suppliers: [
                { id: 'S-M101', name: 'BottleTech Industries', region: 'Thailand', pricePerUnit: 0.050, financialHealth: 'Watch', financialSignal: 'Revenue dropped 8% from lost automotive client. Overcapacity situation = strong buyer leverage. Price concession of 8–12% has been signalled through industry channel checks.', importDutyPct: 0, fxMovementPct: -2.8, scaleScore: 0.74, rmLeverageFactor: 1.08, overheadBenchmarkPct: 17 },
                { id: 'S-M102', name: 'Alpla Group', region: 'Austria', pricePerUnit: 0.055, financialHealth: 'Stable', financialSignal: 'Privately held, very strong financials. Global PET leader. Premium for quality/consistency. EUR appreciation adds ~3% headwind — seek USD contract pricing.', importDutyPct: 0, fxMovementPct: 3.1, scaleScore: 0.97, rmLeverageFactor: 0.88, overheadBenchmarkPct: 9 },
                { id: 'S-M103', name: 'Manjushree Technopack', region: 'India', pricePerUnit: 0.038, financialHealth: 'Stable', financialSignal: 'Largest Indian PET packager. Strong 14.6% EBITDA. INR depreciation provides ~1.2% annual benefit. Ideal for high-volume price-sensitive SKUs.', importDutyPct: 0, fxMovementPct: 1.2, scaleScore: 0.89, rmLeverageFactor: 0.94, overheadBenchmarkPct: 12 },
            ],
            defaultSupplierId: 'S-M101', scrapFactor: 1.04,
        },
        {
            id: 'BOM-M02', name: 'PP Dosing Cap', material: 'Polypropylene',
            weightKg: 0.008, commodityIndex: 'ICIS PP Asia',
            commodityPricePerKg: 1.15,
            suppliers: [
                { id: 'S-M201', name: 'Closure Systems Intl', region: 'US', pricePerUnit: 0.028, financialHealth: 'Stable', financialSignal: 'Owned by Bericap; global closure leader. US domestic = zero tariff exposure. Stable margins, strong supply reliability. Negotiate on tooling amortisation for custom cap design.', importDutyPct: 0, fxMovementPct: 0.0, scaleScore: 0.93, rmLeverageFactor: 0.92, overheadBenchmarkPct: 11 },
                { id: 'S-M202', name: 'United Caps', region: 'Belgium', pricePerUnit: 0.036, financialHealth: 'Stable', financialSignal: 'European specialty closure maker. EUR appreciation creates ~3% FX headwind. Premium for tamper-evident and child-resistant variants. Good for regulatory-sensitive markets.', importDutyPct: 0, fxMovementPct: 3.1, scaleScore: 0.81, rmLeverageFactor: 1.05, overheadBenchmarkPct: 14 },
            ],
            defaultSupplierId: 'S-M201', scrapFactor: 1.03,
        },
        {
            id: 'BOM-M03', name: 'Shrink Sleeve Label', material: 'PVC/PETG Film',
            weightKg: 0.004, commodityIndex: 'Specialty Film',
            commodityPricePerKg: 3.20,
            suppliers: [
                { id: 'S-M301', name: 'CCL Industries', region: 'Canada', pricePerUnit: 0.022, financialHealth: 'Stable', financialSignal: 'World leader in specialty labels. Strong 18%+ EBITDA margin. CAD relatively stable vs USD. Focus negotiation on print complexity fee reduction for simpler label designs.', importDutyPct: 0, fxMovementPct: -1.4, scaleScore: 0.92, rmLeverageFactor: 0.90, overheadBenchmarkPct: 11 },
                { id: 'S-M302', name: 'Huhtamaki', region: 'Finland', pricePerUnit: 0.030, financialHealth: 'Watch', financialSignal: 'Restructuring underway, targeting 500 headcount reduction. EUR headwind creating margin pressure. Under pressure to retain key accounts — price discussion window is open.', importDutyPct: 0, fxMovementPct: 3.1, scaleScore: 0.84, rmLeverageFactor: 1.05, overheadBenchmarkPct: 15 },
            ],
            defaultSupplierId: 'S-M301', scrapFactor: 1.06,
        },
        {
            id: 'BOM-M04', name: 'Colorant Masterbatch', material: 'Tinted Concentrate',
            weightKg: 0.002, commodityIndex: 'Specialty Chemical',
            commodityPricePerKg: 5.50,
            suppliers: [
                { id: 'S-M401', name: 'Clariant', region: 'Switzerland', pricePerUnit: 0.015, financialHealth: 'Stable', financialSignal: 'Specialty chemical leader. CHF appreciation is a headwind — negotiate pricing in USD. Niche technology in bio-based masterbatch gives them pricing power.', importDutyPct: 0, fxMovementPct: 4.2, scaleScore: 0.89, rmLeverageFactor: 0.95, overheadBenchmarkPct: 14 },
                { id: 'S-M402', name: 'Plastiblends', region: 'India', pricePerUnit: 0.011, financialHealth: 'Stable', financialSignal: 'Strong growth trajectory (+18% revenue YoY). Best-in-cost by significant margin. INR depreciation continues to provide tailwind. Ideal for high-volume standard colorways.', importDutyPct: 0, fxMovementPct: 1.2, scaleScore: 0.82, rmLeverageFactor: 0.98, overheadBenchmarkPct: 13 },
            ],
            defaultSupplierId: 'S-M402', scrapFactor: 1.02,
        },
    ],
    manufacturingPhases: [
        { id: 'MFG-M01', name: 'PET Injection (Preform)', type: 'automated', cycleTimeSec: 12, baseCostPerUnit: 0.015, laborMultipliers: { china: 1.0, mexico: 1.10, us: 1.50 }, enabled: true },
        { id: 'MFG-M02', name: 'Stretch Blow Molding', type: 'automated', cycleTimeSec: 8, baseCostPerUnit: 0.012, laborMultipliers: { china: 1.0, mexico: 1.10, us: 1.45 }, enabled: true },
        { id: 'MFG-M03', name: 'Labeling (Shrink Sleeve)', type: 'automated', cycleTimeSec: 4, baseCostPerUnit: 0.008, laborMultipliers: { china: 1.0, mexico: 1.05, us: 1.30 }, enabled: true },
        { id: 'MFG-M04', name: 'Cap Application', type: 'automated', cycleTimeSec: 3, baseCostPerUnit: 0.005, laborMultipliers: { china: 1.0, mexico: 1.08, us: 1.35 }, enabled: true },
        { id: 'MFG-M05', name: 'Leak Testing', type: 'automated', cycleTimeSec: 5, baseCostPerUnit: 0.008, laborMultipliers: { china: 1.0, mexico: 1.05, us: 1.25 }, enabled: true },
        { id: 'MFG-M06', name: 'Case Packing', type: 'manual', cycleTimeSec: 6, baseCostPerUnit: 0.010, laborMultipliers: { china: 1.0, mexico: 1.30, us: 2.50 }, enabled: true },
    ],
    logistics: { domestic: 0.015, oceanFreight: 0.008, importDutyPct: 2.0, brokerage: 0.005, destination: 0.010 },
    overheadPctDefault: 42,
    scrapPctDefault: 2.5,
    toolingFixtures: 0.008,
    marginDefault: 10,
    currentMarketPrice: 0.22,
    confidenceScore: 85,
};


export const products: Product[] = [electricToothbrush, toothpasteTube, mouthwashBottle];
