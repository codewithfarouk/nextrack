"use client";

import React, { memo, useMemo, useState, Suspense, lazy } from "react";
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { format, subDays, startOfMonth, endOfMonth, isWithinInterval } from "date-fns";
import { fr } from "date-fns/locale";
import { ContentCard } from "../../../dashboard/ContentCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  Users,
  Building2,
  Activity
} from "lucide-react";

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

// Enhanced color schemes for ITSM
const ITSM_COLORS = {
  // Ticket Types
  CRQ: "#10B981", // Change Request - Green
  INC: "#EF4444", // Incident - Red
  
  // Priorities
  P1: "#DC2626", // Critical - Dark Red
  P2: "#F59E0B", // High - Orange
  P3: "#059669", // Medium - Green
  
  // Status Colors
  Open: "#3B82F6",
  "In Progress": "#F59E0B",
  "Pending": "#8B5CF6",
  "Resolved": "#10B981",
  "Closed": "#6B7280",
  "On Hold": "#EC4899",
  
  // UI Colors
  primary: "#3B82F6",
  secondary: "#8B5CF6",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#06B6D4",
  muted: "#6B7280",
};

const GRADIENT_DEFS = [
  "url(#itsmGradient1)",
  "url(#itsmGradient2)",
  "url(#itsmGradient3)",
  "url(#itsmGradient4)",
  "url(#itsmGradient5)",
];

interface ChartConfig {
  showGrid?: boolean;
  showLegend?: boolean;
  showTrend?: boolean;
  orientation?: 'horizontal' | 'vertical';
  colorScheme?: 'itsm' | 'gradient' | 'monochrome';
  animationDuration?: number;
  maxItems?: number;
  timeRange?: 'day' | 'week' | 'month' | 'quarter';
}

interface ChartProps {
  tickets: ITSMTicket[];
  filteredTickets: ITSMTicket[];
  config?: ChartConfig;
  className?: string;
}

// Enhanced gradient definitions for ITSM
const ITSMGradientDefs = () => (
  <defs>
    <linearGradient id="itsmGradient1" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={ITSM_COLORS.CRQ} stopOpacity={0.8} />
      <stop offset="100%" stopColor={ITSM_COLORS.CRQ} stopOpacity={0.3} />
    </linearGradient>
    <linearGradient id="itsmGradient2" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={ITSM_COLORS.INC} stopOpacity={0.8} />
      <stop offset="100%" stopColor={ITSM_COLORS.INC} stopOpacity={0.3} />
    </linearGradient>
    <linearGradient id="itsmGradient3" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={ITSM_COLORS.P1} stopOpacity={0.8} />
      <stop offset="100%" stopColor={ITSM_COLORS.P1} stopOpacity={0.3} />
    </linearGradient>
    <linearGradient id="itsmGradient4" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={ITSM_COLORS.P2} stopOpacity={0.8} />
      <stop offset="100%" stopColor={ITSM_COLORS.P2} stopOpacity={0.3} />
    </linearGradient>
    <linearGradient id="itsmGradient5" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={ITSM_COLORS.primary} stopOpacity={0.8} />
      <stop offset="100%" stopColor={ITSM_COLORS.primary} stopOpacity={0.3} />
    </linearGradient>
  </defs>
);

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

// Custom enhanced tooltip
const ITSMTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 backdrop-blur-sm">
        <p className="font-semibold text-gray-900 mb-3">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center justify-between space-x-4 mb-1">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}:</span>
            </div>
            <span className="font-medium text-gray-900">
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// Enhanced KPI cards
const KPICard = memo(({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend,
  subtitle,
  color = "primary"
}: { 
  title: string; 
  value: number | string; 
  change?: number; 
  icon: any; 
  trend?: 'up' | 'down' | 'neutral';
  subtitle?: string;
  color?: keyof typeof ITSM_COLORS;
}) => {
  const colorClass = color === "danger" ? "text-red-500" : 
                    color === "success" ? "text-green-500" : 
                    color === "warning" ? "text-yellow-500" : 
                    "text-blue-500";

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200 border-l-4" 
          style={{ borderLeftColor: ITSM_COLORS[color] }}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${colorClass}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900 mb-1">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <p className="text-xs text-gray-500 mb-2">{subtitle}</p>
        )}
        {change !== undefined && (
          <div className="flex items-center space-x-1">
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
  );
});

