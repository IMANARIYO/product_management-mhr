/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Card } from '@/components/ui/card';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useState, useEffect } from 'react';
import {
  getActivityReport,
  getStockReport,
  getSalesReport,
  getLossReport,
  getStockCountReport,
} from '@/app/actions/reports';
import { formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';

interface ActivityLog {
  id: string;
  action: string;
  details: string | null;
  doneAt: Date;
  user: {
    fullName: string;
  };
}

interface StockAction {
  id: string;
  actionType: string;
  quantity: number;
  doneAt: Date;
  product: {
    name: string;
    size: string;
  };
  user: {
    fullName: string;
  };
  sellingPrice?: string | null;
  reason?: string | null;
  systemQuantity?: number;
  countedQuantity?: number;
  difference?: number;
}

export function ReportsView() {
  const [selectedTab, setSelectedTab] = useState('activity');
  const [isLoading, setIsLoading] = useState(false);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stockReport, setStockReport] = useState<StockAction[]>([]);
  const [salesReport, setSalesReport] = useState<StockAction[]>([]);
  const [lossReport, setLossReport] = useState<StockAction[]>([]);
  const [countReport, setCountReport] = useState<StockAction[]>([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const [activity, stock, sales, loss, count] = await Promise.all([
        getActivityReport({}),
        getStockReport({}),
        getSalesReport(),
        getLossReport(),
        getStockCountReport(),
      ]);

      if (activity.success) setActivityLogs((activity.logs || []).map(log => ({
        ...log,
        actionType: log.action,
        description: log.details || log.action
      })));
      if (stock.success) setStockReport(stock.report || []);
      if (sales.success) setSalesReport(sales.report || []);
      if (loss.success) setLossReport(loss.report || []);
      if (count.success) setCountReport(count.report || []);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionColor = (actionType: string) => {
    const colors: Record<string, string> = {
      STOCK_IN: 'bg-green-100 text-green-800',
      STOCK_OUT: 'bg-blue-100 text-blue-800',
      BROKEN: 'bg-red-100 text-red-800',
      COUNT: 'bg-yellow-100 text-yellow-800',
      CREATE_PRODUCT: 'bg-purple-100 text-purple-800',
      ARCHIVE_PRODUCT: 'bg-gray-100 text-gray-800',
      CREDIT_SALE: 'bg-orange-100 text-orange-800',
      CREDIT_PAID: 'bg-green-100 text-green-800',
    };
    return colors[actionType] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="mt-8">
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="loss">Losses</TabsTrigger>
          <TabsTrigger value="count">Counts</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="activity">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Activity Log</h3>
              <div className="space-y-2">
                {activityLogs.length === 0 ? (
                  <p className="text-muted-foreground">No activity</p>
                ) : (
                  activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{log.details || log.action}</p>
                        <p className="text-sm text-muted-foreground">
                          {/* {log.user.fullName} •{' '} */}
                          {formatDistanceToNow(new Date(log.doneAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge className={getActionColor(log.action)}>
                        {log.action}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="stock">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Stock Movements</h3>
              <div className="space-y-2">
                {stockReport.length === 0 ? (
                  <p className="text-muted-foreground">No stock movements</p>
                ) : (
                  stockReport.map((action) => (
                    <div
                      key={action.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {action.product.name} ({action.product.size}) - {action.quantity} units
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {action.user.fullName} •{' '}
                          {formatDistanceToNow(new Date(action.doneAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge className={getActionColor(action.actionType)}>
                        {action.actionType}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="sales">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Sales Report</h3>
              <div className="space-y-2">
                {salesReport.length === 0 ? (
                  <p className="text-muted-foreground">No sales</p>
                ) : (
                  <>
                    <div className="p-4 bg-green-50 rounded-lg mb-4">
                      <p className="text-muted-foreground text-sm">Total Revenue</p>
                      <p className="text-2xl font-bold text-green-600">
                        RWF{' '}
                        {salesReport
                          .reduce(
                            (sum, s) => sum + (parseFloat(s.sellingPrice || '0') * s.quantity || 0),
                            0
                          )
                          .toLocaleString()}
                      </p>
                    </div>
                    {salesReport.map((sale) => (
                      <div
                        key={sale.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition"
                      >
                        <div className="flex-1">
                          <p className="font-medium">
                            {sale.product.name} - {sale.quantity} units
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {sale.user.fullName} •{' '}
                            {formatDistanceToNow(new Date(sale.doneAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            RWF {(parseFloat(sale.sellingPrice || '0') * sale.quantity).toLocaleString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            RWF {parseFloat(sale.sellingPrice || '0')} x {sale.quantity}
                          </p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="loss">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Loss Report</h3>
              <div className="space-y-2">
                {lossReport.length === 0 ? (
                  <p className="text-muted-foreground">No losses recorded</p>
                ) : (
                  lossReport.map((loss) => (
                    <div
                      key={loss.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition"
                    >
                      <div className="flex-1">
                        <p className="font-medium">
                          {loss.product.name} - {loss.quantity} units
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Reason: {loss.reason}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {loss.user.fullName} •{' '}
                          {formatDistanceToNow(new Date(loss.doneAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge className="bg-red-100 text-red-800">BROKEN</Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="count">
            <Card className="p-6">
              <h3 className="font-semibold mb-4">Stock Count Report</h3>
              <div className="space-y-2">
                {countReport.length === 0 ? (
                  <p className="text-muted-foreground">No counts recorded</p>
                ) : (
                  countReport.map((count) => (
                    <div
                      key={count.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{count.product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          System: {count.systemQuantity} | Actual: {count.countedQuantity} |
                          Diff: {(count.difference ?? 0) > 0 ? '+' : ''}{count.difference ?? 0}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {count.user.fullName} •{' '}
                          {formatDistanceToNow(new Date(count.doneAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge className={getActionColor(count.actionType)}>
                        {count.actionType}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
