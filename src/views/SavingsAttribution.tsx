import { useState, useEffect } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { navItems } from '../data/navItems';
import { products } from '../data/products';
import type { Product } from '../data/products';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useProduct } from '../context/ProductContext';
import { ArrowUpRight, ArrowDownRight, Minus, PieChart as PieChartIcon, CheckCircle2, GraduationCap, Check } from 'lucide-react';
import componentsData from '../data/components.json';

// Data structure for product scenarios
interface SavingsData {
    breakdown: { name: string; value: number; color: string }[];
    negotiations: { component: string; target: number; actual: number; variance: number; supplier: string; learned: boolean }[];
    learning: {
        component: string;
        supplier: string;
        date: string;
        predicted: number;
        actual: number;
        variance: number;
        reason: string;
        points: string[];
    };
}

// Map Component Data to Savings Data
const getSavingsData = (product: Product): SavingsData => {
    // Filter components for this product
    const relevantComponents = componentsData.filter(c => product.componentIds.includes(c.id));

    // Map to negotiations format
    const negotiations = relevantComponents.map(c => ({
        component: c.name,
        target: c.shouldCost / 1_000_000, // Convert to Millions for simple display or keep unit? Table uses fixed.
        // Let's use unit price equivalent for the table to look like "Price" not "Spend", 
        // OR just divide Spend by Volume to get Unit Price.
        // components.json has totalSpend. product has annualVolume.
        targetUnit: c.shouldCost / product.annualVolume,
        actualUnit: c.totalSpend / product.annualVolume,
        variance: c.variancePercent,
        supplier: c.supplier,
        learned: c.confidence === 'High' // Mock logic
    }));

    return {
        breakdown: [
            { name: 'Negotiation Leverage', value: 4.8, color: '#06b6d4' },
            { name: 'Commodity-Driven', value: 2.1, color: '#8b5cf6' },
            { name: 'Design Optimization', value: 0.9, color: '#10b981' },
            { name: 'Alternate Sourcing', value: 0.4, color: '#f59e0b' },
        ],
        negotiations: negotiations.map(n => ({
            component: n.component,
            target: n.targetUnit,
            actual: n.actualUnit,
            variance: n.variance,
            supplier: n.supplier,
            learned: n.learned
        })),
        learning: {
             // Mock learning data loosely based on the first component
            component: negotiations[0]?.component || 'Unknown',
            supplier: negotiations[0]?.supplier || 'Unknown',
            date: 'Jan 2026',
            predicted: negotiations[0]?.targetUnit || 0,
            actual: negotiations[0]?.actualUnit || 0,
            variance: negotiations[0]?.variance || 0,
            reason: '"Supplier cited raw material index increase. Validated against market data."',
            points: [
                'Updated cost model index linkage',
                'Refined regional risk premium',
                'Triggered alternative sourcing review'
            ]
        }
    };
};

