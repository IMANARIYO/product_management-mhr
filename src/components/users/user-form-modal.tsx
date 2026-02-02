/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createUser, updateUser } from '@/app/actions/auth';
import { toast } from 'sonner';

interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: string;
}

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: User | null;
  onSuccess: () => void;
}

export function UserFormModal({ isOpen, onClose, user, onSuccess }: UserFormModalProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    password: '',
    role: 'EMPLOYEE' as 'ADMIN' | 'EMPLOYEE',
  });
  const [isLoading, setIsLoading] = useState(false);

  const isEditing = !!user;

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        password: '', // Don't populate password for editing
        role: user.role,
      });
    } else {
      setFormData({
        fullName: '',
        phoneNumber: '',
        password: '',
        role: 'EMPLOYEE',
      });
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let result;
      if (isEditing && user) {
        result = await updateUser(
          user.id,
          formData.fullName,
          formData.role
        );
      } else {
        result = await createUser(
          formData.fullName,
          formData.phoneNumber,
          formData.password,
          formData.role
        );
      }

      if (result.success) {
        toast.success(isEditing ? 'User updated successfully' : 'User created successfully');
        onSuccess();
        onClose();
      } else {
        toast.error(result.error || 'Operation failed');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">{isEditing ? 'Edit User' : 'Add New User'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Full Name</label>
            <Input
              value={formData.fullName}
              onChange={(e) => handleInputChange('fullName', e.target.value)}
              placeholder="Enter full name"
              disabled={isLoading}
              className="h-12"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Phone Number</label>
            <Input
              value={formData.phoneNumber}
              onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
              placeholder="+250 7XX XXX XXX"
              disabled={isLoading || isEditing}
              className="h-12"
              required
            />
          </div>

          {!isEditing && (
            <div>
              <label className="text-sm font-medium mb-2 block">Password</label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Enter password"
                disabled={isLoading}
                className="h-12"
                required
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Role</label>
            <Select value={formData.role} onValueChange={(value) => handleInputChange('role', value)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMPLOYEE">Employee</SelectItem>
                <SelectItem value="ADMIN">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col space-y-3 pt-4">
            <Button type="submit" disabled={isLoading} className="h-12">
              {isLoading ? 'Saving...' : isEditing ? 'Update User' : 'Create User'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="h-12">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}