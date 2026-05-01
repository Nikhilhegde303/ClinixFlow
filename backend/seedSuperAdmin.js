// backend/seedSuperAdmin.js
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function createGenesisAdmin() {
  console.log("Seeding Super Admin...");

  try {
    // 1. Hash the password properly!
    const hashedPassword = await bcrypt.hash("admin123", 10);

    // 2. Use 'upsert' so if you run this twice accidentally, it won't crash
    const superAdmin = await prisma.user.upsert({
      where: { email: 'system@clinixflow.com' },
      update: {}, // Do nothing if they already exist
      create: {
        email: 'system@clinixflow.com',
        password: hashedPassword,
        name: 'Nikhil Hegde', // The Platform Owner!
        role: 'SUPER_ADMIN',
        is_verified: true,
        // Notice we DO NOT include a hospital_id because you own the whole platform
      },
    });

    console.log("✅ Super Admin created successfully!");
    console.log("Email:", superAdmin.email);
    console.log("Password: admin123");

  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    // Always disconnect Prisma when a standalone script finishes
    await prisma.$disconnect();
  }
}

createGenesisAdmin();