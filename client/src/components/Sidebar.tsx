import { useState } from "react";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  User as UserIcon,
  Settings,
  LogOut,
} from "lucide-react";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarProps {
  user: User | null;
  onLogout: () => void;
  className?: string;
}

export default function Sidebar({ user, onLogout, className = "" }: SidebarProps) {
  const [activeTab, setActiveTab] = useState("messages");

  return (
    <div className={`w-16 bg-gray-800 text-white flex flex-col flex-shrink-0 items-center py-4 ${className}`}>
      <div className="flex-1 flex flex-col space-y-4 items-center">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`h-10 w-10 ${activeTab === "messages" ? "bg-primary text-white" : "text-gray-400 hover:bg-gray-700"} rounded-md flex items-center justify-center`}
                onClick={() => setActiveTab("messages")}
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Messages</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`h-10 w-10 ${activeTab === "contacts" ? "bg-primary text-white" : "text-gray-400 hover:bg-gray-700"} rounded-md flex items-center justify-center`}
                onClick={() => setActiveTab("contacts")}
              >
                <UserIcon className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Contacts</p>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={`h-10 w-10 ${activeTab === "settings" ? "bg-primary text-white" : "text-gray-400 hover:bg-gray-700"} rounded-md flex items-center justify-center`}
                onClick={() => setActiveTab("settings")}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Settings</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              {user && (
                <div className="h-10 w-10 bg-primary/20 text-white rounded-full flex items-center justify-center uppercase">
                  {user.username.charAt(0)}
                </div>
              )}
              <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-gray-800"></span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start p-2">
              <div className="h-10 w-10 bg-primary/20 text-primary rounded-full flex items-center justify-center uppercase mr-2">
                {user?.username.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-medium">{user?.username}</p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
            <DropdownMenuItem 
              className="cursor-pointer text-red-600 focus:text-red-600"
              onClick={onLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
