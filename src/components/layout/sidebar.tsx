'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  LogOut,
  Menu,
  X,
  Activity,
  Glasses,
  Calendar,
} from 'lucide-react';
import { logoutUser } from '@/app/actions/auth';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  fullName: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

interface SidebarProps {
  user: User;
}

import { LucideIcon } from 'lucide-react';

// Move NavItems outside of component to avoid creating during render
function NavItems({ menuItems, pathname, isAdmin, onItemClick }: {
  menuItems: Array<{
    href: string;
    label: string;
    icon: LucideIcon;
    adminOnly: boolean;
  }>;
  pathname: string;
  isAdmin: boolean;
  onItemClick: () => void;
}) {
  return (
    <nav className="space-y-2">
      {menuItems.map((item) => {
        if (item.adminOnly && !isAdmin) return null;
        const Icon = item.icon;
        const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={onItemClick}
            >
              <Icon className="mr-2 h-4 w-4" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.role === 'ADMIN';

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      adminOnly: false,
    },
    {
      href: '/products',
      label: 'Products',
      icon: Package,
      adminOnly: false,
    },
    {
      href: '/stock',
      label: 'Stock Management',
      icon: ShoppingCart,
      adminOnly: false,
    },
    {
      href: '/dashboard/purchase-orders',
      label: 'Purchase Orders',
      icon: Package,
      adminOnly: false,
    },
    {
      href: '/credits',
      label: 'Credit Sales',
      icon: Glasses,
      adminOnly: false,
    },
    {
      href: '/activity',
      label: 'My Activity',
      icon: Activity,
      adminOnly: false,
    },
    ...(isAdmin
      ? [
          {
            href: '/users',
            label: 'Users',
            icon: Users,
            adminOnly: true,
          },
          {
            href: '/reports',
            label: 'Reports',
            icon: BarChart3,
            adminOnly: true,
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logoutUser();
  };

  return (
    <>
      {/* Mobile toggle button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setOpen(!open)}
        >
          {open ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col overflow-y-auto',
          'lg:translate-x-0 lg:static lg:h-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo area */}
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-foreground flex items-center gap-2">
            <Glasses className="h-6 w-6" />
            Bar Manager
          </h1>
          <p className="text-xs text-muted-foreground mt-2">Rwanda</p>
        </div>

        {/* Navigation */}
        <div className="flex-1 p-6">
          <NavItems 
            menuItems={menuItems}
            pathname={pathname}
            isAdmin={isAdmin}
            onItemClick={() => setOpen(false)}
          />
        </div>

        {/* User info and logout */}
        <div className="p-6 border-t border-sidebar-border">
          <div className="mb-4 p-3 bg-sidebar-accent rounded-lg">
            <p className="text-xs font-medium text-sidebar-accent-foreground">
              {user?.fullName}
            </p>
            <p className="text-xs text-muted-foreground">{user?.role}</p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start bg-transparent"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </aside>
    </>
  );
}
