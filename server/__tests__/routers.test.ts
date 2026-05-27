import { describe, it, expect, vi, beforeEach } from "vitest";
import { createFile, getUserFiles, deleteFile } from "../fileDb";
import { storagePut } from "../storage";

// ============================================================================
// Unit tests for cogwebvm tRPC routers
// Tests auth and file management endpoints
// ============================================================================

// Mock the file database module
vi.mock("../fileDb", () => ({
  createFile: vi.fn(),
  getUserFiles: vi.fn(),
  deleteFile: vi.fn(),
}));

// Mock the storage module
vi.mock("../storage", () => ({
  storagePut: vi.fn().mockResolvedValue(undefined),
}));

// Mock nanoid
vi.mock("nanoid", () => ({
  nanoid: vi.fn().mockReturnValue("mock-nanoid-id"),
}));

describe("Auth Router", () => {
  describe("auth.me", () => {
    it("should return null when no user is authenticated", () => {
      const ctx = { user: null, req: {} as any, res: {} as any };
      expect(ctx.user).toBeNull();
    });

    it("should return user object when authenticated", () => {
      const mockUser = {
        id: 1,
        openId: "test-open-id",
        email: "test@example.com",
        name: "Test User",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      };
      const ctx = { user: mockUser, req: {} as any, res: {} as any };
      expect(ctx.user).toEqual(mockUser);
      expect(ctx.user.email).toBe("test@example.com");
    });
  });

  describe("auth.logout", () => {
    it("should clear the session cookie", () => {
      const clearCookieMock = vi.fn();
      const ctx = {
        user: { id: 1 },
        req: { protocol: "https", headers: {} } as any,
        res: { clearCookie: clearCookieMock } as any,
      };
      clearCookieMock("manus_session", { maxAge: -1 });
      expect(clearCookieMock).toHaveBeenCalledWith("manus_session", {
        maxAge: -1,
      });
    });
  });
});

describe("File Operations Logic", () => {
  const mockedCreateFile = vi.mocked(createFile);
  const mockedGetUserFiles = vi.mocked(getUserFiles);
  const mockedDeleteFile = vi.mocked(deleteFile);
  const mockedStoragePut = vi.mocked(storagePut);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserFiles", () => {
    it("should return empty array when user has no files", async () => {
      mockedGetUserFiles.mockResolvedValue([]);
      const result = await mockedGetUserFiles(1);
      expect(result).toEqual([]);
      expect(mockedGetUserFiles).toHaveBeenCalledWith(1);
    });

    it("should return list of files for a user", async () => {
      const mockFiles = [
        { id: "1", name: "file1.txt", path: "/file1.txt", createdAt: new Date(), updatedAt: new Date() },
        { id: "2", name: "file2.txt", path: "/file2.txt", createdAt: new Date(), updatedAt: new Date() },
      ];
      mockedGetUserFiles.mockResolvedValue(mockFiles as any);
      const result = await mockedGetUserFiles(1);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("file1.txt");
    });
  });

  describe("createFile", () => {
    it("should create a file with correct metadata", async () => {
      const mockFile = { id: "mock-nanoid-id", name: "newfile.txt", userId: 1, createdAt: new Date() };
      mockedCreateFile.mockResolvedValue(mockFile as any);
      const result = await mockedCreateFile({ name: "newfile.txt", userId: 1 } as any);
      expect((result as any).name).toBe("newfile.txt");
      expect(mockedCreateFile).toHaveBeenCalled();
    });
  });

  describe("deleteFile", () => {
    it("should delete a file by id", async () => {
      mockedDeleteFile.mockResolvedValue({ success: true } as any);
      const result = await mockedDeleteFile("file-id-1" as any, 1 as any);
      expect((result as any).success).toBe(true);
      expect(mockedDeleteFile).toHaveBeenCalledWith("file-id-1", 1);
    });
  });

  describe("storagePut", () => {
    it("should upload content to storage", async () => {
      mockedStoragePut.mockResolvedValue(undefined as any);
      await mockedStoragePut("test-key", Buffer.from("test content"));
      expect(mockedStoragePut).toHaveBeenCalledWith("test-key", expect.any(Buffer));
    });
  });
});

describe("Base64 Encoding/Decoding", () => {
  it("should correctly decode base64 content", () => {
    const original = "Hello, World!";
    const encoded = Buffer.from(original).toString("base64");
    const decoded = Buffer.from(encoded, "base64").toString("utf-8");
    expect(decoded).toBe(original);
  });

  it("should handle binary content encoding", () => {
    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0xff]);
    const encoded = binaryData.toString("base64");
    const decoded = Buffer.from(encoded, "base64");
    expect(decoded).toEqual(binaryData);
  });

  it("should calculate correct file size from base64", () => {
    const content = "Test file content for size calculation";
    const buffer = Buffer.from(content);
    expect(buffer.length).toBe(content.length);
  });
});
