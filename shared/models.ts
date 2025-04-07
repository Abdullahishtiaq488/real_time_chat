import { z } from 'zod';

// User schema
export const userSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  displayName: z.string(),
  avatarUrl: z.string().optional().nullable(),
  bio: z.string().optional().default(''),
  status: z.enum(['online', 'offline', 'away']).default('offline'),
});

export const updateUserSchema = userSchema.partial().omit({ password: true });
export const userLoginSchema = userSchema.pick({ username: true, password: true });

// Attachment schema
export const attachmentSchema = z.object({
  url: z.string(),
  type: z.enum(['image', 'file']),
  name: z.string().optional().default(''),
});

// Reaction schema
export const reactionSchema = z.object({
  userId: z.string(),
  emoji: z.string(),
});

// Message schema
export const messageSchema = z.object({
  chatId: z.string(),
  senderId: z.string(),
  content: z.string(),
  isRead: z.boolean().optional().default(false),
  readBy: z.array(z.string()).optional().default([]),
  attachments: z.array(attachmentSchema).optional().default([]),
  reactions: z.array(reactionSchema).optional().default([]),
});

// Chat schema
export const chatSchema = z.object({
  name: z.string(),
  avatarUrl: z.string().optional().nullable(),
  description: z.string().optional().default(''),
  lastMessage: z.string().optional().default(''),
  lastMessageTime: z.date().optional().nullable(),
  isGroup: z.boolean().default(false),
  creatorId: z.string().optional(),
  status: z.enum(['active', 'archived']).default('active'),
});

// Chat member schema
export const chatMemberSchema = z.object({
  chatId: z.string(),
  userId: z.string(),
  isAdmin: z.boolean().default(false),
  joinedAt: z.date().default(() => new Date()),
  lastReadAt: z.date().optional().nullable(),
  nickname: z.string().optional().default(''),
  unreadCount: z.number().default(0),
});

// Export types
export type User = z.infer<typeof userSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;
export type Attachment = z.infer<typeof attachmentSchema>;
export type Reaction = z.infer<typeof reactionSchema>;
export type Message = z.infer<typeof messageSchema>;
export type Chat = z.infer<typeof chatSchema>;
export type ChatMember = z.infer<typeof chatMemberSchema>;