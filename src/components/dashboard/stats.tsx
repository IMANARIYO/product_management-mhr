'use client';

import { Card } from '@/components/ui/card';
import { Box, BarChart3, CreditCard, Users } from 'lucide-react';

interface DashboardStatsProps {
  totalStock: number;
  totalProducts: number;
  unpaidCredits: number;
  totalEmployees: number;
  userRole: string;
}

export function DashboardStats({
  totalStock,
  totalProducts,
  unpaidCredits,
  totalEmployees,
  userRole,
}: DashboardStatsProps) {
  const stats = [
    {
      label: 'Total Stock',
      value: totalStock,
      icon: Box,
      color: 'text-blue-500',
    },
    {
      label: 'Products',
      value: totalProducts,
      icon: BarChart3,
      color: 'text-green-500',
    },
    {
      label: 'Unpaid Credits',
      value: `RWF ${unpaidCredits.toLocaleString()}`,
      icon: CreditCard,
      color: 'text-orange-500',
    },
  ];

  if (userRole === 'ADMIN') {
    stats.push({
      label: 'Employees',
      value: totalEmployees,
      icon: Users,
      color: 'text-purple-500',
    });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.label} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
                <p className="text-3xl font-bold mt-2">{stat.value}</p>
              </div>
              <Icon className={`w-8 h-8 ${stat.color} opacity-20`} />
            </div>
          </Card>
        );
      })}
    </div>
  );
}
