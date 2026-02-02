'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  Menu,
  Home,
  Package,
  Users,
  TrendingUp,
  CreditCard,
  FileText,
  Settings,
  LogOut,
  User,
  ShoppingCart
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ProfileModal } from '@/components/profile/profile-modal';
import { logoutUser } from '@/app/actions/auth';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { LucideIcon } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  session: {
    userId: string;
    phoneNumber: string;
    role: 'ADMIN' | 'EMPLOYEE';
  };
}

interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

interface SessionData {
  userId: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Products', href: '/dashboard/products', icon: Package },
  { name: 'Stock', href: '/dashboard/stock', icon: TrendingUp },
  { name: 'Purchase Orders', href: '/dashboard/purchase-orders', icon: ShoppingCart },
  { name: 'Credits', href: '/dashboard/credits', icon: CreditCard },
  { name: 'Reports', href: '/dashboard/reports', icon: FileText },
];

const adminNavigation = [
  { name: 'Users', href: '/dashboard/users', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export function DashboardLayout({ children, session }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const allNavigation = session.role === 'ADMIN'
    ? [...navigation, ...adminNavigation]
    : navigation;

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Logout failed');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        {/* Mobile header */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm lg:hidden">
          <SheetTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center">
              <h1 className="text-lg font-semibold text-gray-900">Bar Management</h1>
            </div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setProfileOpen(true)}
                className="p-2"
              >
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <SheetContent side="left" className="p-0 w-64">
          <MobileSidebar
            navigation={allNavigation}
            pathname={pathname}
            session={session}
            onProfileOpen={() => setProfileOpen(true)}
            onLogout={handleLogout}
            onClose={() => setSidebarOpen(false)}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-64 lg:flex-col">
        <DesktopSidebar
          navigation={allNavigation}
          pathname={pathname}
          session={session}
          onProfileOpen={() => setProfileOpen(true)}
          onLogout={handleLogout}
        />
      </div>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="px-2 py-2 lg:px-2">
          {children}
        </div>
      </main>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={profileOpen}
        onClose={() => setProfileOpen(false)}
        session={session}
      />
    </div>
  );
}

function DesktopSidebar({
  navigation,
  pathname,
  session,
  onProfileOpen,
  onLogout
}: {
  navigation: NavigationItem[];
  pathname: string;
  session: SessionData;
  onProfileOpen: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white border-r border-gray-200 px-6 pb-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center">
        <h1 className="text-xl font-bold text-gray-900">Bar Management</h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      pathname === item.href
                        ? 'bg-gray-50 text-blue-600'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                      'group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold'
                    )}
                  >
                    <item.icon
                      className={cn(
                        pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600',
                        'h-6 w-6 shrink-0'
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>

          {/* User section */}
          <li className="mt-auto">
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-x-3 mb-3">
                <div className="shrink-0">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session.phoneNumber}
                  </p>
                  <p className="text-xs text-gray-500">{session.role}</p>
                </div>
              </div>

              <div className="space-y-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onProfileOpen}
                  className="w-full justify-start h-8"
                >
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onLogout}
                  className="w-full justify-start h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}

function MobileSidebar({
  navigation,
  pathname,
  session,
  onProfileOpen,
  onLogout,
  onClose
}: {
  navigation: NavigationItem[];
  pathname: string;
  session: SessionData;
  onProfileOpen: () => void;
  onLogout: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex grow flex-col gap-y-5 overflow-y-auto bg-white px-6 pb-4">
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center">
        <h1 className="text-lg font-bold text-gray-900">Bar Management</h1>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col">
        <ul role="list" className="flex flex-1 flex-col gap-y-7">
          <li>
            <ul role="list" className="-mx-2 space-y-1">
              {navigation.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      pathname === item.href
                        ? 'bg-gray-50 text-blue-600'
                        : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50',
                      'group flex gap-x-3 rounded-md p-3 text-base leading-6 font-semibold'
                    )}
                  >
                    <item.icon
                      className={cn(
                        pathname === item.href ? 'text-blue-600' : 'text-gray-400 group-hover:text-blue-600',
                        'h-6 w-6 shrink-0'
                      )}
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </li>

          {/* User section */}
          <li className="mt-auto">
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center gap-x-3 mb-4">
                <div className="shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {session.phoneNumber}
                  </p>
                  <p className="text-xs text-gray-500">{session.role}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onProfileOpen();
                    onClose();
                  }}
                  className="w-full justify-start h-10"
                >
                  <User className="h-5 w-5 mr-3" />
                  Profile
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="w-full justify-start h-10 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Logout
                </Button>
              </div>
            </div>
          </li>
        </ul>
      </nav>
    </div>
  );
}