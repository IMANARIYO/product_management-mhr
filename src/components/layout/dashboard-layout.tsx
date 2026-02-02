'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { ProfileModal } from '@/components/profile/profile-modal';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu, X, Glasses } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';

interface DashboardLayoutProps {
  children: React.ReactNode;
  session: {
    userId: string;
    phoneNumber: string;
    fullName: string;
    role: 'ADMIN' | 'EMPLOYEE';
  };
}

export function DashboardLayout({ children, session }: DashboardLayoutProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(false); // Reset collapse state on mobile
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const user = {
    id: session.userId,
    fullName: session.fullName || session.phoneNumber,
    role: session.role
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header with Menu Button */}
      <div className="lg:hidden bg-white border-b border-gray-200 px-2 py-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Bar Management</h1>
        <Drawer open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen} direction="left">
          <DrawerTrigger asChild>
            <Button variant="ghost" size="sm">
              <Menu className="h-5 w-5" />
            </Button>
          </DrawerTrigger>
          <DrawerContent className="h-full w-80 mt-0 rounded-none">
            <div className="flex flex-col h-full">
              <DrawerHeader className="border-b">
                <DrawerTitle className="flex items-center gap-2">
                  <Glasses className="h-5 w-5" />
                  Bar Manager
                </DrawerTitle>
                <DrawerClose asChild>
                  <Button variant="ghost" size="sm" className="absolute right-4 top-4">
                    <X className="h-4 w-4" />
                  </Button>
                </DrawerClose>
              </DrawerHeader>
              <div className="flex-1 p-4">
                <Sidebar
                  user={user}
                  collapsed={false}
                  onToggleCollapse={() => { }}
                  isMobile={true}
                  onMobileClose={() => setMobileDrawerOpen(false)}
                />
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar
          user={user}
          collapsed={sidebarCollapsed}
          onToggleCollapse={setSidebarCollapsed}
          isMobile={false}
        />
      </div>

      {/* Main content with responsive margins */}
      <main className={cn(
        'transition-all duration-300',
        // Mobile: full width with top padding for header
        'lg:ml-0 pt-2 lg:pt-0',
        // Desktop: dynamic margin based on sidebar state
        !isMobile && (sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64')
      )}>
        <div className="px-1 py-1 lg:px-2">
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
