import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

export interface KPICardProps {
    title: string;
    value: string;
    change?: number;
    changeLabel?: string;
    icon: LucideIcon;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'cyan' | 'purple' | 'green' | 'red' | 'yellow' | 'blue';
    className?: string;
    subtitle?: string;
}

export function KPICard({ title, value, change, changeLabel = 'vs last month', icon: Icon, color = 'cyan', className, subtitle }: KPICardProps) {
    const colorMap = {
        cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
        purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
        green: 'text-green-400 bg-green-400/10 border-green-400/20',
        red: 'text-red-400 bg-red-400/10 border-red-400/20',
        yellow: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
        blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20'
    };

    return (
        <div className={cn('bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-xl hover:border-white/20 transition-all duration-300 group', className)}>
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
                    <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white tracking-tight">{value}</span>
                    </div>
                    {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
                </div>
                <div className={cn('p-2 rounded-lg transition-transform group-hover:scale-110', colorMap[color])}>
                    <Icon className="w-5 h-5" />
                </div>
            </div>

            {change !== undefined && (
                <div className="flex items-center gap-2 text-xs">
                    <span className={cn('font-medium px-1.5 py-0.5 rounded', change >= 0 ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10')}>
                        {change >= 0 ? '+' : ''}{change}%
                    </span>
                    {changeLabel && <span className="text-gray-500">{changeLabel}</span>}
                </div>
            )}
        </div>
    );
}
