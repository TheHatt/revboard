import { z } from "zod";

export const replyBodySchema = z.object({
  text: z.string().trim().min(1, "Text is required").max(5000),
  tone: z.enum(["neutral", "freundlich", "formell", "ausführlich", "knapp"]).optional(),
});

export type ReplyBody = z.infer<typeof replyBodySchema>;