// Data aggregation utility functions (NOT hooks)
const getTypeStats = (filteredTickets: ITSMTicket[]) => {
  const stats = new Map<string, number>();
  for (const ticket of filteredTickets) {
    stats.set(ticket.type, (stats.get(ticket.type) || 0) + 1);
  }
  
  return Array.from(stats, ([name, value]) => ({ 
    name: name === 'CRQ' ? 'Change Request' : 'Incident', 
    shortName: name,
    value,
    percentage: (value / filteredTickets.length * 100).toFixed(1),
    color: ITSM_COLORS[name as keyof typeof ITSM_COLORS]
  }))
  .sort((a, b) => b.value - a.value);
};

const getPriorityStats = (filteredTickets: ITSMTicket[]) => {
  const priorityOrder = ['P1', 'P2', 'P3'];
  const stats = new Map<string, number>();
  
  for (const ticket of filteredTickets) {
    stats.set(ticket.priority, (stats.get(ticket.priority) || 0) + 1);
  }
  
  return Array.from(stats, ([name, value]) => ({ 
    name: `Priority ${name.slice(1)} (${name})`, 
    shortName: name,
    value,
    percentage: (value / filteredTickets.length * 100).toFixed(1),
    color: ITSM_COLORS[name as keyof typeof ITSM_COLORS],
    order: priorityOrder.indexOf(name)
  }))
  .sort((a, b) => a.order - b.order);
};

const getStatusStats = (filteredTickets: ITSMTicket[]) => {
  const stats = new Map<string, number>();
  for (const ticket of filteredTickets) {
    stats.set(ticket.status, (stats.get(ticket.status) || 0) + 1);
  }
  
  return Array.from(stats, ([name, value]) => ({ 
    name, 
    value,
    percentage: (value / filteredTickets.length * 100).toFixed(1),
    color: ITSM_COLORS[name as keyof typeof ITSM_COLORS] || ITSM_COLORS.muted
  }))
  .sort((a, b) => b.value - a.value);
};

const getAssigneeStats = (filteredTickets: ITSMTicket[], maxItems: number = 10) => {
  const stats = new Map<string, number>();
  for (const ticket of filteredTickets) {
    stats.set(ticket.assignee, (stats.get(ticket.assignee) || 0) + 1);
  }
  
  return Array.from(stats, ([name, value]) => ({ 
    name, 
    value,
    percentage: (value / filteredTickets.length * 100).toFixed(1)
  }))
  .sort((a, b) => b.value - a.value)
  .slice(0, maxItems);
};

const getCompanyStats = (filteredTickets: ITSMTicket[], maxItems: number = 10) => {
  const stats = new Map<string, number>();
  for (const ticket of filteredTickets) {
    stats.set(ticket.company, (stats.get(ticket.company) || 0) + 1);
  }
  
  return Array.from(stats, ([name, value]) => ({ 
    name, 
    value,
    percentage: (value / filteredTickets.length * 100).toFixed(1)
  }))
  .sort((a, b) => b.value - a.value)
  .slice(0, maxItems);
};

// Data aggregation hooks
const useTypeStats = (filteredTickets: ITSMTicket[]) => {
  return useMemo(() => getTypeStats(filteredTickets), [filteredTickets]);
};

const usePriorityStats = (filteredTickets: ITSMTicket[]) => {
  return useMemo(() => getPriorityStats(filteredTickets), [filteredTickets]);
};

const useStatusStats = (filteredTickets: ITSMTicket[]) => {
  return useMemo(() => getStatusStats(filteredTickets), [filteredTickets]);
};

const useAssigneeStats = (filteredTickets: ITSMTicket[], maxItems: number = 10) => {
  return useMemo(() => getAssigneeStats(filteredTickets, maxItems), [filteredTickets, maxItems]);
};

const useCompanyStats = (filteredTickets: ITSMTicket[], maxItems: number = 10) => {
  return useMemo(() => getCompanyStats(filteredTickets, maxItems), [filteredTickets, maxItems]);
};

