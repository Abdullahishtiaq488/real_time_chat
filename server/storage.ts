import { 
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
import MongoStore from "connect-mongo";
import { User as UserModel, Chat as ChatModel, Message as MessageModel, ChatMember as ChatMemberModel } from "./models";
import { mongoClient } from "./db";

// Interface for storage operations
export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserStatus(userId: string, status: string): Promise<void>;
  
  // Chat operations
  getChatsForUser(userId: string): Promise<Chat[]>;
  createChat(chat: InsertChat): Promise<Chat>;
  addUserToChat(chatId: string, userId: string, isAdmin?: boolean): Promise<void>;
  isUserInChat(chatId: string, userId: string): Promise<boolean>;
  getChatMembers(chatId: string): Promise<ChatMember[]>;
  updateChatLastMessage(chatId: string, message: string, timestamp: Date): Promise<void>;
  
  // Message operations
  getMessagesForChat(chatId: string): Promise<Message[]>;
  createMessage(message: InsertMessage & { senderName?: string, senderAvatar?: string | null }): Promise<Message>;
  markMessagesAsRead(chatId: string, userId: string): Promise<void>;
  
  // Session store
  sessionStore: Store;
}

// MongoDB implementation
export class DatabaseStorage implements IStorage {
  sessionStore: Store;
  
  constructor() {
    this.sessionStore = MongoStore.create({
      client: mongoClient,
      collectionName: 'sessions'
    });
  }
  
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const user = await UserModel.findById(id);
    return user ? (user.toObject() as User) : undefined;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const user = await UserModel.findOne({ username });
    return user ? (user.toObject() as User) : undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const user = await UserModel.create({
      ...insertUser,
      status: "online"
    });
    
    return user.toObject() as User;
  }
  
  async updateUserStatus(userId: string, status: string): Promise<void> {
    await UserModel.findByIdAndUpdate(userId, { 
      status,
      updatedAt: new Date()
    });
  }
  
  // Chat operations
  async getChatsForUser(userId: string): Promise<Chat[]> {
    // Find chat memberships
    const memberships = await ChatMemberModel.find({ userId });
    const chatIds = memberships.map(membership => membership.chatId);
    
    if (chatIds.length === 0) {
      return [];
    }
    
    // Get all chats
    const chats = await ChatModel.find({ _id: { $in: chatIds } })
      .sort({ lastMessageTime: -1 });
    
    // Return chats with unread message count
    return Promise.all(chats.map(async (chat) => {
      const membership = memberships.find(
        m => m.chatId.toString() === chat._id.toString()
      );
      
      return {
        ...(chat.toObject() as Chat),
        unreadCount: membership ? membership.unreadCount : 0
      };
    }));
  }
  
  async createChat(insertChat: InsertChat): Promise<Chat> {
    const chat = await ChatModel.create({
      ...insertChat,
      status: "active",
      lastMessageTime: null,
      lastMessage: ""
    });
    
    return chat.toObject() as Chat;
  }
  
  async addUserToChat(chatId: string, userId: string, isAdmin: boolean = false): Promise<void> {
    await ChatMemberModel.create({
      chatId,
      userId,
      isAdmin,
      joinedAt: new Date(),
      lastReadAt: new Date(),
      unreadCount: 0
    });
  }
  
  async isUserInChat(chatId: string, userId: string): Promise<boolean> {
    const membership = await ChatMemberModel.findOne({
      chatId,
      userId
    });
    
    return !!membership;
  }
  
  async getChatMembers(chatId: string): Promise<ChatMember[]> {
    const members = await ChatMemberModel.find({ chatId });
    return members.map(member => member.toObject() as ChatMember);
  }
  
  async updateChatLastMessage(chatId: string, message: string, timestamp: Date): Promise<void> {
    await ChatModel.findByIdAndUpdate(chatId, {
      lastMessage: message,
      lastMessageTime: timestamp
    });
  }
  
  // Message operations
  async getMessagesForChat(chatId: string): Promise<Message[]> {
    const messages = await MessageModel.find({ chatId })
      .sort({ createdAt: 1 })
      .populate('senderId', 'username displayName avatarUrl');
    
    return messages.map(message => message.toObject() as Message);
  }
  
  async createMessage(insertMessage: InsertMessage & { senderName?: string, senderAvatar?: string | null }): Promise<Message> {
    const message = await MessageModel.create({
      chatId: insertMessage.chatId,
      senderId: insertMessage.senderId,
      content: insertMessage.content,
      isRead: false,
      readBy: [insertMessage.senderId], // Sender has read their own message
      attachments: insertMessage.attachments || []
    });
    
    await message.populate('senderId', 'username displayName avatarUrl');
    
    return message.toObject() as Message;
  }
  
  async markMessagesAsRead(chatId: string, userId: string): Promise<void> {
    // Mark messages as read
    await MessageModel.updateMany(
      { 
        chatId,
        readBy: { $ne: userId }
      },
      { 
        $addToSet: { readBy: userId } 
      }
    );
    
    // Reset unread count for this user
    const chatMember = await ChatMemberModel.findOne({
      chatId,
      userId
    });
    
    if (chatMember) {
      await ChatMemberModel.findByIdAndUpdate(
        chatMember._id,
        { 
          unreadCount: 0,
          lastReadAt: new Date()
        }
      );
    }
  }
}

export const storage = new DatabaseStorage();
