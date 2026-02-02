'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';


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

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getActionLabel = (actionType: string) => {
    const labels: Record<string, string> = {
      STOCK_IN: 'Stock Added',
      STOCK_OUT: 'Stock Sold',
      BROKEN: 'Broken',
      COUNT: 'Stock Count',
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType: string) => {
    const colors: Record<string, string> = {
      STOCK_IN: 'bg-green-100 text-green-800',
      STOCK_OUT: 'bg-blue-100 text-blue-800',
      BROKEN: 'bg-red-100 text-red-800',
      COUNT: 'bg-yellow-100 text-yellow-800',
    };
    return colors[actionType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold mb-6">Recent Activity</h2>

      <div className="space-y-4">
        {activities.length === 0 ? (
          <p className="text-muted-foreground">No recent activity</p>
        ) : (
          activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between p-4 bg-muted rounded-lg"
            >
              <div className="flex-1">
                <p className="font-medium">
                  {activity.product.name} - {activity.quantity} units
                </p>
                <p className="text-sm text-muted-foreground">
                  by {activity.user.fullName} •{' '}
                  {formatDistanceToNow(activity.doneAt, { addSuffix: true })}
                </p>
              </div>
              <Badge className={getActionColor(activity.actionType)}>
                {getActionLabel(activity.actionType)}
              </Badge>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
