import { useState, useEffect, useRef } from "react";
import { formatRelative } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Message } from "@shared/schema";
import MessageItem from "@/components/MessageItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Phone, 
  Video, 
  Info, 
  Smile, 
  Paperclip, 
  Send, 
  ChevronLeft,
  ImageIcon,
  Mic,
  FileIcon
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
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Load messages when chat changes
  useEffect(() => {
    if (currentChat) {
      loadMessages(currentChat._id.toString());
      markAsRead(currentChat._id.toString());
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
      startTyping(currentChat._id.toString());
      typingTimeout = setTimeout(() => {
        setIsTyping(false);
        stopTyping(currentChat._id.toString());
      }, 3000);
    } else {
      stopTyping(currentChat._id.toString());
    }
    
    return () => {
      clearTimeout(typingTimeout);
    };
  }, [isTyping, currentChat, startTyping, stopTyping]);

  // Focus input when chat changes
  useEffect(() => {
    if (currentChat) {
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 300);
    }
  }, [currentChat]);

  // Group messages by date
  const getGroupedMessages = () => {
    if (!currentChat || !messages[currentChat._id.toString()]) return [];
    
    const chatMessages = messages[currentChat._id.toString()];
    const groupedMessages: { date: string; messages: Message[] }[] = [];
    
    chatMessages.forEach(message => {
      // Handle the case where createdAt might be null
      const timestamp = message.createdAt ? new Date(message.createdAt) : new Date();
      const messageDate = formatRelative(timestamp, new Date()).split(" at ")[0];
      
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

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !currentChat || isSending) return;
    
    try {
      setIsSending(true);
      await sendMessage(currentChat._id.toString(), messageInput.trim());
      setMessageInput("");
      setIsTyping(false);
      
      // Ensure focus returns to input after sending
      setTimeout(() => {
        messageInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
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
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-10 w-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium text-gray-900">No chat selected</h3>
          <p className="text-sm text-gray-500 mt-2">
            Select a chat from the list or create a new conversation to start messaging
          </p>
          <div className="mt-6 bg-primary/5 p-4 rounded-lg border border-primary/10">
            <h4 className="text-sm font-medium text-primary">Tips</h4>
            <ul className="mt-2 text-xs text-gray-600 space-y-1">
              <li>• Click on a chat in the left sidebar to open it</li>
              <li>• Use the "+" button to create a new chat</li>
              <li>• Send messages with the Enter key</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  const groupedMessages = getGroupedMessages();
  const chatTypingUsers = typingUsers[currentChat._id] || [];
  const isOtherUserTyping = chatTypingUsers.length > 0;

  return (
    <div className={`flex flex-col flex-1 bg-gray-50 ${className}`}>
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
        <div className="flex items-center">
          {onBackClick && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 md:hidden" 
              onClick={onBackClick}
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <div className="relative">
            {currentChat.avatarUrl ? (
              <img 
                src={currentChat.avatarUrl} 
                alt={`${currentChat.name} avatar`} 
                className="h-10 w-10 rounded-full object-cover border border-gray-200"
              />
            ) : (
              <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/60 text-white rounded-full flex items-center justify-center uppercase shadow-sm">
                {currentChat.name.charAt(0)}
              </div>
            )}
            <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full bg-gray-400 border-2 border-white`}></div>
          </div>
          <div className="ml-3">
            <p className="text-sm font-semibold text-gray-900 truncate max-w-[150px]">{currentChat.name}</p>
            <p className="text-xs text-gray-500">
              {isOtherUserTyping ? (
                <span className="text-primary animate-pulse">typing...</span>
              ) : (
                'Offline'
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" aria-label="Voice call">
                  <Phone className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Voice call</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" aria-label="Video call">
                  <Video className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Video call</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700" aria-label="Chat information">
                  <Info className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Chat information</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Message List */}
      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        {groupedMessages.length > 0 ? (
          <>
            {groupedMessages.map((group, groupIndex) => (
              <div key={groupIndex} className="space-y-4 mb-6">
                <div className="flex items-center justify-center">
                  <div className="bg-gray-200 text-gray-600 text-xs px-3 py-1 rounded-full font-medium">
                    {group.date}
                  </div>
                </div>
                
                {group.messages.map((message) => (
                  <MessageItem 
                    key={message._id}
                    message={message}
                    isOwnMessage={message.senderId === user?._id}
                  />
                ))}
              </div>
            ))}
            
            {/* Typing indicator */}
            {isOtherUserTyping && (
              <div className="flex items-end mb-4">
                <div className="relative mr-2">
                  <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center uppercase">
                    {chatTypingUsers[0]?.charAt(0)}
                  </div>
                </div>
                <div className="bg-white rounded-2xl px-4 py-2 shadow-sm inline-flex space-x-1 items-center">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <svg className="h-10 w-10 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900">No messages yet</h3>
            <p className="text-sm text-gray-500 max-w-sm mt-2">
              Send a message to start the conversation with {currentChat.name}!
            </p>
            <div className="mt-6 flex space-x-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex items-center" 
                onClick={() => messageInputRef.current?.focus()}
              >
                <Send className="h-4 w-4 mr-1 text-primary" />
                Send message
              </Button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>

      {/* Message Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center space-x-2">
          <div className="flex space-x-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                    <Smile className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add emoji</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
                    <ImageIcon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach image</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 md:flex hidden">
                    <FileIcon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach file</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          
          <div className="flex-1 relative">
            <Input
              ref={messageInputRef}
              type="text"
              placeholder="Type a message..."
              className="w-full py-2.5 px-4 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-gray-50 hover:bg-white transition-colors"
              value={messageInput}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              disabled={isSending}
            />
          </div>
          
          {messageInput.trim() ? (
            <Button 
              className="bg-primary text-white rounded-full p-2 hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || isSending}
              size="icon"
              aria-label="Send message"
            >
              {isSending ? (
                <div className="h-5 w-5 border-2 border-t-transparent border-white rounded-full animate-spin"></div>
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          ) : (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Voice message"
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Record voice message</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </div>
    </div>
  );
}
