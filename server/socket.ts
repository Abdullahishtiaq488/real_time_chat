import { Server, Socket } from "socket.io";
import { log } from "./utils/logger";
import { Chat, Message, User } from "@shared/schema";
import { authenticateSocket } from "./auth";
import { ChatModel, MessageModel, UserModel } from "./models";

export function setupSocket(io: Server) {
  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    try {
      const user = await authenticateSocket(socket);
      if (!user) {
        return next(new Error("Authentication failed"));
      }
      socket.data.user = user;
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", async (socket) => {
    const user = socket.data.user;
    log(`User connected: ${user.username}`);

    // Update user status to online
    await UserModel.findByIdAndUpdate(user._id, { status: "online" });

    // Join user's rooms
    const chats = await ChatModel.find({ participants: user._id });
    chats.forEach((chat) => {
      socket.join(chat._id.toString());
    });

    // Handle chat events
    socket.on("selectChat", async (chatId: string) => {
      try {
        const chat = await ChatModel.findById(chatId)
          .populate("participants", "username displayName avatarUrl status")
          .populate("lastMessage");
        
        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        // Check if user is a participant
        if (!chat.participants.some((p: any) => p._id.toString() === user._id)) {
          socket.emit("error", { message: "Not a participant" });
          return;
        }

        // Load messages
        const messages = await MessageModel.find({ chatId })
          .sort({ createdAt: 1 })
          .limit(50);

        socket.emit("chat", chat);
        socket.emit("messages", messages);
      } catch (error) {
        log("Error selecting chat:", error);
        socket.emit("error", { message: "Failed to load chat" });
      }
    });

    // Handle message events
    socket.on("sendMessage", async (data: { chatId: string; content: string }) => {
      try {
        const { chatId, content } = data;
        const chat = await ChatModel.findById(chatId);

        if (!chat) {
          socket.emit("error", { message: "Chat not found" });
          return;
        }

        // Create message
        const message = new MessageModel({
          chatId,
          senderId: user._id,
          content,
          type: "text",
        });

        await message.save();

        // Update chat's last message
        chat.lastMessage = message._id;
        await chat.save();

        // Emit message to all participants
        io.to(chatId).emit("message", message);
      } catch (error) {
        log("Error sending message:", error);
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // Handle typing events
    socket.on("typing", (data: { chatId: string; isTyping: boolean }) => {
      const { chatId, isTyping } = data;
      socket.to(chatId).emit("typing", {
        chatId,
        userId: user._id,
        isTyping,
      });
    });

    // Handle disconnect
    socket.on("disconnect", async () => {
      log(`User disconnected: ${user.username}`);
      await UserModel.findByIdAndUpdate(user._id, { status: "offline" });
    });
  });
}