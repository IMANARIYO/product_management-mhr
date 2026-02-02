/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { getCurrentUser, updateUser } from '@/app/actions/auth';
import { logoutUser } from '@/app/actions/auth';
import { toast } from 'sonner';
import { User, Phone, Shield, LogOut, Edit3, Save, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Session {
  userId: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
}

interface UserDetails {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE';
}

export function ProfileModal({ isOpen, onClose, session }: ProfileModalProps) {
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: '',
  });
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      loadUserDetails();
    }
  }, [isOpen]);

  const loadUserDetails = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setUserDetails(user);
        setEditForm({
          fullName: user.fullName,
        });
      }
    } catch (error) {
      toast.error('Failed to load profile');
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const result = await updateUser(
        session.userId,
        editForm.fullName
      );

      if (result.success) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
        loadUserDetails();
      } else {
        toast.error(result.error || 'Failed to update profile');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      toast.success('Logged out successfully');
      router.push('/');
    } catch (error) {
      toast.error('Logout failed');
    }
  };

  const getRoleColor = (role: string) => {
    return role === 'ADMIN' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-md mx-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>My Profile</span>
          </DialogTitle>
        </DialogHeader>

        {userDetails && (
          <div className="space-y-6">
            {/* Profile Header */}
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="w-8 h-8 text-gray-400" />
              </div>
              <Badge className={getRoleColor(userDetails.role)}>
                {userDetails.role}
              </Badge>
            </div>

            {/* Profile Details */}
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Full Name
                </label>
                {isEditing ? (
                  <Input
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    placeholder="Enter your full name"
                    disabled={isLoading}
                  />
                ) : (
                  <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                    <User className="w-4 h-4 text-gray-400" />
                    <span className="text-sm">{userDetails.fullName}</span>
                  </div>
                )}
              </div>

              {/* Phone Number (Read-only) */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Phone Number
                </label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{userDetails.phoneNumber}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Phone number cannot be changed
                </p>
              </div>

              {/* Role (Read-only) */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Role
                </label>
                <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{userDetails.role}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              {isEditing ? (
                <div className="flex space-x-3">
                  <Button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsEditing(false);
                      setEditForm({ fullName: userDetails.fullName });
                    }}
                    disabled={isLoading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="w-full"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              )}

              <Button
                onClick={handleLogout}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}