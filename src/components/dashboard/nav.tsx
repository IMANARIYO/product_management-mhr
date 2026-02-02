'use client';

import { logoutUser } from '@/app/actions/auth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useState } from 'react';

export function DashboardNav() {
  const router = useRouter();
  const [] = useState(false);

  const handleLogout = async () => {
    await logoutUser();
    router.push('/');
  };

  return (
    <nav className="border-b bg-card">
      <div className="flex items-center justify-between px-8 py-4">
        <h2 className="text-lg font-semibold">Bar Management System</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className="gap-2 bg-transparent"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </nav>
  );
}
