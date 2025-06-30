"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ContentCard } from "../../../dashboard/ContentCard";
import React from "react";


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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface ChartProps {
  filteredTickets: ITSMTicket[];
}

export const TypeChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const getTypeStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.type] = (acc[ticket.type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number));
  };

  return (
    <ContentCard title="Ticket Types">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={getTypeStats()}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {getTypeStats().map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
};

export const PriorityChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const getPriorityStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number));
  };

  return (
    <ContentCard title="Priority Distribution">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getPriorityStats()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Tickets" fill="#00C49F" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
};

export const StatusChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const getStatusStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number));
  };

  return (
    <ContentCard title="Status Distribution">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={getStatusStats()}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {getStatusStats().map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
};

export const AssigneeChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const getAssigneeStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.assignee] = (acc[ticket.assignee] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  };

  return (
    <ContentCard title="Assignee Distribution">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getAssigneeStats()} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
};

export const TicketsOverTimeChart: React.FC<ChartProps> = ({
  filteredTickets,
}) => {
  const getTicketsByMonth = () => {
    const monthData = filteredTickets.reduce(
      (acc: Map<string, number>, ticket) => {
        const monthYear = format(ticket.createdAt, "MMM yyyy", { locale: fr });
        acc.set(monthYear, (acc.get(monthYear) || 0) + 1);
        return acc;
      },
      new Map()
    );

    return Array.from(monthData.entries())
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => {
        const [monthA, yearA] = a.month.split(" ");
        const [monthB, yearB] = b.month.split(" ");
        return (
          new Date(`${monthA} 1, ${yearA}`).getTime() -
          new Date(`${monthB} 1, ${yearB}`).getTime()
        );
      });
  };

  return (
    <ContentCard title="Tickets Over Time">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={getTicketsByMonth()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="count"
              name="Tickets"
              stroke="#8884d8"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
};

export const ChangesVsIncidentsChart: React.FC<ChartProps> = ({
  filteredTickets,
}) => {
  const getTypeStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.type] = (acc[ticket.type] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number));
  };

  return (
    <ContentCard title="Changes vs Incidents">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={getTypeStats()}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {getTypeStats().map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
};

export const PriorityTrendsChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const getPriorityStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => (b.value as number) - (a.value as number));
  };

  return (
    <ContentCard title="Priority Trends">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getPriorityStats()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="value" name="Tickets" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
};

export const AssigneeWorkloadChart: React.FC<ChartProps> = ({
  filteredTickets,
}) => {
  const getAssigneeStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.assignee] = (acc[ticket.assignee] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .map(([name, value]) => ({ name, value }));
  };

  return (
    <ContentCard title="Assignee Workload">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getAssigneeStats()}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
};