const useTimeSeriesData = (tickets: ITSMTicket[], timeRange: 'day' | 'week' | 'month' = 'month') => {
  return useMemo(() => {
    const now = new Date();
    const periods = timeRange === 'day' ? 30 : timeRange === 'week' ? 12 : 12;
    
    const data = [];
    
    for (let i = periods - 1; i >= 0; i--) {
      let startDate: Date, endDate: Date, label: string;
      
      if (timeRange === 'day') {
        startDate = subDays(now, i);
        endDate = startDate;
        label = format(startDate, 'MMM dd');
      } else if (timeRange === 'week') {
        startDate = subDays(now, i * 7);
        endDate = subDays(now, i * 7 - 6);
        label = `Week ${format(startDate, 'MMM dd')}`;
      } else {
        startDate = startOfMonth(subDays(now, i * 30));
        endDate = endOfMonth(startDate);
        label = format(startDate, 'MMM yyyy');
      }
      
      const periodTickets = tickets.filter(ticket => 
        isWithinInterval(ticket.createdAt, { start: startDate, end: endDate })
      );
      
      const typeStats = periodTickets.reduce((acc: any, ticket) => {
        acc[ticket.type] = (acc[ticket.type] || 0) + 1;
        return acc;
      }, {});
      
      data.push({
        period: label,
        CRQ: typeStats.CRQ || 0,
        INC: typeStats.INC || 0,
        total: periodTickets.length
      });
    }
    
    return data;
  }, [tickets, timeRange]);
};

