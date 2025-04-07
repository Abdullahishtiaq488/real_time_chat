import { useEffect } from "react";
import { useLocation } from "wouter";

export default function HomePage() {
  const [_, setLocation] = useLocation();
  
  // Redirect to chat on home page
  useEffect(() => {
    setLocation("/chat");
  }, [setLocation]);
  
  return <div>Redirecting to chat...</div>;
}
