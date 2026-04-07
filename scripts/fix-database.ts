import { db } from '../src/index';
import { users } from '../src/db/schema';
import { sql } from 'drizzle-orm';

async function fixDatabase() {
  try {
    console.log('Fixing database constraints and adding missing columns...');
    
    // First, let's check what users exist
    const existingUsers = await db.select().from(users);
    console.log('Existing users:', existingUsers.length);
    
    if (existingUsers.length === 0) {
      console.log('No users found, creating admin user first...');
      // Create a system admin user if none exists
      await db.execute(sql`
        INSERT INTO users (id, full_name, phone_number, password_hash, role, created_by, created_at)
        VALUES ('00000000-0000-0000-0000-000000000000', 'System Admin', '+250788000000', '$2b$10$dummy', 'ADMIN', '00000000-0000-0000-0000-000000000000', NOW())
        ON CONFLICT (id) DO NOTHING
      `);
    }
    
    // Add missing columns if they don't exist
    console.log('Adding missing timestamp columns...');
    
    // Add updatedAt to users if missing
    await db.execute(sql`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    
    // Add updatedAt to products if missing
    await db.execute(sql`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    
    // Add timestamps to stock_actions if missing
    await db.execute(sql`
      ALTER TABLE stock_actions 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    
    // Add timestamps to other tables
    await db.execute(sql`
      ALTER TABLE stock_days 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    
    await db.execute(sql`
      ALTER TABLE daily_stock_snapshots 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    
    await db.execute(sql`
      ALTER TABLE credit_sales 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    
    await db.execute(sql`
      ALTER TABLE credit_sale_items 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    
    await db.execute(sql`
      ALTER TABLE activity_logs 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    
    await db.execute(sql`
      ALTER TABLE purchase_orders 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    
    await db.execute(sql`
      ALTER TABLE purchase_order_items 
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW() NOT NULL,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW() NOT NULL
    `);
    
    // Fix orphaned records by updating them to reference the system admin
    console.log('Fixing orphaned foreign key references...');
    
    const systemAdminId = '00000000-0000-0000-0000-000000000000';
    
    // Fix stock_actions with invalid done_by references
    await db.execute(sql`
      UPDATE stock_actions 
      SET done_by = ${systemAdminId}
      WHERE done_by NOT IN (SELECT id FROM users)
    `);
    
    // Fix products with invalid created_by references
    await db.execute(sql`
      UPDATE products 
      SET created_by = ${systemAdminId}
      WHERE created_by NOT IN (SELECT id FROM users)
    `);
    
    // Fix credit_sales with invalid done_by references
    await db.execute(sql`
      UPDATE credit_sales 
      SET done_by = ${systemAdminId}
      WHERE done_by NOT IN (SELECT id FROM users)
    `);
    
    // Fix activity_logs with invalid user_id references
    await db.execute(sql`
      UPDATE activity_logs 
      SET user_id = ${systemAdminId}
      WHERE user_id NOT IN (SELECT id FROM users)
    `);
    
    console.log('Database fixed successfully!');
    console.log('You can now run: npm run db:push');
    
  } catch (error) {
    console.error('Database fix failed:', error);
  }
  
  process.exit(0);
}

fixDatabase();