'use client';

import { useState, useEffect } from 'react';
import { UsersManager } from '@/components/users/users-manager';
import { getAllUsers } from '@/app/actions/auth';
import { getCurrentUser } from '@/app/actions/auth';

interface User {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: 'ADMIN' | 'EMPLOYEE';
  status: string;
  createdAt: Date;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const result = await getAllUsers();
      if (result.success && result.users) {
        setUsers(result.users);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const loadCurrentUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setCurrentUserRole(user.role);
      }
    } catch (error) {
      console.error('Failed to load current user:', error);
    }
  };

  useEffect(() => {
    loadUsers();
    loadCurrentUser();
  }, []);

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <UsersManager 
        users={users} 
        currentUserRole={currentUserRole}
        onRefresh={loadUsers}
      />
    </div>
  );
}