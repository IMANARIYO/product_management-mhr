'use client';

import { useState, useEffect } from 'react';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Box, Typography, Chip, Alert
} from '@mui/material';
import { useToastHandler } from '@/hooks/use-toast-handler';

interface PurchaseOrderItem {
  id: string;
  desiredQuantity: number;
  confirmedQuantity: number;
  actualFoundQuantity?: number | null;
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
  confirmedAt: Date;
  notes?: string | null;
}

interface ExecuteOrderDialogProps {
  open: boolean;
  onClose: () => void;
  order: PurchaseOrder | null;
  onExecute: (actualItems: Array<{itemId: string; actualFoundQuantity: number; notes?: string}>) => Promise<void>;
  loading: boolean;
}

export function ExecuteOrderDialog({ open, onClose, order, onExecute, loading }: ExecuteOrderDialogProps) {
  const [actualQuantities, setActualQuantities] = useState<{[itemId: string]: number}>({});
  const [itemNotes, setItemNotes] = useState<{[itemId: string]: string}>({});
  const { showToast } = useToastHandler();

  useEffect(() => {
    if (order) {
      const initialQty: {[itemId: string]: number} = {};
      const initialNotes: {[itemId: string]: string} = {};
      
      order.items.forEach(item => {
        initialQty[item.id] = item.actualFoundQuantity || item.confirmedQuantity;
        initialNotes[item.id] = item.notes || '';
      });
      
      setActualQuantities(initialQty);
      setItemNotes(initialNotes);
    }
  }, [order]);

  const updateActualQuantity = (itemId: string, quantity: number) => {
    setActualQuantities(prev => ({
      ...prev,
      [itemId]: quantity
    }));
  };

  const updateItemNotes = (itemId: string, notes: string) => {
    setItemNotes(prev => ({
      ...prev,
      [itemId]: notes
    }));
  };

  const handleExecute = async () => {
    if (!order) return;

    const actualItems = order.items.map(item => ({
      itemId: item.id,
      actualFoundQuantity: actualQuantities[item.id] || 0,
      notes: itemNotes[item.id] || undefined
    }));

    // Check for large variances
    const largeVariances = order.items.filter(item => {
      const actual = actualQuantities[item.id] || 0;
      const confirmed = item.confirmedQuantity;
      const variance = Math.abs((actual - confirmed) / confirmed);
      return variance > 0.2; // 20% variance threshold
    });

    if (largeVariances.length > 0) {
      const missingNotes = largeVariances.filter(item => !itemNotes[item.id]?.trim());
      if (missingNotes.length > 0) {
        showToast({ 
          type: 'warning', 
          title: 'Large Variance Detected', 
          message: 'Please add notes explaining variances > 20%' 
        });
        return;
      }
    }

    await onExecute(actualItems);
  };

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
      field: 'confirmedQuantity', 
      headerName: 'To Buy', 
      width: 80,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value} size="small" color="info" />
      )
    },
    {
      field: 'actualFoundQuantity',
      headerName: 'Actually Found',
      width: 140,
      renderCell: (params: GridRenderCellParams) => (
        <TextField
          type="number"
          size="small"
          value={actualQuantities[params.row.id] || 0}
          onChange={(e) => updateActualQuantity(params.row.id, parseInt(e.target.value) || 0)}
          inputProps={{ min: 0 }}
          sx={{ width: '120px' }}
          color={
            (actualQuantities[params.row.id] || 0) !== params.row.confirmedQuantity 
              ? 'warning' 
              : 'success'
          }
        />
      )
    },
    {
      field: 'variance',
      headerName: 'Variance',
      width: 100,
      renderCell: (params: GridRenderCellParams) => {
        const actual = actualQuantities[params.row.id] || 0;
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
      field: 'notes',
      headerName: 'Notes',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => {
        const actual = actualQuantities[params.row.id] || 0;
        const confirmed = params.row.confirmedQuantity;
        const percentVariance = confirmed > 0 ? Math.abs((actual - confirmed) / confirmed) : 0;
        const requiresNotes = percentVariance > 0.2;
        
        return (
          <TextField
            size="small"
            multiline
            maxRows={2}
            value={itemNotes[params.row.id] || ''}
            onChange={(e) => updateItemNotes(params.row.id, e.target.value)}
            placeholder={requiresNotes ? "Explain variance (required)" : "Optional notes"}
            fullWidth
            error={requiresNotes && !itemNotes[params.row.id]?.trim()}
            helperText={requiresNotes && !itemNotes[params.row.id]?.trim() ? "Required for >20% variance" : ""}
          />
        );
      }
    }
  ];

  const totalActualCost = order.items.reduce((sum, item) => {
    const actualQty = actualQuantities[item.id] || 0;
    return sum + (actualQty * parseFloat(item.unitCost));
  }, 0);

  const totalConfirmedCost = order.items.reduce((sum, item) => 
    sum + (item.confirmedQuantity * parseFloat(item.unitCost)), 0
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">Execute Order {order.orderNumber} at Market</Typography>
          <Chip label="CONFIRMED → EXECUTED_AT_MARKET" color="secondary" size="small" />
        </Box>
      </DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" gutterBottom>
            🛒 Phase 4: Market Execution - Record what you actually found at the market
          </Typography>
          <Typography variant="caption">
            • Enter actualFoundQuantity for each item (can be 0 if unavailable)<br/>
            • actualFoundQuantity can differ from confirmedQuantity (real-world scenario)<br/>
            • Large variances (&gt;20%) require explanation in notes<br/>
            • Document reasons: out of stock, supplier changed, price difference, etc.
          </Typography>
        </Alert>

        <Box sx={{ mb: 2 }}>
          <Typography variant="body2"><strong>Confirmed:</strong> {new Date(order.confirmedAt).toLocaleString()}</Typography>
          {order.notes && (
            <Typography variant="body2"><strong>Order Notes:</strong> {order.notes}</Typography>
          )}
        </Box>

        <Box sx={{ height: 450, mb: 2 }}>
          <DataGrid
            rows={order.items}
            columns={columns}
            hideFooter
            disableRowSelectionOnClick
            density="compact"
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">
              Planned Cost: ${totalConfirmedCost.toFixed(2)}
            </Typography>
            <Typography variant="h6">
              Actual Cost: ${totalActualCost.toFixed(2)}
            </Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="body2" color="text.secondary">
              Items found: {Object.values(actualQuantities).filter(qty => qty > 0).length}
            </Typography>
            <Typography variant="body2" color={totalActualCost > totalConfirmedCost ? 'error' : 'success'}>
              Cost Variance: ${(totalActualCost - totalConfirmedCost).toFixed(2)}
            </Typography>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleExecute} 
          variant="contained" 
          disabled={loading}
          color="secondary"
        >
          Complete Market Execution
        </Button>
      </DialogActions>
    </Dialog>
  );
}