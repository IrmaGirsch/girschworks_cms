import { PrismaClient } from './generated';

// Singleton pattern for Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Re-export Prisma types for use in other packages
export * from './generated';

// Helper function to connect to database
export async function connectDatabase() {
  try {
    await db.$connect();
    console.log('✅ Database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Helper function to disconnect from database
export async function disconnectDatabase() {
  await db.$disconnect();
}