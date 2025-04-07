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
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  sessionStore: session.SessionStore;
}

// In-memory implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private chats: Map<number, Chat>;
  private messages: Map<number, Message>;
  private chatMembers: Map<number, ChatMember>;
  private currentUserId: number;
  private currentChatId: number;
  private currentMessageId: number;
  private currentChatMemberId: number;
  sessionStore: session.SessionStore;

  constructor() {
    this.users = new Map();
    this.chats = new Map();
    this.messages = new Map();
    this.chatMembers = new Map();
    this.currentUserId = 1;
    this.currentChatId = 1;
    this.currentMessageId = 1;
    this.currentChatMemberId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // Prune expired entries every day
    });
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      status: "online", 
      lastActive: new Date(),
      avatarUrl: null 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserStatus(userId: number, status: string): Promise<void> {
    const user = await this.getUser(userId);
    if (user) {
      user.status = status;
      user.lastActive = new Date();
      this.users.set(userId, user);
    }
  }

  // Chat operations
  async getChatsForUser(userId: number): Promise<Chat[]> {
    // Get chat IDs that the user is a member of
    const memberChatIds = Array.from(this.chatMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.chatId);
    
    // Get the chat objects
    const userChats = Array.from(this.chats.values())
      .filter(chat => memberChatIds.includes(chat.id));
    
    return userChats;
  }

  async createChat(insertChat: InsertChat): Promise<Chat> {
    const id = this.currentChatId++;
    const chat: Chat = { 
      ...insertChat, 
      id, 
      status: "online", 
      avatarUrl: null,
      lastMessage: null,
      lastMessageTime: null
    };
    this.chats.set(id, chat);
    return chat;
  }

  async addUserToChat(chatId: number, userId: number, isAdmin: boolean = false): Promise<void> {
    const chatMember: ChatMember = {
      id: this.currentChatMemberId++,
      chatId,
      userId,
      joinedAt: new Date(),
      isAdmin
    };
    this.chatMembers.set(chatMember.id, chatMember);
  }

  async isUserInChat(chatId: number, userId: number): Promise<boolean> {
    return Array.from(this.chatMembers.values()).some(
      member => member.chatId === chatId && member.userId === userId
    );
  }

  async getChatMembers(chatId: number): Promise<ChatMember[]> {
    return Array.from(this.chatMembers.values()).filter(
      member => member.chatId === chatId
    );
  }

  async updateChatLastMessage(chatId: number, message: string, timestamp: Date): Promise<void> {
    const chat = this.chats.get(chatId);
    if (chat) {
      chat.lastMessage = message;
      chat.lastMessageTime = timestamp;
      this.chats.set(chatId, chat);
    }
  }

  // Message operations
  async getMessagesForChat(chatId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.chatId === chatId)
      .sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateA.getTime() - dateB.getTime();
      });
  }

  async createMessage(insertMessage: InsertMessage & { senderName?: string, senderAvatar?: string | null }): Promise<Message> {
    const id = this.currentMessageId++;
    const message: Message = {
      ...insertMessage,
      id,
      timestamp: insertMessage.timestamp || new Date(),
      status: insertMessage.status || "sent",
      senderName: insertMessage.senderName || "",
      senderAvatar: insertMessage.senderAvatar || null
    };
    this.messages.set(id, message);
    return message;
  }

  async markMessagesAsRead(chatId: number, userId: number): Promise<void> {
    // Update status of all messages in chat not sent by this user
    Array.from(this.messages.values())
      .filter(message => message.chatId === chatId && message.senderId !== userId)
      .forEach(message => {
        message.status = "read";
        this.messages.set(message.id, message);
      });
  }
}

export const storage = new MemStorage();
