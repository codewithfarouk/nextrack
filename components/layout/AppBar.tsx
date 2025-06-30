"use client";

import { useState, useEffect } from "react";
import { Menu, Bell, Sun, Moon, Search, User, ChevronDown, Activity, BarChart3, Settings, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { useSession } from "next-auth/react";
import React from "react";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuGroup
} from "../ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Badge } from "../ui/badge";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface AppBarProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
}

export function AppBar({ toggleSidebar, isSidebarOpen }: AppBarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [notifications, setNotifications] = useState(3);
  const { data: session } = useSession();
  const [searchFocused, setSearchFocused] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const userInitials = React.useMemo(() => {
    if (!session?.user?.name) return "U";
    return session.user.name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  }, [session?.user?.name]);

  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled 
          ? "bg-background/95 backdrop-blur-md border-b shadow-sm" 
          : "bg-background"
      )}
      role="banner"
    >
      <div className="flex h-16 items-center px-4 md:px-6 gap-4">
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 text-foreground/70 hover:text-primary transition-colors"
            onClick={toggleSidebar}
            aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </motion.div>
        
        <Link href="/dashboard" className="flex items-center mr-8">
          <div className="flex items-center gap-2 font-bold">
            <div className="relative">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 260, 
                  damping: 20,
                  delay: 0.1
                }}
                className="flex items-center justify-center w-8 h-8 rounded-md bg-gradient-to-br from-blue-600 to-indigo-700"
              >
                <Activity className="h-5 w-5 text-white" />
              </motion.div>
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 }}
                className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-500" 
              />
            </div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="hidden md:block"
            >
              <span className="text-xl tracking-tight bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent font-extrabold">
                NEXTRACK
              </span>
            </motion.div>
          </div>
        </Link>

        <motion.div 
          className={cn(
            "relative md:flex hidden items-center rounded-full transition-all duration-300",
            searchFocused ? "w-96 bg-accent" : "w-64 bg-accent/50 hover:bg-accent"
          )}
          layout
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search anything..."
            className="w-full pl-10 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            aria-label="Search"
          />
        </motion.div>

        <div className="ml-auto flex items-center gap-4">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                  <Bell className="h-5 w-5" />
                  {notifications > 0 && (
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-0.5 -right-0.5 flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold"
                    >
                      {notifications}
                    </motion.div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  <Badge variant="outline" className="ml-auto">
                    {notifications} new
                  </Badge>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem className="flex flex-col items-start p-4 cursor-pointer">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                      <span>New update available</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        2m ago
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-4">
                      A new software update is available for download.
                    </p>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start p-4 cursor-pointer">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      <span>Task completed</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        1h ago
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-4">
                      Your task Database migration has been completed.
                    </p>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex flex-col items-start p-4 cursor-pointer">
                    <div className="flex items-center gap-2 font-medium text-sm">
                      <span className="h-2 w-2 rounded-full bg-yellow-500" />
                      <span>Server warning</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        3h ago
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-4">
                      High CPU usage detected on server N2-CL5.
                    </p>
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex justify-center text-primary">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </motion.div>
          
          {mounted && (
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Toggle theme">
                    {theme === "dark" ? (
                      <Moon className="h-5 w-5" />
                    ) : (
                      <Sun className="h-5 w-5" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => setTheme("light")}
                    className="flex items-center gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    <span>Light</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTheme("dark")}
                    className="flex items-center gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    <span>Dark</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setTheme("system")}
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    <span>System</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </motion.div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="cursor-pointer"
              >
                <Button variant="ghost" className="flex items-center gap-2 pl-2 pr-3" aria-label="User menu">
                  <Avatar className="h-8 w-8 border-2 border-primary/20">
                    <AvatarImage src={session?.user?.image || ''} alt="User avatar" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-700 text-white">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="font-medium text-sm leading-none">
                      {session?.user?.name || 'User'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {session?.user?.role || 'User'}
                    </span>
                  </div>
                  <ChevronDown className="hidden md:block h-4 w-4 opacity-50" />
                </Button>
              </motion.div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{getTimeOfDay()}</p>
                  <p className="text-xs text-muted-foreground">
                    {session?.user?.email || 'user@example.com'}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem 
                  onClick={() => router.push("/dashboard/profile")}
                  className="flex items-center gap-2 font-semibold text-primary"
                >
                  <User className="h-4 w-4" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push("/dashboard")}
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push("/dashboard/settings")}
                  className="flex items-center gap-2"
                >
                  <Settings className="h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => router.push("/api/auth/signout")}
                className="flex items-center gap-2 text-red-500 focus:text-red-500"
              >
                <LogOut className="h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </motion.header>
  );
}