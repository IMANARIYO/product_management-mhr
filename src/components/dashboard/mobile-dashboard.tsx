'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProfileModal } from '@/components/profile/profile-modal';
import { User, Settings, Package, TrendingUp, Users, CreditCard } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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

interface MobileDashboardProps {
  session: Session;
  stats: Stats;
  recentActivities: Activity[];
}

export function MobileDashboard({ session, stats, recentActivities }: MobileDashboardProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

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
      STOCK_IN: 'text-green-600',
      SOLD: 'text-blue-600',
      BROKEN: 'text-red-600',
      COUNTED: 'text-yellow-600',
    };
    return colors[actionType] || 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Mobile Header */}
      <div className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Bar Management</h1>
              <p className="text-sm text-gray-500">Welcome back!</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsProfileOpen(true)}
              className="p-2"
            >
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards - Mobile First */}
      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Stock</p>
                <p className="text-lg font-semibold">{stats.totalStock}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Products</p>
                <p className="text-lg font-semibold">{stats.totalProducts}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Unpaid</p>
                <p className="text-sm font-semibold">RWF {stats.unpaidCredits.toLocaleString()}</p>
              </div>
            </div>
          </Card>

          {session.role === 'ADMIN' && (
            <Card className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Employees</p>
                  <p className="text-lg font-semibold">{stats.totalEmployees}</p>
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* Recent Activity - Mobile Optimized */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Recent Activity</h3>
            <Badge variant="secondary" className="text-xs">
              {recentActivities.length} items
            </Badge>
          </div>

          <div className="space-y-3">
            {recentActivities.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No recent activity</p>
            ) : (
              recentActivities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg">{getActionIcon(activity.actionType)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.product.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {activity.quantity} units • {activity.user.fullName}
                    </p>
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
        </Card>

        {/* Quick Actions - Mobile */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="h-12 flex-col space-y-1">
              <Package className="w-4 h-4" />
              <span className="text-xs">Products</span>
            </Button>
            <Button variant="outline" className="h-12 flex-col space-y-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs">Stock</span>
            </Button>
            <Button variant="outline" className="h-12 flex-col space-y-1">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs">Credits</span>
            </Button>
            <Button variant="outline" className="h-12 flex-col space-y-1">
              <Settings className="w-4 h-4" />
              <span className="text-xs">Reports</span>
            </Button>
          </div>
        </Card>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        session={session}
      />
    </div>
  );
}