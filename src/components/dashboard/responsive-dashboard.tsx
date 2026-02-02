'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, TrendingUp, Users, CreditCard, ArrowRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';

interface Session {
  userId: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

interface Stats {
  totalStock: number;
  totalProducts: number;
  unpaidCredits: number;
  totalEmployees: number;
}

interface Activity {
  id: string;
  actionType: string;
  quantity: number;
  doneAt: Date;
  product: {
    name: string;
  };
  user: {
    fullName: string;
  };
}

interface ResponsiveDashboardProps {
  session: Session;
  stats: Stats;
  recentActivities: Activity[];
}

export function ResponsiveDashboard({ session, stats, recentActivities }: ResponsiveDashboardProps) {
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'STOCK_IN': return '📦';
      case 'SOLD': return '💰';
      case 'BROKEN': return '💔';
      case 'COUNTED': return '📊';
      default: return '📝';
    }
  };

  const getActionColor = (actionType: string) => {
    const colors: Record<string, string> = {
      STOCK_IN: 'bg-green-100 text-green-800',
      SOLD: 'bg-blue-100 text-blue-800',
      BROKEN: 'bg-red-100 text-red-800',
      COUNTED: 'bg-yellow-100 text-yellow-800',
    };
    return colors[actionType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          Welcome back!
        </h1>
        <p className="text-gray-600 mt-1">
          Here&apos;s what&apos;s happening with your bar today.
        </p>
      </div>

      {/* Stats Grid - Responsive */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 sm:p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center sm:w-10 sm:h-10">
                <Package className="w-4 h-4 text-blue-600 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide sm:text-sm">
                Total Stock
              </p>
              <p className="text-lg font-semibold text-gray-900 sm:text-2xl">
                {stats.totalStock}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center sm:w-10 sm:h-10">
                <TrendingUp className="w-4 h-4 text-green-600 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide sm:text-sm">
                Products
              </p>
              <p className="text-lg font-semibold text-gray-900 sm:text-2xl">
                {stats.totalProducts}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4 sm:p-6">
          <div className="flex items-center">
            <div className="shrink-0">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center sm:w-10 sm:h-10">
                <CreditCard className="w-4 h-4 text-orange-600 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide sm:text-sm">
                Unpaid Credits
              </p>
              <p className="text-sm font-semibold text-gray-900 sm:text-lg">
                RWF {stats.unpaidCredits.toLocaleString()}
              </p>
            </div>
          </div>
        </Card>

        {session.role === 'ADMIN' && (
          <Card className="p-4 sm:p-6">
            <div className="flex items-center">
              <div className="shrink-0">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center sm:w-10 sm:h-10">
                  <Users className="w-4 h-4 text-purple-600 sm:w-5 sm:h-5" />
                </div>
              </div>
              <div className="ml-3 sm:ml-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide sm:text-sm">
                  Employees
                </p>
                <p className="text-lg font-semibold text-gray-900 sm:text-2xl">
                  {stats.totalEmployees}
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h3 className="text-lg font-semibold text-gray-900 sm:text-xl">
            Recent Activity
          </h3>
          <Badge variant="secondary" className="text-xs sm:text-sm">
            {recentActivities.length} items
          </Badge>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {recentActivities.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500">No recent activity</p>
            </div>
          ) : (
            recentActivities.slice(0, 8).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg sm:p-4">
                <div className="text-lg sm:text-xl">{getActionIcon(activity.actionType)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate sm:text-base">
                    {activity.product.name}
                  </p>
                  {/* <p className="text-xs text-gray-500 sm:text-sm">
                    {activity.quantity} units • {activity.user.fullName}
                  </p> */}
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(activity.doneAt), { addSuffix: true })}
                  </p>
                </div>
                <Badge
                  variant="secondary"
                  className={`text-xs ${getActionColor(activity.actionType)}`}
                >
                  {activity.actionType}
                </Badge>
              </div>
            ))
          )}
        </div>

        {recentActivities.length > 8 && (
          <div className="mt-4 sm:mt-6">
            <Link href="/dashboard/reports">
              <Button variant="outline" className="w-full sm:w-auto">
                View All Activity
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Quick Actions - Mobile/Desktop Responsive */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 sm:text-xl sm:mb-6">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <Link href="/dashboard/products">
            <Button variant="outline" className="h-16 flex-col space-y-2 w-full sm:h-20">
              <Package className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Products</span>
            </Button>
          </Link>
          <Link href="/dashboard/stock">
            <Button variant="outline" className="h-16 flex-col space-y-2 w-full sm:h-20">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Stock</span>
            </Button>
          </Link>
          <Link href="/dashboard/credits">
            <Button variant="outline" className="h-16 flex-col space-y-2 w-full sm:h-20">
              <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Credits</span>
            </Button>
          </Link>
          <Link href="/dashboard/reports">
            <Button variant="outline" className="h-16 flex-col space-y-2 w-full sm:h-20">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="text-xs sm:text-sm">Reports</span>
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}