import { createContext, useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { userLoginSchema } from "@shared/schema";
import {
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { InsertUser, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: {
    _id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
    status?: string;
    token: string;
  } | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (username: string, password: string, displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<AuthContextType["user"]>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [location] = useLocation();

  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      // Validate token with server
      fetch("/api/auth/validate", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error("Invalid token");
        })
        .then((data) => {
          setUser({ ...data, token });
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.removeItem("token");
          setUser(null);
          setIsAuthenticated(false);
        });
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Login failed");
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      setUser({ ...data.user, token: data.token });
      setIsAuthenticated(true);
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("token");
      setUser(null);
      setIsAuthenticated(false);
      queryClient.clear();
    }
  };

  const register = async (username: string, password: string, displayName: string) => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, displayName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Registration failed");
      }

      const data = await response.json();
      localStorage.setItem("token", data.token);
      setUser({ ...data.user, token: data.token });
      setIsAuthenticated(true);
      queryClient.invalidateQueries();
    } catch (error) {
      console.error("Registration error:", error);
      throw error;
    }
  };

  const value = {
    user,
    isAuthenticated,
    login,
    logout,
    register,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
