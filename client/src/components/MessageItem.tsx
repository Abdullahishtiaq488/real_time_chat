import { formatDistanceToNow } from "date-fns";
import { Message } from "@shared/schema";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { CheckCheck } from "lucide-react";

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
  showAvatar?: boolean;
  isLastInGroup?: boolean;
}

export default function MessageItem({
  message,
  isOwnMessage,
  showAvatar = true,
  isLastInGroup = true
}: MessageItemProps) {
  const isSystemMessage = message.type === "system";
  const formattedTime = formatMessageTime(message.createdAt);

  // System messages are centered and have a distinct style
  if (isSystemMessage) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-gray-100 bg-opacity-70 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm">
          <p className="text-xs text-gray-500 font-medium">{message.content}</p>
        </div>
      </div>
    );
  }

  // Calculate bubble classes based on ownership and position in group
  const bubbleClasses = cn(
    "py-2 px-3 max-w-[85%] break-words shadow-sm",
    {
      "bg-[#e7ffdb] text-gray-800 rounded-tl-lg rounded-bl-lg": isOwnMessage,
      "bg-white text-gray-800 rounded-tr-lg rounded-br-lg": !isOwnMessage,
      "rounded-br-lg": isOwnMessage && isLastInGroup,
      "rounded-bl-lg": !isOwnMessage && isLastInGroup,
      "rounded-tr-lg": isOwnMessage && !isLastInGroup,
      "rounded-tl-lg": !isOwnMessage && !isLastInGroup,
    }
  );

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-1`}>
      {!isOwnMessage && showAvatar ? (
        <div className="mr-1.5 pt-1">
          <Avatar className="h-8 w-8">
            {message.senderAvatar ? (
              <AvatarImage src={message.senderAvatar} alt={message.senderName || 'User'} />
            ) : (
              <AvatarFallback className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white text-xs">
                {message.senderName?.charAt(0) || 'U'}
              </AvatarFallback>
            )}
          </Avatar>
        </div>
      ) : !isOwnMessage ? (
        <div className="w-8 mr-1.5"></div>
      ) : null}

      <div className={bubbleClasses}>
        {!isOwnMessage && message.senderName && showAvatar && (
          <p className="text-xs font-medium text-indigo-600 mb-1">
            {message.senderName}
          </p>
        )}

        <div className="relative">
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>

          <div className={`flex items-center text-[10px] text-gray-500 ${isOwnMessage ? 'justify-end' : 'justify-start'} mt-1 gap-1`}>
            <span>{formattedTime}</span>
          {isOwnMessage && (
              <CheckCheck className="h-3 w-3 text-blue-500" />
            )}
            </div>
        </div>
      </div>
    </div>
  );
}

function formatMessageTime(timestamp: Date | string | undefined): string {
  if (!timestamp) return "";

  try {
    const date = new Date(timestamp);
    // Use hours and minutes in 12-hour format with AM/PM
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch (error) {
    console.error("Error formatting message time:", error);
    return "";
  }
}
