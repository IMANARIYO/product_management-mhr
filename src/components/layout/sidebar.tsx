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
  ChevronsLeft,
  ChevronsRight,
  User,
  CreditCard,
  FileText,
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

type SidebarState = 'full' | 'icons' | 'hidden';

import { LucideIcon } from 'lucide-react';

function NavItems({ 
  menuItems, 
  pathname, 
  isAdmin, 
  onItemClick, 
  sidebarState 
}: {
  menuItems: Array<{
    href: string;
    label: string;
    icon: LucideIcon;
    adminOnly: boolean;
  }>;
  pathname: string;
  isAdmin: boolean;
  onItemClick: () => void;
  sidebarState: SidebarState;
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
              className={cn(
                'w-full justify-start',
                sidebarState === 'icons' && 'justify-center px-2'
              )}
              onClick={onItemClick}
              title={sidebarState === 'icons' ? item.label : undefined}
            >
              <Icon className={cn(
                'h-4 w-4',
                sidebarState === 'full' && 'mr-2'
              )} />
              {sidebarState === 'full' && item.label}
            </Button>
          </Link>
        );
      })}
    </nav>
  );
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarState, setSidebarState] = useState<SidebarState>('full');

  const isAdmin = user?.role === 'ADMIN';

  const menuItems = [
    {
      href: '/dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      adminOnly: false,
    },
    {
      href: '/dashboard/products',
      label: 'Products',
      icon: Package,
      adminOnly: false,
    },
    {
      href: '/dashboard/stock',
      label: 'Stock Management',
      icon: ShoppingCart,
      adminOnly: false,
    },
    {
      href: '/dashboard/stock-days',
      label: 'Stock Days',
      icon: Calendar,
      adminOnly: false,
    },
    {
      href: '/dashboard/purchase-orders',
      label: 'Purchase Orders',
      icon: Package,
      adminOnly: false,
    },
    {
      href: '/dashboard/credits',
      label: 'Credit Sales',
      icon: CreditCard,
      adminOnly: false,
    },
    {
      href: '/dashboard/activity',
      label: 'My Activity',
      icon: Activity,
      adminOnly: false,
    },
    ...(isAdmin
      ? [
          {
            href: '/dashboard/users',
            label: 'Users',
            icon: Users,
            adminOnly: true,
          },
          {
            href: '/dashboard/reports',
            label: 'Reports',
            icon: FileText,
            adminOnly: true,
          },
        ]
      : []),
  ];

  const handleLogout = async () => {
    await logoutUser();
  };

  const toggleSidebar = () => {
    if (sidebarState === 'full') setSidebarState('icons');
    else if (sidebarState === 'icons') setSidebarState('hidden');
    else setSidebarState('full');
  };

  const sidebarWidth = sidebarState === 'full' ? 'w-64' : sidebarState === 'icons' ? 'w-16' : 'w-0';

  return (
    <>
      {/* Mobile toggle button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X className="h-4 w-4" />
          ) : (
            <Menu className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 w-64 h-screen bg-sidebar border-r border-sidebar-border flex flex-col overflow-y-auto lg:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="p-6 border-b border-sidebar-border">
          <h1 className="text-2xl font-bold text-sidebar-foreground flex items-center gap-2">
            <Glasses className="h-6 w-6" />
            Bar Manager
          </h1>
          <p className="text-xs text-muted-foreground mt-2">Rwanda</p>
        </div>

        <div className="flex-1 p-6">
          <NavItems 
            menuItems={menuItems}
            pathname={pathname}
            isAdmin={isAdmin}
            onItemClick={() => setMobileOpen(false)}
            sidebarState="full"
          />
        </div>

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

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          'hidden lg:flex fixed left-0 top-0 z-40 h-screen bg-sidebar border-r border-sidebar-border flex-col overflow-y-auto transition-all duration-300',
          sidebarWidth,
          sidebarState === 'hidden' && 'border-r-0'
        )}
      >
        {sidebarState !== 'hidden' && (
          <>
            {/* Logo area */}
            <div className={cn(
              'p-6 border-b border-sidebar-border',
              sidebarState === 'icons' && 'p-4'
            )}>
              {sidebarState === 'full' ? (
                <>
                  <h1 className="text-2xl font-bold text-sidebar-foreground flex items-center gap-2">
                    <Glasses className="h-6 w-6" />
                    Bar Manager
                  </h1>
                  <p className="text-xs text-muted-foreground mt-2">Rwanda</p>
                </>
              ) : (
                <div className="flex justify-center">
                  <Glasses className="h-6 w-6 text-sidebar-foreground" />
                </div>
              )}
            </div>

            {/* Navigation */}
            <div className={cn(
              'flex-1 p-6',
              sidebarState === 'icons' && 'p-4'
            )}>
              <NavItems 
                menuItems={menuItems}
                pathname={pathname}
                isAdmin={isAdmin}
                onItemClick={() => {}}
                sidebarState={sidebarState}
              />
            </div>

            {/* User info and logout */}
            <div className={cn(
              'p-6 border-t border-sidebar-border',
              sidebarState === 'icons' && 'p-4'
            )}>
              {sidebarState === 'full' ? (
                <>
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
                </>
              ) : (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full"
                    title={user?.fullName}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-full"
                    onClick={handleLogout}
                    title="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Toggle button for desktop */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'hidden lg:flex fixed top-4 z-50 transition-all duration-300',
          sidebarState === 'full' && 'left-60',
          sidebarState === 'icons' && 'left-12',
          sidebarState === 'hidden' && 'left-4'
        )}
        onClick={toggleSidebar}
      >
        {sidebarState === 'hidden' ? (
          <ChevronsRight className="h-4 w-4" />
        ) : (
          <ChevronsLeft className="h-4 w-4" />
        )}
      </Button>
    </>
  );
}
