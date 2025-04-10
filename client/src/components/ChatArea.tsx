import { useState, useEffect, useRef } from "react";
import { formatRelative } from "date-fns";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Message } from "@shared/schema";
import MessageItem from "@/components/MessageItem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Phone,
  Video,
  Info,
  Smile,
  Paperclip,
  Send,
  ChevronLeft,
  Image as ImageIcon,
  Mic,
  MoreVertical,
  UserPlus
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
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  // Load messages when chat changes
  useEffect(() => {
    if (currentChat && currentChat._id) {
      console.log(`Loading messages for chat: ${currentChat._id}`);
      loadMessages(currentChat._id.toString());

      // Mark messages as read
      markAsRead(currentChat._id.toString());
    }
  }, [currentChat?._id, loadMessages, markAsRead]);

  // Update loading state when messages or chat changes
  useEffect(() => {
    if (currentChat && messages[currentChat._id]) {
      setIsLoadingMessages(false);
    } else if (currentChat) {
      setIsLoadingMessages(true);
    }
  }, [currentChat, messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (!isLoadingMessages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, currentChat, isLoadingMessages]);

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessageInput(e.target.value);

    if (!isTyping && e.target.value.length > 0) {
      setIsTyping(true);
    } else if (isTyping && e.target.value.length === 0) {
      setIsTyping(false);
    }
  };

  const handleSendMessage = async () => {
    if (messageInput.trim() === "" || !currentChat || !user) return;

    setIsSending(true);

    try {
      await sendMessage(
        currentChat._id.toString(),
        messageInput.trim()
      );

      setMessageInput("");
      setIsTyping(false);
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Group messages by date
  const getGroupedMessages = () => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = "";

    if (!currentChat) return groups;

    // Get messages for the current chat
    const chatMessages = messages[currentChat._id] || [];

    if (chatMessages.length === 0) return groups;

    chatMessages.forEach((message) => {
      try {
        const messageDate = new Date(message.createdAt || Date.now());
        const formattedDate = formatRelative(messageDate, new Date());

        if (formattedDate !== currentDate) {
          currentDate = formattedDate;
          groups.push({ date: formattedDate, messages: [message] });
        } else {
          const lastGroup = groups[groups.length - 1];
          lastGroup.messages.push(message);
        }
      } catch (error) {
        console.error("Error processing message:", error, message);
      }
    });

    return groups;
  };

  if (!currentChat) {
    return (
      <div className={`flex flex-col flex-1 items-center justify-center ${className}`}
        style={{ background: "linear-gradient(180deg, #f0f2f5 0%, #e6ebf2 100%)" }}>
        <div className="text-center max-w-md px-6">
          <div className="w-72 h-72 mx-auto mb-6 bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: "url('https://web.whatsapp.com/img/intro-connection-light_c98cc75f2aa905314d74375a975d2cf2.jpg')" }}>
          </div>
          <h3 className="text-xl font-light text-gray-900 mb-3">LiveChat Connect</h3>
          <p className="text-sm text-gray-500 mb-6">
            Select a chat from the sidebar or create a new conversation to start messaging
          </p>
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mt-8">
            <MessageIcon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </div>
    );
  }

  const groupedMessages = getGroupedMessages();
  const chatTypingUsers = typingUsers[currentChat._id] || [];
  const isOtherUserTyping = chatTypingUsers.length > 0;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Chat Header - WhatsApp style */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#f0f2f5] border-b border-gray-200 z-10">
        <div className="flex items-center">
          {onBackClick && (
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 md:hidden rounded-full h-9 w-9 hover:bg-gray-200"
              onClick={onBackClick}
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          <Avatar className="h-10 w-10 border border-gray-200">
            {currentChat.avatarUrl ? (
              <AvatarImage src={currentChat.avatarUrl} alt={currentChat.name} />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-primary/80 to-primary/50 text-white">
                {currentChat.name.charAt(0)}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="ml-3">
            <p className="text-base font-medium text-gray-900">{currentChat.name}</p>
            <p className="text-xs text-gray-500">
              {isOtherUserTyping ? (
                <span className="flex items-center text-green-600 font-medium">
                  typing<span className="inline-flex ml-1 w-5">
                    <span className="animate-bounce inline-block w-1 h-1 bg-green-600 rounded-full mr-1" style={{ animationDelay: "0ms" }}></span>
                    <span className="animate-bounce inline-block w-1 h-1 bg-green-600 rounded-full mr-1" style={{ animationDelay: "160ms" }}></span>
                    <span className="animate-bounce inline-block w-1 h-1 bg-green-600 rounded-full" style={{ animationDelay: "320ms" }}></span>
                  </span>
                </span>
              ) : (
                currentChat.lastMessageTime ? (
                  `Last active ${formatRelative(new Date(currentChat.lastMessageTime), new Date())}`
                ) : 'No recent activity'
              )}
            </p>
          </div>
        </div>

        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 hover:bg-gray-200"
            onClick={() => {
              if (currentChat?._id) {
                window.location.href = `/chat/add-user/${currentChat._id}`;
              }
            }}
          >
            <UserPlus className="h-5 w-5 text-gray-600" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-gray-200">
            <Video className="h-5 w-5 text-gray-600" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-gray-200">
            <Phone className="h-5 w-5 text-gray-600" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-9 w-9 hover:bg-gray-200">
            <MoreVertical className="h-5 w-5 text-gray-600" />
          </Button>
        </div>
      </div>

      {/* Messages Area - Scrollable content with chat background */}
      <div className="flex-1 overflow-hidden bg-[#e5ded8] relative">
        {/* Background Pattern - WhatsApp style */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23000000' fill-opacity='0.1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
            backgroundSize: '300px',
          }}
        />

        <ScrollArea className="h-full px-4 py-2 relative z-10" ref={scrollAreaRef}>
          {isLoadingMessages ? (
            <div className="flex flex-col items-center justify-center h-64 py-10">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                <div className="h-6 w-6 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-sm font-medium text-gray-900 bg-white/30 backdrop-blur-sm px-4 py-2 rounded-full">Loading messages...</h3>
            </div>
          ) : !currentChat || (currentChat && (!messages[currentChat._id] || messages[currentChat._id].length === 0)) ? (
            <div className="flex flex-col items-center justify-center h-64 py-10">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <div className="bg-white/30 backdrop-blur-sm px-6 py-4 rounded-xl text-center">
                <h3 className="text-base font-medium text-gray-900 mb-1">No messages yet</h3>
                <p className="text-sm text-gray-700">
                  Send your first message to start the conversation with {currentChat?.name}
                </p>
              </div>
            </div>
          ) : (
            <>
              {groupedMessages.map((group, groupIndex) => (
                <div key={groupIndex} className="mb-4">
                  <div className="flex justify-center mb-4">
                    <div className="bg-white/30 backdrop-blur-sm rounded-full px-4 py-1 shadow-sm">
                      <span className="text-xs text-gray-700 font-medium">{group.date}</span>
                    </div>
                  </div>

                  {group.messages.map((message, messageIndex) => (
                    <MessageItem
                      key={message._id}
                      message={message}
                      isOwnMessage={message.senderId === user?._id}
                      showAvatar={
                        messageIndex === 0 ||
                        group.messages[messageIndex - 1].senderId !== message.senderId
                      }
                      isLastInGroup={
                        messageIndex === group.messages.length - 1 ||
                        group.messages[messageIndex + 1].senderId !== message.senderId
                      }
                    />
                  ))}
                </div>
              ))}
            </>
          )}

          {isOtherUserTyping && (
            <div className="flex items-center mb-4">
              <div className="bg-white rounded-lg py-2 px-3 max-w-[85%] shadow-sm">
                <div className="flex space-x-1">
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '200ms' }}></div>
                  <div className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '400ms' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-4" />
        </ScrollArea>
      </div>

      {/* Message Input Area - WhatsApp style */}
      <div className="py-2 px-3 bg-[#f0f2f5]">
        <div className="flex items-center bg-white rounded-lg shadow-sm">
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-gray-500 hover:bg-gray-100 ml-1">
            <Smile className="h-6 w-6" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 text-gray-500 hover:bg-gray-100 mr-1">
            <Paperclip className="h-6 w-6" />
          </Button>

          <Input
            ref={messageInputRef}
            value={messageInput}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type a message"
            className="flex-1 h-10 border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent"
          />

          <Button
            variant="ghost"
            size="icon"
            className={`rounded-full h-10 w-10 mr-1 ${messageInput.trim() ? 'text-primary hover:bg-primary/10' : 'text-gray-500 hover:bg-gray-100'
              }`}
            onClick={handleSendMessage}
            disabled={!messageInput.trim() || isSending}
          >
            {isSending ? (
              <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
            ) : messageInput.trim() ? (
              <Send className="h-6 w-6" />
            ) : (
              <Mic className="h-6 w-6" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

const MessageIcon = ({ className }: { className?: string }) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3098 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
