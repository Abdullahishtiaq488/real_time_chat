import { 
  users, 
  chats, 
  messages, 
  chatMembers, 
  type User, 
  type InsertUser, 
  type Chat, 
  type InsertChat, 
  type Message, 
  type InsertMessage, 
  type ChatMember, 
  type InsertChatMember 
} from "@shared/schema";
import session from "express-session";
import type { Store } from 'express-session';
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, desc, or, not, sql } from "drizzle-orm";
import { pool } from "./db";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(userId: number, status: string): Promise<void>;
  
  // Chat operations
  getChatsForUser(userId: number): Promise<Chat[]>;
  createChat(chat: InsertChat): Promise<Chat>;
  addUserToChat(chatId: number, userId: number, isAdmin?: boolean): Promise<void>;
  isUserInChat(chatId: number, userId: number): Promise<boolean>;
  getChatMembers(chatId: number): Promise<ChatMember[]>;
  updateChatLastMessage(chatId: number, message: string, timestamp: Date): Promise<void>;
  
  // Message operations
  getMessagesForChat(chatId: number): Promise<Message[]>;
  createMessage(message: InsertMessage & { senderName?: string, senderAvatar?: string | null }): Promise<Message>;
  markMessagesAsRead(chatId: number, userId: number): Promise<void>;
  
  // Session store
  sessionStore: Store;
}

// Database implementation
export class DatabaseStorage implements IStorage {
  sessionStore: Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users)
      .values({
        ...insertUser,
        status: "online",
        lastActive: new Date()
      })
      .returning();
    return user;
  }
  
  async updateUserStatus(userId: number, status: string): Promise<void> {
    await db.update(users)
      .set({
        status,
        lastActive: new Date()
      })
      .where(eq(users.id, userId));
  }
  
  // Chat operations
  async getChatsForUser(userId: number): Promise<Chat[]> {
    // Get chat ids that the user is a member of
    const chatMembersList = await db.select({
      chatId: chatMembers.chatId
    })
    .from(chatMembers)
    .where(eq(chatMembers.userId, userId));
    
    const chatIds = chatMembersList.map(cm => cm.chatId);
    
    if (chatIds.length === 0) {
      return [];
    }
    
    // Get the chats using proper SQL construction
    const userChats = await db.select()
      .from(chats)
      .where(
        sql`${chats.id} IN (${sql.join(chatIds.map(id => sql`${id}`), sql`, `)})`
      );
    
    return userChats;
  }
  
  async createChat(insertChat: InsertChat): Promise<Chat> {
    const [chat] = await db.insert(chats)
      .values({
        ...insertChat,
        status: "online"
      })
      .returning();
    
    return chat;
  }
  
  async addUserToChat(chatId: number, userId: number, isAdmin: boolean = false): Promise<void> {
    await db.insert(chatMembers)
      .values({
        chatId,
        userId,
        isAdmin,
        joinedAt: new Date()
      });
  }
  
  async isUserInChat(chatId: number, userId: number): Promise<boolean> {
    const [member] = await db.select()
      .from(chatMembers)
      .where(
        and(
          eq(chatMembers.chatId, chatId),
          eq(chatMembers.userId, userId)
        )
      );
    
    return !!member;
  }
  
  async getChatMembers(chatId: number): Promise<ChatMember[]> {
    return db.select()
      .from(chatMembers)
      .where(eq(chatMembers.chatId, chatId));
  }
  
  async updateChatLastMessage(chatId: number, message: string, timestamp: Date): Promise<void> {
    await db.update(chats)
      .set({
        lastMessage: message,
        lastMessageTime: timestamp
      })
      .where(eq(chats.id, chatId));
  }
  
  // Message operations
  async getMessagesForChat(chatId: number): Promise<Message[]> {
    return db.select()
      .from(messages)
      .where(eq(messages.chatId, chatId))
      .orderBy(messages.timestamp);
  }
  
  async createMessage(insertMessage: InsertMessage & { senderName?: string, senderAvatar?: string | null }): Promise<Message> {
    const [message] = await db.insert(messages)
      .values({
        chatId: insertMessage.chatId,
        senderId: insertMessage.senderId,
        content: insertMessage.content,
        status: "sent",
        timestamp: new Date(),
        senderName: insertMessage.senderName || "",
        senderAvatar: insertMessage.senderAvatar
      })
      .returning();
    
    return message;
  }
  
  async markMessagesAsRead(chatId: number, userId: number): Promise<void> {
    await db.update(messages)
      .set({
        status: "read"
      })
      .where(
        and(
          eq(messages.chatId, chatId),
          not(eq(messages.senderId, userId)) // Only mark messages from other users
        )
      );
  }
}

export const storage = new DatabaseStorage();
