'use client';

import { Dialog, DialogTitle, DialogContent, Typography, Box, TextField, Button } from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';

interface OrderDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  orderItems: any[];
  columns: GridColDef[];
  totalOrderCost: number;
  notes: string;
  onNotesChange: (notes: string) => void;
  onSubmit: () => void;
  loading: boolean;
  submitLabel: string;
  pendingChanges?: Set<string>;
  onSaveAll?: () => void;
}

export function OrderDialog({
  open,
  onClose,
  title,
  orderItems,
  columns,
  totalOrderCost,
  notes,
  onNotesChange,
  onSubmit,
  loading,
  submitLabel,
  pendingChanges,
  onSaveAll
}: OrderDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle className="text-lg sm:text-xl">{title}</DialogTitle>
      <DialogContent>
        <div className="space-y-4 mt-2">
          <Typography variant="h6" className="text-base sm:text-lg">Select Products & Quantities</Typography>
          <Box sx={{ height: { xs: 300, sm: 400 }, width: '100%' }}>
            <DataGrid
              rows={orderItems}
              columns={columns}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 10 },
                },
              }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
              density="compact"
              sx={{
                '& .MuiDataGrid-cell': {
                  padding: '4px',
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                },
                '& .MuiDataGrid-columnHeader': {
                  fontSize: { xs: '0.75rem', sm: '0.875rem' },
                },
              }}
            />
          </Box>

          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' }, 
            justifyContent: 'space-between', 
            alignItems: { xs: 'start', sm: 'center' }, 
            mt: 2, 
            gap: 2 
          }}>
            <Typography variant="h6" className="text-base sm:text-lg">
              Total: ${totalOrderCost.toFixed(2)}
            </Typography>
            <Typography variant="body2" color="textSecondary" className="text-sm">
              Items: {orderItems.filter(item => item.quantity > 0).length}
            </Typography>
          </Box>

          <TextField
            fullWidth
            multiline
            rows={3}
            label="Notes (Optional)"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            size="small"
          />

          <div className="flex flex-col sm:flex-row justify-end gap-2">
            <Button onClick={onClose} size="small">Cancel</Button>
            {pendingChanges && pendingChanges.size > 0 && onSaveAll && (
              <Button
                onClick={onSaveAll}
                variant="outlined"
                disabled={loading}
                size="small"
                color="primary"
              >
                Save All ({pendingChanges.size})
              </Button>
            )}
            <Button onClick={onSubmit} variant="contained" disabled={loading} size="small">
              {submitLabel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}