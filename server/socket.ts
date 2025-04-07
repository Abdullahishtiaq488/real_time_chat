import { WebSocketServer, WebSocket } from 'ws';
import { User, Message, Chat, ChatMember } from './models';
import { log } from './vite';

// Define CustomWebSocket type for type safety
// This is a more accurate representation of what we're using from the ws library
type UserWebSocket = WebSocket & {
  userId?: string;
  username?: string;
  isAlive?: boolean;
}

// Set up WebSocket handlers
export function setupSocketHandlers(wss: WebSocketServer) {
  // Ping clients every 30 seconds to keep connections alive
  const interval = setInterval(() => {
    wss.clients.forEach((ws: UserWebSocket) => {
      if (ws.isAlive === false) return ws.terminate();
      
      ws.isAlive = false;
      ws.send(JSON.stringify({ type: 'ping' }));
    });
  }, 30000);

  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });

  // Handle new connections
  wss.on('connection', (ws: UserWebSocket) => {
    ws.isAlive = true;

    // Handle pong responses
    ws.on('pong', () => {
      ws.isAlive = true;
    });

    // Handle messages from clients
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'auth':
            // Authenticate user and set userId and username on the socket
            if (data.userId) {
              ws.userId = data.userId;
              const user = await User.findById(data.userId);
              if (user) {
                ws.username = user.username;
                // Update user status to online
                await User.findByIdAndUpdate(data.userId, { status: 'online' });
                // Broadcast user status change
                await broadcastUserStatus(data.userId, 'online');
              }
            }
            break;
            
          case 'pong':
            ws.isAlive = true;
            break;
            
          case 'message':
            // Handle new messages
            if (!ws.userId) {
              ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
              return;
            }
            
            if (data.chatId && data.content) {
              // Check if user is a member of the chat
              const isMember = await ChatMember.findOne({ 
                chatId: data.chatId, 
                userId: ws.userId 
              });
              
              if (!isMember) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'You are not a member of this chat' 
                }));
                return;
              }
              
              // Get user info for message
              const sender = await User.findById(ws.userId);
              
              if (!sender) {
                ws.send(JSON.stringify({ 
                  type: 'error', 
                  message: 'User not found' 
                }));
                return;
              }
              
              // Create new message
              const newMessage = await Message.create({
                chatId: data.chatId,
                senderId: ws.userId,
                content: data.content,
                isRead: false,
                readBy: [ws.userId], // Sender has read their own message
                attachments: data.attachments || []
              });
              
              // Populate sender info
              await newMessage.populate('senderId', 'username displayName avatarUrl');
              
              // Update chat with last message
              await Chat.findByIdAndUpdate(data.chatId, {
                lastMessage: data.content,
                lastMessageTime: new Date()
              });
              
              // Broadcast message to all chat members
              const chatMembers = await ChatMember.find({ chatId: data.chatId });
              
              // Mark all other members with unread messages
              await Promise.all(chatMembers.map(async (member) => {
                if (member.userId !== ws.userId) {
                  await ChatMember.findByIdAndUpdate(member._id, {
                    $inc: { unreadCount: 1 }
                  });
                }
              }));
              
              // Broadcast to all connected clients who are members of this chat
              wss.clients.forEach((client: UserWebSocket) => {
                if (client.readyState === WebSocket.OPEN && client.userId) {
                  // Find if this connected client is a member of the chat
                  const isMember = chatMembers.some(m => m.userId === client.userId);
                  if (isMember) {
                    client.send(JSON.stringify({
                      type: 'new_message',
                      message: newMessage
                    }));
                  }
                }
              });
            }
            break;
            
          case 'typing':
            // Handle typing indicators
            if (!ws.userId || !data.chatId) return;
            
            wss.clients.forEach((client: UserWebSocket) => {
              if (client.readyState === WebSocket.OPEN && 
                  client.userId && 
                  client.userId !== ws.userId) {
                client.send(JSON.stringify({
                  type: 'typing',
                  chatId: data.chatId,
                  userId: ws.userId,
                  username: ws.username,
                  isTyping: data.isTyping
                }));
              }
            });
            break;
            
          case 'read':
            // Mark messages as read
            if (!ws.userId || !data.chatId) return;
            
            // Find the chat member
            const chatMember = await ChatMember.findOne({
              chatId: data.chatId,
              userId: ws.userId
            });
            
            if (chatMember) {
              // Mark messages as read
              await Message.updateMany(
                { 
                  chatId: data.chatId,
                  readBy: { $ne: ws.userId }
                },
                { 
                  $addToSet: { readBy: ws.userId } 
                }
              );
              
              // Reset unread count
              await ChatMember.findByIdAndUpdate(
                chatMember._id,
                { unreadCount: 0, lastReadAt: new Date() }
              );
              
              // Notify other users that messages have been read
              wss.clients.forEach((client: UserWebSocket) => {
                if (client.readyState === WebSocket.OPEN &&
                    client.userId &&
                    client.userId !== ws.userId) {
                  client.send(JSON.stringify({
                    type: 'read_receipt',
                    chatId: data.chatId,
                    userId: ws.userId
                  }));
                }
              });
            }
            break;
        }
      } catch (error) {
        log(`WebSocket message error: ${error}`, 'websocket');
        ws.send(JSON.stringify({ 
          type: 'error', 
          message: 'Failed to process message' 
        }));
      }
    });

    // Handle disconnections
    ws.on('close', async () => {
      if (ws.userId) {
        // Update user status to offline
        await User.findByIdAndUpdate(ws.userId, { status: 'offline' });
        // Broadcast status change
        await broadcastUserStatus(ws.userId, 'offline');
      }
    });
    
    // Send initial connection success message
    ws.send(JSON.stringify({ type: 'connected' }));
  });
  
  // Helper function to broadcast user status changes
  async function broadcastUserStatus(userId: string, status: string) {
    const user = await User.findById(userId, 'username displayName avatarUrl status');
    
    if (!user) return;
    
    // Find all chats this user is a member of
    const chatMemberships = await ChatMember.find({ userId });
    const chatIds = chatMemberships.map(cm => cm.chatId);
    
    // Find all users who share a chat with this user
    const chatMembers = await ChatMember.find({
      chatId: { $in: chatIds },
      userId: { $ne: userId }
    });
    
    // Create array of unique user IDs
    const userIds = Array.from(new Set(chatMembers.map(cm => cm.userId)));
    
    // Broadcast to all connected clients who share a chat with this user
    wss.clients.forEach((client: UserWebSocket) => {
      if (client.readyState === WebSocket.OPEN && 
          client.userId && 
          userIds.includes(client.userId)) {
        client.send(JSON.stringify({
          type: 'user_status',
          user: {
            _id: userId,
            username: user.username,
            displayName: user.displayName,
            avatarUrl: user.avatarUrl,
            status
          }
        }));
      }
    });
  }
}