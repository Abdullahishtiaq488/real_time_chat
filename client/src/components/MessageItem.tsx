import { format } from "date-fns";
import { Message } from "@shared/schema";
import { CheckCheck, Image, FileIcon, Play } from "lucide-react";
import { useState, useEffect } from "react";

interface MessageItemProps {
  message: Message;
  isOwnMessage: boolean;
}

export default function MessageItem({ message, isOwnMessage }: MessageItemProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLongMessage, setIsLongMessage] = useState(false);

  useEffect(() => {
    // Check if message is longer than 100 characters
    setIsLongMessage(message.content.length > 100);
  }, [message.content]);

  const formatTime = (timestamp: string | Date | null) => {
    if (!timestamp) return "";
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return format(date, "h:mm a");
  };

  // Function to detect if content has image, video or file links
  const getContentType = () => {
    const content = message.content.toLowerCase();
    
    if (content.includes('.jpg') || content.includes('.png') || content.includes('.gif') || content.includes('image/')) {
      return 'image';
    } else if (content.includes('.mp4') || content.includes('.mov') || content.includes('.avi') || content.includes('video/')) {
      return 'video';
    } else if (content.includes('.pdf') || content.includes('.doc') || content.includes('.xls')) {
      return 'file';
    }
    
    return 'text';
  };

  // Get icon based on content type
  const getContentIcon = () => {
    const type = getContentType();
    
    if (type === 'image') {
      return <Image className="h-4 w-4 text-primary" />;
    } else if (type === 'video') {
      return <Play className="h-4 w-4 text-primary" />;
    } else if (type === 'file') {
      return <FileIcon className="h-4 w-4 text-primary" />;
    }
    
    return null;
  };

  // Get content type indicator
  const contentTypeIcon = getContentIcon();

  return (
    <div 
      className={`flex items-end ${isOwnMessage ? 'justify-end' : ''} mb-3 group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {!isOwnMessage && (
        <div className="relative mr-2 flex-shrink-0">
          {message.senderAvatar ? (
            <img 
              src={message.senderAvatar} 
              alt={`${message.senderName} avatar`} 
              className="h-8 w-8 rounded-full object-cover shadow-sm border border-gray-100"
            />
          ) : (
            <div className="h-8 w-8 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center uppercase text-gray-600 shadow-sm">
              {message.senderName?.charAt(0) || "?"}
            </div>
          )}
        </div>
      )}
      
      <div className={`max-w-xs md:max-w-md ${isOwnMessage ? 'text-right' : ''}`}>
        {!isOwnMessage && message.senderName && (
          <div className="ml-1 mb-1">
            <span className="text-xs font-medium text-gray-700">{message.senderName}</span>
          </div>
        )}
        
        <div 
          className={`relative ${
            isOwnMessage 
              ? 'bg-gradient-to-r from-primary/90 to-primary/70 text-white rounded-tl-2xl rounded-bl-2xl rounded-tr-sm rounded-br-2xl' 
              : 'bg-white text-gray-800 rounded-tr-2xl rounded-br-2xl rounded-tl-sm rounded-bl-2xl'
          } px-4 py-2 shadow-sm border border-gray-100`}
        >
          {contentTypeIcon && (
            <div className="absolute -top-3 -left-1 bg-white p-1 rounded-full shadow-sm border border-gray-200">
              {contentTypeIcon}
            </div>
          )}
          
          <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        </div>
        
        <div className={`flex items-center ${isOwnMessage ? 'justify-end' : 'justify-start'} space-x-1 mt-1 px-1`}>
          <span className="text-xs text-gray-500 opacity-70 group-hover:opacity-100">
            {formatTime(message.timestamp)}
          </span>
          {isOwnMessage && message.status && (
            <div className="flex items-center">
              <CheckCheck className={`h-3.5 w-3.5 ${
                message.status === 'read' ? 'text-blue-500' : 'text-gray-400'
              }`} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
