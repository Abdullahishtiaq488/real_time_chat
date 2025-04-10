import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Message, Chat } from "@shared/schema";
import { io, Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";

// Add global type definitions
declare global {
  interface Window {
    messageTimeouts: {
      [chatId: string]: {
        apiTimeout: NodeJS.Timeout | null;
        loadingTimeout: NodeJS.Timeout;
      }
    }
  }
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  currentChat: Chat | null;
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
  chats: Chat[];
  unreadCount: Record<string, number>;
  selectChat: (chatId: string) => void;
  sendMessage: (chatId: string, content: string) => Promise<void>;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  loadMessages: (chatId: string) => void;
  markAsRead: (chatId: string) => void;
  createChat: (name: string, userIds: string[]) => Promise<Chat>;
  addUserToChat: (chatId: string, userId: string) => Promise<void>;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const [chats, setChats] = useState<Chat[]>([]);
  const [unreadCount, setUnreadCount] = useState<Record<string, number>>({});

  // Initialize socket connection
  useEffect(() => {
    if (!user) return;

    const newSocket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:3000", {
      auth: {
        token: user.token,
      },
    });

    newSocket.on("connect", () => {
      console.log("WebSocket connection established");
      setIsConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("WebSocket connection lost");
      setIsConnected(false);
    });

    newSocket.on("error", (error) => {
      console.error("WebSocket error:", error);
    });

    newSocket.on("message", (message: Message) => {
      console.log("New message received:", message);
      setMessages((prev) => {
        const chatMessages = prev[message.chatId] || [];
        return {
          ...prev,
          [message.chatId]: [...chatMessages, message],
        };
      });

      // Update unread count if not in current chat
      if (currentChat?._id !== message.chatId) {
        setUnreadCount((prev) => ({
          ...prev,
          [message.chatId]: (prev[message.chatId] || 0) + 1,
        }));
      }
    });

    newSocket.on("typing", ({ chatId, userId, isTyping }) => {
      setTypingUsers((prev) => {
        const currentTyping = prev[chatId] || [];
        if (isTyping && !currentTyping.includes(userId)) {
          return {
            ...prev,
            [chatId]: [...currentTyping, userId],
          };
        } else if (!isTyping) {
          return {
            ...prev,
            [chatId]: currentTyping.filter((id) => id !== userId),
          };
        }
        return prev;
      });
    });

    newSocket.on("chat", (chat: Chat) => {
      console.log("Chat updated:", chat);
      setChats((prev) => {
        const existingIndex = prev.findIndex((c) => c._id === chat._id);
        if (existingIndex >= 0) {
          const newChats = [...prev];
          newChats[existingIndex] = chat;
          return newChats;
        }
        return [...prev, chat];
      });
    });

    newSocket.on("connected", () => {
      console.log("Connected to WebSocket server");
      // Load initial data
      newSocket.emit("getChats");
    });

    newSocket.on("chats", (loadedChats: Chat[]) => {
      console.log("Chats loaded:", loadedChats.length);
      setChats(loadedChats);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  const selectChat = useCallback((chatId: string) => {
    if (!socket) return;
    console.log("Selecting chat:", chatId);
    socket.emit("selectChat", chatId);
    setCurrentChat(chats.find((chat) => chat._id === chatId) || null);
    setUnreadCount((prev) => ({ ...prev, [chatId]: 0 }));
  }, [socket, chats]);

  const sendMessage = useCallback(async (chatId: string, content: string) => {
    if (!socket) throw new Error("Socket not connected");
    return new Promise<void>((resolve, reject) => {
      socket.emit("sendMessage", { chatId, content }, (error: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }, [socket]);

  const startTyping = useCallback((chatId: string) => {
    if (!socket) return;
    socket.emit("typing", { chatId, isTyping: true });
  }, [socket]);

  const stopTyping = useCallback((chatId: string) => {
    if (!socket) return;
    socket.emit("typing", { chatId, isTyping: false });
  }, [socket]);

  const loadMessages = useCallback((chatId: string) => {
    if (!socket) return;
    socket.emit("getMessages", chatId);
  }, [socket]);

  const markAsRead = useCallback((chatId: string) => {
    if (!socket) return;
    socket.emit("markAsRead", chatId);
  }, [socket]);

  const createChat = useCallback(async (name: string, userIds: string[]) => {
    if (!socket) throw new Error("Socket not connected");
    return new Promise<Chat>((resolve, reject) => {
      socket.emit("createChat", { name, userIds }, (error: Error | null, chat: Chat) => {
        if (error) reject(error);
        else resolve(chat);
      });
    });
  }, [socket]);

  const addUserToChat = useCallback(async (chatId: string, userId: string) => {
    if (!socket) throw new Error("Socket not connected");
    return new Promise<void>((resolve, reject) => {
      socket.emit("addUserToChat", { chatId, userId }, (error: Error | null) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }, [socket]);

  const value = {
    socket,
    isConnected,
    currentChat,
    messages,
    typingUsers,
    chats,
    unreadCount,
    selectChat,
    sendMessage,
    startTyping,
    stopTyping,
    loadMessages,
    markAsRead,
    createChat,
    addUserToChat,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
