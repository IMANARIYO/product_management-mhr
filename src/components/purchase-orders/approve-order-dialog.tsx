'use client';

import { Dialog, DialogTitle, DialogContent, Typography, Button } from '@mui/material';

interface ApproveOrderDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  loading: boolean;
}

export function ApproveOrderDialog({ open, onClose, onApprove, loading }: ApproveOrderDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Approve Purchase Request</DialogTitle>
      <DialogContent>
        <Typography className="mb-4">
          Are you sure you want to approve this purchase request?
        </Typography>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button onClick={onApprove} variant="contained" color="success" disabled={loading}>
            Approve
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}