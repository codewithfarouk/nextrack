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

import React from "react";
import { ContentCard } from "../../../dashboard/ContentCard";

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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

interface ChartProps {
  filteredTickets: ClarifyTicket[];
}

export const StatusChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const getStatusStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.status] = (acc[ticket.status] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
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

export const SeverityChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const getSeverityStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[`Severity ${ticket.severity}`] =
        (acc[`Severity ${ticket.severity}`] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  return (
    <ContentCard title="Severity Distribution">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={getSeverityStats()}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {getSeverityStats().map((entry, index) => (
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

export const RegionChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const getRegionStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.region] = (acc[ticket.region] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  return (
    <ContentCard title="Regional Distribution">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getRegionStats()}>
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

export const CompanyChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const getCompanyStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.company] = (acc[ticket.company] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  };

  return (
    <ContentCard title="Top Companies by Ticket Volume">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getCompanyStats()} layout="vertical">
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

export const PriorityChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const getPriorityStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[ticket.priority] = (acc[ticket.priority] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  return (
    <ContentCard title="Priority Distribution">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={getPriorityStats()}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
            >
              {getPriorityStats().map((entry, index) => (
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

export const SeverityTrendsChart: React.FC<ChartProps> = ({
  filteredTickets,
}) => {
  const getSeverityStats = () => {
    const stats = filteredTickets.reduce((acc: any, ticket) => {
      acc[`Severity ${ticket.severity}`] =
        (acc[`Severity ${ticket.severity}`] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  return (
    <ContentCard title="Severity Trends">
      <div className="h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getSeverityStats()}>
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

export const ResolutionTimeChart: React.FC<{ tickets: ClarifyTicket[] }> = ({
  tickets,
}) => {
  return (
    <ContentCard title="Resolution Time by Region">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={Array.from(new Set(tickets.map((t) => t.region))).map(
              (region) => {
                const regionTickets = tickets.filter(
  (t) =>
    t.region === region &&
    t.closedAt instanceof Date &&
    !isNaN(t.closedAt.getTime())
);

                return {
                  region,
                  avgHours:
                    regionTickets.length > 0
                      ? Math.round(
                          regionTickets.reduce(
                            (acc, t) =>
                              acc +
                              (t.closedAt!.getTime() - t.createdAt.getTime()) /
                                (1000 * 60 * 60),
                            0
                          ) / regionTickets.length
                        )
                      : 0,
                };
              }
            )}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="region" />
            <YAxis
              label={{
                value: "Average Resolution Time (hours)",
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip />
            <Bar dataKey="avgHours" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ContentCard>
  );
};

export const OwnerChart: React.FC<ChartProps> = ({ filteredTickets }) => {
  const OWNER_NAME_MAPPING: Record<string, string> = {
    ee0023059: "Nada BELMAATI",
    ee0023068: "Mohamed AZFAR AZAMI",
    ee0023070: "Youssef RAYOUD",
    ee0095270: "Chafik ZARHOUR",
  };

  const getOwnerStats = () => {
  const stats = filteredTickets.reduce((acc: any, ticket) => {
    const normalizedOwner = ticket.owner.toLowerCase();
    const ownerName = OWNER_NAME_MAPPING[normalizedOwner] || ticket.owner;
    acc[ownerName] = (acc[ownerName] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(stats)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));
};

  return (
    <ContentCard title="Top Owners by Ticket Volume">
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={getOwnerStats()} layout="vertical">
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
