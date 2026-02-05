'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Button, Chip, Dialog, DialogTitle, DialogContent, Box } from '@mui/material';
import { DataGrid, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { Visibility, History } from '@mui/icons-material';
import { toast } from 'sonner';
import { getAllStockDays, getStockDayDetails } from '@/app/actions/stock-day-history';
import { StockDayStatus } from '@/db/types';

interface StockDayRecord {
  id: string;
  businessDate: Date;
  status: StockDayStatus;
  totalOpeningStock?: number;
  totalClosingStock?: number;
  totalStockIn?: number;
  totalStockOut?: number;
  openedAt: Date;
  verifiedAt?: Date | null;
  closedAt?: Date | null;
  opener?: { fullName: string; phoneNumber: string } | null;
  verifier?: { fullName: string; phoneNumber: string } | null;
  closer?: { fullName: string; phoneNumber: string } | null;
}

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
  verifiedAt?: Date | null;
  product: {
    id: string;
    name: string;
    size: string;
    sellingPrice: string;
    buyingPrice: string;
  };
}

export function StockDayHistory() {
  const [stockDays, setStockDays] = useState<StockDayRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedStockDay, setSelectedStockDay] = useState<StockDayRecord | null>(null);
  const [snapshots, setSnapshots] = useState<StockSnapshot[]>([]);

  useEffect(() => {
    fetchStockDays();
  }, []);

  const fetchStockDays = async () => {
    setLoading(true);
    try {
      const result = await getAllStockDays();
      if (result.success) {
        setStockDays(result.stockDays);
      }
    } catch (error) {
      console.error('Error fetching stock days:', error);
      toast.error('Failed to fetch stock days');
    } finally {
      setLoading(false);
    }
  };

  const handleViewStockDay = async (stockDay: StockDayRecord) => {
    setLoading(true);
    try {
      const result = await getStockDayDetails(stockDay.id);
      if (result.success) {
        setSelectedStockDay(result.stockDay);
        setSnapshots(result.snapshots);
        setViewDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching stock day details:', error);
      toast.error('Failed to fetch stock day details');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: StockDayStatus) => {
    switch (status) {
      case 'OPEN': return 'warning';
      case 'VERIFIED': return 'info';
      case 'CLOSED': return 'success';
      default: return 'default';
    }
  };

  const stockDayColumns: GridColDef[] = [
    {
      field: 'businessDate',
      headerName: 'Date',
      width: 120,
      renderCell: (params: GridRenderCellParams) => 
        new Date(params.value).toLocaleDateString()
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value} 
          color={getStatusColor(params.value)}
          size="small"
        />
      )
    },
    {
      field: 'totalOpeningStock',
      headerName: 'Opening Stock',
      width: 130,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => params.value || 'N/A'
    },
    {
      field: 'totalClosingStock',
      headerName: 'Closing Stock',
      width: 130,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => params.value || 'N/A'
    },
    {
      field: 'totalStockIn',
      headerName: 'Stock In',
      width: 100,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <span className="text-green-600">+{params.value || 0}</span>
      )
    },
    {
      field: 'totalStockOut',
      headerName: 'Stock Out',
      width: 100,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <span className="text-red-600">-{params.value || 0}</span>
      )
    },
    {
      field: 'opener',
      headerName: 'Opened By',
      width: 150,
      renderCell: (params: GridRenderCellParams) => 
        params.row.opener?.fullName || 'N/A'
    },
    {
      field: 'closedAt',
      headerName: 'Closed At',
      width: 150,
      renderCell: (params: GridRenderCellParams) => 
        params.value ? new Date(params.value).toLocaleString() : 'N/A'
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <Button
          size="small"
          startIcon={<Visibility />}
          onClick={() => handleViewStockDay(params.row)}
        >
          View
        </Button>
      )
    }
  ];

  const snapshotColumns: GridColDef[] = [
    {
      field: 'productName',
      headerName: 'Product',
      flex: 1,
      renderCell: (params: GridRenderCellParams) => 
        `${params.row.product.name} (${params.row.product.size})`
    },
    {
      field: 'expectedOpeningStock',
      headerName: 'Expected',
      width: 100,
      type: 'number'
    },
    {
      field: 'openingStock',
      headerName: 'Opening',
      width: 100,
      type: 'number'
    },
    {
      field: 'stockIn',
      headerName: 'In',
      width: 80,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <span className="text-green-600">+{params.value}</span>
      )
    },
    {
      field: 'stockOut',
      headerName: 'Out',
      width: 80,
      type: 'number',
      renderCell: (params: GridRenderCellParams) => (
        <span className="text-red-600">-{params.value}</span>
      )
    },
    {
      field: 'closingStock',
      headerName: 'Closing',
      width: 100,
      type: 'number'
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
      }
    },
    {
      field: 'isVerified',
      headerName: 'Verified',
      width: 100,
      renderCell: (params: GridRenderCellParams) => (
        <Chip 
          label={params.value ? 'Yes' : 'No'} 
          color={params.value ? 'success' : 'warning'}
          size="small"
        />
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Stock Day History</h1>
          <p className="text-muted-foreground mt-2">
            Review all previous stock days and their details
          </p>
        </div>
        <Button
          variant="outlined"
          startIcon={<History />}
          onClick={fetchStockDays}
          disabled={loading}
        >
          Refresh
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <Typography variant="h6" className="mb-4">Stock Days History</Typography>
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={stockDays}
              columns={stockDayColumns}
              loading={loading}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25 },
                },
              }}
              pageSizeOptions={[10, 25, 50]}
              disableRowSelectionOnClick
            />
          </Box>
        </CardContent>
      </Card>

      {/* View Stock Day Details Dialog */}
      <Dialog open={viewDialogOpen} onClose={() => setViewDialogOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>
          Stock Day Details - {selectedStockDay ? new Date(selectedStockDay.businessDate).toDateString() : ''}
        </DialogTitle>
        <DialogContent>
          {selectedStockDay && (
            <div className="space-y-6 mt-2">
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-3">
                    <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                    <Chip 
                      label={selectedStockDay.status} 
                      color={getStatusColor(selectedStockDay.status)}
                      size="small"
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <Typography variant="subtitle2" color="textSecondary">Opening Stock</Typography>
                    <Typography variant="h6">{selectedStockDay.totalOpeningStock || 'N/A'}</Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <Typography variant="subtitle2" color="textSecondary">Closing Stock</Typography>
                    <Typography variant="h6">{selectedStockDay.totalClosingStock || 'N/A'}</Typography>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <Typography variant="subtitle2" color="textSecondary">Net Change</Typography>
                    <Typography variant="h6" className={
                      (selectedStockDay.totalStockIn || 0) - (selectedStockDay.totalStockOut || 0) >= 0 
                        ? 'text-green-600' : 'text-red-600'
                    }>
                      {((selectedStockDay.totalStockIn || 0) - (selectedStockDay.totalStockOut || 0)) >= 0 ? '+' : ''}
                      {(selectedStockDay.totalStockIn || 0) - (selectedStockDay.totalStockOut || 0)}
                    </Typography>
                  </CardContent>
                </Card>
              </div>

              {/* Timeline */}
              <Card>
                <CardContent className="p-4">
                  <Typography variant="h6" className="mb-3">Timeline</Typography>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Opened:</span>
                      <span>{new Date(selectedStockDay.openedAt).toLocaleString()} by {selectedStockDay.opener?.fullName}</span>
                    </div>
                    {selectedStockDay.verifiedAt && (
                      <div className="flex justify-between">
                        <span>Verified:</span>
                        <span>{new Date(selectedStockDay.verifiedAt).toLocaleString()} by {selectedStockDay.verifier?.fullName}</span>
                      </div>
                    )}
                    {selectedStockDay.closedAt && (
                      <div className="flex justify-between">
                        <span>Closed:</span>
                        <span>{new Date(selectedStockDay.closedAt).toLocaleString()} by {selectedStockDay.closer?.fullName}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Product Details */}
              <Card>
                <CardContent className="p-4">
                  <Typography variant="h6" className="mb-4">Product Details</Typography>
                  <Box sx={{ height: 400, width: '100%' }}>
                    <DataGrid
                      rows={snapshots}
                      columns={snapshotColumns}
                      initialState={{
                        pagination: {
                          paginationModel: { pageSize: 10 },
                        },
                      }}
                      pageSizeOptions={[10, 25]}
                      disableRowSelectionOnClick
                    />
                  </Box>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}