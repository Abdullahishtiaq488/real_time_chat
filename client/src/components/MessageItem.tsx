import { format } from "date-fns";
import { Message } from "@shared/schema";
import { CheckCheck } from "lucide-react";

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const formatTime = (timestamp: string | Date) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return format(date, "h:mm a");
  };

  return (
    <div className={`flex items-end ${isOwnMessage ? 'justify-end' : ''}`}>
      {!isOwnMessage && (
        <div className="relative mr-2">
          {message.senderAvatar ? (
            <img 
              src={message.senderAvatar} 
              alt={`${message.senderName} avatar`} 
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 bg-gray-200 rounded-full flex items-center justify-center uppercase text-gray-600">
              {message.senderName?.charAt(0) || "?"}
            </div>
          )}
        </div>
      )}
      
      <div className={`max-w-xs md:max-w-md ${isOwnMessage ? 'text-right' : ''}`}>
        <div className={`${
          isOwnMessage 
            ? 'bg-primary/10 text-gray-900 rounded-t-lg rounded-l-lg' 
            : 'bg-white rounded-t-lg rounded-r-lg'
        } px-4 py-2 shadow-sm`}>
          <p className="text-sm">{message.content}</p>
        </div>
        
        <div className={`flex items-center ${isOwnMessage ? 'justify-end' : 'justify-start'} space-x-1 mt-1`}>
          <span className="text-xs text-gray-500">{formatTime(message.timestamp)}</span>
          {isOwnMessage && message.status && (
            <CheckCheck className={`h-3 w-3 ${
              message.status === 'read' ? 'text-blue-500' : 'text-gray-400'
            }`} />
          )}
        </div>
      </div>
    </div>
  );
}
