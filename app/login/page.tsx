"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User, Lock, Activity } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    setLoading(true);

    const result = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    setLoading(false);

    if (result?.error) {
      toast.error("Invalid credentials");
    } else {
      router.push("/dashboard/globale");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Enhanced 3D animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-blue-800/30 via-transparent to-cyan-800/20"></div>
        
        {/* 3D floating elements */}
        <div className="absolute top-20 left-20 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 opacity-20 blur-xl animate-bounce shadow-2xl transform rotate-12"></div>
        <div className="absolute bottom-32 right-20 h-48 w-48 rounded-full bg-gradient-to-br from-purple-400 to-pink-300 opacity-25 blur-2xl animate-pulse shadow-2xl transform -rotate-12"></div>
        <div className="absolute top-1/2 right-1/3 h-20 w-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-300 opacity-30 blur-lg animate-ping shadow-xl"></div>
        <div className="absolute bottom-1/3 left-1/4 h-28 w-28 rounded-full bg-gradient-to-br from-pink-400 to-purple-300 opacity-20 blur-xl animate-bounce shadow-2xl transform rotate-45"></div>
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full bg-gradient-to-br from-transparent via-white/5 to-transparent transform rotate-12 animate-pulse"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* 3D NEXTRACK Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 shadow-2xl transform rotate-3 hover:rotate-6 transition-transform duration-300">
              <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-blue-400 via-purple-500 to-pink-400 opacity-60"></div>
              <Activity className="text-white relative z-10 drop-shadow-lg" size={36} />
            </div>
            {/* 3D shadow effect */}
            <div className="absolute top-2 left-2 w-20 h-20 rounded-2xl bg-black/20 blur-md -z-10 transform rotate-3"></div>
          </div>
          
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 tracking-wider drop-shadow-lg">
            NEXTRACK
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full mt-2 shadow-lg"></div>
        </div>

        {/* Enhanced 3D Card */}
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl transform hover:scale-105 transition-all duration-300">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none"></div>
          <div className="absolute -top-px left-20 right-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <CardHeader className="space-y-3 relative">
            <CardTitle className="text-center text-3xl font-bold text-white drop-shadow-lg">
              Welcome Back
            </CardTitle>
            <CardDescription className="text-center text-gray-300 text-base">
              Access your enterprise dashboard
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email Field */}
              <div className="space-y-3">
                <Label htmlFor="email" className="text-gray-200 font-medium">Email Address</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 h-12 bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-xl backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
                    placeholder="your@email.com"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
              </div>
              
              {/* Password Field */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-gray-200 font-medium">Password</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-purple-400 transition-colors" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 h-12 bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/20 rounded-xl backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
                    placeholder="Enter your password"
                    required
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
              </div>
              
              {/* Enhanced 3D Submit Button */}
              <Button 
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25 mt-8 relative overflow-hidden group" 
                disabled={loading}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                {loading ? (
                  <div className="flex items-center justify-center relative z-10">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Signing you in...
                  </div>
                ) : (
                  <span className="relative z-10 flex items-center justify-center">
                    <Activity className="mr-2 h-4 w-4" />
                    Access Dashboard
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Subtle footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm">
            Secure • Reliable • Enterprise-Grade
          </p>
        </div>
      </div>
    </div>
  );
}