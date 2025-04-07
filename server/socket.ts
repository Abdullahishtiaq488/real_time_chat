import { WebSocketServer, WebSocket } from "ws";
import { IStorage } from "./storage";

// Extended WebSocket with user information
interface UserWebSocket extends WebSocket {
  userId?: number;
  username?: string;
  isAlive?: boolean;
}

export function setupSocketHandlers(wss: WebSocketServer, storage: IStorage) {
  // Store connected clients by userId
  const clients = new Map<number, UserWebSocket>();
  
  // Check connections periodically
  const interval = setInterval(() => {
    wss.clients.forEach((ws: UserWebSocket) => {
      if (ws.isAlive === false) return ws.terminate();
      
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(interval);
  });

  wss.on('connection', (ws: UserWebSocket) => {
    ws.isAlive = true;
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
    
    ws.on('message', async (data: string) => {
      try {
        const message = JSON.parse(data);
        
        switch (message.type) {
          case 'auth':
            // Associate this connection with a user
            ws.userId = message.userId;
            const user = await storage.getUser(message.userId);
            if (user) {
              ws.username = user.username;
              clients.set(message.userId, ws);
              
              // Update user status to online
              await storage.updateUserStatus(message.userId, 'online');
              
              // Send user's chats
              const chats = await storage.getChatsForUser(message.userId);
              ws.send(JSON.stringify({
                type: 'chats_list',
                chats
              }));
              
              // Broadcast online status to all users in shared chats
              broadcastUserStatus(message.userId, 'online');
            }
            break;
            
          case 'message':
            if (!ws.userId) break;
            
            try {
              // Store message in database
              const newMessage = await storage.createMessage({
                chatId: message.chatId,
                senderId: ws.userId,
                content: message.content,
                senderName: ws.username,
                timestamp: new Date(),
                status: 'sent'
              });
              
              // Update chat's last message
              await storage.updateChatLastMessage(
                message.chatId, 
                message.content, 
                newMessage.timestamp
              );
              
              // Get chat members to broadcast message
              const chatMembers = await storage.getChatMembers(message.chatId);
              
              // Broadcast to all members of the chat
              chatMembers.forEach(member => {
                const client = clients.get(member.userId);
                if (client && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'message',
                    message: newMessage
                  }));
                  
                  // If message is not from the current user, mark as delivered
                  if (member.userId !== ws.userId) {
                    client.send(JSON.stringify({
                      type: 'chat_updated',
                      chat: {
                        id: message.chatId,
                        lastMessage: message.content,
                        lastMessageTime: newMessage.timestamp
                      }
                    }));
                  }
                }
              });
            } catch (error) {
              console.error('Error handling message:', error);
              ws.send(JSON.stringify({
                type: 'error',
                message: 'Failed to send message'
              }));
            }
            break;
            
          case 'typing':
            if (!ws.userId || !ws.username) break;
            
            // Broadcast typing indicator to other users in the chat
            const chatMembers = await storage.getChatMembers(message.chatId);
            chatMembers
              .filter(member => member.userId !== ws.userId)
              .forEach(member => {
                const client = clients.get(member.userId);
                if (client && client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: 'typing',
                    chatId: message.chatId,
                    userId: ws.userId,
                    username: ws.username,
                    isTyping: message.isTyping
                  }));
                }
              });
            break;
            
          case 'get_messages':
            if (!ws.userId) break;
            
            // Check if user is a member of the chat
            const isMember = await storage.isUserInChat(message.chatId, ws.userId);
            if (isMember) {
              const messages = await storage.getMessagesForChat(message.chatId);
              ws.send(JSON.stringify({
                type: 'message_history',
                chatId: message.chatId,
                messages
              }));
            }
            break;
            
          case 'mark_read':
            if (!ws.userId) break;
            
            // Mark messages as read
            await storage.markMessagesAsRead(message.chatId, ws.userId);
            
            // Notify senders that their messages were read
            const chatMsgs = await storage.getMessagesForChat(message.chatId);
            const senderIds = new Set(
              chatMsgs.filter(msg => msg.senderId !== ws.userId).map(msg => msg.senderId)
            );
            
            senderIds.forEach(senderId => {
              const senderClient = clients.get(senderId);
              if (senderClient && senderClient.readyState === WebSocket.OPEN) {
                senderClient.send(JSON.stringify({
                  type: 'messages_read',
                  chatId: message.chatId,
                  byUserId: ws.userId
                }));
              }
            });
            break;
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    });
    
    ws.on('close', async () => {
      if (ws.userId) {
        // Set user status to offline
        await storage.updateUserStatus(ws.userId, 'offline');
        
        // Remove from clients map
        clients.delete(ws.userId);
        
        // Broadcast offline status to all users in shared chats
        broadcastUserStatus(ws.userId, 'offline');
      }
    });
    
    // Helper function to broadcast user status to relevant users
    async function broadcastUserStatus(userId: number, status: string) {
      // Get all chats this user belongs to
      const userChats = await storage.getChatsForUser(userId);
      
      // For each chat, notify other members about status change
      for (const chat of userChats) {
        const members = await storage.getChatMembers(chat.id);
        
        for (const member of members) {
          if (member.userId !== userId) {
            const client = clients.get(member.userId);
            if (client && client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({
                type: 'user_status',
                userId,
                status
              }));
            }
          }
        }
      }
    }
  });
}
