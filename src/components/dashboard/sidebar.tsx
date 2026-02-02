'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Box,
  ShoppingCart,
  Users,
  FileText,

  Home,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'Products', href: '/dashboard/products', icon: Box },
  { label: 'Stock Management', href: '/dashboard/stock', icon: ShoppingCart },
  { label: 'Credit Sales', href: '/dashboard/credits', icon: BarChart3 },
  { label: 'Reports', href: '/dashboard/reports', icon: FileText },
  { label: 'Users', href: '/dashboard/users', icon: Users, adminOnly: true },
];

export function DashboardSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r bg-card p-6 flex flex-col">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Bar Mgmt</h1>
      </div>

      <nav className="space-y-2 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2 rounded-lg transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