// Enhanced Type Distribution Chart
export const TypeChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = useTypeStats(filteredTickets);
  const [chartType, setChartType] = useState<'bar' | 'donut'>('bar');

  if (data.length === 0) {
    return (
      <ContentCard title="Ticket Types Distribution">
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard 
      title="Ticket Types Distribution" 
      className={className}
      extra={
        <div className="flex space-x-2">
          <Button
            variant={chartType === 'bar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('bar')}
          >
            Bar
          </Button>
          <Button
            variant={chartType === 'donut' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setChartType('donut')}
          >
            Donut
          </Button>
        </div>
      }
    >
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <ITSMGradientDefs />
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
              <Tooltip content={<ITSMTooltip formatter={(value: number) => `${value} tickets`} />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Tickets">
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                {data.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 mb-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium">{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{item.value}</div>
                      <div className="text-sm text-gray-500">{item.percentage}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Enhanced Priority Chart
export const PriorityChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = usePriorityStats(filteredTickets);

  if (data.length === 0) {
    return (
      <ContentCard title="Priority Distribution">
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Priority Distribution" className={className}>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout={config?.orientation === 'horizontal' ? 'vertical' : undefined}
            margin={{ top: 20, right: 30, left: config?.orientation === 'horizontal' ? 80 : 20, bottom: 5 }}
          >
            <ITSMGradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            {config?.orientation === 'horizontal' ? (
              <>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
              </>
            ) : (
              <>
                <XAxis dataKey="shortName" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
              </>
            )}
            <Tooltip content={<ITSMTooltip formatter={(value: number) => `${value} tickets`} />} />
            <Bar 
              dataKey="value" 
              radius={config?.orientation === 'horizontal' ? [0, 8, 8, 0] : [8, 8, 0, 0]}
              name="Tickets"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Enhanced Status Chart
export const StatusChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = useStatusStats(filteredTickets);

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
    <ContentCard title="Status Distribution" className={className}>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
          >
            <ITSMGradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={95} />
            <Tooltip content={<ITSMTooltip formatter={(value: number) => `${value} tickets`} />} />
            <Bar dataKey="value" radius={[0, 8, 8, 0]} name="Tickets">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Enhanced Assignee Chart
export const AssigneeChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = useAssigneeStats(filteredTickets, config?.maxItems || 10);

  if (data.length === 0) {
    return (
      <ContentCard title="Top Assignees">
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Top Assignees" className={className}>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
          >
            <ITSMGradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
            <Tooltip content={<ITSMTooltip formatter={(value: number) => `${value} tickets`} />} />
            <Bar 
              dataKey="value" 
              fill={config?.colorScheme === 'gradient' ? GRADIENT_DEFS[0] : ITSM_COLORS.primary}
              radius={[0, 8, 8, 0]}
              name="Tickets"
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// New Company Chart
export const CompanyChart = memo<ChartProps>(({ filteredTickets, config, className }) => {
  const data = useCompanyStats(filteredTickets, config?.maxItems || 10);

  if (data.length === 0) {
    return (
      <ContentCard title="Top Companies">
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="Top Companies" className={className}>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={data} 
            layout="vertical"
            margin={{ top: 20, right: 30, left: 120, bottom: 5 }}
          >
            <ITSMGradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={115} />
            <Tooltip content={<ITSMTooltip formatter={(value: number) => `${value} tickets`} />} />
            <Bar 
              dataKey="value" 
              fill={config?.colorScheme === 'gradient' ? GRADIENT_DEFS[1] : ITSM_COLORS.info}
              radius={[0, 8, 8, 0]}
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
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('month');
  const data = useTimeSeriesData(tickets, timeRange);

  if (data.length === 0) {
    return (
      <ContentCard title="Tickets Over Time">
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard 
      title="Tickets Over Time" 
      className={className}
      extra={
        <div className="flex space-x-2">
          {(['day', 'week', 'month'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className="capitalize"
            >
              {range}ly
            </Button>
          ))}
        </div>
      }
    >
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <ITSMGradientDefs />
            {config?.showGrid !== false && (
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            )}
            <XAxis 
              dataKey="period" 
              tick={{ fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              height={80}
            />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<ITSMTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="total"
              fill={GRADIENT_DEFS[0]}
              fillOpacity={0.3}
              stroke="none"
              name="Total Volume"
            />
            <Bar dataKey="CRQ" fill={ITSM_COLORS.CRQ} name="Change Requests" />
            <Bar dataKey="INC" fill={ITSM_COLORS.INC} name="Incidents" />
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke={ITSM_COLORS.primary}
              strokeWidth={3}
              dot={{ r: 4 }}
              name="Total Trend"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// New Advanced Analytics Chart
export const ITSMRadarChart = memo<ChartProps>(({ filteredTickets, className }) => {
  // Call hooks at the top level
  const typeStats = useTypeStats(filteredTickets);
  const priorityStats = usePriorityStats(filteredTickets);
  const statusStats = useStatusStats(filteredTickets);

  const data = useMemo(() => {
    const maxValue = Math.max(
      ...typeStats.map(t => t.value),
      ...priorityStats.map(p => p.value),
      ...statusStats.map(s => s.value)
    );
    
    return [
      {
        subject: 'Change Requests',
        value: typeStats.find(t => t.shortName === 'CRQ')?.value || 0,
        fullMark: maxValue
      },
      {
        subject: 'Incidents', 
        value: typeStats.find(t => t.shortName === 'INC')?.value || 0,
        fullMark: maxValue
      },
      {
        subject: 'P1 Critical',
        value: priorityStats.find(p => p.shortName === 'P1')?.value || 0,
        fullMark: maxValue
      },
      {
        subject: 'P2 High',
        value: priorityStats.find(p => p.shortName === 'P2')?.value || 0,
        fullMark: maxValue
      },
      {
        subject: 'Open Status',
        value: statusStats.find(s => s.name === 'Open')?.value || 0,
        fullMark: maxValue
      },
      {
        subject: 'Resolved',
        value: statusStats.find(s => s.name === 'Resolved')?.value || 0,
        fullMark: maxValue
      }
    ];
  }, [typeStats, priorityStats, statusStats]);

  if (data.every(d => d.value === 0)) {
    return (
      <ContentCard title="ITSM Performance Radar">
        <div className="h-[400px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard title="ITSM Performance Radar" className={className}>
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={{ top: 20, right: 80, bottom: 20, left: 80 }}>
            <PolarGrid stroke="#e0e0e0" />
            <PolarAngleAxis tick={{ fontSize: 11 }} />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 'dataMax']} 
              tick={{ fontSize: 10 }}
              tickCount={4}
            />
            <Radar
              name="Tickets"
              dataKey="value"
              stroke={ITSM_COLORS.primary}
              fill={ITSM_COLORS.primary}
              fillOpacity={0.3}
              strokeWidth={2}
            />
            <Tooltip content={<ITSMTooltip formatter={(value: number) => `${value} tickets`} />} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
});

// Priority Trends with Time Analysis
export const PriorityTrendsChart = memo<ChartProps>(({ tickets, config, className }) => {
  const [viewMode, setViewMode] = useState<'current' | 'trend'>('current');
  
  const currentData = usePriorityStats(tickets);
  
  const trendData = useMemo(() => {
    const last30Days = tickets.filter(ticket => 
      isWithinInterval(ticket.createdAt, { 
        start: subDays(new Date(), 30), 
        end: new Date() 
      })
    );
    
    const previous30Days = tickets.filter(ticket =>
      isWithinInterval(ticket.createdAt, {
        start: subDays(new Date(), 60),
        end: subDays(new Date(), 30)
      })
    );
    
    // Use utility functions instead of hooks inside useMemo
    const currentPriorities = getPriorityStats(last30Days);
    const previousPriorities = getPriorityStats(previous30Days);
    
    return currentPriorities.map(current => {
      const previous = previousPriorities.find(p => p.shortName === current.shortName);
      const change = previous ? ((current.value - previous.value) / previous.value) * 100 : 0;
      
      return {
        ...current,
        previousValue: previous?.value || 0,
        change: Math.round(change),
        trend: change > 5 ? 'up' : change < -5 ? 'down' : 'neutral'
      };
    });
  }, [tickets]);

  if (currentData.length === 0) {
    return (
      <ContentCard title="Priority Trends Analysis">
        <div className="h-[350px] flex items-center justify-center text-muted-foreground">
          No data available
        </div>
      </ContentCard>
    );
  }

  return (
    <ContentCard 
      title="Priority Trends Analysis" 
      className={className}
      extra={
        <div className="flex space-x-2">
          <Button
            variant={viewMode === 'current' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('current')}
          >
            Current
          </Button>
          <Button
            variant={viewMode === 'trend' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('trend')}
          >
            Trend
          </Button>
        </div>
      }
    >
      <div className="h-[350px]">
        {viewMode === 'current' ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <ITSMGradientDefs />
              {config?.showGrid !== false && (
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              )}
              <XAxis dataKey="shortName" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip content={<ITSMTooltip formatter={(value: number) => `${value} tickets`} />} />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} name="Tickets">
                {currentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col justify-center space-y-4 p-4">
            {trendData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="font-medium">{item.shortName}</span>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className="text-sm text-gray-500">Current: {item.value}</div>
                    <div className="text-sm text-gray-500">Previous: {item.previousValue}</div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {item.trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                    {item.trend === 'down' && <TrendingDown className="h-4 w-4 text-green-500" />}
                    {item.trend === 'neutral' && <Minus className="h-4 w-4 text-gray-500" />}
                    <span className={`text-sm font-medium ${
                      item.trend === 'up' ? 'text-red-600' : 
                      item.trend === 'down' ? 'text-green-600' : 
                      'text-gray-600'
                    }`}>
                      {item.change > 0 ? '+' : ''}{item.change}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ContentCard>
  );
});

// Comprehensive ITSM Dashboard
export const ITSMDashboard = memo<{
  tickets: ITSMTicket[];
  filteredTickets: ITSMTicket[];
  config?: ChartConfig;
}>(({ tickets, filteredTickets, config }) => {
  const kpis = useMemo(() => {
    const total = filteredTickets.length;
    const incidents = filteredTickets.filter(t => t.type === 'INC').length;
    const changes = filteredTickets.filter(t => t.type === 'CRQ').length;
    const p1Tickets = filteredTickets.filter(t => t.priority === 'P1').length;
    const openTickets = filteredTickets.filter(t => !['Closed', 'Resolved'].includes(t.status)).length;
    const resolvedTickets = filteredTickets.filter(t => t.status === 'Resolved').length;
    
    // Calculate trends (simplified)
    const last30Days = filteredTickets.filter(t => 
      isWithinInterval(t.createdAt, { start: subDays(new Date(), 30), end: new Date() })
    );
    
    return {
      total,
      incidents,
      changes,
      p1Tickets,
      openTickets,
      resolvedTickets,
      incidentRatio: total > 0 ? Math.round((incidents / total) * 100) : 0,
      resolutionRate: total > 0 ? Math.round((resolvedTickets / total) * 100) : 0,
      recentVolume: last30Days.length
    };
  }, [filteredTickets]);

  return (
    <div className="space-y-6">
      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <KPICard
          title="Total Tickets"
          value={kpis.total}
          icon={Activity}
          color="primary"
          subtitle="All time"
        />
        <KPICard
          title="Incidents"
          value={kpis.incidents}
          icon={AlertTriangle}
          color="danger"
          change={5}
          trend="up"
          subtitle={`${kpis.incidentRatio}% of total`}
        />
        <KPICard
          title="Change Requests"
          value={kpis.changes}
          icon={CheckCircle}
          color="success"
          change={-2}
          trend="down"
        />
        <KPICard
          title="P1 Critical"
          value={kpis.p1Tickets}
          icon={AlertTriangle}
          color="danger"
          change={12}
          trend="up"
        />
        <KPICard
          title="Open Tickets"
          value={kpis.openTickets}
          icon={Clock}
          color="warning"
          change={-8}
          trend="down"
        />
        <KPICard
          title="Resolution Rate"
          value={`${kpis.resolutionRate}%`}
          icon={CheckCircle}
          color="success"
          change={3}
          trend="up"
        />
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TypeChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        <PriorityChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        <StatusChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        <PriorityTrendsChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
      </div>

      {/* Full Width Charts */}
      <div className="space-y-6">
        <TicketsOverTimeChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AssigneeChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
          <CompanyChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
        </div>
        
        <ITSMRadarChart tickets={tickets} filteredTickets={filteredTickets} config={config} />
      </div>
    </div>
  );
});

// Configuration Provider for ITSM
export const ITSMConfigProvider: React.FC<{
  children: React.ReactNode;
  defaultConfig?: ChartConfig;
}> = ({ children, defaultConfig }) => {
  const [config, setConfig] = useState<ChartConfig>(defaultConfig || {
    showGrid: true,
    showLegend: true,
    showTrend: false,
    orientation: 'vertical',
    colorScheme: 'itsm',
    animationDuration: 300,
    maxItems: 10,
    timeRange: 'month'
  });

  return (
    <div className="space-y-4">
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>ITSM Chart Configuration</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showGrid}
                onChange={(e) => setConfig(prev => ({ ...prev, showGrid: e.target.checked }))}
                className="rounded"
              />
              <label className="text-sm">Grid Lines</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showLegend}
                onChange={(e) => setConfig(prev => ({ ...prev, showLegend: e.target.checked }))}
                className="rounded"
              />
              <label className="text-sm">Legends</label>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={config.showTrend}
                onChange={(e) => setConfig(prev => ({ ...prev, showTrend: e.target.checked }))}
                className="rounded"
              />
              <label className="text-sm">Trend Lines</label>
            </div>
            <Select 
              value={config.colorScheme} 
              onValueChange={(value: 'itsm' | 'gradient' | 'monochrome') => 
                setConfig(prev => ({ ...prev, colorScheme: value }))
              }
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="itsm">ITSM Colors</SelectItem>
                <SelectItem value="gradient">Gradients</SelectItem>
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
            <Select 
              value={String(config.maxItems)} 
              onValueChange={(value) => 
                setConfig(prev => ({ ...prev, maxItems: parseInt(value) }))
              }
            >
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">Top 5</SelectItem>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="15">Top 15</SelectItem>
                <SelectItem value="20">Top 20</SelectItem>
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

// Lazy-loaded components
export const LazyTypeChart = lazy(() => Promise.resolve({ default: TypeChart }));
export const LazyPriorityChart = lazy(() => Promise.resolve({ default: PriorityChart }));
export const LazyStatusChart = lazy(() => Promise.resolve({ default: StatusChart }));
export const LazyAssigneeChart = lazy(() => Promise.resolve({ default: AssigneeChart }));
export const LazyCompanyChart = lazy(() => Promise.resolve({ default: CompanyChart }));
export const LazyTicketsOverTimeChart = lazy(() => Promise.resolve({ default: TicketsOverTimeChart }));
export const LazyPriorityTrendsChart = lazy(() => Promise.resolve({ default: PriorityTrendsChart }));
export const LazyITSMRadarChart = lazy(() => Promise.resolve({ default: ITSMRadarChart }));
export const LazyITSMDashboard = lazy(() => Promise.resolve({ default: ITSMDashboard }));

// Chart wrapper with suspense
export const ITSMChartWithSuspense: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <Suspense fallback={<ChartSkeleton />}>
    {children}
  </Suspense>
);

// Set display names
StatusChart.displayName = "StatusChart";
PriorityChart.displayName = "PriorityChart";
CompanyChart.displayName = "CompanyChart";
TicketsOverTimeChart.displayName = "TicketsOverTimeChart";
ChartSkeleton.displayName = "ChartSkeleton";
PriorityTrendsChart.displayName = "PriorityTrendsChart";
ITSMRadarChart.displayName = "ITSMRadarChart";
ITSMDashboard.displayName = "ITSMDashboard";
AssigneeChart.displayName = "AssigneeChart";
TypeChart.displayName = "TypeChart";
KPICard.displayName = "KPICard";

// Export types
export type { ChartConfig, ChartProps, ITSMTicket };