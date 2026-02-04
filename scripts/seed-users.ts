import { db } from "@/index";
import { users } from "../src/db/schema";

async function seedUsers() {
  console.log("🌱 Seeding users...");

  try {
    // Insert admin user
    await db.insert(users).values([
      {
        firstName: "Admin",
        fullName: "System Administrator",
        email: "admin@bar.com",
        phoneNumber: "+250788123456",
        password: "admin123",
        role: "ADMIN",
        status: "ACTIVE",
      },
      {
        firstName: "John",
        fullName: "John Doe",
        email: "john@bar.com",
        phoneNumber: "+250788123457",
        password: "john123",
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
      {
        firstName: "Jane",
        fullName: "Jane Smith",
        email: "jane@bar.com",
        phoneNumber: "+250788123458",
        password: "jane123",
        role: "EMPLOYEE",
        status: "ACTIVE",
      },
    ]);

    console.log("✅ Users seeded successfully!");
    console.log("📱 Login credentials:");
    console.log("  - +250788123456 / admin123 (ADMIN)");
    console.log("  - +250788123457 / john123 (EMPLOYEE)");
    console.log("  - +250788123458 / jane123 (EMPLOYEE)");
  } catch (error) {
    console.error("❌ Error seeding users:", error);
  }
}

seedUsers().then(() => {
  console.log("🎉 Seeding completed!");
  process.exit(0);
});
