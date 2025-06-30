"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Lock, Activity, Shield, CheckCircle, Eye, EyeOff } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const router = useRouter();

  // Password strength calculator
  const calculatePasswordStrength = (pwd: string) => {
    let strength = 0;
    if (pwd.length >= 8) strength += 1;
    if (/[a-z]/.test(pwd)) strength += 1;
    if (/[A-Z]/.test(pwd)) strength += 1;
    if (/[0-9]/.test(pwd)) strength += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) strength += 1;
    return strength;
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    setPasswordStrength(calculatePasswordStrength(value));
  };

  const getStrengthColor = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return "from-red-500 to-red-600";
      case 2: return "from-orange-500 to-yellow-500";
      case 3: return "from-yellow-500 to-blue-500";
      case 4:
      case 5: return "from-green-500 to-emerald-500";
      default: return "from-gray-500 to-gray-600";
    }
  };

  const getStrengthText = () => {
    switch (passwordStrength) {
      case 0:
      case 1: return "Weak";
      case 2: return "Fair";
      case 3: return "Good";
      case 4:
      case 5: return "Strong";
      default: return "";
    }
  };

  const handleSubmit = async (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    if (passwordStrength < 3) {
      toast.error("Please choose a stronger password");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/users/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      setLoading(false);

      if (res.ok) {
        toast.success("Password updated successfully!");
        router.push("/login");
      } else {
        toast.error("Failed to update password. Please try again.");
      }
    } catch (error) {
      setLoading(false);
      toast.error("An error occurred. Please try again.");
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Enhanced 3D animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-blue-800/30 via-transparent to-cyan-800/20"></div>
        
        {/* 3D floating elements with enhanced animations */}
        <div className="absolute top-20 left-20 h-32 w-32 rounded-full bg-gradient-to-br from-blue-400 to-cyan-300 opacity-20 blur-xl animate-bounce shadow-2xl transform rotate-12 hover:scale-110 transition-transform duration-1000"></div>
        <div className="absolute bottom-32 right-20 h-48 w-48 rounded-full bg-gradient-to-br from-purple-400 to-pink-300 opacity-25 blur-2xl animate-pulse shadow-2xl transform -rotate-12 hover:rotate-0 transition-transform duration-1000"></div>
        <div className="absolute top-1/2 right-1/3 h-20 w-20 rounded-full bg-gradient-to-br from-cyan-400 to-blue-300 opacity-30 blur-lg animate-ping shadow-xl"></div>
        <div className="absolute bottom-1/3 left-1/4 h-28 w-28 rounded-full bg-gradient-to-br from-pink-400 to-purple-300 opacity-20 blur-xl animate-bounce shadow-2xl transform rotate-45 hover:rotate-90 transition-transform duration-1000"></div>
        <div className="absolute top-10 right-10 h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-teal-300 opacity-25 blur-lg animate-pulse shadow-xl transform -rotate-45"></div>
        
        {/* Animated particles */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/2 w-2 h-2 bg-white rounded-full opacity-60 animate-ping animation-delay-1000"></div>
          <div className="absolute top-3/4 left-1/4 w-1 h-1 bg-blue-300 rounded-full opacity-40 animate-pulse animation-delay-2000"></div>
          <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 bg-purple-300 rounded-full opacity-50 animate-bounce animation-delay-3000"></div>
        </div>
        
        {/* Animated grid pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="h-full w-full bg-gradient-to-br from-transparent via-white/5 to-transparent transform rotate-12 animate-pulse"></div>
        </div>
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Enhanced 3D NEXTRACK Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-4 group">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 shadow-2xl transform rotate-3 group-hover:rotate-6 transition-all duration-500 group-hover:scale-110">
              <div className="absolute inset-1 rounded-xl bg-gradient-to-br from-blue-400 via-purple-500 to-pink-400 opacity-60 group-hover:opacity-80 transition-opacity duration-300"></div>
              <Activity className="text-white relative z-10 drop-shadow-lg group-hover:scale-110 transition-transform duration-300" size={36} />
            </div>
            {/* Enhanced 3D shadow effect */}
            <div className="absolute top-2 left-2 w-20 h-20 rounded-2xl bg-black/20 blur-md -z-10 transform rotate-3 group-hover:blur-lg transition-all duration-500"></div>
            
            {/* Pulsing ring effect */}
            <div className="absolute inset-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 animate-ping"></div>
          </div>
          
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 tracking-wider drop-shadow-lg hover:scale-105 transition-transform duration-300 cursor-default">
            NEXTRACK
          </h1>
          <div className="h-1 w-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full mt-2 shadow-lg animate-pulse"></div>
        </div>

        {/* Enhanced 3D Card */}
        <Card className="backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl transform hover:scale-[1.02] transition-all duration-500 hover:shadow-purple-500/20">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 via-transparent to-white/5 pointer-events-none"></div>
          <div className="absolute -top-px left-20 right-20 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
          
          <CardHeader className="space-y-3 relative">
            <div className="flex items-center justify-center mb-2">
              <Shield className="text-green-400 mr-2 animate-pulse" size={24} />
            </div>
            <CardTitle className="text-center text-3xl font-bold text-white drop-shadow-lg">
              Reset Password
            </CardTitle>
            <CardDescription className="text-center text-gray-300 text-base">
              Create a new secure password for your account
            </CardDescription>
          </CardHeader>
          
          <CardContent className="relative">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password Field */}
              <div className="space-y-3">
                <Label htmlFor="password" className="text-gray-200 font-medium">New Password</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  </div>
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className="pl-12 pr-12 h-12 bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 rounded-xl backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-500/10 via-transparent to-purple-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-2 animate-fadeIn">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-400">Password Strength</span>
                      <span className={`text-xs font-medium ${passwordStrength >= 3 ? 'text-green-400' : passwordStrength >= 2 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {getStrengthText()}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full bg-gradient-to-r ${getStrengthColor()} rounded-full transition-all duration-500 ease-out`}
                        style={{ width: `${(passwordStrength / 5) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Confirm Password Field */}
              <div className="space-y-3">
                <Label htmlFor="confirmPassword" className="text-gray-200 font-medium">Confirm Password</Label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                    <Shield className="h-5 w-5 text-gray-400 group-focus-within:text-green-400 transition-colors" />
                  </div>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-12 pr-12 h-12 bg-white/5 border border-white/10 text-white placeholder-gray-500 focus:border-green-400 focus:ring-2 focus:ring-green-400/20 rounded-xl backdrop-blur-sm transition-all duration-300 hover:bg-white/10"
                    placeholder="Confirm new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-green-500/10 via-transparent to-emerald-500/10 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
                
                {/* Password Match Indicator */}
                {confirmPassword && (
                  <div className="flex items-center space-x-2 animate-fadeIn">
                    {password === confirmPassword ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        <span className="text-xs text-green-400">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-red-400"></div>
                        <span className="text-xs text-red-400">Passwords don&apos;t match</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              
              {/* Enhanced 3D Submit Button */}
              <Button 
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 hover:from-green-700 hover:via-blue-700 hover:to-purple-700 text-white font-semibold rounded-xl transition-all duration-300 transform hover:scale-105 hover:shadow-2xl hover:shadow-green-500/25 mt-8 relative overflow-hidden group" 
                disabled={loading || !password || !confirmPassword || password !== confirmPassword || passwordStrength < 3}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                {loading ? (
                  <div className="flex items-center justify-center relative z-10">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating Password...
                  </div>
                ) : (
                  <span className="relative z-10 flex items-center justify-center">
                    <Shield className="mr-2 h-4 w-4" />
                    Update Password
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
        
        {/* Enhanced footer */}
        <div className="text-center mt-8">
          <p className="text-gray-400 text-sm animate-pulse">
            🔐 Your security is our priority
          </p>
          <div className="flex items-center justify-center mt-2 space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-gray-500 text-xs">Encrypted Connection</span>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-3000 {
          animation-delay: 3s;
        }
      `}</style>
    </div>
  );
}