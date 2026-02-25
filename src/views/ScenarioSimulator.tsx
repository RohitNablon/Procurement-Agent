import { useState, useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { navItems } from '../data/navItems';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

const ScenarioSimulator = () => {
    const [lithiumChange, setLithiumChange] = useState(12);
    const [cobaltChange, setCobaltChange] = useState(0);
    const [geopolitical, setGeopolitical] = useState('severe');
    const [fxRate, setFxRate] = useState(148.2);
    const [tariffOn, setTariffOn] = useState(false);

    const baseline = 6.82;

    const impacts = useMemo(() => {
        const commodity = +(baseline * (lithiumChange + cobaltChange) / 100 * 0.62).toFixed(2);
        const geoPremium = geopolitical === 'none' ? 0 : geopolitical === 'minor' ? 0.08 : 0.18;
        const fx = +((fxRate - 148.2) / 148.2 * baseline * -0.1).toFixed(2);
        const tariff = tariffOn ? 1.47 : 0;
        return { commodity, geoPremium, fx, tariff, total: +(baseline + commodity + geoPremium + fx + tariff).toFixed(2) };
    }, [lithiumChange, cobaltChange, geopolitical, fxRate, tariffOn]);

    const waterfallData = [
        { name: 'Baseline', value: baseline, fill: '#06b6d4' },
        { name: 'Commodity', value: impacts.commodity, fill: impacts.commodity > 0 ? '#ef4444' : '#10b981' },
        { name: 'Geopolitical', value: impacts.geoPremium, fill: impacts.geoPremium > 0 ? '#ef4444' : '#10b981' },
        { name: 'FX Impact', value: impacts.fx, fill: impacts.fx > 0 ? '#ef4444' : '#10b981' },
        { name: 'Tariff', value: impacts.tariff, fill: impacts.tariff > 0 ? '#ef4444' : '#10b981' },
        { name: 'Revised', value: impacts.total, fill: '#8b5cf6' },
    ];

    const getIcon = (v: number) => v > 0.5 ? '▲' : v > 0 ? '!' : v < 0 ? '✓' : '—';

    return (
        <div className="flex h-screen bg-[#09090b]">
            <Sidebar navItems={navItems} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header breadcrumbs={['Nablon Procurement Agent', 'Scenario Simulator']} />
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <h1 className="text-2xl font-bold text-white">Scenario Simulator — Li-ion Battery Pack</h1>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Controls */}
                        <div className="space-y-4">
                            {/* Commodity Sliders */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Commodity Price Shock</h3>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">Lithium Carbonate</span><span className={lithiumChange > 0 ? 'text-red-400' : 'text-green-400'}>{lithiumChange > 0 ? '+' : ''}{lithiumChange}%</span></div>
                                        <input type="range" min={-20} max={30} value={lithiumChange} onChange={e => setLithiumChange(+e.target.value)} className="w-full accent-cyan-400" />
                                        <p className="text-xs text-yellow-400 mt-1">Current: +12% spike detected</p>
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-sm mb-1"><span className="text-gray-300">Cobalt Sulfate</span><span className={cobaltChange > 0 ? 'text-red-400' : 'text-green-400'}>{cobaltChange > 0 ? '+' : ''}{cobaltChange}%</span></div>
                                        <input type="range" min={-10} max={25} value={cobaltChange} onChange={e => setCobaltChange(+e.target.value)} className="w-full accent-cyan-400" />
                                    </div>
                                </div>
                            </div>

                            {/* Geopolitical */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Geopolitical Scenario</h3>
                                <select value={geopolitical} onChange={e => setGeopolitical(e.target.value)} className="w-full bg-white/10 border border-white/10 rounded-lg py-2 px-3 text-white text-sm focus:outline-none focus:border-cyan-500/50">
                                    <option value="none">None (baseline)</option>
                                    <option value="minor">Minor disruption (+5% lead time)</option>
                                    <option value="severe">Severe disruption (+20% spot buy premium)</option>
                                </select>
                            </div>

                            {/* FX + Tariff */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">FX Impact</h3>
                                    <label className="text-xs text-gray-500">USD/JPY Rate</label>
                                    <input type="number" value={fxRate} onChange={e => setFxRate(+e.target.value)} step={0.1} className="w-full bg-white/10 border border-white/10 rounded-lg py-2 px-3 text-white text-sm mt-1 focus:outline-none focus:border-cyan-500/50" />
                                    <p className="text-xs text-gray-500 mt-1">Current: 148.2</p>
                                </div>
                                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                                    <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Tariff Scenario</h3>
                                    <p className="text-xs text-gray-500 mb-2">US Battery Tariff 25%</p>
                                    <button onClick={() => setTariffOn(!tariffOn)} className={`w-full py-2 rounded-lg text-sm font-medium transition-all ${tariffOn ? 'bg-red-500/30 text-red-400 border border-red-500/50' : 'bg-white/10 text-gray-400 border border-white/10'}`}>
                                        {tariffOn ? '● ON' : '○ OFF'}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="space-y-4">
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Impact Simulation Results</h3>
                                <div className="space-y-3 text-sm font-mono">
                                    <div className="flex justify-between"><span className="text-gray-300">Baseline Should-Cost:</span><span className="text-white font-bold">${baseline.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-300">+ Commodity volatility:</span><span className={impacts.commodity > 0 ? 'text-red-400' : 'text-green-400'}>+${impacts.commodity.toFixed(2)} {getIcon(impacts.commodity)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-300">+ Geopolitical premium:</span><span className={impacts.geoPremium > 0 ? 'text-yellow-400' : 'text-green-400'}>+${impacts.geoPremium.toFixed(2)} {getIcon(impacts.geoPremium)}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-300">+ FX impact:</span><span className={impacts.fx < 0 ? 'text-green-400' : 'text-red-400'}>{impacts.fx >= 0 ? '+' : ''}${impacts.fx.toFixed(2)} {getIcon(Math.abs(impacts.fx))}</span></div>
                                    <div className="flex justify-between"><span className="text-gray-300">+ Tariff impact:</span><span className={impacts.tariff > 0 ? 'text-red-400' : 'text-gray-500'}>+${impacts.tariff.toFixed(2)} {getIcon(impacts.tariff)}</span></div>
                                    <div className="border-t border-white/10 pt-3 flex justify-between">
                                        <span className="text-white font-bold">Revised Should-Cost:</span>
                                        <span className={`text-xl font-bold ${impacts.total > 8.47 ? 'text-red-400' : 'text-green-400'}`}>${impacts.total.toFixed(2)}</span>
                                    </div>
                                </div>

                                {/* Waterfall Chart */}
                                <ResponsiveContainer width="100%" height={200} className="mt-4">
                                    <BarChart data={waterfallData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                        <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                                        <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} domain={[0, 'auto']} />
                                        <Tooltip contentStyle={{ background: '#1f1f23', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                                        <ReferenceLine y={8.47} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Current $8.47', fill: '#f59e0b', fontSize: 11 }} />
                                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                            {waterfallData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* LLM Strategic Insight */}
                            <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 border border-cyan-500/20 rounded-xl p-5">
                                <h3 className="text-sm font-medium text-cyan-400 mb-3">Strategic Insight (AI-Generated)</h3>
                                <div className="text-sm text-gray-300 space-y-2">
                                    {impacts.total > 8.47 ? (
                                        <>
                                            <p>Current contracted price of <strong className="text-white">$8.47</strong> appears <strong className="text-green-400">favorable</strong> under this scenario (revised should-cost: <strong className="text-red-400">${impacts.total.toFixed(2)}</strong>).</p>
                                            <p>Recommendation: <strong className="text-white">Lock in current pricing</strong> with a volume commitment. Negotiate tariff pass-through clause capped at 8%.</p>
                                            <p>Alternative: Dual-source with <strong className="text-cyan-400">LG Energy (S.Korea plant)</strong> to hedge tariff exposure.</p>
                                        </>
                                    ) : (
                                        <>
                                            <p>Current contracted price of <strong className="text-white">$8.47</strong> is <strong className="text-red-400">{((8.47 - impacts.total) / impacts.total * 100).toFixed(1)}% above</strong> the revised should-cost of <strong className="text-green-400">${impacts.total.toFixed(2)}</strong>.</p>
                                            <p>Recommendation: <strong className="text-white">Open renegotiation</strong> leveraging clean-sheet cost transparency. Target settlement: <strong className="text-cyan-400">${(impacts.total * 1.05).toFixed(2)}-${(impacts.total * 1.08).toFixed(2)}</strong>.</p>
                                        </>
                                    )}
                                </div>
                                <div className="flex gap-3 mt-4">
                                    <button className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors border border-cyan-500/30">Generate Negotiation Brief</button>
                                    <button className="px-4 py-2 bg-white/5 text-gray-400 rounded-lg text-sm hover:bg-white/10 transition-colors">Reset</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScenarioSimulator;
