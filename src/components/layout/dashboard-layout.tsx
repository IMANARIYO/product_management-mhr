'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { ProfileModal } from '@/components/profile/profile-modal';
import { useState } from 'react';
import { cn } from '@/lib/utils';

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

  const user = {
    id: session.userId,
    fullName: session.fullName || session.phoneNumber,
    role: session.role
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />

      {/* Main content with dynamic margin based on sidebar state */}
      <main className={cn(
        'transition-all duration-300',
        'lg:ml-64' // Default full sidebar width
      )}>
        <div className="px-2 py-2 lg:px-4">
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
