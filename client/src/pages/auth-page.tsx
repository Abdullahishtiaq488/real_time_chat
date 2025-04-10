import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, userLoginSchema } from "@shared/schema";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LockKeyhole, User, MessageSquare, Mail, Lock, UserCircle } from "lucide-react";

// Use userLoginSchema for login which only requires username and password
const loginSchema = userLoginSchema;

const registerSchema = insertUserSchema.extend({
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function AuthPage() {
  const [_, setLocation] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      displayName: "",
      password: "",
      confirmPassword: "",
    },
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  function onLoginSubmit(values: z.infer<typeof loginSchema>) {
    console.log("Login form submitted:", values);
    try {
      loginMutation.mutate(values);
    } catch (error) {
      console.error("Login mutation error:", error);
    }
  }

  function onRegisterSubmit(values: z.infer<typeof registerSchema>) {
    console.log("Register form submitted:", values);
    try {
      const { confirmPassword, ...userData } = values;
      registerMutation.mutate(userData);
    } catch (error) {
      console.error("Register mutation error:", error);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Left side branding */}
      <div className="hidden md:flex flex-col md:w-1/2 bg-gradient-to-br from-primary to-primary/70 text-white justify-center p-8">
        <div className="max-w-md mx-auto">
          <div className="flex items-center mb-6">
            <MessageSquare className="h-10 w-10 mr-3" />
            <h1 className="text-3xl font-bold">LiveChat Connect</h1>
          </div>
          <p className="text-xl mb-8 text-white/90">Connect with friends and colleagues in real-time with our simple and elegant chat platform.</p>

          <div className="space-y-6 mt-8">
            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded-full mr-4">
                <UserCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Simple & Intuitive</h3>
                <p className="text-white/80">Easy to use interface lets you focus on your conversations</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded-full mr-4">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Secure Messaging</h3>
                <p className="text-white/80">Your conversations are private and protected</p>
              </div>
            </div>

            <div className="flex items-start">
              <div className="bg-white/20 p-2 rounded-full mr-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Real-time Updates</h3>
                <p className="text-white/80">Instant message delivery with typing indicators</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side auth forms */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md shadow-lg border-0">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-2 md:hidden">
              <div className="bg-primary p-3 rounded-full">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to LiveChat</CardTitle>
          </CardHeader>

          <CardContent className="pt-4">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                <User size={16} />
                              </span>
                              <Input placeholder="Enter your username" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                <LockKeyhole size={16} />
                              </span>
                              <Input type="password" placeholder="Enter your password" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Signing in...
                        </>
                      ) : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
              
              <TabsContent value="register">
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                <User size={16} />
                              </span>
                              <Input placeholder="Choose a username" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="displayName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Display Name</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                <UserCircle size={16} />
                              </span>
                              <Input placeholder="Enter your display name" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                <LockKeyhole size={16} />
                              </span>
                              <Input type="password" placeholder="Create a password" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                                <LockKeyhole size={16} />
                              </span>
                              <Input type="password" placeholder="Confirm your password" className="pl-10" {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit"
                      className="w-full bg-primary hover:bg-primary/90"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? (
                        <>
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Creating account...
                        </>
                      ) : "Create account"}
                    </Button>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex justify-center border-t pt-4 text-xs text-gray-500">
            &copy; {new Date().getFullYear()} LiveChat Connect. All rights reserved.
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
