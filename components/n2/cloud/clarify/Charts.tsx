"use client";

import React, { memo, useMemo, Suspense, lazy, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  ComposedChart,
  Cell,
} from "recharts";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { ContentCard } from "../../../../components/dashboard/ContentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Filter, TrendingUp, TrendingDown, Minus } from "lucide-react";

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

// Modern color palette with gradients
const MODERN_COLORS = {
  primary: "#3B82F6",
  secondary: "#8B5CF6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#06B6D4",
  purple: "#8B5CF6",
  pink: "#EC4899",
  indigo: "#6366F1",
  emerald: "#059669",
  rose: "#F43F5E",
  amber: "#D97706",
  slate: "#64748B",
  gray: "#6B7280",
};

const GRADIENT_COLORS = [
  "url(#gradient1)",
  "url(#gradient2)", 
  "url(#gradient3)",
  "url(#gradient4)",
  "url(#gradient5)",
];

// Chart configuration interface
interface ChartConfig {
  showGrid?: boolean;
  showLegend?: boolean;
  showTrend?: boolean;
  orientation?: 'horizontal' | 'vertical';
  colorScheme?: 'modern' | 'gradient' | 'monochrome';
  animationDuration?: number;
  maxItems?: number;
}

interface ChartProps {
  tickets: ClarifyTicket[];
  filteredTickets: ClarifyTicket[];
  config?: ChartConfig;
  className?: string;
}

// Enhanced loading skeleton
const ChartSkeleton = memo(() => (
  <div className="h-[350px] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg">
    <div className="flex flex-col items-center space-y-4">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-[280px] w-full" />
      <div className="flex space-x-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  </div>
));

// Enhanced gradient definitions
const GradientDefs = () => (
  <defs>
    <linearGradient id="gradient1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={MODERN_COLORS.primary} stopOpacity={0.8} />
      <stop offset="100%" stopColor={MODERN_COLORS.primary} stopOpacity={0.3} />
    </linearGradient>
    <linearGradient id="gradient2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={MODERN_COLORS.secondary} stopOpacity={0.8} />
      <stop offset="100%" stopColor={MODERN_COLORS.secondary} stopOpacity={0.3} />
    </linearGradient>
    <linearGradient id="gradient3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={MODERN_COLORS.success} stopOpacity={0.8} />
      <stop offset="100%" stopColor={MODERN_COLORS.success} stopOpacity={0.3} />
    </linearGradient>
    <linearGradient id="gradient4" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={MODERN_COLORS.warning} stopOpacity={0.8} />
      <stop offset="100%" stopColor={MODERN_COLORS.warning} stopOpacity={0.3} />
    </linearGradient>
    <linearGradient id="gradient5" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={MODERN_COLORS.danger} stopOpacity={0.8} />
      <stop offset="100%" stopColor={MODERN_COLORS.danger} stopOpacity={0.3} />
    </linearGradient>
  </defs>
);

// Custom tooltip component
const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 backdrop-blur-sm">
        <p className="font-semibold text-gray-900 mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-600">
              {entry.name}: <span className="font-medium">{formatter ? formatter(entry.value) : entry.value}</span>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Enhanced statistics cards
