import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useSocket } from "@/context/SocketContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Check, ChevronLeft, Search, UserPlus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface User {
    _id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
}

export default function AddUserToChat() {
    const [, params] = useRoute("/chat/add-user/:chatId");
    const [, setLocation] = useLocation();
    const chatId = params?.chatId;
    const { toast } = useToast();
    const { chats } = useSocket();
    const [searchQuery, setSearchQuery] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

    // Get current chat
    const currentChat = chats.find(chat => chat._id === chatId);

    // Fetch users when search query changes
    useEffect(() => {
        if (!searchQuery.trim()) {
            setUsers([]);
            setIsSearching(false);
            return;
        }

        const fetchUsers = async () => {
            setIsLoading(true);
            setIsSearching(true);

            try {
                const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
                if (!response.ok) throw new Error('Failed to fetch users');

                const data = await response.json();
                setUsers(data);
            } catch (error) {
                console.error('Error searching users:', error);
                toast({
                    title: "Error",
                    description: "Failed to search users. Please try again.",
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce search
        const timer = setTimeout(() => {
            if (searchQuery.trim()) {
                fetchUsers();
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [searchQuery, toast]);

    // Add selected user to the chat
    const addUserToChat = async (user: User) => {
        if (!chatId) return;

        try {
            const response = await fetch(`/api/chats/${chatId}/members`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ userId: user._id })
            });

            if (!response.ok) {
                throw new Error('Failed to add user to chat');
            }

            toast({
                title: "Success",
                description: `Added ${user.displayName || user.username} to the chat`,
                variant: "default"
            });

            // Add user to selected users
            setSelectedUsers(prev => [...prev, user]);

            // Remove from the search results
            setUsers(prev => prev.filter(u => u._id !== user._id));
        } catch (error) {
            console.error('Error adding user to chat:', error);
            toast({
                title: "Error",
                description: "Failed to add user to chat. Please try again.",
                variant: "destructive"
            });
        }
    };

    // Navigate back to chat
    const handleBackClick = () => {
        setLocation(`/chat/${chatId}`);
    };

    if (!currentChat) {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-gray-100">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center">
                    <div className="mb-4 text-red-500">
                        <X className="h-12 w-12 mx-auto" />
                    </div>
                    <h2 className="text-xl font-bold mb-4">Chat Not Found</h2>
                    <p className="text-gray-600 mb-6">The chat you're trying to add users to doesn't exist or you don't have access to it.</p>
                    <Button onClick={() => setLocation('/chat')}>
                        Go to Chats
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 flex flex-col bg-gray-100">
            {/* Fixed header */}
            <header className="p-4 bg-white border-b border-gray-200 shadow-sm z-10">
                <div className="flex items-center">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="mr-2"
                        onClick={handleBackClick}
                        aria-label="Go back"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </Button>
                    <div className="ml-2">
                        <h1 className="text-xl font-bold">Add Users to Chat</h1>
                        <p className="text-sm text-gray-500">
                            {currentChat.name}
                        </p>
                    </div>
                </div>
            </header>

            {/* Search input - fixed position */}
            <div className="p-4 bg-white border-b border-gray-200">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                        type="text"
                        placeholder="Search users by username or name..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 py-2"
                    />
                    {searchQuery && (
                        <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6"
                            onClick={() => setSearchQuery("")}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* Selected users section - fixed */}
            {selectedUsers.length > 0 && (
                <div className="p-4 bg-primary/5 border-b border-primary/10">
                    <h2 className="text-sm font-medium text-primary mb-2">Added Users</h2>
                    <div className="flex flex-wrap gap-2">
                        {selectedUsers.map(user => (
                            <div
                                key={user._id}
                                className="flex items-center bg-white rounded-full pl-1 pr-3 py-1 border border-gray-200 shadow-sm"
                            >
                                <Avatar className="h-6 w-6 mr-1">
                                    <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username} />
                                    <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium">{user.displayName || user.username}</span>
                                <Check className="h-3 w-3 ml-1 text-green-500" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Scrollable results area */}
            <div className="flex-1 overflow-hidden">
                <ScrollArea className="h-full">
                    <div className="p-4">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        ) : isSearching && users.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Search className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="font-medium">No users found</p>
                                <p className="text-sm">Try a different search term</p>
                            </div>
                        ) : !isSearching ? (
                            <div className="text-center py-8 text-gray-500">
                                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <UserPlus className="h-6 w-6 text-gray-400" />
                                </div>
                                <p className="font-medium">Search for users to add</p>
                                <p className="text-sm">Enter a username or name to find people</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {users.map(user => (
                                    <div
                                        key={user._id}
                                        className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200 shadow-sm"
                                    >
                                        <div className="flex items-center">
                                            <Avatar className="h-10 w-10 mr-3">
                                                <AvatarImage src={user.avatarUrl} alt={user.displayName || user.username} />
                                                <AvatarFallback>{user.username.charAt(0)}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium">{user.displayName || user.username}</p>
                                                <p className="text-sm text-gray-500">@{user.username}</p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={() => addUserToChat(user)}
                                            variant="outline"
                                            size="sm"
                                            className="flex items-center gap-1"
                                        >
                                            <UserPlus className="h-4 w-4" />
                                            <span>Add</span>
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Fixed footer with done button */}
            <div className="p-4 bg-white border-t border-gray-200">
                <Button
                    onClick={handleBackClick}
                    className="w-full"
                >
                    Done
                </Button>
            </div>
        </div>
    );
} 