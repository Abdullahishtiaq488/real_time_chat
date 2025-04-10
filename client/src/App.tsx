import { useEffect } from "react";
import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Pages
import AuthPage from "@/pages/auth-page";
import ChatPage from "@/pages/chat-page";
import AddUserPage from "@/pages/add-user-page";
import HomePage from "@/pages/home-page";
import NotFound from "@/pages/not-found";

// Providers
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SocketProvider } from "@/context/SocketContext";

// Protected route wrapper
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoading } = useAuth();

  // If authentication is still loading, show nothing or a spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  // If authenticated, render the protected route
  return <>{children}</>;
};

// App layout with providers
function AppLayout() {
  const { user } = useAuth();

  // Document title based on authentication
  useEffect(() => {
    document.title = user ? "LiveChat Connect" : "Login - LiveChat Connect";
  }, [user]);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-background">
      <SocketProvider>
        <Switch>
          {/* Public routes */}
          <Route path="/auth" component={AuthPage} />

          {/* Protected routes - more specific routes first */}
          <Route path="/chat/add-user/:chatId">
            <ProtectedRoute>
              <AddUserPage />
            </ProtectedRoute>
          </Route>
          <Route path="/chat/:id">
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          </Route>
          <Route path="/chat">
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          </Route>
          <Route path="/">
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          </Route>

          {/* 404 - Not Found */}
          <Route component={NotFound} />
        </Switch>
        <Toaster />
      </SocketProvider>
    </div>
  );
}

// Main app component with providers
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <AppLayout />
      </AuthProvider>
    </QueryClientProvider>
  );
}
