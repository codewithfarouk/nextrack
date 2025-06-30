"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Cloud, 
  Server, 
  FileText, 
  Settings, 
  Users, 
  HelpCircle,
  LogOut,
  ChevronLeft,
  BarChart3,
  Layers,
  Database,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { cn } from "../../lib/utils";
import { Button } from "../../components/ui/button";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Separator } from "../../components/ui/separator";
import { SidebarNavItem, NavItem } from "./SidebarNavItem";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import React from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: session } = useSession();

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Sidebar width configuration
  const EXPANDED_WIDTH = 320; // Increased from 256px to 320px
  const COLLAPSED_WIDTH = 80; // Increased from 70px to 80px

 const mainNavItems: NavItem[] = [
  {
    title: "Tableau de bord",
    path: "/dashboard",
    icon: <Home className="w-5 h-5" />,
  },
  {
    title: "CDS N2",
    icon: <Server className="w-5 h-5" />,
    children: [
      {
        title: "Infra & Cloud",
        icon: <Cloud className="w-5 h-5" />,
        children: [
          {
            title: "Gestion des incidents",
            icon: <AlertTriangle className="w-4 h-4" />,
            children: [
              {
                title: "Tableau Clarify",
                path: "/dashboard/n2/cloud/clarify",
                icon: <FileText className="w-4 h-4" />,
                backlogPath: "/dashboard/n2/cloud/incident/clarify/backlogs",
              },
              {
                title: "Portail ITSM",
                path: "/dashboard/n2/cloud/itsm/incident",
                icon: <BarChart3 className="w-4 h-4" />,
                backlogPath: "/dashboard/n2/cloud/incident/itsm/backlogs",
              },
            ],
          },
          {
            title: "Gestion des changements",
            icon: <RefreshCw className="w-4 h-4" />,
            children: [
              {
                title: "Requêtes JSD",
                path: "/dashboard/n2/cloud/jsd",
                icon: <Database className="w-4 h-4" />,
                backlogPath: "/dashboard/n2/cloud/changement/jsd/backlogs",
              },
              {
                title: "Changements ITSM",
                path: "/dashboard/n2/cloud/itsm/changement",
                icon: <BarChart3 className="w-4 h-4" />,
                backlogPath: "/dashboard/n2/cloud/changement/itsm/backlogs",
              },
            ],
          },
        ],
      },
      {
        title: "Réseau & Sécurité",
        icon: <Layers className="w-5 h-5" />,
        children: [
          {
            title: "Gestion des incidents",
            icon: <AlertTriangle className="w-4 h-4" />,
            children: [
              {
                title: "Tableau Clarify",
                path: "/dashboard/n2/ces/clarify",
                icon: <FileText className="w-4 h-4" />,
                backlogPath: "/dashboard/n2/ces/incident/clarify/backlogs",
              },
              {
                title: "Portail ITSM",
                path: "/dashboard/n2/ces/itsm/incident",
                icon: <BarChart3 className="w-4 h-4" />,
                backlogPath: "/dashboard/n2/ces/incident/itsm/backlogs",
              },
            ],
          },
          {
            title: "Gestion des changements",
            icon: <RefreshCw className="w-4 h-4" />,
            children: [
              {
                title: "Changements ITSM",
                path: "/dashboard/n2/ces/itsm/changement",
                icon: <BarChart3 className="w-4 h-4" />,
                backlogPath: "/dashboard/n2/ces/changement/itsm/backlogs",
              },
            ],
          },
        ],
      },
    ],
  },
];


  const utilityNavItems: NavItem[] = [
    ...(session?.user.role === "SUPERADMIN"
      ? [
          {
            title: "Users",
            path: "/dashboard/users",
            icon: <Users className="h-5 w-5" />,
          },
          {
            title: "Settings",
            path: "/dashboard/settings",
            icon: <Settings className="h-5 w-5" />,
          },
        ]
      : []),
    {
      title: "Help",
      path: "/dashboard/help",
      icon: <HelpCircle className="h-5 w-5" />,
    },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{
        width: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        x: isOpen ? 0 : -EXPANDED_WIDTH, // Use expanded width for proper slide animation
      }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className={cn(
        "fixed top-0 left-0 z-40 h-full pt-16 overflow-hidden",
        "bg-gradient-to-b from-card/90 via-card/95 to-card/90 backdrop-blur-xl",
        "border-r border-border/20 shadow-2xl",
        "text-foreground/90"
      )}
      style={{
        // Ensure minimum width is respected
        minWidth: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH,
        maxWidth: isCollapsed ? COLLAPSED_WIDTH : EXPANDED_WIDTH
      }}
    >
      <div className="flex h-full flex-col">
        <motion.div
          className="flex items-center justify-between p-4 border-b border-border/20"
          animate={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {!isCollapsed && (
            <Link
              href="/dashboard"
              className="flex items-center gap-3 font-semibold text-foreground/90 hover:text-primary transition-colors duration-300"
            >
              <motion.div
                className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
                <Server className="h-5 w-5 text-primary" />
              </motion.div>
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-sm font-semibold tracking-tight"
              >
                Enterprise Portal
              </motion.span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "ml-auto h-9 w-9 rounded-full hover:bg-accent/30 hover:shadow-md transition-all duration-300",
              isCollapsed && "mx-auto"
            )}
            onClick={toggleCollapsed}
          >
            <motion.div
              animate={{ rotate: isCollapsed ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              <ChevronLeft className="h-5 w-5 text-foreground/70" />
            </motion.div>
          </Button>
        </motion.div>
        
        <ScrollArea className="flex-1 px-3"> {/* Increased padding from px-2 to px-3 */}
          <motion.div
            className="py-4 space-y-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <div className="space-y-0.5">
              {mainNavItems.map((item, i) => (
                <SidebarNavItem
                  key={i}
                  item={item}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
            
            <motion.div
              className="px-2 py-3"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Separator className="bg-gradient-to-r from-transparent via-border/30 to-transparent h-px" />
            </motion.div>
            
            <div className="space-y-0.5">
              {utilityNavItems.map((item, i) => (
                <SidebarNavItem
                  key={i}
                  item={item}
                  isCollapsed={isCollapsed}
                />
              ))}
            </div>
          </motion.div>
        </ScrollArea>
        
        <motion.div
          className="mt-auto p-4 border-t border-border/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
        >
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-11 text-sm font-medium rounded-lg",
              "hover:bg-destructive/20 hover:text-destructive hover:shadow-md transition-all duration-300",
              isCollapsed && "justify-center px-2"
            )}
            onClick={() => window.location.href = "/api/auth/signout"}
          >
            <motion.div
              whileHover={{ scale: 1.2, rotate: 5 }}
              transition={{ duration: 0.2 }}
            >
              <LogOut className="h-5 w-5" />
            </motion.div>
            {!isCollapsed && (
              <motion.span
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                Log out
              </motion.span>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.aside>
  );
}