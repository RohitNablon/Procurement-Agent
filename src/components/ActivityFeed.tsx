import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface ActivityItem {
    id: string;
    agent: string;
    action: string;
    timestamp: string;
    status: 'success' | 'in-progress' | 'alert' | 'pending';
    details: string;
}

export interface ActivityFeedProps {
    title?: string;
    items: ActivityItem[];
    maxItems?: number;
    className?: string;
}

export function ActivityFeed({ title = 'Agent Activity', items, maxItems, className }: ActivityFeedProps) {
    const displayItems = maxItems ? items.slice(0, maxItems) : items;

    const getStatusDot = (status: string) => {
        switch (status) {
            case 'success': return 'bg-green-400';
            case 'in-progress': return 'bg-cyan-400 animate-pulse';
            case 'alert': return 'bg-red-400';
            case 'pending': return 'bg-yellow-400';
            default: return 'bg-gray-400';
        }
    };

    return (
        <div className={cn('bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-5', className)}>
            <h3 className="text-lg font-semibold text-cyan-400 mb-4">{title}</h3>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                {displayItems.map((item) => (
                    <div key={item.id} className="p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/15 transition-colors">
                        <div className="flex items-start gap-3">
                            <div className={cn('w-2 h-2 rounded-full mt-2 shrink-0', getStatusDot(item.status))} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium text-white text-sm truncate">{item.agent}</span>
                                    <span className="text-xs text-gray-400 shrink-0">
                                        {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-300 mt-1">{item.action}</div>
                                {item.details && <div className="text-xs text-gray-500 mt-1">{item.details}</div>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
