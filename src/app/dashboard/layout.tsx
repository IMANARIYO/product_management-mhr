import { requireAuth } from '@/lib/auth-middleware';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { redirect } from 'next/navigation';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  if (!session) {
    redirect('/login');
  }

  return (
    <DashboardLayout session={session}>
      {children}
    </DashboardLayout>
  );
}