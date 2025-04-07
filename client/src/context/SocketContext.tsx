import { createContext, ReactNode, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Message, Chat } from "@shared/schema";

interface SocketContextProps {
  isConnected: boolean;
  typingUsers: { [chatId: string]: string[] };
  sendMessage: (chatId: string, content: string) => void;
  startTyping: (chatId: string) => void;
  stopTyping: (chatId: string) => void;
  messages: { [chatId: string]: Message[] };
  chats: Chat[];
  currentChat: Chat | null;
  setCurrentChat: (chat: Chat | null) => void;
  loadMessages: (chatId: string) => void;
  markAsRead: (chatId: string) => void;
}

const SocketContext = createContext<SocketContextProps | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [chatId: string]: string[] }>({});
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChat, setCurrentChat] = useState<Chat | null>(null);

  // Connect to WebSocket when user is authenticated
  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.close();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Get the protocol and host for WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;
    console.log("Connecting to WebSocket:", wsUrl);
    
    // Create new WebSocket connection
    const newSocket = new WebSocket(wsUrl);

    setSocket(newSocket);

    newSocket.onopen = () => {
      setIsConnected(true);
      // Send authentication message
      newSocket.send(JSON.stringify({
        type: "auth",
        userId: user._id
      }));

      // Get initial chat list
      fetch('/api/chats')
        .then(res => res.json())
        .then(data => {
          setChats(data);
        })
        .catch(err => {
          toast({
            title: "Error loading chats",
            description: err.message,
            variant: "destructive"
          });
        });
    };

    newSocket.onclose = () => {
      setIsConnected(false);
      toast({
        title: "Disconnected",
        description: "Connection to chat server lost. Reconnecting...",
        variant: "destructive"
      });
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      toast({
        title: "Connection Error",
        description: "Error connecting to the chat server",
        variant: "destructive"
      });
    };

    newSocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case "message":
            handleNewMessage(data.message);
            break;
          case "typing":
            handleTypingIndicator(data);
            break;
          case "chat_updated":
            updateChat(data.chat);
            break;
          case "chats_list":
            setChats(data.chats);
            break;
          case "message_history":
            setMessages(prev => ({
              ...prev,
              [data.chatId]: data.messages
            }));
            break;
        }
      } catch (err) {
        console.error("Error processing message:", err);
      }
    };

    return () => {
      if (newSocket) {
        newSocket.close();
      }
    };
  }, [user, toast]);

  const handleNewMessage = useCallback((message: Message) => {
    setMessages(prev => {
      const chatMessages = prev[message.chatId] || [];
      return {
        ...prev,
        [message.chatId]: [...chatMessages, message]
      };
    });

    // Update chat with latest message
    setChats(prevChats => {
      return prevChats.map(chat => {
        if (chat._id === message.chatId) {
          return {
            ...chat,
            lastMessage: message.content,
            lastMessageTime: message.createdAt
          };
        }
        return chat;
      });
    });
  }, []);

  const handleTypingIndicator = useCallback((data: { chatId: string, userId: string, isTyping: boolean, username: string }) => {
    setTypingUsers(prev => {
      const { chatId, username, isTyping } = data;
      const chatTypers = prev[chatId] || [];
      
      if (isTyping && !chatTypers.includes(username)) {
        return { ...prev, [chatId]: [...chatTypers, username] };
      } else if (!isTyping) {
        return { ...prev, [chatId]: chatTypers.filter(user => user !== username) };
      }
      
      return prev;
    });
  }, []);

  const updateChat = useCallback((chat: Chat) => {
    setChats(prev => {
      const exists = prev.some(c => c._id === chat._id);
      if (exists) {
        return prev.map(c => c._id === chat._id ? chat : c);
      } else {
        return [...prev, chat];
      }
    });
  }, []);

  const sendMessage = useCallback((chatId: string, content: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "message",
        chatId,
        content
      }));
    } else {
      toast({
        title: "Connection error",
        description: "You're currently offline. Message will be sent when you reconnect.",
        variant: "destructive"
      });
    }
  }, [socket, toast]);

  const startTyping = useCallback((chatId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && user) {
      socket.send(JSON.stringify({
        type: "typing",
        chatId,
        isTyping: true
      }));
    }
  }, [socket, user]);

  const stopTyping = useCallback((chatId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN && user) {
      socket.send(JSON.stringify({
        type: "typing",
        chatId,
        isTyping: false
      }));
    }
  }, [socket, user]);

  const loadMessages = useCallback((chatId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "get_messages",
        chatId
      }));
    } else {
      // Fallback to API call if WebSocket is not connected
      fetch(`/api/chats/${chatId}/messages`)
        .then(res => res.json())
        .then(data => {
          setMessages(prev => ({
            ...prev,
            [chatId]: data
          }));
        })
        .catch(err => {
          toast({
            title: "Error loading messages",
            description: err.message,
            variant: "destructive"
          });
        });
    }
  }, [socket, toast]);

  const markAsRead = useCallback((chatId: string) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: "mark_read",
        chatId
      }));
    }
  }, [socket]);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        typingUsers,
        sendMessage,
        startTyping,
        stopTyping,
        messages,
        chats,
        currentChat,
        setCurrentChat,
        loadMessages,
        markAsRead
      }}
    >
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
