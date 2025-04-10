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
import { Router } from "express";
import { log } from "./utils/logger";
import { ChatModel, MessageModel, UserModel } from "./models";

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
  
  // Add user to chat
  app.post("/api/chats/:chatId/members", isAuth, async (req, res) => {
    try {
      const chatId = req.params.chatId;
      const { userId } = req.body;
      
      if (!userId) {
        return res.status(400).json({ message: "User ID is required" });
      }
      
      // Verify requester is a member and has permission
      const requesterMembership = await ChatMember.findOne({ 
        chatId, 
        userId: req.user._id 
      });
      
      if (!requesterMembership) {
        return res.status(403).json({ message: "You don't have access to this chat" });
      }
      
      // Check if user already in chat
      const existingMember = await ChatMember.findOne({ chatId, userId });
      
      if (existingMember) {
        return res.status(400).json({ message: "User is already a member of this chat" });
      }
      
      // Add user to chat
      await ChatMember.create({
        chatId,
        userId,
        isAdmin: false,
        joinedAt: new Date(),
        lastReadAt: new Date(),
        unreadCount: 0
      });
      
      // Add system message that user was added
      const addedUser = await User.findById(userId, 'username displayName');
      const adderUser = await User.findById(req.user._id, 'username displayName');
      
      if (addedUser) {
        const userName = addedUser.displayName || addedUser.username;
        const adderName = adderUser ? (adderUser.displayName || adderUser.username) : "Someone";
        
        await Message.create({
          chatId,
          senderId: req.user._id,
          content: `${adderName} added ${userName} to the chat`,
          isRead: false,
          readBy: [req.user._id],
          isSystemMessage: true
        });
        
        // Update chat's last message
        await Chat.findByIdAndUpdate(chatId, {
          lastMessage: `${adderName} added ${userName} to the chat`,
          lastMessageTime: new Date()
        });
      }
      
      res.status(201).json({ message: "User added to chat successfully" });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to add user to chat" });
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

export function setupRoutes(app: any) {
  const router = Router();

  // Get all chats for current user
  router.get("/chats", async (req, res) => {
    try {
      const chats = await ChatModel.find({ participants: req.session.userId })
        .populate("participants", "username displayName avatarUrl status")
        .populate("lastMessage")
        .sort({ updatedAt: -1 });

      res.json(chats);
    } catch (error) {
      log("Error fetching chats:", error);
      res.status(500).json({ message: "Failed to fetch chats" });
    }
  });

  // Create new chat
  router.post("/chats", async (req, res) => {
    try {
      const { name, participantIds } = req.body;

      // Add current user to participants
      const participants = [...new Set([req.session.userId, ...participantIds])];

      const chat = new ChatModel({
        name,
        participants,
      });

      await chat.save();
      await chat.populate("participants", "username displayName avatarUrl status");

      res.status(201).json(chat);
    } catch (error) {
      log("Error creating chat:", error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });

  // Get chat messages
  router.get("/chats/:chatId/messages", async (req, res) => {
    try {
      const { chatId } = req.params;
      const { before } = req.query;

      const query: any = { chatId };
      if (before) {
        query.createdAt = { $lt: new Date(before as string) };
      }

      const messages = await MessageModel.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .populate("senderId", "username displayName avatarUrl");

      res.json(messages.reverse());
    } catch (error) {
      log("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  // Search users
  router.get("/users/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) {
        return res.json([]);
      }

      const users = await UserModel.find({
        $or: [
          { username: { $regex: query, $options: "i" } },
          { displayName: { $regex: query, $options: "i" } },
        ],
        _id: { $ne: req.session.userId },
      }).select("username displayName avatarUrl status");

      res.json(users);
    } catch (error) {
      log("Error searching users:", error);
      res.status(500).json({ message: "Failed to search users" });
    }
  });

  // Update user profile
  router.put("/users/profile", async (req, res) => {
    try {
      const { displayName, avatarUrl } = req.body;
      const user = await UserModel.findByIdAndUpdate(
        req.session.userId,
        { displayName, avatarUrl },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(user);
    } catch (error) {
      log("Error updating profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Apply routes
  app.use("/api", router);
}
