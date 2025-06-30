// components/layout/SidebarNavItem.tsx
"use client";

import React, { useState, ReactNode, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronRight, ListTodo, Folder, FolderOpen } from "lucide-react";
import { cn } from "../../lib/utils";
import { motion, AnimatePresence } from "framer-motion";

export interface NavItem {
  title: string;
  path?: string;
  icon?: ReactNode;
  children?: NavItem[];
  backlogPath?: string;
}

interface SidebarNavItemProps {
  item: NavItem;
  level?: number;
  isCollapsed?: boolean;
}

export function SidebarNavItem({
  item,
  level = 0,
  isCollapsed = false,
}: SidebarNavItemProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isActive = pathname === item.path;
  const hasBacklog = item.backlogPath;

  // Check if current item or any nested child is active
  const isItemOrChildActive = (navItem: NavItem, currentPath: string): boolean => {
    if (currentPath === navItem.path || currentPath === navItem.backlogPath) {
      return true;
    }
    if (navItem.children) {
      return navItem.children.some(child => isItemOrChildActive(child, currentPath));
    }
    return false;
  };

  const isParentOfActive = hasChildren && isItemOrChildActive(item, pathname);

  // Auto-expand if any child is active
  useEffect(() => {
    if (isParentOfActive) {
      setOpen(true);
    }
  }, [isParentOfActive]);

  const toggleOpen = () => {
    setOpen(!open);
  };

  // Enhanced indent class function with better spacing
  const getIndentClass = (currentLevel: number) => {
    if (currentLevel === 0) return ""; // Top level items (Dashboard, CDS N2)
    if (currentLevel === 1) return "ml-6"; // Infra & Cloud, Network & Security
    if (currentLevel === 2) return "ml-12"; // Incident Management, Change Management
    if (currentLevel === 3) return "ml-16"; // Clarify Dashboard, ITSM Portal, etc.
    return `ml-${16 + (currentLevel - 3) * 4}`; // Any deeper levels
  };

  // Enhanced background gradient with level-specific styling
  const getBackgroundGradient = (currentLevel: number) => {
    if (currentLevel === 0) return "hover:bg-gradient-to-r hover:from-accent/70 hover:to-accent/50";
    if (currentLevel === 1) return "hover:bg-gradient-to-r hover:from-accent/50 hover:to-accent/30";
    if (currentLevel === 2) return "hover:bg-gradient-to-r hover:from-accent/40 hover:to-accent/20";
    return "hover:bg-gradient-to-r hover:from-accent/30 hover:to-accent/10";
  };

  // Enhanced padding based on level
  const getPaddingClass = (currentLevel: number) => {
    if (currentLevel === 0) return "py-3 px-4";
    if (currentLevel === 1) return "py-2.5 px-3";
    if (currentLevel === 2) return "py-2 px-3";
    return "py-1.5 px-3";
  };

  const linkVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -10 }
  };

  const chevronVariants = {
    closed: { rotate: 0, scale: 1 },
    open: { rotate: 90, scale: 1.1 }
  };

  const containerVariants = {
    closed: { 
      height: 0,
      opacity: 0,
      scale: 0.95
    },
    open: { 
      height: "auto",
      opacity: 1,
      scale: 1,
      transition: {
        height: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
        opacity: { duration: 0.3, delay: 0.1 },
        scale: { duration: 0.3, delay: 0.1 }
      }
    }
  };

  const itemVariants = {
    closed: { opacity: 0, y: -10, x: -20 },
    open: (i: number) => ({
      opacity: 1,
      y: 0,
      x: 0,
      transition: {
        duration: 0.3,
        delay: 0.2 + (i * 0.08),
        ease: [0.16, 1, 0.3, 1]
      }
    })
  };

  return (
    <div className={cn("relative", isCollapsed && level === 0 ? "w-full" : "")}>
      <div className="flex flex-col">
        <div 
          className="flex items-center group relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Animated background glow */}
          <motion.div
            className="absolute inset-0 rounded-lg bg-gradient-to-r from-primary/5 via-accent/10 to-primary/5 opacity-0"
            animate={{
              opacity: isHovered ? 1 : 0,
              scale: isHovered ? 1.02 : 1
            }}
            transition={{ duration: 0.3 }}
          />

          {item.path ? (
            <Link
              href={item.path}
              className={cn(
                "flex items-center gap-3 my-0.5 rounded-lg text-sm font-medium transition-all duration-300 relative z-10",
                "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5",
                "border border-transparent hover:border-border/50",
                getPaddingClass(level),
                getBackgroundGradient(level),
                (isActive || isParentOfActive) &&
                  "bg-gradient-to-r from-accent/80 to-accent/60 text-accent-foreground shadow-md",
                isActive && "bg-gradient-to-r from-primary/15 to-primary/10 text-primary hover:from-primary/20 hover:to-primary/15 border-primary/20",
                getIndentClass(level),
                isCollapsed && level === 0 && "justify-center p-3 mx-1",
                "flex-grow backdrop-blur-sm"
              )}
            >
              {/* Enhanced active indicator with glow */}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-primary via-primary/80 to-primary rounded-r-full shadow-lg shadow-primary/50"
                  initial={false}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              
              {/* Icon with enhanced animations */}
              {item.icon && (
                <motion.span
                  className={cn(
                    "shrink-0 transition-all duration-300 relative",
                    isCollapsed && level === 0 ? "text-lg" : level === 0 ? "text-base" : level === 1 ? "text-sm" : "text-xs",
                    isActive && "text-primary drop-shadow-sm",
                    "group-hover:scale-110 group-hover:rotate-3"
                  )}
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  transition={{ duration: 0.2 }}
                >
                  {item.icon}
                  {/* Icon glow effect */}
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 text-primary/30 blur-sm"
                      animate={{ opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {item.icon}
                    </motion.div>
                  )}
                </motion.span>
              )}
              
              {(!isCollapsed || level > 0) && (
                <motion.span
                  variants={linkVariants}
                  initial="initial"
                  animate="animate"
                  className={cn(
                    "truncate",
                    level === 0 ? "font-semibold" : level === 1 ? "font-medium" : "font-normal",
                    level > 1 ? "text-sm" : "text-sm"
                  )}
                >
                  {item.title}
                </motion.span>
              )}
            </Link>
          ) : (
            <button
              type="button"
              onClick={toggleOpen}
              className={cn(
                "flex w-full items-center justify-between gap-3 my-0.5 rounded-lg text-sm font-medium transition-all duration-300 relative z-10",
                "hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5",
                "border border-transparent hover:border-border/50",
                getPaddingClass(level),
                getBackgroundGradient(level),
                (isParentOfActive || open) && "bg-gradient-to-r from-accent/70 to-accent/50 text-accent-foreground shadow-md border-accent/30",
                getIndentClass(level),
                isCollapsed && level === 0 && "justify-center p-3 mx-1",
                "backdrop-blur-sm group"
              )}
            >
              {/* Enhanced parent active indicator */}
              {isParentOfActive && (
                <motion.div
                  layoutId="parentActiveIndicator"
                  className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/60 via-primary/40 to-primary/60 rounded-r-full"
                  initial={false}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
              
              <div className="flex items-center gap-3">
                {/* Enhanced folder icon that changes on open/close */}
                {item.icon && (
                  <motion.span
                    className={cn(
                      "shrink-0 transition-all duration-300 relative",
                      isCollapsed && level === 0 ? "text-lg" : level === 0 ? "text-base" : level === 1 ? "text-sm" : "text-xs",
                      isParentOfActive && "text-primary/80 drop-shadow-sm",
                      "group-hover:scale-110"
                    )}
                    whileHover={{ scale: 1.2 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Replace folder icons with animated versions */}
                    {item.title.toLowerCase().includes('folder') ? (
                      open ? <FolderOpen className="h-4 w-4" /> : <Folder className="h-4 w-4" />
                    ) : (
                      item.icon
                    )}
                  </motion.span>
                )}
                
                {(!isCollapsed || level > 0) && (
                  <motion.span
                    variants={linkVariants}
                    initial="initial"
                    animate="animate"
                    className={cn(
                      "truncate",
                      level === 0 ? "font-semibold" : level === 1 ? "font-medium" : "font-normal",
                      level > 1 ? "text-sm" : "text-sm"
                    )}
                  >
                    {item.title}
                  </motion.span>
                )}
              </div>
              
              {(!isCollapsed || level > 0) && (
                <motion.span
                  className="ml-auto p-1 rounded-md hover:bg-accent/50 transition-colors duration-200"
                  variants={chevronVariants}
                  animate={open ? "open" : "closed"}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  whileHover={{ scale: 1.2 }}
                >
                  <ChevronRight className={cn(
                    "h-4 w-4 transition-colors duration-200",
                    open ? "text-primary" : "text-muted-foreground"
                  )} />
                </motion.span>
              )}
            </button>
          )}
        </div>

        {/* Enhanced dropdown container with better structure and spacing */}
        {hasChildren && (
          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                variants={containerVariants}
                initial="closed"
                animate="open"
                exit="closed"
                className="overflow-hidden"
              >
                <div className={cn(
                  "relative",
                  // Enhanced visual hierarchy with connecting lines
                  level === 0 && "ml-3 border-l-2 border-gradient-to-b from-border/50 via-border/30 to-transparent",
                  level === 1 && "ml-4 border-l border-border/40",
                  level === 2 && "ml-2 border-l border-border/20"
                )}>
                  {/* Enhanced connecting line for nested items */}
                  <div className={cn(
                    "absolute top-0 bottom-0 w-px bg-gradient-to-b from-border/40 via-border/20 to-transparent",
                    level === 0 && "left-6",
                    level === 1 && "left-5",
                    level === 2 && "left-4"
                  )} />
                  
                  <motion.div 
                    className={cn(
                      "space-y-1 relative",
                      level === 0 ? "pt-2 pb-2" : "pt-1 pb-1"
                    )}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    {/* Enhanced dropdown header for ITSM-like items */}
                    {level === 1 && item.title.toLowerCase().includes('itsm') && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                        className="px-4 py-2 mx-2 mb-2 rounded-md bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/10"
                      >
                        <div className="text-xs font-semibold text-primary/80 uppercase tracking-wider">
                          Service Management
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          Incident & Change Management
                        </div>
                      </motion.div>
                    )}

                    {(item.children ?? []).map((child, index) => (
                      <motion.div
                        key={`${child.title}-${index}`}
                        custom={index}
                        variants={itemVariants}
                        initial="closed"
                        animate="open"
                        className="relative"
                      >
                        {/* Enhanced individual item connector */}
                        <div className={cn(
                          "absolute top-1/2 h-px bg-border/30",
                          level === 0 && "left-6 w-4",
                          level === 1 && "left-5 w-3",
                          level === 2 && "left-4 w-2"
                        )} />
                        
                        {/* Enhanced item wrapper with better hover effects and spacing */}
                        <div className={cn(
                          "relative transition-all duration-200",
                          level === 0 && "hover:ml-1",
                          level === 1 && "hover:ml-0.5",
                          level === 2 && "hover:ml-0.5"
                        )}>
                          <SidebarNavItem
                            item={child}
                            level={level + 1}
                            isCollapsed={isCollapsed}
                          />
                        </div>
                      </motion.div>
                    ))}
                    
                    {/* Enhanced visual separation */}
                    {level === 1 && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.4, delay: 0.3 }}
                        className="h-px bg-gradient-to-r from-transparent via-border/30 to-transparent mx-4 mt-4"
                      />
                    )}
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}