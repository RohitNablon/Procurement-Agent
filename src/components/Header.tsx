import { useState, useRef, useEffect } from 'react';
import { Bell, HelpCircle, Settings, ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import { products } from '../data/products';
import { useProduct } from '../context/ProductContext';

interface HeaderAction {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    badge?: boolean;
}

export interface HeaderProps {
    breadcrumbs?: string[];
    actions?: HeaderAction[];
    className?: string;
    children?: React.ReactNode;
}

export function Header({ breadcrumbs = ['Dashboard', 'Command Center'], actions, className, children }: HeaderProps) {
    const { selectedProductId, setSelectedProductId } = useProduct();
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const defaultActions: HeaderAction[] = [
        { icon: Bell, label: 'Notifications', badge: true },
        { icon: HelpCircle, label: 'Help' },
        { icon: Settings, label: 'Settings' }
    ];
    const headerActions = actions || defaultActions;

    return (
        <header className={cn('h-16 bg-black/50 backdrop-blur-xl border-b border-white/5 px-6 flex items-center justify-between relative z-50', className)}>
            <div className="flex items-center gap-4 text-gray-400">
                {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center gap-4">
                        <span className={cn('text-sm font-medium', index === breadcrumbs.length - 1 ? 'text-white' : 'text-gray-400')}>{crumb}</span>
                        {index < breadcrumbs.length - 1 && <span className="text-gray-600">/</span>}
                    </div>
                ))}
            </div>

            <div className="flex items-center gap-4">
                {/* ── Product Selector ── */}
                <div ref={dropdownRef} className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 group"
                    >
                        <selectedProduct.icon className="w-5 h-5 text-cyan-400" />
                        <span className="text-sm font-medium text-white max-w-[160px] truncate">{selectedProduct.name}</span>
                        <ChevronDown className={cn(
                            'w-4 h-4 text-gray-500 transition-transform duration-200',
                            dropdownOpen && 'rotate-180 text-cyan-400'
                        )} />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute top-full right-0 mt-2 w-72 bg-[#111113] border border-white/10 rounded-xl shadow-2xl shadow-black/80 z-[100] animate-in fade-in slide-in-from-top-2 duration-200 flex flex-col">
                            <div className="px-4 py-3 border-b border-white/5 shrink-0">
                                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Select Product</p>
                            </div>
                            <div className="max-h-[60vh] overflow-y-auto py-1 custom-scrollbar">
                                {products.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => { setSelectedProductId(product.id); setDropdownOpen(false); }}
                                        className={cn(
                                            'w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 hover:bg-white/5',
                                            product.id === selectedProductId && 'bg-cyan-500/10 border-l-2 border-l-cyan-400'
                                        )}
                                    >
                                        <product.icon className={cn("w-5 h-5 shrink-0", product.id === selectedProductId ? "text-cyan-400" : "text-gray-500")} />
                                        <div className="flex-1 min-w-0">
                                            <p className={cn('text-sm font-medium truncate', product.id === selectedProductId ? 'text-cyan-400' : 'text-white')}>
                                                {product.name}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{product.description}</p>
                                        </div>
                                        {product.id === selectedProductId && (
                                            <div className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Header actions ── */}
                {children || (
                    <div className="flex items-center gap-1">
                        {headerActions.map((action, index) => (
                            <button
                                key={index}
                                onClick={action.onClick}
                                className="w-10 h-10 rounded-full hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors relative"
                                aria-label={action.label}
                            >
                                <action.icon className="w-5 h-5" />
                                {action.badge && (
                                    <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-pulse" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </header>
    );
}
