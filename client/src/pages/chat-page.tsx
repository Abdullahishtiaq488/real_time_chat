import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useSocket } from "@/context/SocketContext";
import { useAuth } from "@/context/AuthContext";
import ChatArea from "@/components/ChatArea";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import {
  Menu,
  Search,
  LogOut,
  Settings,
  UserPlus,
  MessageSquare,
  User,
  X
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function ChatPage() {
  const [, params] = useRoute("/chat/:id");
  const [location, navigate] = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { selectChat, currentChat, isConnected } = useSocket();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Check if we're on mobile
  const [isMobile, setIsMobile] = useState(false);

  // Handle window resize
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };

    checkIfMobile();
    window.addEventListener("resize", checkIfMobile);

    return () => {
      window.removeEventListener("resize", checkIfMobile);
    };
  }, []);

  // Select chat from URL
  useEffect(() => {
    if (params?.id && params.id !== "new" && params.id !== "add-user") {
      try {
        // Clean up any non-alphanumeric characters
        const chatId = params.id.replace(/[^a-zA-Z0-9]/g, "");
        if (chatId && selectChat) {
          selectChat(chatId);
        }
      } catch (error) {
        console.error("Error selecting chat:", error);
      }
    }
  }, [params?.id, selectChat]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = "/auth";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex flex-col h-screen bg-[#eae6df]">
      {/* Background pattern */}
      <div
        className="absolute inset-0 opacity-5 z-0"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23000000' fill-opacity='0.2' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '300px',
        }}
      />

      {/* Mobile Header (visible only on mobile) */}
      {isMobile && (
        <div className="flex items-center justify-between p-3 bg-[#008069] text-white z-10 md:hidden">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="icon"
              className="text-white mr-2 hover:bg-white/10"
              onClick={toggleSidebar}
            >
              {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <h1 className="text-lg font-medium">LiveChat Connect</h1>
          </div>

          {!isSidebarOpen && currentChat && (
            <div className="text-sm truncate max-w-[150px]">
              {currentChat.name}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative z-10">
        {/* Sidebar */}
        <div
          className={`transition-all duration-300 ${isSidebarOpen
            ? 'w-full md:w-[380px] md:max-w-[380px]'
            : 'w-0 max-w-0'
            } h-full overflow-hidden shadow-lg`}
        >
          <Sidebar
            className="h-full"
            isMobile={isMobile}
            onClose={() => setIsSidebarOpen(false)}
          />
        </div>

        {/* Main Content */}
        <div
          className={`flex-1 transition-all duration-300 ${isMobile && isSidebarOpen ? 'hidden' : 'flex flex-col'
            }`}
        >
          <ChatArea
            onBackClick={isMobile ? () => setIsSidebarOpen(true) : undefined}
          />
        </div>
      </div>
    </div>
  );
}
