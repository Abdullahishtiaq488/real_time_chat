import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { Chat } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Edit, Menu, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatListProps {
  chats: Chat[];
  currentChat: Chat | null;
  className?: string;
}

export default function ChatList({ chats, currentChat, className = "" }: ChatListProps) {
  const [_, setLocation] = useLocation();

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: false });
  };

  // Function to get status color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online':
        return 'bg-green-500';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleChatClick = (chat: Chat) => {
    setLocation(`/chat/${chat.id}`);
  };

  return (
    <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${className}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Messages</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700">
            <Edit className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            type="text" 
            placeholder="Search messages" 
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:bg-white"
          />
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {chats.length > 0 ? (
          chats.map((chat) => (
            <div 
              key={chat.id}
              className={`px-3 py-2 hover:bg-gray-50 cursor-pointer ${currentChat?.id === chat.id ? 'border-l-4 border-primary' : ''}`}
              onClick={() => handleChatClick(chat)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="relative">
                    {chat.avatarUrl ? (
                      <img 
                        src={chat.avatarUrl} 
                        alt={`${chat.name} avatar`} 
                        className="h-10 w-10 rounded-full object-cover" 
                      />
                    ) : (
                      <div className="h-10 w-10 bg-primary/20 text-primary rounded-full flex items-center justify-center uppercase">
                        {chat.name.charAt(0)}
                      </div>
                    )}
                    <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${getStatusColor(chat.status)} border-2 border-white`}></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{chat.name}</p>
                    <p className="text-xs text-gray-500 truncate w-40">
                      {chat.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {chat.lastMessageTime ? formatTime(chat.lastMessageTime) : ""}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Start a new chat by clicking the edit button</p>
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
