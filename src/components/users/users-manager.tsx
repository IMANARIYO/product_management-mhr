/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { UserFormModal } from './user-form-modal';
import { disableUser, enableUser } from '@/app/actions/auth';
import { toast } from 'sonner';
import { Pencil, UserX, UserCheck, Plus, Eye, Users, User } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: string;
  createdAt: Date;
}

interface UsersManagerProps {
  users: User[];
  currentUserRole: string;
  onRefresh: () => void;
}

export function UsersManager({ users, currentUserRole, onRefresh }: UsersManagerProps) {
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsFormModalOpen(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsFormModalOpen(true);
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setIsViewModalOpen(true);
  };

  const handleDisableUser = async (userId: string) => {
    if (confirm('Are you sure you want to disable this user?')) {
      try {
        const result = await disableUser(userId);
        if (result.success) {
          toast.success('User disabled successfully');
          onRefresh();
        } else {
          toast.error(result.error || 'Failed to disable user');
        }
      } catch (error) {
        toast.error('An error occurred');
      }
    }
  };

  const handleEnableUser = async (userId: string) => {
    try {
      const result = await enableUser(userId);
      if (result.success) {
        toast.success('User enabled successfully');
        onRefresh();
      } else {
        toast.error(result.error || 'Failed to enable user');
      }
    } catch (error) {
      console.log(error)
      toast.error('An error occurred');
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      ADMIN: 'bg-purple-100 text-purple-800',
      EMPLOYEE: 'bg-blue-100 text-blue-800',
    };
    return colors[role] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-800',
      DISABLED: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 pb-20">
      {/* Mobile Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Users</h2>
          <p className="text-sm text-gray-500">{users.length} total users</p>
        </div>
        {currentUserRole === 'ADMIN' && (
          <Button onClick={handleAddUser} className="h-10">
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
        )}
      </div>

      {/* Mobile User Cards */}
      <div className="space-y-3">
        {users.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="space-y-3">
              {/* User Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                  <p className="text-sm text-gray-500">{user.phoneNumber}</p>
                  <p className="text-xs text-gray-400">
                    Created: {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex flex-col items-end space-y-1">
                  <Badge className={getRoleColor(user.role)} variant="secondary">
                    {user.role}
                  </Badge>
                  <Badge className={getStatusColor(user.status)} variant="secondary">
                    {user.status}
                  </Badge>
                </div>
              </div>

              {/* Mobile Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleViewUser(user)}
                  className="flex-1 h-9"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </Button>

                {currentUserRole === 'ADMIN' && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditUser(user)}
                      className="flex-1 h-9"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>

                    {user.status === 'ACTIVE' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDisableUser(user.id)}
                        className="flex-1 h-9"
                      >
                        <UserX className="w-3 h-3 mr-1" />
                        Disable
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEnableUser(user.id)}
                        className="flex-1 h-9"
                      >
                        <UserCheck className="w-3 h-3 mr-1" />
                        Enable
                      </Button>
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {users.length === 0 && (
        <Card className="p-8 text-center">
          <div className="text-gray-400 mb-2">
            <Users className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-500">No users found</p>
        </Card>
      )}

      {/* Form Modal for Add/Edit */}
      <UserFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        user={selectedUser}
        onSuccess={onRefresh}
      />

      {/* Mobile View Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Full Name</label>
                  <p className="text-sm font-medium mt-1">{selectedUser.fullName}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Phone Number</label>
                  <p className="text-sm font-medium mt-1">{selectedUser.phoneNumber}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Role</label>
                  <div className="mt-2">
                    <Badge className={getRoleColor(selectedUser.role)} variant="secondary">
                      {selectedUser.role}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                  <div className="mt-2">
                    <Badge className={getStatusColor(selectedUser.status)} variant="secondary">
                      {selectedUser.status}
                    </Badge>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-lg">
                  <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created At</label>
                  <p className="text-sm font-medium mt-1">
                    {new Date(selectedUser.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <Button onClick={() => setIsViewModalOpen(false)} className="w-full h-12">
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}