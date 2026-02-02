'use client';


import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Package,
  ShoppingCart,
  Users,
  LogOut,

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
  collapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
  isMobile?: boolean;
  onMobileClose?: () => void;
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

export function Sidebar({
  user,
  collapsed = false,
  onToggleCollapse,
  isMobile = false,
  onMobileClose
}: SidebarProps) {
  const pathname = usePathname();

  const sidebarState = isMobile ? 'full' : (collapsed ? 'icons' : 'full');

  const handleItemClick = () => {
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  const handleToggle = () => {
    if (!isMobile && onToggleCollapse) {
      onToggleCollapse(!collapsed);
    }
  };

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
    if (isMobile && onMobileClose) {
      onMobileClose();
    }
  };

  // Mobile version - simplified for drawer
  if (isMobile) {
    return (
      <div className="space-y-4">
        <NavItems
          menuItems={menuItems}
          pathname={pathname}
          isAdmin={isAdmin}
          onItemClick={handleItemClick}
          sidebarState="full"
        />

        <div className="pt-4 border-t">
          <div className="mb-4 p-3 bg-gray-100 rounded-lg">
            <p className="text-sm font-medium">{user?.fullName}</p>
            <p className="text-xs text-gray-600">{user?.role}</p>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={handleLogout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    );
  }

  // Desktop version
  return (
    <>
      <aside className={cn(
        'fixed left-0 top-0 z-40 h-screen bg-white border-r flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}>
        {/* Header */}
        <div className={cn('p-6 border-b', collapsed && 'p-4')}>
          {collapsed ? (
            <div className="flex justify-center">
              <Glasses className="h-6 w-6" />
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Glasses className="h-5 w-5" />
                Bar Manager
              </h1>
              <p className="text-xs text-gray-500 mt-1">Rwanda</p>
            </>
          )}
        </div>

        {/* Navigation */}
        <div className={cn('flex-1 p-6', collapsed && 'p-4')}>
          <NavItems
            menuItems={menuItems}
            pathname={pathname}
            isAdmin={isAdmin}
            onItemClick={() => { }}
            sidebarState={sidebarState}
          />
        </div>

        {/* Footer */}
        <div className={cn('p-6 border-t', collapsed && 'p-4')}>
          {collapsed ? (
            <div className="space-y-2">
              <Button variant="ghost" size="icon" className="w-full" title={user?.fullName}>
                <User className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="w-full" onClick={handleLogout} title="Logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                <p className="text-sm font-medium">{user?.fullName}</p>
                <p className="text-xs text-gray-600">{user?.role}</p>
              </div>
              <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* Toggle Button */}
      <Button
        variant="outline"
        size="icon"
        className={cn(
          'fixed top-4 z-50 transition-all duration-300',
          collapsed ? 'left-12' : 'left-60'
        )}
        onClick={handleToggle}
      >
        {collapsed ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
      </Button>
    </>
  );
}
