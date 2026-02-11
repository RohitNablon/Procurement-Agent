import {
    BarChart3, Calculator, DollarSign, TrendingUp, Zap, Database, RefreshCw
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
}

export const navItems: NavItem[] = [
    { name: 'Command Center', href: '/command-center', icon: BarChart3 },
    { name: 'Negotiations', href: '/negotiation', icon: DollarSign },
    { name: 'Savings Attribution', href: '/savings', icon: TrendingUp },
    { name: 'Agent Orchestrator', href: '/agent-orchestrator', icon: Zap, badge: '3' },
    { name: 'Data Sources', href: '/data-sources', icon: Database },
    { name: 'Data Sync', href: '/data-sync', icon: RefreshCw },
    { name: 'Should-Cost Simulator', href: '/should-cost', icon: Calculator, badge: 'New' },
];
