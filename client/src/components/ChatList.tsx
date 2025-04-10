import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { useLocation } from "wouter";
import { Chat } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Edit, Menu, MessageSquare, X, Plus, Users, CheckCircle, PlusCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";

interface ChatListProps {
  chats: Chat[];
  currentChat: Chat | null;
  className?: string;
}

export default function ChatList({ chats, currentChat, className = "" }: ChatListProps) {
  const [_, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [isNewChatDialogOpen, setIsNewChatDialogOpen] = useState(false);
  const [newChatName, setNewChatName] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const { toast } = useToast();

  const handleChatClick = (chat: Chat) => {
    setLocation(`/chat/${chat._id}`);
  };

  const formatTime = (timestamp: string | Date) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "online":
        return "bg-green-500";
      case "away":
        return "bg-yellow-500";
      case "offline":
      default:
        return "bg-gray-400";
    }
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
        <h1 className="text-xl font-bold text-gray-800">LiveChat</h1>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" className="text-gray-500 hover:text-gray-700 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-primary border-primary/20 hover:bg-primary/10 hover:text-primary"
            onClick={() => setIsNewChatDialogOpen(true)}
          >
            <PlusCircle className="h-4 w-4 mr-1" />
            New Chat
          </Button>
        </div>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search conversations"
            className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-white"
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
              className={`px-3 py-3 hover:bg-gray-50 cursor-pointer transition-colors border-l-4 ${currentChat?._id === chat._id
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent'
                }`}
              onClick={() => handleChatClick(chat)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center">
                  <div className="relative">
                    {chat.avatarUrl ? (
                      <img
                        src={chat.avatarUrl}
                        alt={`${chat.name} avatar`}
                        className="h-12 w-12 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-gradient-to-br from-primary/80 to-primary/30 text-white rounded-full flex items-center justify-center text-lg font-medium uppercase">
                        {chat.name.charAt(0)}
                      </div>
                    )}
                    <div className={`absolute bottom-0 right-0 h-3 w-3 rounded-full ${getStatusColor(chat.status)} border-2 border-white`}></div>
                  </div>
                  <div className="ml-3 flex flex-col">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900">{chat.name}</p>
                      {chat.unreadCount > 0 && (
                        <Badge className="ml-2 bg-primary text-white" variant="default">{chat.unreadCount}</Badge>
                      )}
                    </div>
                    <p className={`text-xs ${chat.unreadCount > 0 ? 'text-gray-800 font-medium' : 'text-gray-500'
                      } truncate max-w-[170px]`}>
                      {chat.lastMessage || "No messages yet"}
                    </p>
                  </div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap mt-1">
                  {chat.lastMessageTime ? formatTime(chat.lastMessageTime) : ""}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-40 p-4 text-center">
            {searchQuery ? (
              <>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                  <Search className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-gray-500 text-sm">No chats matching "{searchQuery}"</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-primary hover:text-primary"
                  onClick={() => setSearchQuery("")}
                >
                  Clear search
                </Button>
              </>
            ) : (
              <>
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <p className="text-gray-500 text-sm">No chats yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 text-primary border-primary/20 hover:bg-primary/10"
                  onClick={() => setIsNewChatDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Create your first chat
                </Button>
              </>
            )}
          </div>
        )}
      </ScrollArea>

      <Dialog open={isNewChatDialogOpen} onOpenChange={setIsNewChatDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Create New Chat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="name">Chat Name</Label>
              <Input
                id="name"
                placeholder="Enter chat name"
                value={newChatName}
                onChange={(e) => setNewChatName(e.target.value)}
                className="border-gray-300 focus:border-primary"
              />
            </div>

            <div className="flex items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
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
              className="border-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={createNewChat}
              disabled={!newChatName.trim() || isCreatingChat}
              className="bg-primary hover:bg-primary/90"
            >
              {isCreatingChat ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
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
