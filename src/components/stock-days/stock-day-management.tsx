'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, Typography, Button, Chip, Dialog, DialogTitle, DialogContent, TextField, Box, Tooltip } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams, GridToolbar } from '@mui/x-data-grid';
import { Add, CheckCircle, Visibility } from '@mui/icons-material';
import { toast } from 'sonner';
import { getCurrentUserAction } from '@/app/actions/profile';
import { initializeStockDay, verifyProductStock, verifyStockDay as verifyStockDayInit } from '@/app/actions/stock-day-init';
import { closeCurrentStockDay } from '@/app/actions/stock-day-close';
import { getStockDayStatus, forceCloseStockDay } from '@/app/actions/stock-day-actions';
import { handleStockAction } from '@/app/actions/stock';
import { StockDayStatus } from '@/db/types';

interface StockSnapshot {
  id: string;
  productId: string;
  expectedOpeningStock: number;
  openingStock: number;
  variance: number | null;
  stockIn: number;
  stockOut: number;
  closingStock: number;
  isOutOfStock: number;
  isVerified: number;
  product: {
    id: string;
    name: string;
    size: string;
    sellingPrice: string;
    buyingPrice: string;
  };
}

interface StockDay {
  id: string;
  businessDate: Date;
  status: StockDayStatus;
  snapshots: StockSnapshot[];
}

