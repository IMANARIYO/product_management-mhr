/* eslint-disable @typescript-eslint/no-unused-vars */
import { requireAuth } from '@/lib/auth-middleware';
import { ReportsView } from '@/components/reports/reports-view';

export default async function ReportsPage() {
  const session = await requireAuth('ADMIN'); // it should be for the admin

  return (
    <div className="p-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Reports & Analytics</h1>
        <p className="text-muted-foreground">View detailed reports and activity logs</p>
      </div>

      <ReportsView />
    </div>
  );
}
