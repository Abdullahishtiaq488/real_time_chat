import { useEffect, useState } from "react";
import { useParams } from "wouter";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import ChatList from "@/components/ChatList";
import ChatArea from "@/components/ChatArea";
import { Separator } from "@/components/ui/separator";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ChatPage() {
  const params = useParams<{ id?: string }>();
  const { chats, setCurrentChat, currentChat } = useSocket();
  const { user, logoutMutation } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Set current chat based on URL param
  useEffect(() => {
    if (params.id && chats.length > 0) {
      const chat = chats.find(c => c._id === params.id);
      if (chat) {
        setCurrentChat(chat);
      }
    } else if (chats.length > 0 && !currentChat) {
      // Select first chat if none is selected
      setCurrentChat(chats[0]);
    }
  }, [params.id, chats, setCurrentChat, currentChat]);

  // If viewing a chat on mobile, show the chat view
  useEffect(() => {
    if (params.id) {
      setMobileChatOpen(true);
    }
  }, [params.id]);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Sidebar - Always visible on desktop, collapsible on mobile */}
      <Sidebar 
        user={user}
        onLogout={() => logoutMutation.mutate()}
        className={`${mobileMenuOpen ? 'block' : 'hidden'} md:block`}
      />

      {/* Chat list - Always visible on desktop, hidden when viewing a chat on mobile */}
      <ChatList 
        chats={chats}
        currentChat={currentChat}
        className={`${mobileChatOpen ? 'hidden' : 'block'} md:block`}
      />

      {/* Chat area - Always visible on desktop, only visible when viewing a chat on mobile */}
      <ChatArea 
        className={`${mobileChatOpen ? 'block' : 'hidden'} md:block`}
        onBackClick={() => setMobileChatOpen(false)}
      />

      {/* Mobile navigation bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 md:hidden">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={toggleMobileMenu}
          className={mobileMenuOpen ? "text-primary" : "text-gray-500"}
        >
          <Menu className="h-6 w-6" />
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => {
            setMobileChatOpen(false);
            setMobileMenuOpen(false);
          }}
          className={!mobileChatOpen ? "text-primary" : "text-gray-500"}
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </Button>
        
        <Button 
          variant="ghost" 
          size="icon"
          className="text-gray-500"
        >
          <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </Button>
        
        <div className="relative">
          <Button 
            variant="ghost" 
            size="icon"
            className="relative"
          >
            {user?.username && (
              <div className="h-8 w-8 bg-primary/20 text-primary rounded-full flex items-center justify-center">
                {user.username.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-white"></span>
          </Button>
        </div>
      </div>
    </div>
  );
}
