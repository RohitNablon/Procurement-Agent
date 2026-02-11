import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';

interface NavItem {
    name: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
}

export interface SidebarProps {
    brandName?: string;
    brandSubtext?: string;
    navItems: NavItem[];
    className?: string;
}

export function Sidebar({ brandName = 'Nablon', brandSubtext = 'Procurement Agent', navItems, className }: SidebarProps) {
    const location = useLocation();
    const [collapsed, setCollapsed] = useState(false);

    console.log('Sidebar navItems:', navItems);
    return (
        <div className={cn(
            'h-screen bg-white/5 backdrop-blur-xl border-r border-white/10 flex flex-col shrink-0 transition-all duration-300 ease-in-out',
            collapsed ? 'w-[72px]' : 'w-64',
            className
        )}>
            {/* Logo */}
            <div className={cn("flex items-center gap-3", collapsed ? "justify-center p-4" : "p-6")}>
                <div className="shrink-0 flex items-center justify-center">
                    <img src="/assets/nablon-logo.png" alt="Nablon" className="h-8 w-auto object-contain" />
                </div>
                {!collapsed && (
                    <div className="text-xl font-bold tracking-tight text-white overflow-hidden whitespace-nowrap">
                        {brandName}
                        <br />
                        <span className="text-cyan-400 text-sm">{brandSubtext}</span>
                    </div>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href));
                    return (
                        <Link
                            key={item.name}
                            to={item.href}
                            title={collapsed ? item.name : undefined}
                            className={cn(
                                'flex items-center rounded-lg font-medium transition-all duration-200 group',
                                collapsed ? 'justify-center px-0 py-2.5' : 'gap-3 px-3 py-2.5 text-sm',
                                isActive
                                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                            )}
                        >
                            <item.icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-cyan-400' : 'text-gray-500 group-hover:text-white')} />
                            {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
                            {!collapsed && item.badge && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-cyan-500/20 text-cyan-400">{item.badge}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Collapse Toggle */}
            <div className={cn("px-2 pb-2", collapsed ? "flex justify-center" : "")}>
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className={cn(
                        'flex items-center rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors',
                        collapsed ? 'w-10 h-10 justify-center' : 'w-full gap-3 px-3 py-2.5 text-sm'
                    )}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronsRight className="w-5 h-5" /> : <ChevronsLeft className="w-5 h-5" />}
                    {!collapsed && <span>Collapse Sidebar</span>}
                </button>
            </div>

            {/* User */}
            <div className={cn('border-t border-white/5', collapsed ? 'p-2' : 'p-4')}>
                <div className={cn(
                    'flex items-center rounded-lg bg-white/5 border border-white/5',
                    collapsed ? 'justify-center p-2' : 'gap-3 px-3 py-2'
                )}>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center font-bold text-xs text-white shrink-0">SB</div>
                    {!collapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">Sagar Balan</p>
                            <p className="text-xs text-gray-500 truncate">sg@nablon.ai</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
