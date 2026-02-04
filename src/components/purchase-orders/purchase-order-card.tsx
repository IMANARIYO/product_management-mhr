'use client';

import { Card, CardContent, Typography, Chip, Button } from '@mui/material';
import { Visibility, Edit, CheckCircle, Cancel } from '@mui/icons-material';
import { PurchaseOrderStatus } from '@/db/types';

interface PurchaseOrderCardProps {
  order: {
    id: string;
    orderNumber: string;
    totalAmount: string;
    status: PurchaseOrderStatus;
    createdAt: Date;
    items: Array<{
      id: string;
      quantity: number;
      unitCost: string;
      product: {
        name: string;
        size: string;
      };
    }>;
  };
  userRole: 'ADMIN' | 'EMPLOYEE';
  onView: (orderId: string) => void;
  onEdit: (orderId: string) => void;
  onSubmit: (orderId: string) => void;
  onApprove: (orderId: string) => void;
  onReceive: (orderId: string) => void;
  onCancel: (orderId: string) => void;
}

export function PurchaseOrderCard({ order, userRole, onView, onEdit, onSubmit, onApprove, onReceive, onCancel }: PurchaseOrderCardProps) {
  const getStatusColor = (status: PurchaseOrderStatus) => {
    const colors: Record<PurchaseOrderStatus, 'default' | 'primary' | 'success' | 'info' | 'error'> = {
      DRAFT: 'default',
      SUBMITTED: 'primary',
      CONFIRMED: 'success',
      EXECUTED_AT_MARKET: 'info',
      REJECTED_FOR_STOCK: 'error',
      STOCK_ENTERED: 'success',
      CANCELLED: 'error'
    };
    return colors[status] || 'default';
  };

  return (
    <Card className="mb-3">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
          <div className="flex-1">
            <Typography variant="h6" className="text-sm sm:text-base font-medium">
              {order.orderNumber}
            </Typography>
            <Typography variant="body2" color="textSecondary" className="text-xs sm:text-sm">
              ${parseFloat(order.totalAmount).toLocaleString()}
            </Typography>
            <Typography variant="body2" color="textSecondary" className="text-xs sm:text-sm">
              {new Date(order.createdAt).toLocaleDateString()}
            </Typography>
          </div>
          <Chip 
            label={order.status.replace('_', ' ')} 
            color={getStatusColor(order.status)}
            size="small"
            className="self-start"
          />
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          <Button
            size="small"
            startIcon={<Visibility />}
            onClick={() => onView(order.id)}
            className="text-xs"
          >
            View
          </Button>

          {order.status === 'DRAFT' && (
            <>
              <Button
                size="small"
                startIcon={<Edit />}
                onClick={() => onEdit(order.id)}
                className="text-xs"
              >
                Edit
              </Button>
              <Button
                size="small"
                startIcon={<CheckCircle />}
                onClick={() => onSubmit(order.id)}
                className="text-xs"
                color="primary"
              >
                Submit
              </Button>
            </>
          )}

          {order.status === 'SUBMITTED' && userRole === 'ADMIN' && (
            <Button
              size="small"
              startIcon={<CheckCircle />}
              onClick={() => onApprove(order.id)}
              className="text-xs"
              color="success"
            >
              Approve
            </Button>
          )}

          {order.status === 'CONFIRMED' && userRole === 'ADMIN' && (
            <Button
              size="small"
              startIcon={<CheckCircle />}
              onClick={() => onApprove(order.id)}
              className="text-xs"
              color="success"
            >
              Execute Order
            </Button>
          )}

          {order.status === 'STOCK_ENTERED' && userRole === 'ADMIN' && (
            <Button
              size="small"
              startIcon={<CheckCircle />}
              onClick={() => onReceive(order.id)}
              className="text-xs"
              color="success"
            >
              Complete Order
            </Button>
          )}

          {order.status !== 'STOCK_ENTERED' && order.status !== 'CANCELLED' && (
            <Button
              size="small"
              startIcon={<Cancel />}
              onClick={() => onCancel(order.id)}
              className="text-xs"
              color="error"
            >
              Cancel
            </Button>
          )}
        </div>

        <Typography variant="subtitle2" className="mb-2 text-sm">Items ({order.items.length}):</Typography>
        <div className="text-xs sm:text-sm text-gray-600">
          {order.items.slice(0, 3).map((item, index) => (
            <div key={index}>
              {item.product.name} ({item.product.size}) - Qty: {item.quantity} @ ${item.unitCost}
            </div>
          ))}
          {order.items.length > 3 && <div>... and {order.items.length - 3} more items</div>}
        </div>
      </CardContent>
    </Card>
  );
}