'use client';

import { useState, useEffect } from 'react';
import { getCurrentUserAction } from '@/app/actions/profile';
import { getActivityLogsAction } from '@/app/actions/activity';
import { Sidebar } from '@/components/layout/sidebar';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity } from 'lucide-react';

interface User {
  id: string;
  firstName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: 'ACTIVE' | 'DISABLED';
}

interface ActivityLog {
  id: string;
  action: string;
  entityType: string;
  details: string | null;
  doneAt: string | Date;
}

export default function ActivityPage() {
  const [user, setUser] = useState<User | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResult = await getCurrentUserAction();
        if (userResult.success && userResult.user) {
          setUser(userResult.user);
        }

        const result = await getActivityLogsAction(page, 20);
        if (result.success) {
          const mappedLogs = (result.logs || []).map(log => ({
            id: log.id,
            action: log.action,
            entityType: log.entityType,
            details: log.details,
            doneAt: log.doneAt
          }));
          setLogs(mappedLogs);
          setTotalPages(result.totalPages || 1);
        }
      } catch (error) {
        console.error('Error loading activity logs:', error);
      }
    };

    fetchData();
  }, [page]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATED':
      case 'STOCK_IN':
      case 'CREDIT_SALE':
        return 'text-green-600';
      case 'UPDATED':
      case 'COUNTED':
        return 'text-blue-600';
      case 'SOLD':
      case 'BROKEN':
      case 'CREDIT_PAID':
        return 'text-orange-600';
      case 'ARCHIVED':
      case 'DISABLED':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getEntityEmoji = (entityType: string) => {
    switch (entityType) {
      case 'PRODUCT':
        return '📦';
      case 'STOCK':
        return '📊';
      case 'CREDIT':
        return '💳';
      case 'USER':
        return '👤';
      default:
        return '📋';
    }
  };

  if (!user) return null;

  return (
    <div className="flex">
      <Sidebar user={user} />

      <main className="flex-1 lg:ml-0">
        {/* Header */}
        <div className="border-b border-border p-6 pt-20 lg:pt-6">
          <h1 className="text-3xl font-bold">Activity Log</h1>
          <p className="text-muted-foreground mt-2">
            View your activity history and audit trail
          </p>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-border">
          <div className="flex gap-4 items-center">
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Activity List */}
        <div className="p-6">
          {logs.length === 0 ? (
            <Card className="p-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">No activity yet</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="text-2xl">{getEntityEmoji(log.entityType)}</div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`font-semibold ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {log.entityType}
                        </span>
                      </div>

                      {log.details && (
                        <p className="text-sm text-muted-foreground mt-1">{log.details}</p>
                      )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>{new Date(log.doneAt).toLocaleDateString()}</span>
                        <span>{new Date(log.doneAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-4 py-2 rounded border border-border disabled:opacity-50 hover:bg-muted"
              >
                Previous
              </button>
              <span className="px-4 py-2 text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 rounded border border-border disabled:opacity-50 hover:bg-muted"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
