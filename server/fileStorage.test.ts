import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { User } from "../drizzle/schema";
import type { Request, Response } from "express";

// Check if storage credentials are available
const hasStorageCredentials = !!(
  process.env.BUILT_IN_FORGE_API_URL &&
  process.env.BUILT_IN_FORGE_API_KEY
);

// Helper to create a caller with mock context
function createCaller(user: User) {
  return appRouter.createCaller({
    user,
    req: {} as Request,
    res: {} as Response,
  });
}

describe.skipIf(!hasStorageCredentials)("File Storage API", () => {
  let mockUser: User;
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    // Create a mock user for testing
    mockUser = {
      id: 1,
      openId: "test-open-id",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "oauth",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    };

    // Create caller with mock context
    caller = createCaller(mockUser);
  });

  it("should upload a file successfully", async () => {
    const testFile = {
      filename: "test.txt",
      content: Buffer.from("Hello World").toString("base64"),
      mimeType: "text/plain",
    };

    const result = await caller.files.upload(testFile);

    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("fileKey");
    expect(result.url).toContain(".txt"); // URL contains the extension
    expect(result.fileKey).toContain("user-1/files/"); // Verify file key structure
  });

  it("should list user files", async () => {
    const files = await caller.files.list();

    expect(Array.isArray(files)).toBe(true);
    // After the upload test, we should have at least one file
    expect(files.length).toBeGreaterThanOrEqual(1);
    
    if (files.length > 0) {
      const file = files[0]!;
      expect(file).toHaveProperty("id");
      expect(file).toHaveProperty("filename");
      expect(file).toHaveProperty("url");
      expect(file.userId).toBe(mockUser.id);
    }
  });

  it("should delete a file", async () => {
    // First, get the list of files
    const filesBefore = await caller.files.list();
    
    if (filesBefore.length > 0) {
      const fileToDelete = filesBefore[0]!;
      
      const result = await caller.files.delete({ fileId: fileToDelete.id });
      
      expect(result.success).toBe(true);
      expect(result.file).toHaveProperty("id");
      expect(result.file.id).toBe(fileToDelete.id);
      
      // Verify the file was deleted
      const filesAfter = await caller.files.list();
      expect(filesAfter.length).toBe(filesBefore.length - 1);
    }
  });

  it("should not allow deleting another user's file", async () => {
    // Create a different user's caller
    const otherUser: User = {
      ...mockUser,
      id: 999,
      openId: "other-user-id",
    };

    const otherCaller = createCaller(otherUser);

    // Upload a file as the first user
    const testFile = {
      filename: "protected.txt",
      content: Buffer.from("Protected content").toString("base64"),
      mimeType: "text/plain",
    };

    await caller.files.upload(testFile);
    const files = await caller.files.list();
    const protectedFile = files[files.length - 1]!;

    // Try to delete it as the other user
    await expect(
      otherCaller.files.delete({ fileId: protectedFile.id })
    ).rejects.toThrow("Unauthorized");
  });
});
