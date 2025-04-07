import { useState, useEffect, useRef } from "react";
import { formatRelative } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Message } from "@shared/schema";
import MessageItem from "@/components/MessageItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Phone, 
  Video, 
  Info, 
  Smile, 
  Paperclip, 
  Send, 
  ChevronLeft
} from "lucide-react";

interface ChatAreaProps {
  className?: string;
  onBackClick?: () => void;
}

export default function ChatArea({ className = "", onBackClick }: ChatAreaProps) {
  const { user } = useAuth();
  const { 
    currentChat,
    messages,
    typingUsers,
    sendMessage,
    startTyping,
    stopTyping,
    loadMessages,
    markAsRead
  } = useSocket();
  
  const [messageInput, setMessageInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load messages when chat changes
  useEffect(() => {
    if (currentChat) {
      loadMessages(currentChat.id);
      markAsRead(currentChat.id);
    }
  }, [currentChat, loadMessages, markAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, currentChat]);

  // Handle typing indicators
  useEffect(() => {
    if (!currentChat) return;
    
    let typingTimeout: NodeJS.Timeout;
    
    if (isTyping) {
      startTyping(currentChat.id);
      typingTimeout = setTimeout(() => {
        setIsTyping(false);
        stopTyping(currentChat.id);
      }, 3000);
    } else {
      stopTyping(currentChat.id);
    }
    
    return () => {
      clearTimeout(typingTimeout);
    };
  }, [isTyping, currentChat, startTyping, stopTyping]);

  // Group messages by date
  const getGroupedMessages = () => {
    if (!currentChat || !messages[currentChat.id]) return [];
    
    const chatMessages = messages[currentChat.id];
    const groupedMessages: { date: string; messages: Message[] }[] = [];
    
    chatMessages.forEach(message => {
      const messageDate = formatRelative(new Date(message.timestamp), new Date()).split(" at ")[0];
      
      const existingGroup = groupedMessages.find(group => group.date === messageDate);
      if (existingGroup) {
        existingGroup.messages.push(message);
      } else {
        groupedMessages.push({
          date: messageDate,
          messages: [message]
        });
      }
    });
    
    return groupedMessages;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);
    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
    } else if (e.target.value.length === 0) {
      setIsTyping(false);
    }
  };

  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentChat) return;
    
    sendMessage(currentChat.id, messageInput.trim());
    setMessageInput("");
    setIsTyping(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!currentChat) {
    return (
      <div className={`hidden md:flex flex-col flex-1 bg-gray-50 items-center justify-center ${className}`}>
        <div className="text-center max-w-md p-6">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900">No chat selected</h3>
          <p className="text-sm text-gray-500 mt-2">
            Select a chat from the list to start messaging
          </p>
        </div>
      </div>
    );
  }

  const groupedMessages = getGroupedMessages();
  const chatTypingUsers = typingUsers[currentChat.id] || [];
  const isOtherUserTyping = chatTypingUsers.length > 0;

  return (
    <div className={`flex flex-col flex-1 bg-gray-50 ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center">
          {onBackClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 md:hidden" 
              onClick={onBackClick}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="relative">
            {currentChat.avatarUrl ? (
              <img 
                src={currentChat.avatarUrl} 
                alt={`${currentChat.name} avatar`} 
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="h-10 w-10 bg-primary/20 text-primary rounded-full flex items-center justify-center uppercase">
                {currentChat.name.charAt(0)}
              </div>
            )}
            <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${
              currentChat.status === 'online' ? 'bg-green-500' :
              currentChat.status === 'away' ? 'bg-yellow-500' : 'bg-red-500'
            } border-2 border-white`}></div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{currentChat.name}</p>
            <p className="text-xs text-gray-500">
              {currentChat.status === 'online' ? 'Online' : 
               currentChat.status === 'away' ? 'Away' : 'Offline'}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <Phone className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <Video className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <Info className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1 p-4">
        {groupedMessages.length > 0 ? (
          <>
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-4 mb-6">
                <div className="flex items-center justify-center">
                  <div className="bg-gray-200 text-gray-600 text-xs px-2 py-1 rounded-full">
                    {group.date}
                  </div>
                </div>
                
                {group.messages.map((message) => (
                  <MessageItem 
                    key={message.id}
                    message={message}
                    isOwnMessage={message.senderId === user?.id}
                  />
                ))}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isOtherUserTyping && (
              <div className="flex items-end mb-4">
                <div className="relative">
                  <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center uppercase">
                    {chatTypingUsers[0]?.charAt(0)}
                  </div>
                </div>
                <div className="ml-2 bg-white rounded-lg px-4 py-2 shadow-sm inline-flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No messages yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-2">
              Send a message to start the conversation!
            </p>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 mr-1">
            <Smile className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 mr-1">
            <Paperclip className="h-5 w-5" />
          </Button>
          <div className="flex-1 relative">
            <Input
              type="text"
              placeholder="Type a message..."
              className="w-full p-2 pr-10 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={messageInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
            />
          </div>
          <Button 
            className="ml-2 bg-primary text-white rounded-full p-2 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            onClick={handleSendMessage}
            disabled={!messageInput.trim()}
            size="icon"
          >
            <Send className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
