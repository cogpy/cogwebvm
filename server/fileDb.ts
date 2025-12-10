import { eq, desc } from "drizzle-orm";
import { files, type InsertFile } from "../drizzle/schema";
import { getDb } from "./db";

export async function createFile(file: InsertFile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(files).values(file);
  return result;
}

export async function getUserFiles(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select()
    .from(files)
    .where(eq(files.userId, userId))
    .orderBy(desc(files.createdAt));
  
  return result;
}

export async function deleteFile(fileId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First check if the file belongs to the user
  const file = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  
  if (file.length === 0) {
    throw new Error("File not found");
  }
  
  if (file[0]!.userId !== userId) {
    throw new Error("Unauthorized");
  }
  
  await db.delete(files).where(eq(files.id, fileId));
  return file[0];
}

export async function getFileById(fileId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(files)
    .where(eq(files.id, fileId))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}
