"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUser } from "@/app/actions/users";
import { useToastHandler } from "@/hooks/use-toast-handler";

interface User {
  id: string;
  firstName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: "ADMIN" | "EMPLOYEE";
  status: "ACTIVE" | "DISABLED";
}

interface UserEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  currentUser: { id: string; role: "ADMIN" | "EMPLOYEE" };
}

export function UserEditDialog({ open, onOpenChange, user, currentUser }: UserEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const { handleActionResult } = useToastHandler();

  const isOwnProfile = currentUser.id === user.id;
  const canEditRoleStatus = currentUser.role === "ADMIN" && !isOwnProfile;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("userId", user.id);
    
    const result = await updateUser(formData);
    
    handleActionResult(result);
    
    if (result.success) {
      onOpenChange(false);
    }
    
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isOwnProfile ? "Edit Profile" : `Edit User: ${user.fullName}`}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                required
                defaultValue={user.firstName}
              />
            </div>
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                name="fullName"
                required
                defaultValue={user.fullName}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={user.email}
            />
          </div>

          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              required
              defaultValue={user.phoneNumber}
            />
          </div>

          {canEditRoleStatus && (
            <>
              <div>
                <Label htmlFor="role">Role</Label>
                <Select name="role" defaultValue={user.role}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={user.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DISABLED">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {!canEditRoleStatus && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Role</Label>
                <Input value={user.role} disabled />
              </div>
              <div>
                <Label>Status</Label>
                <Input value={user.status} disabled />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Updating..." : "Update User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}