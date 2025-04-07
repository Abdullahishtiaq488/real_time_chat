// This file serves as a compatibility layer for the MongoDB implementation
// We're using MongoDB models directly but keeping this file for type references

import { z } from "zod";
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
