// This file serves as a compatibility layer for the MongoDB implementation
// We're using MongoDB models directly but keeping this file for type references

import { z } from "zod";
import mongoose from "mongoose";
import {
  userSchema,
  chatSchema,
  messageSchema,
  chatMemberSchema,
  attachmentSchema,
  reactionSchema,
  User as UserType,
  Chat as ChatType,
  Message as MessageType,
  ChatMember as ChatMemberType,
  Attachment as AttachmentType,
  Reaction as ReactionType
} from "./models";

// For compatibility with existing code that expects these types
export type User = UserType & { 
  _id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Chat = ChatType & { 
  _id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Message = MessageType & { 
  _id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ChatMember = ChatMemberType & { 
  _id: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type Attachment = AttachmentType;
export type Reaction = ReactionType;

// For compatibility with existing code that expects these schemas
export const insertUserSchema = userSchema;
export const insertChatSchema = chatSchema;
export const insertMessageSchema = messageSchema;
export const insertChatMemberSchema = chatMemberSchema;

// Export insert types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertChat = z.infer<typeof insertChatSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertChatMember = z.infer<typeof insertChatMemberSchema>;

// Zod schemas for validation
export const userLoginSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
});

export const userRegisterSchema = z.object({
  username: z.string().min(3).max(20),
  password: z.string().min(6),
  displayName: z.string().min(2).max(30),
});

// MongoDB schemas
export const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  displayName: { type: String, required: true },
  avatarUrl: { type: String },
  status: { type: String, enum: ["online", "offline", "away"], default: "offline" },
  createdAt: { type: Date, default: Date.now },
});

export const ChatSchema = new mongoose.Schema({
  name: { type: String, required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
  createdAt: { type: Date, default: Date.now },
});

export const MessageSchema = new mongoose.Schema({
  chatId: { type: mongoose.Schema.Types.ObjectId, ref: "Chat", required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  type: { type: String, enum: ["text", "image", "file"], default: "text" },
  createdAt: { type: Date, default: Date.now },
});

// TypeScript types
export type User = mongoose.Document & {
  _id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  status: "online" | "offline" | "away";
  createdAt: Date;
};

export type Chat = mongoose.Document & {
  _id: string;
  name: string;
  participants: User[];
  lastMessage?: Message;
  createdAt: Date;
};

export type Message = mongoose.Document & {
  _id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: "text" | "image" | "file";
  createdAt: Date;
};
