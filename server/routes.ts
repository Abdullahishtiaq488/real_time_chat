import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { setupAuth } from "./auth";
import { setupSocketHandlers } from "./socket";
import { isAuth } from "./utils/authMiddleware";
import { upload, getFileUrl } from "./utils/uploadMiddleware";
import { User, Chat, Message, ChatMember } from "./models";
import { z } from "zod";
import { messageSchema } from "@shared/models";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // User profile routes
  app.get("/api/users", isAuth, async (req, res) => {
    try {
      const users = await User.find({}, 'username displayName avatarUrl status');
      res.json(users);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to retrieve users" });
    }
  });

  app.get("/api/users/:id", isAuth, async (req, res) => {
    try {
      const user = await User.findById(req.params.id, '-password');
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to retrieve user" });
    }
  });

  app.patch("/api/users/profile", isAuth, async (req, res) => {
    try {
      const { displayName, bio } = req.body;
      
      // Update user profile
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { 
          ...(displayName && { displayName }),
          ...(bio && { bio }) 
        },
        { new: true, select: '-password' }
      );
      
      res.json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Profile picture upload
  app.post("/api/users/avatar", isAuth, upload.single('avatar'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const avatarUrl = getFileUrl(req.file.filename);
      
      // Update user's avatar URL
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        { avatarUrl },
        { new: true, select: '-password' }
      );
      
      res.json(updatedUser);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to upload avatar" });
    }
  });

  // Chat routes
  app.get("/api/chats", isAuth, async (req, res) => {
    try {
      // Find all chat memberships for this user
      const chatMemberships = await ChatMember.find({ userId: req.user._id });
      const chatIds = chatMemberships.map(membership => membership.chatId);
      
      // Find all chats
      const chats = await Chat.find({ _id: { $in: chatIds } })
        .sort({ lastMessageTime: -1 });
      
      // Get unread counts
      const chatsWithMetadata = await Promise.all(chats.map(async (chat) => {
        const membership = chatMemberships.find(
          m => m.chatId.toString() === chat._id.toString()
        );
        
        return {
          ...chat.toObject(),
          unreadCount: membership ? membership.unreadCount : 0
        };
      }));
      
      res.json(chatsWithMetadata);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to retrieve chats" });
    }
  });

  app.post("/api/chats", isAuth, async (req, res) => {
    try {
      const { name, description, userIds, isGroup = false } = req.body;
      
      if (!name || !userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      // Create new chat
      const newChat = await Chat.create({
        name,
        description: description || '',
        isGroup,
        creatorId: isGroup ? req.user._id : undefined
      });
      
      // Add all users including the creator
      await ChatMember.create({
        chatId: newChat._id,
        userId: req.user._id,
        isAdmin: true
      });
      
      // Add other users
      for (const userId of userIds) {
        if (userId !== req.user._id.toString()) {
          await ChatMember.create({
            chatId: newChat._id,
            userId: userId,
            isAdmin: false
          });
        }
      }
      
      res.status(201).json(newChat);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });
  
  app.get("/api/chats/:chatId", isAuth, async (req, res) => {
    try {
      const chatId = req.params.chatId;
      
      // Verify user belongs to chat
      const isMember = await ChatMember.findOne({ 
        chatId: chatId, 
        userId: req.user._id 
      });
      
      if (!isMember) {
        return res.status(403).json({ message: "You don't have access to this chat" });
      }
      
      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }
      
      // Get chat members
      const members = await ChatMember.find({ chatId });
      const userIds = members.map(member => member.userId);
      
      // Get member details
      const users = await User.find(
        { _id: { $in: userIds } },
        'username displayName avatarUrl status'
      );
      
      // Combine chat data with member details
      const chatWithMembers = {
        ...chat.toObject(),
        members: members.map(member => {
          const user = users.find(u => u._id.toString() === member.userId.toString());
          return {
            ...member.toObject(),
            user
          };
        })
      };
      
      res.json(chatWithMembers);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to retrieve chat" });
    }
  });
  
  app.get("/api/chats/:chatId/messages", isAuth, async (req, res) => {
    try {
      const chatId = req.params.chatId;
      
      // Verify user belongs to chat
      const isMember = await ChatMember.findOne({ 
        chatId: chatId, 
        userId: req.user._id 
      });
      
      if (!isMember) {
        return res.status(403).json({ message: "You don't have access to this chat" });
      }
      
      // Get messages with pagination
      const limit = parseInt(req.query.limit as string) || 50;
      const before = req.query.before as string;
      
      const query = { chatId };
      if (before) {
        Object.assign(query, { createdAt: { $lt: new Date(before) } });
      }
      
      const messages = await Message.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .populate('senderId', 'username displayName avatarUrl');
      
      res.json(messages.reverse());
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to retrieve messages" });
    }
  });
  
  app.post("/api/chats/:chatId/messages", isAuth, async (req, res) => {
    try {
      const chatId = req.params.chatId;
      
      // Validate message data
      const messageData = messageSchema.parse({
        ...req.body,
        chatId,
        senderId: req.user._id.toString()
      });
      
      // Verify user belongs to chat
      const isMember = await ChatMember.findOne({ 
        chatId: chatId, 
        userId: req.user._id 
      });
      
      if (!isMember) {
        return res.status(403).json({ message: "You don't have access to this chat" });
      }
      
      // Create message
      const newMessage = await Message.create({
        chatId,
        senderId: req.user._id,
        content: messageData.content,
        isRead: false,
        readBy: [req.user._id], // Sender has read their own message
        attachments: messageData.attachments || []
      });
      
      // Populate sender info
      await newMessage.populate('senderId', 'username displayName avatarUrl');
      
      // Update chat's last message
      await Chat.findByIdAndUpdate(chatId, {
        lastMessage: messageData.content,
        lastMessageTime: new Date()
      });
      
      // Update unread counts for other chat members
      await ChatMember.updateMany(
        { chatId, userId: { $ne: req.user._id } },
        { $inc: { unreadCount: 1 } }
      );
      
      res.status(201).json(newMessage);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  // Mark messages as read
  app.post("/api/chats/:chatId/read", isAuth, async (req, res) => {
    try {
      const chatId = req.params.chatId;
      
      // Verify user belongs to chat
      const chatMember = await ChatMember.findOne({ 
        chatId: chatId, 
        userId: req.user._id 
      });
      
      if (!chatMember) {
        return res.status(403).json({ message: "You don't have access to this chat" });
      }
      
      // Mark messages as read
      await Message.updateMany(
        { 
          chatId: chatId,
          readBy: { $ne: req.user._id }
        },
        { 
          $addToSet: { readBy: req.user._id } 
        }
      );
      
      // Reset unread count
      await ChatMember.findByIdAndUpdate(
        chatMember._id,
        { unreadCount: 0, lastReadAt: new Date() }
      );
      
      res.sendStatus(200);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });
  
  // File upload for chat attachments
  app.post("/api/upload", isAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      
      const fileUrl = getFileUrl(req.file.filename);
      const fileType = req.file.mimetype.startsWith('image/') ? 'image' : 'file';
      
      res.json({ 
        url: fileUrl, 
        type: fileType, 
        name: req.file.originalname 
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to upload file" });
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Setup WebSocket handlers
  setupSocketHandlers(wss);
  
  return httpServer;
}
