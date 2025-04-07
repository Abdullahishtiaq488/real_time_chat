import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupAuth } from "./auth";
import { setupSocketHandlers } from "./socket";
import { storage } from "./storage";
import { z } from "zod";
import { insertMessageSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication routes
  setupAuth(app);

  // Chat routes
  app.get("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const chats = await storage.getChatsForUser(req.user.id);
      res.json(chats);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to retrieve chats" });
    }
  });

  app.post("/api/chats", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const { name, userIds } = req.body;
      
      if (!name || !userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ message: "Invalid request format" });
      }
      
      const chat = await storage.createChat({
        name,
        isGroup: userIds.length > 1
      });
      
      // Add all users including the creator
      await storage.addUserToChat(chat.id, req.user.id, true);
      for (const userId of userIds) {
        if (userId !== req.user.id) {
          await storage.addUserToChat(chat.id, userId, false);
        }
      }
      
      res.status(201).json(chat);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to create chat" });
    }
  });
  
  app.get("/api/chats/:chatId/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const chatId = parseInt(req.params.chatId);
      
      // Verify user belongs to chat
      const isMember = await storage.isUserInChat(chatId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "You don't have access to this chat" });
      }
      
      const messages = await storage.getMessagesForChat(chatId);
      res.json(messages);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to retrieve messages" });
    }
  });
  
  app.post("/api/chats/:chatId/messages", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const chatId = parseInt(req.params.chatId);
      
      // Validate message data
      const messageData = insertMessageSchema.parse({
        chatId,
        senderId: req.user.id,
        content: req.body.content
      });
      
      // Verify user belongs to chat
      const isMember = await storage.isUserInChat(chatId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "You don't have access to this chat" });
      }
      
      const message = await storage.createMessage({
        ...messageData,
        senderName: req.user.username,
        senderAvatar: req.user.avatarUrl || null
      });
      
      // Update chat's last message
      await storage.updateChatLastMessage(chatId, message.content, message.timestamp);
      
      res.status(201).json(message);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });
  
  // Mark messages as read
  app.post("/api/chats/:chatId/read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    try {
      const chatId = parseInt(req.params.chatId);
      
      // Verify user belongs to chat
      const isMember = await storage.isUserInChat(chatId, req.user.id);
      if (!isMember) {
        return res.status(403).json({ message: "You don't have access to this chat" });
      }
      
      await storage.markMessagesAsRead(chatId, req.user.id);
      res.sendStatus(200);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to mark messages as read" });
    }
  });

  // Create the HTTP server
  const httpServer = createServer(app);
  
  // Initialize WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Setup WebSocket handlers
  setupSocketHandlers(wss, storage);
  
  return httpServer;
}
