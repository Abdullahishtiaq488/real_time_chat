import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { useSocket } from "@/context/SocketContext";
import { Chat } from "@shared/schema";
import {
  Search,
  MessageSquarePlus,
  LogOut,
  User,
  Menu,
  X,
  UserPlus,
  MoreVertical,
  CircleDot,
  Filter,
  Bell,
  Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface SidebarProps {
  className?: string;
  isMobile?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ className = "", isMobile = false, onClose }: SidebarProps) {
  const [location, navigate] = useLocation();
  const [, params] = useRoute("/chat/:id");
  const [filterText, setFilterText] = useState("");
  const { user, logout } = useAuth();
  const { chats, currentChat, selectChat, unreadCount } = useSocket();

  const currentChatId = params?.id || currentChat?._id;

  const filteredChats = chats.filter((chat) => {
    return chat.name.toLowerCase().includes(filterText.toLowerCase());
  });

  const handleChatSelect = (chat: Chat) => {
    if (!chat || !chat._id) {
      console.error("Attempted to select chat with undefined id", chat);
      return;
    }
    selectChat(chat._id.toString());
    navigate(`/chat/${chat._id}`);

    if (isMobile && onClose) {
      onClose();
    }
  };

  const createNewChat = () => {
    navigate("/chat/new");
    if (isMobile && onClose) {
      onClose();
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getChatUnreadCount = (chatId: string) => {
    return unreadCount[chatId] || 0;
  };

  return (
    <div className={cn("flex flex-col h-full bg-white border-r border-gray-200", className)}>
      {/* Sidebar Header with User Profile */}
      <div className="flex items-center justify-between p-3 bg-[#f0f2f5] border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {user?.avatarUrl ? (
              <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username} />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-white">
                {user?.displayName?.charAt(0) || user?.username?.charAt(0) || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
          <div>
            <h3 className="text-base font-medium">{user?.displayName || user?.username}</h3>
            <p className="text-xs text-gray-500">{user?.status || 'Online'}</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
              <Button
                variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 hover:bg-gray-200"
            onClick={createNewChat}
            aria-label="New chat"
          >
            <MessageSquarePlus className="h-5 w-5 text-gray-600" />
              </Button>
          
              <Button
                variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 hover:bg-gray-200"
            aria-label="Menu"
              >
            <MoreVertical className="h-5 w-5 text-gray-600" />
              </Button>
          
          {isMobile && (
              <Button
                variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 md:hidden hover:bg-gray-200"
              onClick={onClose}
              >
              <X className="h-5 w-5 text-gray-600" />
              </Button>
          )}
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="p-2 bg-[#f6f6f6]">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              type="text"
              placeholder="Search or start new chat"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="pl-10 pr-4 py-2 h-9 w-full rounded-lg bg-white focus-visible:ring-0 focus-visible:ring-offset-0 border-0"
            />
                </div>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-full h-9 w-9 hover:bg-gray-200 flex-shrink-0"
          >
            <Filter className="h-4 w-4 text-gray-500" />
            </Button>
        </div>

        {/* Status updates - WhatsApp style */}
        <div className="mt-2 p-2 bg-[#e3f6ff] rounded-lg cursor-pointer hover:bg-[#c9efff] transition-colors duration-200">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-11 w-11 border-2 border-[#e3f6ff]">
                <AvatarFallback className="bg-blue-500 text-white">
                  <Bell className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-[#e3f6ff]">
                <Plus className="h-3 w-3 text-white" />
              </div>
              </div>
              <div>
              <p className="text-sm font-medium">Status updates</p>
              <p className="text-xs text-gray-500">Tap to add status update</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat List */}
      <ScrollArea className="flex-1">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <MessageSquarePlus className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-base font-medium text-gray-900 mb-2">No chats found</h3>
            <p className="text-sm text-gray-500 mb-6 max-w-xs">
              {filterText ? "Try a different search term" : "Start a new conversation to connect with others"}
            </p>
            <Button
              variant="default"
              size="sm"
              className="flex items-center gap-2"
              onClick={createNewChat}
            >
              <MessageSquarePlus className="h-4 w-4" />
              Start a new chat
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {/* Archive Chat Row */}
            <div className="flex items-center px-3 py-2.5 hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                    <Archive className="h-5 w-5 text-gray-500" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 truncate">Archived</h4>
                  </div>
                  <p className="text-xs text-gray-500 truncate">3 archived chats</p>
                </div>
              </div>
            </div>

            {/* Chat List Items */}
            {filteredChats.map((chat) => {
              const isActive = chat._id === currentChatId;
              const unread = getChatUnreadCount(chat._id.toString());

              return (
                <div
                  key={chat._id?.toString()}
                  className={cn(
                    "flex items-center px-3 py-2.5 cursor-pointer",
                    isActive ? "bg-[#e9edef]" : "hover:bg-gray-50"
                  )}
                  onClick={() => handleChatSelect(chat)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        {chat.avatarUrl ? (
                          <AvatarImage src={chat.avatarUrl} alt={chat.name} />
                        ) : (
                          <AvatarFallback className={
                            isActive
                              ? "bg-primary text-white"
                              : "bg-gradient-to-br from-gray-400 to-gray-600 text-white"
                          }>
                            {chat.name.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {chat.isOnline && (
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 truncate">{chat.name}</h4>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {chat.lastMessageTime ? formatDistanceToNow(new Date(chat.lastMessageTime), { addSuffix: false }) : ''}
                        </span>
                      </div>

                      <div className="flex items-center justify-between mt-0.5">
                        <p className="text-xs text-gray-500 truncate max-w-[180px]">
                          {chat.lastMessage || 'No messages yet'}
                        </p>

                        {unread > 0 && (
                          <div className="flex-shrink-0 h-5 min-w-5 rounded-full bg-primary text-[10px] text-white font-medium flex items-center justify-center px-1.5">
                            {unread}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-gray-200 bg-[#f0f2f5]">
        <Button
          variant="ghost"
          className="w-full flex items-center justify-center gap-2 hover:bg-gray-200 text-gray-700"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
              <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}

const Plus = ({ className }: { className?: string }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
};
