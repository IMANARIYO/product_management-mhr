'use client';

import { Dialog, DialogTitle, DialogContent, Typography, Button } from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  loading: boolean;
  confirmText?: string;
  confirmColor?: 'primary' | 'error' | 'warning';
}

export function ConfirmDialog({ 
  open, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  loading, 
  confirmText = 'Confirm',
  confirmColor = 'primary'
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography className="mb-4">
          {message}
        </Typography>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button 
            onClick={onConfirm} 
            variant="contained" 
            color={confirmColor} 
            disabled={loading}
          >
            {confirmText}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}