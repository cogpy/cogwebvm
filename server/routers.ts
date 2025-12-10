import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { storagePut } from "./storage";
import { createFile, getUserFiles, deleteFile } from "./fileDb";
import { nanoid } from "nanoid";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  files: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await getUserFiles(ctx.user.id);
    }),
    
    upload: protectedProcedure
      .input(
        z.object({
          filename: z.string(),
          content: z.string(), // base64 encoded file content
          mimeType: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Decode base64 content
        const buffer = Buffer.from(input.content, "base64");
        const size = buffer.length;
        
        // Generate unique file key
        const ext = input.filename.split(".").pop() || "";
        const fileKey = `user-${ctx.user.id}/files/${nanoid()}.${ext}`;
        
        // Upload to S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);
        
        // Save metadata to database
        await createFile({
          userId: ctx.user.id,
          filename: input.filename,
          fileKey,
          url,
          mimeType: input.mimeType,
          size,
        });
        
        return { url, fileKey };
      }),
    
    delete: protectedProcedure
      .input(z.object({ fileId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const file = await deleteFile(input.fileId, ctx.user.id);
        return { success: true, file };
      }),
  }),
});

export type AppRouter = typeof appRouter;
