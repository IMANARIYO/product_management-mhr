import { db } from '../src/index';
import { users } from '../src/db/schema';

async function setup() {
  try {
    console.log('Setting up database...');
    
    // Insert admin user
    await db.insert(users).values({
      firstName: 'Admin',
      fullName: 'System Administrator',
      email: 'admin@bar.com',
      phoneNumber: '+250788111111',
      password: 'admin123',
      role: 'ADMIN',
    }).onConflictDoNothing();
    
    // Insert employee user
    await db.insert(users).values({
      firstName: 'Employee',
      fullName: 'Test Employee',
      email: 'employee@bar.com',
      phoneNumber: '+250788222222',
      password: 'employee123',
      role: 'EMPLOYEE',
    }).onConflictDoNothing();
    
    console.log('Database setup completed successfully!');
    console.log('Admin login: +250788111111 / admin123');
    console.log('Employee login: +250788222222 / employee123');
    
  } catch (error) {
    console.error('Setup failed:', error);
  }
  
  process.exit(0);
}

setup();