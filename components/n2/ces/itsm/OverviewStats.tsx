"use client";

import { AlertCircle, CheckCircle2, Clock, TrendingUp, Activity } from "lucide-react";
import React, { useState, useEffect, useMemo } from "react";

interface ITSMTicket {
  id: string;
  type: "CRQ" | "INC";
  priority: "P1" | "P2" | "P3";
  status: string;
  createdAt: Date;
  lastUpdatedAt: Date;
  assignee: string;
  company: string;
}

interface OverviewStatsProps {
  filteredTickets: ITSMTicket[];
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  gradient: string;
  delay: number;
  trend?: number;
  subtitle: string;
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  gradient, 
  delay, 
  trend,
  subtitle 
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
      // Animate counter
      const duration = 1000;
      const steps = 30;
      const increment = value / steps;
      let current = 0;
      
      const counter = setInterval(() => {
        current += increment;
        if (current >= value) {
          setDisplayValue(value);
          clearInterval(counter);
        } else {
          setDisplayValue(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(counter);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div 
      className={`group relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 transition-all duration-500 hover:scale-105 hover:shadow-2xl ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Animated background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />
      
      {/* Glowing border effect */}
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500 group-hover:scale-110`} />
      
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3`}>
            <div className="text-white">
              {icon}
            </div>
          </div>
          
          {trend !== undefined && (
            <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
              trend > 0 
                ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' 
                : trend < 0 
                  ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}>
              <TrendingUp className={`w-3 h-3 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            {title}
          </h3>
          
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              {displayValue.toLocaleString()}
            </span>
            <div className="flex items-center">
              <Activity className="w-4 h-4 text-green-500 animate-pulse" />
            </div>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {subtitle}
          </p>
        </div>
        
        {/* Animated progress bar */}
        <div className="mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div 
            className={`h-full bg-gradient-to-r ${gradient} transition-all duration-1000 ease-out ${
              isVisible ? 'w-full' : 'w-0'
            }`}
            style={{ transitionDelay: `${delay + 500}ms` }}
          />
        </div>
      </div>
      
      {/* Shine effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
      </div>
    </div>
  );
};

export const OverviewStats: React.FC<OverviewStatsProps> = ({
  filteredTickets,
}) => {
  // Memoize calculations for better performance
  const stats = useMemo(() => {
    const validTickets = filteredTickets.filter(
      (ticket) => ticket.id.startsWith("CRQ") || ticket.id.startsWith("INC")
    );

    const totalTickets = validTickets.length;
    const changeRequests = validTickets.filter((t) => t.type === "CRQ").length;
    const incidents = validTickets.filter((t) => t.type === "INC").length;
    const highPriority = validTickets.filter((t) => t.priority === "P1").length;

    // Calculate trends (mock data - replace with actual historical data)
    const trends = {
      total: Math.floor(Math.random() * 20) - 10,
      changes: Math.floor(Math.random() * 15) - 5,
      incidents: Math.floor(Math.random() * 10) - 8,
      priority: Math.floor(Math.random() * 25) - 15,
    };

    return {
      totalTickets,
      changeRequests,
      incidents,
      highPriority,
      trends,
    };
  }, [filteredTickets]);

  const cardConfigs = [
    {
      title: "Total Tickets",
      value: stats.totalTickets,
      icon: <AlertCircle className="h-6 w-6" />,
      gradient: "from-blue-500 to-purple-600",
      trend: stats.trends.total,
      subtitle: "All active tickets",
      delay: 0,
    },
    {
      title: "Change Requests",
      value: stats.changeRequests,
      icon: <CheckCircle2 className="h-6 w-6" />,
      gradient: "from-green-500 to-emerald-600",
      trend: stats.trends.changes,
      subtitle: "Pending changes",
      delay: 100,
    },
    {
      title: "Incidents",
      value: stats.incidents,
      icon: <Clock className="h-6 w-6" />,
      gradient: "from-orange-500 to-red-500",
      trend: stats.trends.incidents,
      subtitle: "Active incidents",
      delay: 200,
    },
    {
      title: "High Priority",
      value: stats.highPriority,
      icon: <AlertCircle className="h-6 w-6" />,
      gradient: "from-red-500 to-pink-600",
      trend: stats.trends.priority,
      subtitle: "P1 critical tickets",
      delay: 300,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with animated text */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
          <Activity className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            ITSM Overview
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Real-time ticket metrics and analytics
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {cardConfigs.map((config, index) => (
          <StatCard key={config.title} {...config} />
        ))}
      </div>

      {/* Additional animated elements */}
      <div className="flex items-center justify-center mt-8">
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-full">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
};