const SavingsAttribution = () => {
    const { selectedProductId } = useProduct();
    const [selectedProduct, setSelectedProduct] = useState<Product>(products.find(p => p.id === selectedProductId) || products[0]);
    const [activeSlice, setActiveSlice] = useState<string | null>(null);

    // Sync local selectedProduct with global context
    useEffect(() => {
        const product = products.find(p => p.id === selectedProductId);
        if (product) setSelectedProduct(product);
    }, [selectedProductId]);

    // Dynamic Data Generation based on Components JSON
    const data = getSavingsData(selectedProduct);
    
    // Total "Savings" (or Impact)
    // If we want to show Total Variance from the components:
    const totalVarianceM = componentsData
        .filter(c => selectedProduct.componentIds.includes(c.id))
        .reduce((sum, c) => sum + c.variance, 0) / 1_000_000;

    return (
        <div className="flex h-screen bg-[#09090b]">
            <Sidebar navItems={navItems} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header breadcrumbs={['Nablon Procurement Agent', 'Savings Attribution']} />
                
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                            <PieChartIcon className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-white">Enterprise Impact Dashboard</h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Donut Chart - Kept as "Savings Opportunities" visualization (Mock Breakdown) */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Projected Savings Opportunities</h3>
                            <div className="flex items-center">
                                <ResponsiveContainer width="60%" height={250}>
                                    <PieChart>
                                        <Pie data={data.breakdown} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} dataKey="value" onClick={(_, i) => setActiveSlice(data.breakdown[i].name)}>
                                            {data.breakdown.map((entry, i) => <Cell key={i} fill={entry.color} stroke="transparent" className="cursor-pointer hover:opacity-80 transition-opacity" />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: '#1f1f23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} formatter={(v: number) => [`$${v}M`, 'Savings']} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex-1 space-y-3">
                                    {data.breakdown.map((item) => (
                                        <div key={item.name} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${activeSlice === item.name ? 'bg-white/10' : 'hover:bg-white/5'}`} onClick={() => setActiveSlice(activeSlice === item.name ? null : item.name)}>
                                            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: item.color }} />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-white truncate">{item.name}</p>
                                                <p className="text-xs text-gray-500">${item.value}M</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Completed Negotiations / Analysis Status */}
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Active Negotiations & Variance</h3>
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-700/50">
                                        <th className="text-left py-2 text-gray-500 text-xs uppercase">Component</th>
                                        <th className="text-right py-2 text-gray-500 text-xs uppercase">Target</th>
                                        <th className="text-right py-2 text-gray-500 text-xs uppercase">Actual</th>
                                        <th className="text-right py-2 text-gray-500 text-xs uppercase">Variance</th>
                                        <th className="text-center py-2 text-gray-500 text-xs uppercase">Learning</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.negotiations.map((n, i) => (
                                        <tr key={i} className="border-b border-gray-800/50 hover:bg-white/5 transition-colors">
                                            <td className="py-3">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-medium">{n.component}</span>
                                                    <span className="text-xs text-cyan-400/80">{n.supplier}</span>
                                                </div>
                                            </td>
                                            <td className="text-right py-3 text-gray-400 font-mono">${n.target.toFixed(2)}</td>
                                            <td className="text-right py-3 text-white font-mono font-medium">${n.actual.toFixed(2)}</td>
                                            <td className="text-right py-3">
                                                <div className={`flex items-center justify-end gap-1 ${n.variance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                    {n.variance > 0 ? <ArrowUpRight className="w-3 h-3" /> : n.variance < 0 ? <ArrowDownRight className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                                                    <span className="font-bold">{Math.abs(n.variance).toFixed(1)}%</span>
                                                </div>
                                            </td>
                                            <td className="text-center py-3">
                                                {n.learned 
                                                    ? <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/10 text-green-400"><CheckCircle2 className="w-4 h-4" /></span> 
                                                    : <span className="text-gray-600">—</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Model Learning Capture */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-cyan-500/10 border border-purple-500/20 rounded-xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <GraduationCap className="w-5 h-5 text-purple-400" />
                            <h3 className="text-sm font-medium text-purple-400 uppercase tracking-wider">Model Learning Capture</h3>
                            <div className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[10px] font-bold ml-2">NEW INSIGHT</div>
                        </div>
                        
                        <div className="bg-white/5 rounded-lg p-5 border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="text-lg text-white font-bold">{data.learning.component}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-800/50">{data.learning.supplier}</span>
                                        <span className="text-xs text-gray-500">Negotiated {data.learning.date}</span>
                                    </div>
                                </div>
                                <div className="text-right bg-black/20 p-3 rounded-lg border border-white/5">
                                    <div className="flex justify-end gap-4 text-sm mb-1">
                                        <div>
                                            <span className="text-gray-500 text-xs block">Predicted</span>
                                            <span className="text-cyan-400 font-mono">${data.learning.predicted.toFixed(2)}</span>
                                        </div>
                                        <div className="w-px bg-white/10" />
                                        <div>
                                            <span className="text-gray-500 text-xs block">Actual</span>
                                            <span className="text-white font-mono">${data.learning.actual.toFixed(2)}</span>
                                        </div>
                                    </div>
                                    <div className={`text-xs font-bold text-right mt-1 ${data.learning.variance > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                        {data.learning.variance > 0 ? '+' : ''}{data.learning.variance.toFixed(1)}% Deviation
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">Deviation Reason (User Input)</p>
                                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
                                        <p className="text-sm text-gray-300 italic">{data.learning.reason}</p>
                                    </div>
                                </div>

                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-medium mb-2">System Learning Applied</p>
                                    <div className="space-y-2">
                                        {data.learning.points.map((point, i) => (
                                            <div key={i} className="flex items-start gap-2 text-sm group">
                                                <div className="mt-0.5 w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20 group-hover:border-green-500/50 transition-colors shrink-0">
                                                    <Check className="w-3 h-3 text-green-400" />
                                                </div>
                                                <span className="text-gray-300 group-hover:text-white transition-colors">{point}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-3 border-t border-white/5 text-center">
                                <p className="text-xs text-gray-500">Future Impact: <span className="text-green-400">Improved precision for subsequent cost models</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default SavingsAttribution;
