"use client";

import React, { useState, useEffect, useMemo } from "react";
import { AlertTriangle, CheckCircle2, Timer, Activity, TrendingUp } from "lucide-react";

interface ClarifyTicket {
  id: string;
  status: string;
  severity: string;
  priority: string;
  createdAt: Date;
  incidentStartDate: Date;
  closedAt: Date | null;
  lastUpdatedAt: Date;
  owner: string;
  region: string;
  company: string;
  city: string;
}

interface OverviewStatsProps {
  filteredTickets: ClarifyTicket[];
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

// Reusable StatCard component with animations
const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  gradient,
  delay,
  trend,
  subtitle,
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
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
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Background gradient and glow effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div
        className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-20 blur-xl transition-all duration-500 group-hover:scale-110`}
      />
      <div className="relative p-6">
        <div className="flex items-center justify-between mb-4">
          <div
            className={`p-3 rounded-xl bg-gradient-to-br ${gradient} shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-3`}
          >
            <div className="text-white">{icon}</div>
          </div>
          {trend !== undefined && (
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                trend > 0
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : trend < 0
                    ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              <TrendingUp className={`w-3 h-3 ${trend < 0 ? "rotate-180" : ""}`} />
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
            <Activity className="w-4 h-4 text-green-500 animate-pulse" />
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
        </div>
        {/* Progress bar */}
        <div className="mt-4 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${gradient} transition-all duration-1000 ease-out ${
              isVisible ? "w-full" : "w-0"
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
  // Memoized calculations for performance
  const stats = useMemo(() => {
    // Total tickets
    const totalTickets = filteredTickets.length;

    // Resolved tickets (status: "Fermé")
    const resolvedTickets = filteredTickets.filter((t) => t.status === "Fermé").length;

    // Critical cases (severity: "1")
    const criticalCases = filteredTickets.filter((t) => t.severity === "1").length;

    // Overdue tickets (>24 hours open)
    const overdueTickets = filteredTickets.filter((t) => {
      const currentTime = new Date().getTime();
      const twentyFourHoursInMs = 24 * 60 * 60 * 1000;
      return (
        !isNaN(t.createdAt.getTime()) &&
        currentTime - t.createdAt.getTime() > twentyFourHoursInMs
      );
    }).length;

    // Mock trend data (replace with historical data in production)
    const trends = {
      total: Math.floor(Math.random() * 20) - 10,
      resolved: Math.floor(Math.random() * 15) - 5,
      critical: Math.floor(Math.random() * 25) - 15,
      overdue: Math.floor(Math.random() * 10) - 8,
    };

    return {
      totalTickets,
      resolvedTickets,
      criticalCases,
      overdueTickets,
      trends,
    };
  }, [filteredTickets]);

  // Card configurations
  const cardConfigs = [
    {
      title: "Total Tickets",
      value: stats.totalTickets,
      icon: <AlertTriangle className="h-6 w-6" />,
      gradient: "from-blue-500 to-purple-600",
      trend: stats.trends.total,
      subtitle: "All active tickets",
      delay: 0,
    },
    {
      title: "Resolved Tickets",
      value: stats.resolvedTickets,
      icon: <CheckCircle2 className="h-6 w-6" />,
      gradient: "from-green-500 to-emerald-600",
      trend: stats.trends.resolved,
      subtitle: "Closed cases",
      delay: 100,
    },
    {
      title: "Critical Cases",
      value: stats.criticalCases,
      icon: <AlertTriangle className="h-6 w-6" />,
      gradient: "from-red-500 to-pink-600",
      trend: stats.trends.critical,
      subtitle: "Severity 1 tickets",
      delay: 200,
    },
    {
      title: "Overdue Tickets",
      value: stats.overdueTickets,
      icon: <Timer className="h-6 w-6" />,
      gradient: "from-orange-500 to-red-500",
      trend: stats.trends.overdue,
      subtitle: "Over 24h open",
      delay: 300,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
       <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  Clarify Overview
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Real-time ticket metrics and analytics
                </p>
              </div>
            </div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cardConfigs.map((config) => (
          <StatCard key={config.title} {...config} />
        ))}
      </div>

      {/* Last Updated */}
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