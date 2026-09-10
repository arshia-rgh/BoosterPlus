import { z } from "zod";
export const conversationSchema = z.object({
  id: z.string(),
  kind: z.enum(["order", "presales"]),
  order_id: z.string(),
  linked_order_id: z.string(),
  subject: z.string(),
  slug: z.string(),
  state: z.enum(["open", "waiting", "resolved"]),
  assigned_to: z.string().optional(),
  version: z.number().int(),
  sequence: z.number().int(),
  unread: z.number().int(),
  updated_at: z.string(),
  created_at: z.string(),
});
export const messageSchema = z.object({
  id: z.string(),
  sequence: z.number().int(),
  sender_label: z.string(),
  sender_role: z.string(),
  sender_id: z.string().optional(),
  visibility: z.enum(["public", "internal"]),
  body: z.string(),
  created_at: z.string(),
});
export const messagesSchema = z.object({
  messages: z.array(messageSchema),
  next: z.number().int(),
  latest: z.number().int(),
});
export const conversationsSchema = z.object({
  conversations: z.array(conversationSchema),
  next: z.string(),
});
export const notificationsSchema = z.object({
  notifications: z.array(
    z.object({
      id: z.string(),
      kind: z.string(),
      href: z.string().startsWith("/"),
      read: z.boolean(),
      created_at: z.string(),
    }),
  ),
  next: z.string(),
});
export type Conversation = z.infer<typeof conversationSchema>;
