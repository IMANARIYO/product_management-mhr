import { db } from "@/index";
import { users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth-middleware";
import { redirect } from "next/navigation";
import { UserManagement } from "@/components/users/user-management";

export default async function UsersPage() {
  const currentUser = await getCurrentUser();
  
  if (!currentUser) {
    redirect("/login");
  }

  const allUsers = await db.select({
    id: users.id,
    firstName: users.firstName,
    fullName: users.fullName,
    email: users.email,
    phoneNumber: users.phoneNumber,
    role: users.role,
    status: users.status,
    createdAt: users.createdAt,
  }).from(users);

  return (
    <UserManagement 
      users={allUsers} 
      currentUser={{ id: currentUser.id, role: currentUser.role }} 
    />
  );
}