const StatsCard = memo(({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend 
}: { 
  title: string; 
  value: number; 
  change?: number; 
  icon: any; 
  trend?: 'up' | 'down' | 'neutral';
}) => (
  <Card className="hover:shadow-lg transition-shadow duration-200">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
      <Icon className="h-4 w-4 text-gray-400" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</div>
      {change !== undefined && (
        <div className="flex items-center space-x-1 mt-1">
          {trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
          {trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
          {trend === 'neutral' && <Minus className="h-3 w-3 text-gray-500" />}
          <span className={`text-xs ${
            trend === 'up' ? 'text-green-600' : 
            trend === 'down' ? 'text-red-600' : 
            'text-gray-600'
          }`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
        </div>
      )}
    </CardContent>
  </Card>
));

// Data aggregation hooks with enhanced performance
const useStatusStats = (filteredTickets: ClarifyTicket[], config?: ChartConfig) => {
  return useMemo(() => {
    const stats = new Map<string, number>();
    for (const ticket of filteredTickets) {
      stats.set(ticket.status, (stats.get(ticket.status) || 0) + 1);
    }
    
    const data = Array.from(stats, ([name, value]) => ({ 
      name, 
      value,
      percentage: (value / filteredTickets.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.value - a.value);
    
    return config?.maxItems ? data.slice(0, config.maxItems) : data;
  }, [filteredTickets, config?.maxItems]);
};

const useSeverityStats = (filteredTickets: ClarifyTicket[], config?: ChartConfig) => {
  return useMemo(() => {
    const severityOrder = ['Critical', 'High', 'Medium', 'Low'];
    const stats = new Map<string, number>();
    
    for (const ticket of filteredTickets) {
      const severityKey = `Severity ${ticket.severity}`;
      stats.set(severityKey, (stats.get(severityKey) || 0) + 1);
    }
    
    const data = Array.from(stats, ([name, value]) => ({ 
      name, 
      value,
      percentage: (value / filteredTickets.length * 100).toFixed(1),
      order: severityOrder.findIndex(s => name.includes(s))
    }))
    .sort((a, b) => a.order - b.order);
    
    return config?.maxItems ? data.slice(0, config.maxItems) : data;
  }, [filteredTickets, config?.maxItems]);
};

const usePriorityStats = (filteredTickets: ClarifyTicket[], config?: ChartConfig) => {
  return useMemo(() => {
    const priorityOrder = ['Urgent', 'High', 'Normal', 'Low'];
    const stats = new Map<string, number>();
    
    for (const ticket of filteredTickets) {
      stats.set(ticket.priority, (stats.get(ticket.priority) || 0) + 1);
    }
    
    const data = Array.from(stats, ([name, value]) => ({ 
      name, 
      value,
      percentage: (value / filteredTickets.length * 100).toFixed(1),
      order: priorityOrder.findIndex(p => p === name)
    }))
    .sort((a, b) => a.order - b.order);
    
    return config?.maxItems ? data.slice(0, config.maxItems) : data;
  }, [filteredTickets, config?.maxItems]);
};

const useRegionStats = (filteredTickets: ClarifyTicket[], config?: ChartConfig) => {
  return useMemo(() => {
    const stats = new Map<string, number>();
    for (const ticket of filteredTickets) {
      stats.set(ticket.region, (stats.get(ticket.region) || 0) + 1);
    }
    
    const data = Array.from(stats, ([name, value]) => ({ 
      name, 
      value,
      percentage: (value / filteredTickets.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.value - a.value);
    
    return config?.maxItems ? data.slice(0, config.maxItems) : data;
  }, [filteredTickets, config?.maxItems]);
};

const useCompanyStats = (filteredTickets: ClarifyTicket[], config?: ChartConfig) => {
  return useMemo(() => {
    const stats = new Map<string, number>();
    for (const ticket of filteredTickets) {
      stats.set(ticket.company, (stats.get(ticket.company) || 0) + 1);
    }
    
    const data = Array.from(stats, ([name, value]) => ({ 
      name, 
      value,
      percentage: (value / filteredTickets.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.value - a.value);
    
    return config?.maxItems ? data.slice(0, config.maxItems || 15) : data.slice(0, 15);
  }, [filteredTickets, config?.maxItems]);
};

const useCityStats = (filteredTickets: ClarifyTicket[], config?: ChartConfig) => {
  return useMemo(() => {
    const stats = new Map<string, number>();
    for (const ticket of filteredTickets) {
      stats.set(ticket.city, (stats.get(ticket.city) || 0) + 1);
    }
    
    const data = Array.from(stats, ([name, value]) => ({ 
      name, 
      value,
      percentage: (value / filteredTickets.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.value - a.value);
    
    return config?.maxItems ? data.slice(0, config.maxItems || 10) : data.slice(0, 10);
  }, [filteredTickets, config?.maxItems]);
};

const useOwnerStats = (filteredTickets: ClarifyTicket[], config?: ChartConfig) => {
  return useMemo(() => {
    const stats = new Map<string, number>();
    for (const ticket of filteredTickets) {
      stats.set(ticket.owner, (stats.get(ticket.owner) || 0) + 1);
    }
    
    const data = Array.from(stats, ([name, value]) => ({ 
      name, 
      value,
      percentage: (value / filteredTickets.length * 100).toFixed(1)
    }))
    .sort((a, b) => b.value - a.value);
    
    return config?.maxItems ? data.slice(0, config.maxItems || 10) : data.slice(0, 10);
  }, [filteredTickets, config?.maxItems]);
};

const useTicketsByDay = (tickets: ClarifyTicket[], days: number = 30) => {
  return useMemo(() => {
    const dailyStats = new Map<string, number>();
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = subDays(endDate, i);
      const dateKey = format(date, "yyyy-MM-dd");
      dailyStats.set(dateKey, 0);
    }
    
    for (const ticket of tickets) {
      if (!ticket.createdAt || isNaN(new Date(ticket.createdAt).getTime())) continue;
      
      const ticketDate = new Date(ticket.createdAt);
      if (isWithinInterval(ticketDate, { start: startDate, end: endDate })) {
        const dateKey = format(ticketDate, "yyyy-MM-dd");
        dailyStats.set(dateKey, (dailyStats.get(dateKey) || 0) + 1);
      }
    }

    return Array.from(dailyStats, ([date, count]) => ({ 
      date, 
      count,
      formattedDate: format(new Date(date), "MMM dd")
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
  }, [tickets, days]);
};

// Enhanced Status Chart
export const StatusChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = useStatusStats(filteredTickets, config);
  const [sortBy, setSortBy] = useState<'value' | 'name'>('value');

  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => 
      sortBy === 'value' ? b.value - a.value : a.name.localeCompare(b.name)
    );
  }, [data, sortBy]);

  if (data.length === 0) {
    return (
      <ContentCard title="Status Distribution">
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard 
      title="Status Distribution" 
      className={className}
      extra={
        <Select value={sortBy} onValueChange={(value: 'value' | 'name') => setSortBy(value)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="value">By Count</SelectItem>
            <SelectItem value="name">By Name</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={sortedData} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <GradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip 
              content={<CustomTooltip formatter={(value: number) => `${value} tickets`} />}
            />
            {config?.showLegend !== false && <Legend />}
            <Bar 
              dataKey="value" 
              fill={config?.colorScheme === 'gradient' ? GRADIENT_COLORS[0] : MODERN_COLORS.primary}
              radius={[6, 6, 0, 0]}
              name="Tickets"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Enhanced Severity Chart
export const SeverityChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = useSeverityStats(filteredTickets, config);

  if (data.length === 0) {
    return (
      <ContentCard title="Severity Distribution">
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  const getBarColor = (name: string) => {
    if (name.includes('Critical')) return MODERN_COLORS.danger;
    if (name.includes('High')) return MODERN_COLORS.warning;
    if (name.includes('Medium')) return MODERN_COLORS.info;
    if (name.includes('Low')) return MODERN_COLORS.success;
    return MODERN_COLORS.primary;
  };

  return (
    <ContentCard title="Severity Distribution" className={className}>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <GradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip 
              content={<CustomTooltip formatter={(value: number) => `${value} tickets`} />}
            />
            {config?.showLegend !== false && <Legend />}
            <Bar 
              dataKey="value" 
              radius={[6, 6, 0, 0]}
              name="Tickets"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.name)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Enhanced Priority Chart
export const PriorityChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = usePriorityStats(filteredTickets, config);

  if (data.length === 0) {
    return (
      <ContentCard title="Priority Distribution">
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  const getBarColor = (name: string) => {
    if (name === 'Urgent') return MODERN_COLORS.danger;
    if (name === 'High') return MODERN_COLORS.warning;
    if (name === 'Normal') return MODERN_COLORS.info;
    if (name === 'Low') return MODERN_COLORS.success;
    return MODERN_COLORS.primary;
  };

  return (
    <ContentCard title="Priority Distribution" className={className}>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <GradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip 
              content={<CustomTooltip formatter={(value: number) => `${value} tickets`} />}
            />
            {config?.showLegend !== false && <Legend />}
            <Bar 
              dataKey="value" 
              radius={[6, 6, 0, 0]}
              name="Tickets"
            >
              {data.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getBarColor(entry.name)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Enhanced Region Chart
export const RegionChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = useRegionStats(filteredTickets, config);
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>(
    config?.orientation || 'vertical'
  );

  if (data.length === 0) {
    return (
      <ContentCard title="Regional Distribution">
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard 
      title="Regional Distribution" 
      className={className}
      extra={
        <div className="flex space-x-2">
          <Button
            variant={orientation === 'vertical' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOrientation('vertical')}
          >
            Vertical
          </Button>
          <Button
            variant={orientation === 'horizontal' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setOrientation('horizontal')}
          >
            Horizontal
          </Button>
        </div>
      }
    >
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data}
            layout={orientation === 'horizontal' ? 'vertical' : undefined}
            margin={{ top: 20, right: 30, left: orientation === 'horizontal' ? 80 : 20, bottom: 5 }}
          >
            <GradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            {orientation === 'horizontal' ? (
              <>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis 
                  type="category"
                  dataKey="name" 
                  tick={{ fontSize: 11 }}
                  width={75}
                />
              </>
            ) : (
              <>
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 11 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
              </>
            )}
            <Tooltip 
              content={<CustomTooltip formatter={(value: number) => `${value} tickets`} />}
            />
            <Bar 
              dataKey="value" 
              fill={config?.colorScheme === 'gradient' ? GRADIENT_COLORS[1] : MODERN_COLORS.info}
              radius={orientation === 'horizontal' ? [0, 6, 6, 0] : [6, 6, 0, 0]}
              name="Tickets"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Enhanced Company Chart
export const CompanyChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = useCompanyStats(filteredTickets, config);

  if (data.length === 0) {
    return (
      <ContentCard title="Meilleures entreprises par volume de Tickets">
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Meilleures entreprises par volume de Tickets" className={className}>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
          >
            <GradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis 
              type="number" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              type="category"
              dataKey="name" 
              tick={{ fontSize: 11 }}
              width={95}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip 
              content={<CustomTooltip formatter={(value: number) => `${value} tickets`} />}
            />
            <Bar 
              dataKey="value" 
              fill={config?.colorScheme === 'gradient' ? GRADIENT_COLORS[2] : MODERN_COLORS.secondary}
              radius={[0, 6, 6, 0]}
              name="Tickets"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// New City Chart
export const CityChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = useCityStats(filteredTickets, config);

  if (data.length === 0) {
    return (
      <ContentCard title="Top Cities by Ticket Volume">
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Top Cities by Ticket Volume" className={className}>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
          >
            <GradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis 
              type="number" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              type="category"
              dataKey="name" 
              tick={{ fontSize: 11 }}
              width={75}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip 
              content={<CustomTooltip formatter={(value: number) => `${value} tickets`} />}
            />
            <Bar 
              dataKey="value" 
              fill={config?.colorScheme === 'gradient' ? GRADIENT_COLORS[3] : MODERN_COLORS.emerald}
              radius={[0, 6, 6, 0]}
              name="Tickets"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// New Owner Chart
export const OwnerChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = useOwnerStats(filteredTickets, config);

  if (data.length === 0) {
    return (
      <ContentCard title="Principaux propriétaires par volume de Tickets">
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Principaux propriétaires par volume de Tickets" className={className}>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
          >
            <GradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis 
              type="number" 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              type="category"
              dataKey="name" 
              tick={{ fontSize: 11 }}
              width={95}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip 
              content={<CustomTooltip formatter={(value: number) => `${value} tickets`} />}
            />
            <Bar 
              dataKey="value" 
              fill={config?.colorScheme === 'gradient' ? GRADIENT_COLORS[4] : MODERN_COLORS.purple}
              radius={[0, 6, 6, 0]}
              name="Tickets"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Enhanced Time Series Chart
export const TicketsOverTimeChart = memo<ChartProps>(({ tickets, config, className }) => {
  const [timeRange, setTimeRange] = useState<7 | 30 | 90>(30);
  const data = useTicketsByDay(tickets, timeRange);

  if (data.length === 0) {
    return (
      <ContentCard title={`Tickets au fil du temps (derniers ${timeRange} Days)`}>
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard 
      title={`Tickets au fil du temps (Last ${timeRange} Days)`} 
      className={className}
      extra={
        <div className="flex space-x-2">
          {[7, 30, 90].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(days as 7 | 30 | 90)}
            >
              {days}d
            </Button>
          ))}
        </div>
      }
    >
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <GradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis 
              dataKey="formattedDate" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={60}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis 
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <Tooltip 
              content={<CustomTooltip formatter={(value: number) => `${value} tickets`} />}
            />
            {config?.showLegend !== false && <Legend />}
            <Area
              type="monotone"
              dataKey="count"
              fill={config?.colorScheme === 'gradient' ? GRADIENT_COLORS[0] : MODERN_COLORS.primary}
              fillOpacity={0.3}
              stroke={MODERN_COLORS.primary}
              strokeWidth={0}
              name="Daily Tickets"
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke={MODERN_COLORS.primary}
              strokeWidth={3}
              dot={{ r: 4, fill: MODERN_COLORS.primary }}
              activeDot={{ r: 6, fill: MODERN_COLORS.primary }}
              name="Trend"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Enhanced Monthly Chart
export const TicketsByMonthChart = memo<ChartProps>(({ tickets, config, className }) => {
  const data = useMemo(() => {
    const monthlyStats = new Map<string, { month: string, count: number, sortKey: string }>();
    
    for (const ticket of tickets) {
      if (!ticket.createdAt || isNaN(new Date(ticket.createdAt).getTime())) continue;
      
      const date = new Date(ticket.createdAt);
      const monthYear = format(date, "MMM yyyy", { locale: fr });
      const sortKey = format(date, "yyyy-MM");
      
      if (!monthlyStats.has(monthYear)) {
        monthlyStats.set(monthYear, { month: monthYear, count: 0, sortKey });
      }
      monthlyStats.get(monthYear)!.count++;
    }

    return Array.from(monthlyStats.values())
      .sort((a, b) => a.sortKey.localeCompare(b.sortKey))
      .slice(-12);
  }, [tickets]);

  if (data.length === 0) {
    return (
      <ContentCard title="Tickets par mois (derniers 12 Months)">
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Tickets par mois (derniers 12 Months)" className={className}>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <GradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis 
              dataKey="month" 
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 11 }}
              axisLine={{ stroke: '#e0e0e0' }}
            />
            <YAxis
              tick={{ fontSize: 12 }}
              axisLine={{ stroke: '#e0e0e0' }}
              label={{
                value: "Number of Tickets",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: 'middle' }
              }}
            />
            <Tooltip 
              content={<CustomTooltip formatter={(value: number) => `${value} tickets`} />}
            />
            <Bar 
              dataKey="count" 
              fill={config?.colorScheme === 'gradient' ? GRADIENT_COLORS[1] : MODERN_COLORS.info}
              name="Tickets"
              radius={[8, 8, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Advanced Analytics Dashboard Component
export const TicketAnalyticsDashboard = memo<{
  tickets: ClarifyTicket[];
  filteredTickets: ClarifyTicket[];
  config?: ChartConfig;
}>(({ tickets, filteredTickets, config }) => {
  const totalTickets = filteredTickets.length;
  const openTickets = filteredTickets.filter(t => t.status !== 'Closed').length;
  const closedTickets = filteredTickets.filter(t => t.status === 'Closed').length;
  const criticalTickets = filteredTickets.filter(t => t.severity === 'Critical').length;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          title="Total Tickets"
          value={totalTickets}
          icon={Calendar}
          trend="neutral"
        />
        <StatsCard
          title="Open Tickets"
          value={openTickets}
          icon={TrendingUp}
          trend="up"
          change={12}
        />
        <StatsCard
          title="Closed Tickets"
          value={closedTickets}
          icon={TrendingDown}
          trend="down"
          change={-8}
        />
        <StatsCard
          title="Critical Issues"
          value={criticalTickets}
          icon={Filter}
          trend="up"
          change={5}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatusChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        <SeverityChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        <PriorityChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        <RegionChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
      </div>

      {/* Full Width Charts */}
      <div className="space-y-6">
        <TicketsOverTimeChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        <CompanyChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CityChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
          <OwnerChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        </div>
        <TicketsByMonthChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
      </div>
    </div>
  );
});

// Chart Configuration Provider
export const ChartConfigProvider: React.FC<{
  children: React.ReactNode;
  defaultConfig?: ChartConfig;
}> = ({ children, defaultConfig }) => {
  const [config, setConfig] = useState<ChartConfig>(defaultConfig || {
    showGrid: true,
    showLegend: true,
    showTrend: false,
    orientation: 'vertical',
    colorScheme: 'modern',
    animationDuration: 300,
    maxItems: 15
  });

  return (
    <div className="space-y-4">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Chart Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showGrid}
                onChange={(e) => setConfig(prev => ({ ...prev, showGrid: e.target.checked }))}
              />
              <label className="text-sm">Show Grid</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showLegend}
                onChange={(e) => setConfig(prev => ({ ...prev, showLegend: e.target.checked }))}
              />
              <label className="text-sm">Show Legend</label>
            </div>
            <Select 
              value={config.colorScheme} 
              onValueChange={(value: 'modern' | 'gradient' | 'monochrome') => 
                setConfig(prev => ({ ...prev, colorScheme: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="modern">Modern</SelectItem>
                <SelectItem value="gradient">Gradient</SelectItem>
                <SelectItem value="monochrome">Monochrome</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={config.orientation} 
              onValueChange={(value: 'horizontal' | 'vertical') => 
                setConfig(prev => ({ ...prev, orientation: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vertical">Vertical</SelectItem>
                <SelectItem value="horizontal">Horizontal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Pass config to children */}
      {React.Children.map(children, child =>
        React.isValidElement(child)
          ? React.cloneElement(child, { config } as any)
          : child
      )}
    </div>
  );
};

SeverityChart.displayName = "SeverityChart";
StatusChart.displayName = "StatusChart";
PriorityChart.displayName = "PriorityChart";
RegionChart.displayName = "RegionChart";
CompanyChart.displayName = "CompanyChart";
CityChart.displayName = "CityChart";
OwnerChart.displayName = "OwnerChart";
TicketsOverTimeChart.displayName = "TicketsOverTimeChart";
TicketsByMonthChart.displayName = "TicketsByMonthChart";
TicketAnalyticsDashboard.displayName = "TicketAnalyticsDashboard";
StatsCard.displayName = "StatsCard";
ChartSkeleton.displayName = "ChartSkeleton";


// Lazy-loaded chart components for better performance
export const LazyStatusChart = lazy(() => Promise.resolve({ default: StatusChart }));
export const LazySeverityChart = lazy(() => Promise.resolve({ default: SeverityChart }));
export const LazyPriorityChart = lazy(() => Promise.resolve({ default: PriorityChart }));
export const LazyRegionChart = lazy(() => Promise.resolve({ default: RegionChart }));
export const LazyCompanyChart = lazy(() => Promise.resolve({ default: CompanyChart }));
export const LazyCityChart = lazy(() => Promise.resolve({ default: CityChart }));
export const LazyOwnerChart = lazy(() => Promise.resolve({ default: OwnerChart }));
export const LazyTicketsOverTimeChart = lazy(() => Promise.resolve({ default: TicketsOverTimeChart }));
export const LazyTicketsByMonthChart = lazy(() => Promise.resolve({ default: TicketsByMonthChart }));
export const LazyTicketAnalyticsDashboard = lazy(() => Promise.resolve({ default: TicketAnalyticsDashboard }));

// Chart wrapper with suspense
export const ChartWithSuspense: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <Suspense fallback={<ChartSkeleton />}>
    {children}
  </Suspense>
);

// Export configuration types
export type { ChartConfig, ChartProps, ClarifyTicket };

