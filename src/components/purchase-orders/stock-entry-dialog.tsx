'use client';

import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, Box, Typography, Chip, Alert, Card, CardContent
} from '@mui/material';

interface PurchaseOrderItem {
  id: string;
  desiredQuantity: number;
  confirmedQuantity: number;
  actualFoundQuantity: number;
  unitCost: string;
  notes?: string | null;
  product: {
    id: string;
    name: string;
    size: string;
  };
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  status: string;
  items: PurchaseOrderItem[];
  executedAt: Date;
  stockEnteredAt?: Date | null;
  notes?: string | null;
}

interface StockEntryDialogProps {
  open: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onEnterStock: () => Promise<void>;
  onRejectStock: (reason: string) => Promise<void>;
  loading: boolean;
}

export function StockEntryDialog({ open, onClose, order, onEnterStock, onRejectStock, loading }: StockEntryDialogProps) {
  
  if (!order) return null;

  const columns: GridColDef[] = [
    { 
      field: 'product', 
      headerName: 'Product', 
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.value.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {params.value.size}
          </Typography>
        </Box>
      )
    },
    { 
      field: 'desiredQuantity', 
      headerName: 'Desired', 
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value} size="small" color="default" />
      )
    },
    { 
      field: 'confirmedQuantity', 
      headerName: 'Confirmed', 
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value} size="small" color="info" />
      )
    },
    { 
      field: 'actualFoundQuantity', 
      headerName: 'Found', 
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          size="small" 
          color={params.value > 0 ? 'success' : 'error'}
        />
      )
    },
    {
      field: 'variance',
      headerName: 'Variance',
      width: 100,
      renderCell: (params: GridRenderCellParams) => {
        const actual = params.row.actualFoundQuantity;
        const confirmed = params.row.confirmedQuantity;
        const variance = actual - confirmed;
        const percentVariance = confirmed > 0 ? Math.abs(variance / confirmed) : 0;
        
        if (variance === 0) return <Chip label="0" size="small" color="success" />;
        
        const isLargeVariance = percentVariance > 0.2;
        
        return (
          <Box>
            <Chip 
              label={variance > 0 ? `+${variance}` : variance.toString()} 
              size="small" 
              color={isLargeVariance ? 'error' : (variance > 0 ? 'info' : 'warning')}
            />
            {isLargeVariance && (
              <Typography variant="caption" color="error" display="block">
                {(percentVariance * 100).toFixed(0)}%
              </Typography>
            )}
          </Box>
        );
      }
    },
    { 
      field: 'unitCost', 
      headerName: 'Unit Cost', 
      width: 100,
      renderCell: (params: GridRenderCellParams) => `$${parseFloat(params.value).toFixed(2)}`
    },
    { 
      field: 'stockValue', 
      headerName: 'Stock Value', 
      width: 120,
      renderCell: (params: GridRenderCellParams) => {
        const value = params.row.actualFoundQuantity * parseFloat(params.row.unitCost);
        return `$${value.toFixed(2)}`;
      }
    },
    {
      field: 'notes',
      headerName: 'Notes',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontSize: '0.75rem' }}>
          {params.value || '-'}
        </Typography>
      )
    }
  ];

  const totalStockValue = order.items.reduce((sum, item) => {
    return sum + (item.actualFoundQuantity * parseFloat(item.unitCost));
  }, 0);

  const totalConfirmedValue = order.items.reduce((sum, item) => 
    sum + (item.confirmedQuantity * parseFloat(item.unitCost)), 0
  );

  const itemsToStock = order.items.filter(item => item.actualFoundQuantity > 0);
  const largeVariances = order.items.filter(item => {
    const variance = Math.abs((item.actualFoundQuantity - item.confirmedQuantity) / item.confirmedQuantity);
    return variance > 0.2;
  });

  const isStockAlreadyEntered = !!order.stockEnteredAt;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Stock Entry Review - {order.orderNumber}</Typography>
          <Chip 
            label={isStockAlreadyEntered ? "STOCK_ENTERED" : "EXECUTED_AT_MARKET → STOCK_ENTERED"} 
            color={isStockAlreadyEntered ? "success" : "secondary"} 
            size="small" 
          />
        </Box>
      </DialogTitle>
      <DialogContent>
        {isStockAlreadyEntered ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              ✅ Stock has already been entered for this purchase order on {new Date(order.stockEnteredAt!).toLocaleString()}
            </Typography>
            <Typography variant="caption">
              This is a read-only view. Stock cannot be entered again due to the hard lock system.
            </Typography>
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              🔒 Phase 5: Stock Entry Approval - CRITICAL OPERATION
            </Typography>
            <Typography variant="caption">
              • This will add actualFoundQuantity to inventory for each product<br/>
              • Creates stockActions audit trail for all stock movements<br/>
              • Sets stockEnteredAt timestamp (PERMANENT LOCK - cannot be undone)<br/>
              • Once completed, this order becomes read-only forever
            </Typography>
          </Alert>
        )}

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2"><strong>Executed:</strong> {new Date(order.executedAt).toLocaleString()}</Typography>
          {order.stockEnteredAt && (
            <Typography variant="body2" color="success.main">
              <strong>Stock Entered:</strong> {new Date(order.stockEnteredAt).toLocaleString()}
            </Typography>
          )}
          {order.notes && (
            <Typography variant="body2"><strong>Order Notes:</strong> {order.notes}</Typography>
          )}
        </Box>

        {/* Summary Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 2 }}>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" color="success.main">{itemsToStock.length}</Typography>
              <Typography variant="body2">Items to Stock</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" color={largeVariances.length > 0 ? "error.main" : "success.main"}>
                {largeVariances.length}
              </Typography>
              <Typography variant="body2">Large Variances (&gt;20%)</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6">${totalStockValue.toFixed(2)}</Typography>
              <Typography variant="body2">Total Stock Value</Typography>
            </CardContent>
          </Card>
          <Card>
            <CardContent sx={{ p: 2 }}>
              <Typography variant="h6" color={totalStockValue > totalConfirmedValue ? "error.main" : "success.main"}>
                ${(totalStockValue - totalConfirmedValue).toFixed(2)}
              </Typography>
              <Typography variant="body2">Value Variance</Typography>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ height: 400, mb: 2 }}>
          <DataGrid
            rows={order.items}
            columns={columns}
            hideFooter
            disableRowSelectionOnClick
            density="compact"
          />
        </Box>

        {largeVariances.length > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              ⚠️ Large variances detected on {largeVariances.length} items
            </Typography>
            <Typography variant="caption">
              Review the notes to ensure variances are properly justified before entering stock.
            </Typography>
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {!isStockAlreadyEntered && (
          <>
            <Button 
              onClick={() => onRejectStock('Quantities or variances require correction')} 
              color="error"
              disabled={loading}
            >
              Reject for Stock
            </Button>
            <Button 
              onClick={onEnterStock} 
              variant="contained" 
              disabled={loading}
              color="success"
            >
              Enter Stock (Final)
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}