interface CurrentUser {
  id: string;
  fullName: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

interface SnapshotRow extends StockSnapshot {
  productName: string;
  productSize: string;
  sellingPrice: number;
  buyingPrice: number;
  openingValue: number;
  closingValue: number;
  varianceValue: number;
}

export function StockDayManagement() {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [stockDay, setStockDay] = useState<StockDay | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [addStockDialogOpen, setAddStockDialogOpen] = useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<StockSnapshot | null>(null);
  const [verifiedQuantity, setVerifiedQuantity] = useState(0);
  const [addQuantity, setAddQuantity] = useState(0);
  const [addReason, setAddReason] = useState('');
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionDialogData, setActionDialogData] = useState<{
    title: string;
    message: string;
    actions: Array<{ label: string; action: () => void; color?: 'primary' | 'error' | 'success' }>;
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userResult = await getCurrentUserAction();
      if (userResult.success && userResult.user) {
        setUser(userResult.user as CurrentUser);
      }

      const today = new Date();
      const result = await initializeStockDay(today);
      if (result.stockDay && result.snapshots) {
        setStockDay({
          ...result.stockDay,
          snapshots: result.snapshots
        });
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStockDay = async () => {
    setLoading(true);
    try {
      const status = await getStockDayStatus();
      
      if (status.hasOpen || status.hasVerified) {
        const stockDay = status.openStockDay || status.verifiedStockDay;
        const statusText = status.hasOpen ? 'OPEN' : 'VERIFIED';
        
        setActionDialogData({
          title: `Existing Stock Day Found (${statusText})`,
          message: `There is already a stock day that needs to be closed before opening a new one. What would you like to do?`,
          actions: [
            {
              label: 'Close Existing & Open New',
              action: async () => {
                try {
                  await forceCloseStockDay(stockDay!.id);
                  toast.success('Previous stock day closed');
                  const today = new Date();
                  const result = await initializeStockDay(today);
                  if (result.stockDay) {
                    toast.success('New stock day opened successfully');
                    fetchData();
                  }
                } catch (error) {
                  console.error('Error:', error);
                  throw error;
                }
                setActionDialogOpen(false);
              },
              color: 'primary'
            },
            {
              label: 'Cancel',
              action: () => setActionDialogOpen(false)
            }
          ]
        });
        setActionDialogOpen(true);
        return;
      }
      
      const today = new Date();
      const result = await initializeStockDay(today);
      if (result.stockDay) {
        toast.success('Stock day opened successfully');
        fetchData();
      }
    } catch (error) {
      console.error('Error opening stock day:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStock = (snapshot: StockSnapshot) => {
    setSelectedSnapshot(snapshot);
    setVerifiedQuantity(snapshot.openingStock);
    setVerifyDialogOpen(true);
  };

  const handleConfirmVerify = async () => {
    if (!selectedSnapshot) return;

    setLoading(true);
    try {
      await verifyProductStock(selectedSnapshot.id, verifiedQuantity);
      toast.success('Stock verified successfully');
      setVerifyDialogOpen(false);
      setSelectedSnapshot(null);
      fetchData();
    } catch (error) {
      console.error('Error verifying stock:', error);
      toast.error('Failed to verify stock');
    } finally {
      setLoading(false);
    }
  };

  const handleAddStock = (snapshot: StockSnapshot) => {
    setSelectedSnapshot(snapshot);
    setAddQuantity(0);
    setAddReason('');
    setAddStockDialogOpen(true);
  };

  const handleConfirmAddStock = async () => {
    if (!selectedSnapshot || addQuantity <= 0) return;

    setLoading(true);
    try {
      const result = await handleStockAction({
        productId: selectedSnapshot.productId,
        actionType: 'STOCK_IN',
        quantity: addQuantity,
        reason: addReason || 'Stock adjustment during stock day'
      });

      if (result.success) {
        toast.success('Stock added successfully');
        setAddStockDialogOpen(false);
        setSelectedSnapshot(null);
        fetchData();
      } else {
        toast.error(result.toast?.message || 'Failed to add stock');
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      toast.error('Failed to add stock');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyStockDay = async () => {
    if (!stockDay) return;

    setLoading(true);
    try {
      await verifyStockDayInit(stockDay.id);
      toast.success('Stock day verified successfully');
      fetchData();
    } catch (error) {
      console.error('Error verifying stock day:', error);
      toast.error('Failed to verify stock day');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseStockDay = async () => {
    setLoading(true);
    try {
      const result = await closeCurrentStockDay();
      if (result) {
        toast.success('Stock day closed successfully');
        setCloseDialogOpen(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error closing stock day:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to close stock day';
      
      if (errorMessage.includes('No open or verified stock day found')) {
        setActionDialogData({
          title: 'No Stock Day to Close',
          message: 'There is no open or verified stock day to close. Would you like to open a new stock day?',
          actions: [
            {
              label: 'Open New Stock Day',
              action: () => {
                setActionDialogOpen(false);
                handleOpenStockDay();
              },
              color: 'primary'
            },
            {
              label: 'Cancel',
              action: () => setActionDialogOpen(false)
            }
          ]
        });
        setActionDialogOpen(true);
      } else {
        throw error;
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: StockDayStatus) => {
    switch (status) {
      case 'OPEN': return 'primary';
      case 'VERIFIED': return 'success';
      case 'CLOSED': return 'default';
      default: return 'default';
    }
  };

  const rows: SnapshotRow[] = useMemo(() => {
    if (!stockDay?.snapshots) return [];

    return stockDay.snapshots.map(snapshot => {
      const sellingPrice = parseFloat(snapshot.product.sellingPrice || '0');
      const buyingPrice = parseFloat(snapshot.product.buyingPrice || '0');
      const variance = snapshot.variance || 0;

      return {
        ...snapshot,
        productName: snapshot.product.name,
        productSize: snapshot.product.size,
        sellingPrice,
        buyingPrice,
        openingValue: snapshot.openingStock * sellingPrice,
        closingValue: snapshot.closingStock * sellingPrice,
        varianceValue: variance * sellingPrice,
      };
    });
  }, [stockDay?.snapshots]);

  const totalValues = useMemo(() => {
    return rows.reduce((acc, row) => ({
      openingStock: acc.openingStock + row.openingStock,
      closingStock: acc.closingStock + row.closingStock,
      stockIn: acc.stockIn + row.stockIn,
      stockOut: acc.stockOut + row.stockOut,
      openingValue: acc.openingValue + row.openingValue,
      closingValue: acc.closingValue + row.closingValue,
      varianceValue: acc.varianceValue + row.varianceValue,
    }), {
      openingStock: 0,
      closingStock: 0,
      stockIn: 0,
      stockOut: 0,
      openingValue: 0,
      closingValue: 0,
      varianceValue: 0,
    });
  }, [rows]);

  const allProductsVerified = stockDay?.snapshots?.every(snapshot => snapshot.isVerified === 1) ?? false;
  const unverifiedCount = stockDay?.snapshots?.filter(snapshot => snapshot.isVerified !== 1).length ?? 0;

  const columns: GridColDef[] = [
    {
      field: 'productName',
      headerName: 'Product',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'productSize',
      headerName: 'Size',
      width: 100,
    },
    {
      field: 'sellingPrice',
      headerName: 'Selling Price',
      width: 120,
      renderCell: (params: GridRenderCellParams) => `RWF ${params.value.toLocaleString()}`,
    },
    {
      field: 'buyingPrice',
      headerName: 'Buying Price',
      width: 120,
      renderCell: (params: GridRenderCellParams) => `RWF ${params.value.toLocaleString()}`,
    },
    {
      field: 'expectedOpeningStock',
      headerName: 'Expected',
      width: 100,
      type: 'number',
    },
    {
      field: 'openingStock',
      headerName: 'Opening Stock',
      width: 120,
      type: 'number',
    },
    {
      field: 'openingValue',
      headerName: 'Opening Value',
      width: 130,
      renderCell: (params: GridRenderCellParams) => `RWF ${params.value.toLocaleString()}`,
    },
    {
      field: 'stockIn',
      headerName: 'Stock In',
      width: 100,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <span className="text-green-600 font-medium">+{params.value}</span>
      ),
    },
    {
      field: 'stockOut',
      headerName: 'Stock Out',
      width: 100,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <span className="text-red-600 font-medium">-{params.value}</span>
      ),
    },
    {
      field: 'closingStock',
      headerName: 'Closing Stock',
      width: 120,
      type: 'number',
    },
    {
      field: 'closingValue',
      headerName: 'Closing Value',
      width: 130,
      renderCell: (params: GridRenderCellParams) => `RWF ${params.value.toLocaleString()}`,
    },
    {
      field: 'variance',
      headerName: 'Variance',
      width: 100,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => {
        const value = params.value || 0;
        return (
          <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
            {value >= 0 ? '+' : ''}{value}
          </span>
        );
      },
    },
    {
      field: 'varianceValue',
      headerName: 'Variance Value',
      width: 130,
      renderCell: (params: GridRenderCellParams) => {
        const value = params.value || 0;
        return (
          <span className={value >= 0 ? 'text-green-600' : 'text-red-600'}>
            RWF {value.toLocaleString()}
          </span>
        );
      },
    },
    {
      field: 'isVerified',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <div className="flex gap-1">
          {params.value ? (
            <Chip label="Verified" color="success" size="small" />
          ) : (
            <Chip label="Pending" color="warning" size="small" />
          )}
          {params.row.isOutOfStock ? (
            <Chip label="Out" color="error" size="small" />
          ) : null}
        </div>
      ),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 200,
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams) => (
        <div className="flex gap-1">
          <Button
            size="small"
            startIcon={<Visibility />}
            onClick={() => handleVerifyStock(params.row)}
            disabled={stockDay?.status !== 'OPEN' || params.row.isVerified === 1}
          >
            Verify
          </Button>
          <Button
            size="small"
            startIcon={<Add />}
            onClick={() => handleAddStock(params.row)}
            disabled={stockDay?.status !== 'OPEN'}
          >
            Add
          </Button>
        </div>
      ),
    },
  ];

  if (!user) return null;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Stock Day Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage daily stock verification and tracking
          </p>
        </div>
        {!stockDay && (
          <Button
            variant="contained"
            onClick={handleOpenStockDay}
            disabled={loading}
          >
            Open Stock Day
          </Button>
        )}
      </div>

      {stockDay ? (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <Typography variant="h6">
                    Stock Day - {new Date(stockDay.businessDate).toDateString()}
                  </Typography>
                  <Chip
                    label={stockDay.status}
                    color={getStatusColor(stockDay.status)}
                    size="small"
                    className="mt-2"
                  />
                </div>
                {stockDay.status === 'OPEN' && user.role === 'ADMIN' && (
                  <Tooltip 
                    title={!allProductsVerified ? `Please verify all ${unverifiedCount} remaining products before proceeding` : ""}
                    arrow
                  >
                    <span>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<CheckCircle />}
                        onClick={handleVerifyStockDay}
                        disabled={loading || !allProductsVerified}
                      >
                        Verify Stock Day
                      </Button>
                    </span>
                  </Tooltip>
                )}
                {stockDay.status === 'VERIFIED' && user.role === 'ADMIN' && (
                  <Button
                    variant="contained"
                    color="error"
                    onClick={() => setCloseDialogOpen(true)}
                    disabled={loading}
                  >
                    Close Stock Day
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <Typography variant="subtitle2" color="textSecondary">Opening Stock</Typography>
                <Typography variant="h6">{totalValues.openingStock} units</Typography>
                <Typography variant="body2" color="textSecondary">
                  RWF {totalValues.openingValue.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Typography variant="subtitle2" color="textSecondary">Closing Stock</Typography>
                <Typography variant="h6">{totalValues.closingStock} units</Typography>
                <Typography variant="body2" color="textSecondary">
                  RWF {totalValues.closingValue.toLocaleString()}
                </Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Typography variant="subtitle2" color="textSecondary">Stock In</Typography>
                <Typography variant="h6" className="text-green-600">+{totalValues.stockIn}</Typography>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <Typography variant="subtitle2" color="textSecondary">Stock Out</Typography>
                <Typography variant="h6" className="text-red-600">-{totalValues.stockOut}</Typography>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4">
              <Typography variant="h6" className="mb-4">Product Stock Details</Typography>
              <Box sx={{ height: 600, width: '100%' }}>
                <DataGrid
                  rows={rows}
                  columns={columns}
                  initialState={{
                    pagination: {
                      paginationModel: { pageSize: 25 },
                    },
                  }}
                  pageSizeOptions={[10, 25, 50, 100]}
                  disableRowSelectionOnClick
                  slots={{ toolbar: GridToolbar }}
                  slotProps={{
                    toolbar: {
                      showQuickFilter: true,
                      quickFilterProps: { debounceMs: 500 },
                    },
                  }}
                  sx={{
                    '& .MuiDataGrid-cell': {
                      fontSize: '0.875rem',
                    },
                    '& .MuiDataGrid-columnHeader': {
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <Typography variant="h6" className="mb-2">No Stock Day Open</Typography>
            <Typography color="textSecondary" className="mb-4">
              Open a stock day to start tracking daily inventory
            </Typography>
            <Button
              variant="contained"
              onClick={handleOpenStockDay}
              disabled={loading}
            >
              Open Stock Day
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Dialog */}
      <Dialog open={actionDialogOpen} onClose={() => setActionDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{actionDialogData?.title}</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            <Typography variant="body1">
              {actionDialogData?.message}
            </Typography>
            
            <div className="flex justify-end gap-2 mt-6">
              {actionDialogData?.actions.map((action, index) => (
                <Button 
                  key={index}
                  onClick={action.action}
                  variant={action.color === 'primary' ? 'contained' : 'outlined'}
                  color={action.color || 'primary'}
                  disabled={loading}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Close Stock Day Dialog */}
      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Close Stock Day - Confirmation Required</DialogTitle>
        <DialogContent>
          <div className="space-y-4 mt-2">
            <Typography variant="h6" color="error">
              ⚠️ Warning: This action will permanently close the stock day
            </Typography>
            
            <Typography variant="body1">
              Closing the stock day will:
            </Typography>
            
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li>Calculate and store final totals from all product snapshots</li>
              <li>Record total expected opening stock: <strong>{totalValues.openingStock} units</strong></li>
              <li>Record total stock in: <strong>+{totalValues.stockIn} units</strong></li>
              <li>Record total stock out: <strong>-{totalValues.stockOut} units</strong></li>
              <li>Record total closing stock: <strong>{totalValues.closingStock} units</strong></li>
              <li>Record total closing value: <strong>RWF {totalValues.closingValue.toLocaleString()}</strong></li>
              <li>Mark the stock day as CLOSED - no further modifications allowed</li>
              <li>Enable opening of a new stock day for tomorrow</li>
            </ul>
            
            <Typography variant="body2" color="textSecondary">
              This action cannot be undone. Please ensure all stock verifications are complete.
            </Typography>
            
            <div className="flex justify-end gap-2 mt-6">
              <Button onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
              <Button 
                onClick={handleCloseStockDay} 
                variant="contained" 
                color="error" 
                disabled={loading}
              >
                Yes, Close Stock Day
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Verify Stock Dialog */}
      <Dialog open={verifyDialogOpen} onClose={() => setVerifyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Verify Stock</DialogTitle>
        <DialogContent>
          {selectedSnapshot && (
            <div className="space-y-4 mt-2">
              <Typography>
                Product: {selectedSnapshot.product.name} ({selectedSnapshot.product.size})
              </Typography>
              <Typography>
                Expected: {selectedSnapshot.expectedOpeningStock} units
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Verified Quantity"
                value={verifiedQuantity}
                onChange={(e) => setVerifiedQuantity(parseInt(e.target.value) || 0)}
                inputProps={{ min: 0 }}
              />
              <div className="flex justify-end gap-2">
                <Button onClick={() => setVerifyDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmVerify} variant="contained" disabled={loading}>
                  Verify
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Stock Dialog */}
      <Dialog open={addStockDialogOpen} onClose={() => setAddStockDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Stock</DialogTitle>
        <DialogContent>
          {selectedSnapshot && (
            <div className="space-y-4 mt-2">
              <Typography>
                Product: {selectedSnapshot.product.name} ({selectedSnapshot.product.size})
              </Typography>
              <TextField
                fullWidth
                type="number"
                label="Quantity to Add"
                value={addQuantity}
                onChange={(e) => setAddQuantity(parseInt(e.target.value) || 0)}
                inputProps={{ min: 1 }}
              />
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Reason"
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
              />
              <div className="flex justify-end gap-2">
                <Button onClick={() => setAddStockDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleConfirmAddStock} variant="contained" disabled={loading || addQuantity <= 0}>
                  Add Stock
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}