import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useSocket } from "@/context/SocketContext";
import ChatArea from "@/components/ChatArea";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export default function Chat() {
    const [, params] = useRoute("/chat/:chatId");
    const [, setLocation] = useLocation();
    const chatId = params?.chatId;
    const { chats, setCurrentChat, currentChat } = useSocket();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Set current chat based on URL param
    useEffect(() => {
        if (chatId && chats.length > 0) {
            const chat = chats.find(c => c._id === chatId);

            if (chat) {
                setCurrentChat(chat);
            } else {
                console.error(`Chat with ID ${chatId} not found`);
                // If chat not found and we have chats, navigate to the first one
                if (chats.length > 0) {
                    setLocation(`/chat/${chats[0]._id}`);
                } else {
                    setLocation('/chat');
                }
            }
        } else if (!chatId && chats.length > 0 && currentChat) {
            // If we have a current chat but no chat ID in URL, update URL
            setLocation(`/chat/${currentChat._id}`);
        } else if (!chatId && !currentChat && chats.length > 0) {
            // If no current chat and no chat ID in URL, set the first chat
            setCurrentChat(chats[0]);
            setLocation(`/chat/${chats[0]._id}`);
        } else if (!chatId) {
            // If no chat ID in URL, clear current chat
            setCurrentChat(null);
        }
    }, [chatId, chats, currentChat, setLocation, setCurrentChat]);

    // Close sidebar on mobile when chat is selected
    useEffect(() => {
        if (window.innerWidth < 768 && chatId) {
            setSidebarOpen(false);
        }
    }, [chatId]);

    // Toggle sidebar visibility
    const toggleSidebar = () => {
        setSidebarOpen(prev => !prev);
    };

    return (
        <div className="fixed inset-0 flex flex-col h-screen w-screen overflow-hidden bg-gray-100">
            {/* Top app bar - fixed at top */}
            <header className="flex items-center bg-primary text-primary-foreground px-4 py-3 shadow-md z-30">
                <Button
                    variant="ghost"
                    size="icon"
                    className="mr-2 text-primary-foreground hover:bg-primary-foreground/10"
                    onClick={toggleSidebar}
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle menu</span>
                </Button>
                <h1 className="text-xl font-bold">LiveChat Connect</h1>
            </header>

            {/* Main content area with fixed height */}
            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar - fixed width and scrollable content */}
                <div
                    className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                        } md:translate-x-0 fixed md:relative top-16 bottom-0 left-0 w-80 bg-white border-r border-gray-200 z-20 transition-transform duration-200 ease-in-out`}
                >
                    <Sidebar onChatSelect={(chat) => setLocation(`/chat/${chat._id}`)} />
                </div>

                {/* Chat area - takes remaining space */}
                <div
                    className={`flex-1 transition-all duration-200 ease-in-out ${sidebarOpen ? 'md:ml-80' : 'ml-0'
                        }`}
                    style={{ height: 'calc(100vh - 3.5rem)' }}
                >
                    <ChatArea
                        onBackClick={() => setSidebarOpen(true)}
                        className="h-full"
                    />
                </div>
            </div>
        </div>
    );
} 