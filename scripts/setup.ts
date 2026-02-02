import { db } from '../src/index';
import { users } from '../src/db/schema';
import { hashPassword } from '../src/lib/auth';

async function setup() {
  try {
    console.log('Setting up database...');
    
    // Create admin user
    const adminPasswordHash = await hashPassword('admin123');
    const employeePasswordHash = await hashPassword('employee123');
    
    // Insert admin user
    await db.insert(users).values({
      fullName: 'System Administrator',
      phoneNumber: '+250788111111',
      passwordHash: adminPasswordHash,
      role: 'ADMIN',
    }).onConflictDoNothing();
    
    // Insert employee user
    await db.insert(users).values({
      fullName: 'Test Employee',
      phoneNumber: '+250788222222',
      passwordHash: employeePasswordHash,
      role: 'EMPLOYEE',
    }).onConflictDoNothing();
    
    console.log('Database setup completed successfully!');
    console.log('Admin credentials: +250788111111 / admin123');
    console.log('Employee credentials: +250788222222 / employee123');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
  
  process.exit(0);
}

setup();