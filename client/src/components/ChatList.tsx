import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { Chat } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Edit, Menu, MessageSquare, X, Plus, Users, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ChatListProps {
  chats: Chat[];
  currentChat: Chat | null;
  className?: string;
}

export default function ChatList({ chats, currentChat, className = "" }: ChatListProps) {
  const [_, setLocation] = useLocation();
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return formatDistanceToNow(date, { addSuffix: false });
  };

  // Function to get status color based on status
  const getStatusColor = (status: string | null) => {
    if (!status) return 'bg-gray-500';
    
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
    setLocation(`/chat/${chat._id}`);
  };

  const createNewChat = async () => {
    if (!newChatName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a chat name",
        variant: "destructive"
      });
      return;
    }

    setIsCreatingChat(true);

    try {
      const res = await apiRequest("POST", "/api/chats", {
        name: newChatName.trim(),
        userIds: []
      });

      if (res.ok) {
        const newChat = await res.json();
        toast({
          title: "Success",
          description: "Chat created successfully",
          variant: "default"
        });
        setLocation(`/chat/${newChat._id}`);
        setIsNewChatDialogOpen(false);
        setNewChatName("");
      } else {
        throw new Error("Failed to create chat");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive"
      });
    } finally {
      setIsCreatingChat(false);
    }
  };

  // Filter chats based on search query
  const filteredChats = searchQuery
    ? chats.filter(chat => 
        chat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (chat.lastMessage && chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : chats;

  return (
    <div className={`w-full md:w-80 bg-white border-r border-gray-200 flex flex-col ${className}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-800">Messages</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-gray-500 hover:text-gray-700"
            onClick={() => setIsNewChatDialogOpen(true)}
          >
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
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setSearchQuery("")}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      <ScrollArea className="flex-1">
        {filteredChats.length > 0 ? (
          filteredChats.map((chat) => (
            <div 
              key={chat._id}
              className={`px-3 py-2 hover:bg-gray-50 cursor-pointer ${currentChat?._id === chat._id ? 'border-l-4 border-primary bg-gray-50' : ''}`}
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
        ) : searchQuery ? (
          <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No results found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <MessageSquare className="h-6 w-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">No conversations yet</p>
            <p className="text-xs text-gray-400 mt-1">Start a new chat by clicking the edit button</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 flex items-center"
              onClick={() => setIsNewChatDialogOpen(true)}
            >
              <Plus className="h-4 w-4 mr-1" />
              New Chat
            </Button>
          </div>
        )}
      </ScrollArea>

      {/* Create New Chat Dialog */}
      <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Chat Name</Label>
              <Input
                id="name"
                placeholder="Enter chat name"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
              />
            </div>
            
            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <div className="bg-primary/10 rounded-full p-2 mr-3">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Group Chat</p>
                <p className="text-xs text-gray-500">Add users to create a group chat (Coming soon)</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsNewChatDialogOpen(false);
                setNewChatName("");
              }}
              disabled={isCreatingChat}
            >
              Cancel
            </Button>
            <Button 
              onClick={createNewChat}
              disabled={!newChatName.trim() || isCreatingChat}
              className="relative"
            >
              {isCreatingChat ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Create Chat
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
