'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, Eye, Grid3X3, List } from 'lucide-react';
import { ProductDialog } from './product-dialog';
import { ProductCard } from './product-card';
import { deactivateProduct } from '@/app/actions/products';
import { toast } from 'sonner';
import { Product } from '@/db/types';
import Image from 'next/image';
import { DataGrid, GridColDef, GridActionsCellItem } from '@mui/x-data-grid';
import Box from '@mui/material/Box';

interface ProductWithStock extends Product {
  currentStock: number;
}

interface ProductsListProps {
  products: ProductWithStock[];
  userRole: string;
  onProductsChange: () => void;
}

export function ProductsList({ products, userRole, onProductsChange }: ProductsListProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'create' | 'edit' | 'view'>('create');
  const [loading, setLoading] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<'grid' | 'table'>('table');

  const getProductColor = (type: string) => {
    const colors: Record<string, string> = {
      BEER: 'bg-yellow-100 text-yellow-800',
      SODA: 'bg-blue-100 text-blue-800',
      WINE: 'bg-red-100 text-red-800',
      SPIRIT: 'bg-purple-100 text-purple-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const handleDelete = async (productId: string, productName: string) => {
    if (!confirm(`Are you sure you want to delete ${productName}?`)) return;

    setLoading(productId);
    console.log('Deleting product:', { productId, productName });

    try {
      const result = await deactivateProduct(productId);
      console.log('Delete result:', result);

      if (result.success) {
        toast.success(`Product "${productName}" deleted successfully`);
        onProductsChange();
      } else {
        toast.error(result.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('An error occurred while deleting the product');
    } finally {
      setLoading(null);
    }
  };

  const openDialog = (product: ProductWithStock | null, mode: 'create' | 'edit' | 'view') => {
    console.log('Opening dialog:', { product: product?.name, mode });
    setSelectedProduct(product);
    setViewMode(mode);
    setIsDialogOpen(true);
  };

  const columns: GridColDef[] = [
    {
      field: 'image',
      headerName: 'Image',
      width: 80,
      renderCell: (params) => (
        params.value ? (
          <div className="relative w-10 h-10 rounded overflow-hidden">
            <Image
              src={params.value}
              alt={params.row.name}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
            <span className="text-xs text-gray-400">No img</span>
          </div>
        )
      ),
    },
    { field: 'name', headerName: 'Name', width: 200, flex: 1 },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => (
        <Badge className={getProductColor(params.value)}>
          {params.value}
        </Badge>
      ),
    },
    { field: 'size', headerName: 'Size', width: 120 },
    {
      field: 'buyingPrice',
      headerName: 'Buying Price',
      width: 130,
      renderCell: (params) => `RWF ${parseFloat(params.value).toLocaleString()}`,
    },
    {
      field: 'sellingPrice',
      headerName: 'Selling Price',
      width: 130,
      renderCell: (params) => `RWF ${parseFloat(params.value).toLocaleString()}`,
    },
    {
      field: 'currentStock',
      headerName: 'Stock',
      width: 100,
      renderCell: (params) => `${params.value} units`,
    },
    {
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 120,
      getActions: (params) => {
        const actions = [
          <GridActionsCellItem
            key="view"
            icon={<Eye className="w-4 h-4" />}
            label="View"
            onClick={() => openDialog(params.row, 'view')}
          />,
        ];

        if (userRole === 'ADMIN') {
          actions.push(
            <GridActionsCellItem
              key="edit"
              icon={<Edit2 className="w-4 h-4" />}
              label="Edit"
              onClick={() => openDialog(params.row, 'edit')}
            />,
            <GridActionsCellItem
              key="delete"
              icon={<Trash2 className="w-4 h-4" />}
              label="Delete"
              onClick={() => handleDelete(params.row.id, params.row.name)}
            />
          );
        }

        return actions;
      },
    },
  ];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <div className="flex gap-2">
          <Button
            variant={displayMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDisplayMode('table')}
          >
            <List className="w-4 h-4 mr-2" />
            Table
          </Button>
          <Button
            variant={displayMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDisplayMode('grid')}
          >
            <Grid3X3 className="w-4 h-4 mr-2" />
            Cards
          </Button>
        </div>
      </div>

      {displayMode === 'table' ? (
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={products}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: {
                  pageSize: 10,
                },
              },
            }}
            pageSizeOptions={[5, 10, 20, 30, 40, 50, 100]}
            checkboxSelection
            disableRowSelectionOnClick
            sx={{
              '& .MuiDataGrid-cell': {
                display: 'flex',
                alignItems: 'center',
              },
            }}
          />
        </Box>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.length === 0 ? (
            <Card className="col-span-full p-8 text-center">
              <p className="text-muted-foreground">No products found</p>
            </Card>
          ) : (
            products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                userRole={userRole}
                onView={(p) => openDialog(p as ProductWithStock, 'view')}
                onEdit={(p) => openDialog(p as ProductWithStock, 'edit')}
                onDelete={(p) => handleDelete(p.id, p.name)}
                loading={loading === product.id}
              />
            ))
          )}
        </div>
      )}

      <ProductDialog
        product={selectedProduct}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode={viewMode}
        onClose={() => {
          setSelectedProduct(null);
          setIsDialogOpen(false);
        }}
        onSuccess={onProductsChange}
      />
    </>
  );
}
