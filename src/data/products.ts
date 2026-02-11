import { Zap, Package, Droplets } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface Supplier {
    id: string;
    name: string;
    region: string;
    pricePerUnit: number; // USD
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
    annualVolume: 2_000_000,
    componentIds: ['COMP-001', 'COMP-003', 'COMP-004', 'COMP-009', 'COMP-010'],
    bom: [
        {
            id: 'BOM-001', name: 'Neodymium Ring Magnets (×2)', material: 'N42 Neodymium',
            weightKg: 0.0024, commodityIndex: 'Platts Neodymium Oxide',
            commodityPricePerKg: 952,
            suppliers: [
                { id: 'S-101', name: 'Baotou Rare Earth', region: 'China', pricePerUnit: 0.90 },
                { id: 'S-102', name: 'Shin-Etsu Chemical', region: 'Japan', pricePerUnit: 1.12 },
                { id: 'S-103', name: 'Neo Performance', region: 'Canada', pricePerUnit: 1.28 },
            ],
            defaultSupplierId: 'S-101', scrapFactor: 1.02,
        },
        {
            id: 'BOM-002', name: 'Copper Winding Wire', material: 'Enameled Copper 0.08mm',
            weightKg: 0.015, commodityIndex: 'LME Copper',
            commodityPricePerKg: 9.15,
            suppliers: [
                { id: 'S-201', name: 'Sumitomo Electric', region: 'Japan', pricePerUnit: 0.24 },
                { id: 'S-202', name: 'Elektrisola', region: 'Germany', pricePerUnit: 0.29 },
            ],
            defaultSupplierId: 'S-201', scrapFactor: 1.10,
        },
        {
            id: 'BOM-003', name: 'Steel Shaft', material: '416 Stainless Steel',
            weightKg: 0.012, commodityIndex: 'Steel Index',
            commodityPricePerKg: 2.80,
            suppliers: [
                { id: 'S-301', name: 'Nippon Steel', region: 'Japan', pricePerUnit: 0.15 },
                { id: 'S-302', name: 'POSCO', region: 'Korea', pricePerUnit: 0.14 },
            ],
            defaultSupplierId: 'S-301', scrapFactor: 1.05,
        },
        {
            id: 'BOM-004', name: 'ABS Housings (Stator + Rotor)', material: 'ABS Injection Molded',
            weightKg: 0.008, commodityIndex: 'Platts ABS Asia',
            commodityPricePerKg: 1.65,
            suppliers: [
                { id: 'S-401', name: 'Chi Mei Corp', region: 'Taiwan', pricePerUnit: 0.27 },
                { id: 'S-402', name: 'SABIC', region: 'Saudi Arabia', pricePerUnit: 0.31 },
            ],
            defaultSupplierId: 'S-401', scrapFactor: 1.03,
        },
        {
            id: 'BOM-005', name: 'PCB Controller Assembly', material: 'Custom 4-layer PCB',
            weightKg: 0.005, commodityIndex: 'PCB Fab Index',
            commodityPricePerKg: 0,
            suppliers: [
                { id: 'S-501', name: 'Jabil Circuit', region: 'China', pricePerUnit: 0.85 },
                { id: 'S-502', name: 'Flex Ltd', region: 'Malaysia', pricePerUnit: 0.92 },
            ],
            defaultSupplierId: 'S-501', scrapFactor: 1.01,
        },
        {
            id: 'BOM-006', name: 'Ball Bearings (×2)', material: 'Miniature 682ZZ',
            weightKg: 0.002, commodityIndex: 'Catalog',
            commodityPricePerKg: 0,
            suppliers: [
                { id: 'S-601', name: 'NMB Minebea', region: 'Japan', pricePerUnit: 0.12 },
                { id: 'S-602', name: 'NTN Corp', region: 'Japan', pricePerUnit: 0.14 },
            ],
            defaultSupplierId: 'S-601', scrapFactor: 1.01,
        },
        {
            id: 'BOM-007', name: 'Electronics (Caps + Resistors + Pins)', material: 'SMD Components',
            weightKg: 0.001, commodityIndex: 'Catalog',
            commodityPricePerKg: 0,
            suppliers: [
                { id: 'S-701', name: 'Digikey/Mouser', region: 'US', pricePerUnit: 0.18 },
                { id: 'S-702', name: 'LCSC Electronics', region: 'China', pricePerUnit: 0.14 },
            ],
            defaultSupplierId: 'S-701', scrapFactor: 1.01,
        },
        {
            id: 'BOM-008', name: 'Epoxy + Silicone Seal', material: 'Structural Adhesive + O-ring',
            weightKg: 0.003, commodityIndex: 'Commodity Chemical',
            commodityPricePerKg: 0,
            suppliers: [
                { id: 'S-801', name: 'Henkel Loctite', region: 'Germany', pricePerUnit: 0.20 },
                { id: 'S-802', name: '3M Industrial', region: 'US', pricePerUnit: 0.22 },
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
    annualVolume: 5_000_000,
    componentIds: ['COMP-002', 'COMP-007'],
    bom: [
        {
            id: 'BOM-T01', name: 'LDPE Tube Body', material: 'Low-Density Polyethylene',
            weightKg: 0.012, commodityIndex: 'ICIS LDPE Asia',
            commodityPricePerKg: 1.42,
            suppliers: [
                { id: 'S-T101', name: 'FlexiPack Solutions', region: 'India', pricePerUnit: 0.065 },
                { id: 'S-T102', name: 'Albea Group', region: 'France', pricePerUnit: 0.082 },
                { id: 'S-T103', name: 'Essel Propack', region: 'India', pricePerUnit: 0.058 },
            ],
            defaultSupplierId: 'S-T101', scrapFactor: 1.05,
        },
        {
            id: 'BOM-T02', name: 'Aluminum Barrier Layer', material: 'Aluminum Foil 12μm',
            weightKg: 0.003, commodityIndex: 'LME Aluminum',
            commodityPricePerKg: 2.45,
            suppliers: [
                { id: 'S-T201', name: 'Novelis', region: 'US', pricePerUnit: 0.018 },
                { id: 'S-T202', name: 'Hindalco', region: 'India', pricePerUnit: 0.014 },
            ],
            defaultSupplierId: 'S-T202', scrapFactor: 1.08,
        },
        {
            id: 'BOM-T03', name: 'HDPE Flip-Top Cap', material: 'High-Density Polyethylene',
            weightKg: 0.006, commodityIndex: 'ICIS HDPE SEA',
            commodityPricePerKg: 1.28,
            suppliers: [
                { id: 'S-T301', name: 'CapMasters Inc', region: 'China', pricePerUnit: 0.032 },
                { id: 'S-T302', name: 'Berry Global', region: 'US', pricePerUnit: 0.045 },
            ],
            defaultSupplierId: 'S-T301', scrapFactor: 1.03,
        },
        {
            id: 'BOM-T04', name: 'Shoulder Disc', material: 'HDPE + Pigment',
            weightKg: 0.004, commodityIndex: 'ICIS HDPE SEA',
            commodityPricePerKg: 1.28,
            suppliers: [
                { id: 'S-T401', name: 'CapMasters Inc', region: 'China', pricePerUnit: 0.015 },
                { id: 'S-T402', name: 'Silgan Closures', region: 'US', pricePerUnit: 0.022 },
            ],
            defaultSupplierId: 'S-T401', scrapFactor: 1.04,
        },
        {
            id: 'BOM-T05', name: 'Printing Ink (6-color)', material: 'UV Flexo Ink',
            weightKg: 0.001, commodityIndex: 'Specialty Chemical',
            commodityPricePerKg: 18.0,
            suppliers: [
                { id: 'S-T501', name: 'Sun Chemical', region: 'US', pricePerUnit: 0.025 },
                { id: 'S-T502', name: 'Siegwerk', region: 'Germany', pricePerUnit: 0.028 },
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
    annualVolume: 8_000_000,
    componentIds: ['COMP-005', 'COMP-006', 'COMP-008'],
    bom: [
        {
            id: 'BOM-M01', name: 'PET Preform', material: 'Polyethylene Terephthalate',
            weightKg: 0.028, commodityIndex: 'ICIS PET Asia',
            commodityPricePerKg: 1.24,
            suppliers: [
                { id: 'S-M101', name: 'BottleTech Industries', region: 'Thailand', pricePerUnit: 0.042 },
                { id: 'S-M102', name: 'Alpla Group', region: 'Austria', pricePerUnit: 0.055 },
                { id: 'S-M103', name: 'Manjushree Technopack', region: 'India', pricePerUnit: 0.038 },
            ],
            defaultSupplierId: 'S-M101', scrapFactor: 1.04,
        },
        {
            id: 'BOM-M02', name: 'PP Dosing Cap', material: 'Polypropylene',
            weightKg: 0.008, commodityIndex: 'ICIS PP Asia',
            commodityPricePerKg: 1.15,
            suppliers: [
                { id: 'S-M201', name: 'Closure Systems Intl', region: 'US', pricePerUnit: 0.028 },
                { id: 'S-M202', name: 'United Caps', region: 'Belgium', pricePerUnit: 0.032 },
            ],
            defaultSupplierId: 'S-M201', scrapFactor: 1.03,
        },
        {
            id: 'BOM-M03', name: 'Shrink Sleeve Label', material: 'PVC/PETG Film',
            weightKg: 0.004, commodityIndex: 'Specialty Film',
            commodityPricePerKg: 3.20,
            suppliers: [
                { id: 'S-M301', name: 'CCL Industries', region: 'Canada', pricePerUnit: 0.022 },
                { id: 'S-M302', name: 'Huhtamaki', region: 'Finland', pricePerUnit: 0.026 },
            ],
            defaultSupplierId: 'S-M301', scrapFactor: 1.06,
        },
        {
            id: 'BOM-M04', name: 'Colorant Masterbatch', material: 'Tinted Concentrate',
            weightKg: 0.002, commodityIndex: 'Specialty Chemical',
            commodityPricePerKg: 5.50,
            suppliers: [
                { id: 'S-M401', name: 'Clariant', region: 'Switzerland', pricePerUnit: 0.015 },
                { id: 'S-M402', name: 'Plastiblends', region: 'India', pricePerUnit: 0.011 },
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
