"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import { 
  Users, 
  Settings, 
  FileText, 
  Shield, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Eye, 
  Edit, 
  Trash2, 
  Calendar, 
  Clock, 
  User, 
  Activity, 
  TrendingUp, 
  BarChart3, 
  AlertCircle 
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Badge } from "../../components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";

// Type definitions with proper nullable handling
interface User {
  id: string;
  name?: string | null;
  email: string;
  role?: {
    name: string;
  } | null;
  createdAt?: string | null;
}

interface Backlog {
  id: string;
  title: string;
  content?: string | null;
  moduleType?: string | null;
  status?: string | null;
  creator?: {
    name?: string | null;
    email?: string | null;
  } | null;
  roles?: Array<{ name: string }> | null;
  createdAt?: string | null;
}

interface Role {
  id: string;
  name: string;
}

interface Stats {
  totalUsers: number;
  totalBacklogs: number;
  totalRoles: number;
  activeProjects: number;
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: number;
  trend: string;
  color: string;
}

interface TabButtonProps {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: (id: string) => void;
}

interface UserCardProps {
  user: User;
  onDelete: (userId: string) => void;
}

interface BacklogCardProps {
  backlog: Backlog;
  onDelete: (backlogId: string) => void;
  userRole?: string;
}

interface RoleCardProps {
  role: Role;
  onDelete: (roleId: string, roleName: string) => void;
  userRole?: string;
}

const Dashboard: React.FC = () => {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [users, setUsers] = useState<User[]>([]);
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalBacklogs: 0,
    totalRoles: 0,
    activeProjects: 0,
  });
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [error, setError] = useState<string | null>(null);

  // Safe data transformation functions
  const safeTransformUsers = (data: any[]): User[] => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: String(item?.id || ''),
      name: item?.name || null,
      email: String(item?.email || ''),
      role: item?.role ? { name: String(item.role.name || '') } : null,
      createdAt: item?.createdAt ? String(item.createdAt) : null,
    }));
  };

  const safeTransformBacklogs = (data: any[]): Backlog[] => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: String(item?.id || ''),
      title: String(item?.title || 'Untitled'),
      content: item?.content ? String(item.content) : null,
      moduleType: item?.moduleType ? String(item.moduleType) : null,
      status: item?.status ? String(item.status) : null,
      creator: item?.creator ? {
        name: item.creator.name ? String(item.creator.name) : null,
        email: item.creator.email ? String(item.creator.email) : null,
      } : null,
      roles: Array.isArray(item?.roles) ? item.roles.map((role: any) => ({
        name: String(role?.name || '')
      })) : null,
      createdAt: item?.createdAt ? String(item.createdAt) : null,
    }));
  };

  const safeTransformRoles = (data: any[]): Role[] => {
    if (!Array.isArray(data)) return [];
    return data.map(item => ({
      id: String(item?.id || ''),
      name: String(item?.name || ''),
    }));
  };

  // Fetch data from backend APIs
  useEffect(() => {
    if (status === "loading") return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch all data in parallel with proper error handling
        const fetchWithErrorHandling = async (url: string, fallback: any[] = []) => {
          try {
            const response = await fetch(url);
            if (!response.ok) {
              console.warn(`Failed to fetch from ${url}: ${response.status}`);
              return fallback;
            }
            const data = await response.json();
            return Array.isArray(data) ? data : fallback;
          } catch (error) {
            console.warn(`Error fetching from ${url}:`, error);
            return fallback;
          }
        };

        const [usersData, backlogsData, rolesData] = await Promise.all([
          fetchWithErrorHandling("/api/users", []),
          fetchWithErrorHandling("/api/backlogs", []),
          fetchWithErrorHandling("/api/roles", []),
        ]);

        // Safely transform the data
        const transformedUsers = safeTransformUsers(usersData);
        const transformedBacklogs = safeTransformBacklogs(backlogsData);
        const transformedRoles = safeTransformRoles(rolesData);

        setUsers(transformedUsers);
        setBacklogs(transformedBacklogs);
        setRoles(transformedRoles);

        // Calculate stats safely
        const activeProjectsCount = transformedBacklogs.filter(b => 
          b.status && b.status.toLowerCase() === "active"
        ).length;

        setStats({
          totalUsers: transformedUsers.length,
          totalBacklogs: transformedBacklogs.length,
          totalRoles: transformedRoles.length,
          activeProjects: activeProjectsCount,
        });
      } catch (err) {
        console.error("Error fetching data:", err);
        const errorMessage = err instanceof Error ? err.message : "Failed to load dashboard data";
        setError(errorMessage);
        setUsers([]);
        setBacklogs([]);
        setRoles([]);
        setStats({ totalUsers: 0, totalBacklogs: 0, totalRoles: 0, activeProjects: 0 });
        toast.error("Failed to load dashboard data");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [status]);

  // Handle user actions with proper error handling
  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });

      if (res.ok) {
        setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
        setStats(prev => ({ ...prev, totalUsers: Math.max(0, prev.totalUsers - 1) }));
        toast.success("User deleted successfully");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to delete user");
      }
    } catch (err) {
      console.error("Error deleting user:", err);
      toast.error("Error deleting user");
    }
  };

  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (roleName === "SUPERADMIN") {
      toast.error("Cannot delete SUPERADMIN role");
      return;
    }

    if (!confirm(`Are you sure you want to delete the ${roleName} role?`)) return;

    try {
      const res = await fetch("/api/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roleId }),
      });

      if (res.ok) {
        setRoles(prevRoles => prevRoles.filter(role => role.id !== roleId));
        setStats(prev => ({ ...prev, totalRoles: Math.max(0, prev.totalRoles - 1) }));
        toast.success("Role deleted successfully");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to delete role");
      }
    } catch (err) {
      console.error("Error deleting role:", err);
      toast.error("Error deleting role");
    }
  };

  const handleDeleteBacklog = async (backlogId: string) => {
    if (!confirm("Are you sure you want to delete this backlog?")) return;

    try {
      const res = await fetch(`/api/backlogs/${backlogId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        const deletedBacklog = backlogs.find(b => b.id === backlogId);
        setBacklogs(prevBacklogs => prevBacklogs.filter(backlog => backlog.id !== backlogId));
        setStats(prev => ({
          ...prev,
          totalBacklogs: Math.max(0, prev.totalBacklogs - 1),
          activeProjects: deletedBacklog?.status?.toLowerCase() === "active" 
            ? Math.max(0, prev.activeProjects - 1)
            : prev.activeProjects,
        }));
        toast.success("Backlog deleted successfully");
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to delete backlog");
      }
    } catch (err) {
      console.error("Error deleting backlog:", err);
      toast.error("Error deleting backlog");
    }
  };

  // Safe filtering functions
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm.toLowerCase();
    const userName = user.name?.toLowerCase() || '';
    const userEmail = user.email?.toLowerCase() || '';
    return userName.includes(searchLower) || userEmail.includes(searchLower);
  });

  const filteredBacklogs = backlogs.filter(backlog => {
    const matchesModule = selectedModule === "all" || backlog.moduleType === selectedModule;
    const searchLower = searchTerm.toLowerCase();
    const title = backlog.title?.toLowerCase() || '';
    const content = backlog.content?.toLowerCase() || '';
    const matchesSearch = title.includes(searchLower) || content.includes(searchLower);
    return matchesModule && matchesSearch;
  });

  // Helper function to safely format dates
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return "Invalid date";
    }
  };

  const formatDateTime = (dateString: string | null | undefined): string => {
    if (!dateString) return "Unknown";
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return "Invalid date";
    }
  };

  const StatCard: React.FC<StatCardProps> = ({ icon: Icon, title, value, trend, color }) => (
    <motion.div
      className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-gray-50 p-6 shadow-sm border border-gray-100 hover:shadow-xl"
      whileHover={{ y: -5, boxShadow: "0 10px 20px rgba(0,0,0,0.1)" }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color} shadow-lg`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="text-emerald-500 text-sm font-medium flex items-center">
            <TrendingUp className="w-4 h-4 mr-1" />
            {trend}
          </div>
        </div>
        <h3 className="text-gray-600 text-sm font-medium mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
      </div>
    </motion.div>
  );

  const TabButton: React.FC<TabButtonProps> = ({ id, icon: Icon, label, isActive, onClick }) => (
    <motion.button
      onClick={() => onClick(id)}
      className={`flex items-center px-6 py-3 rounded-xl font-medium transition-all duration-300 ${
        isActive
          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon className="w-5 h-5 mr-2" />
      {label}
    </motion.button>
  );

  const UserCard: React.FC<UserCardProps> = ({ user, onDelete }) => (
    <motion.div
      className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            {(user.name?.charAt(0) || user.email?.charAt(0) || "?").toUpperCase()}
          </div>
          <div className="ml-4">
            <h3 className="font-semibold text-gray-900">{user.name || "No Name"}</h3>
            <p className="text-gray-500 text-sm">{user.email || "No Email"}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge
            className={`px-3 py-1 rounded-full text-xs font-medium ${
              user.role?.name === "SUPERADMIN" 
                ? "bg-red-100 text-red-700" 
                : user.role?.name === "IM" 
                ? "bg-blue-100 text-blue-700" 
                : "bg-green-100 text-green-700"
            }`}
          >
            {user.role?.name || "No Role"}
          </Badge>
          <Button variant="ghost" size="icon" aria-label="More options">
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-1" />
          Joined {formatDate(user.createdAt)}
        </div>
        <div className="flex space-x-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/users/${user.id}`} aria-label="View user">
              <Eye className="w-4 h-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/users/${user.id}/edit`} aria-label="Edit user">
              <Edit className="w-4 h-4" />
            </Link>
          </Button>
          {session?.user?.role === "SUPERADMIN" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(user.id)}
              aria-label="Delete user"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const BacklogCard: React.FC<BacklogCardProps> = ({ backlog, onDelete, userRole }) => (
    <motion.div
      className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center mb-2">
            <h3 className="font-semibold text-gray-900 mr-3">{backlog.title}</h3>
            {backlog.moduleType && (
              <Badge
                className={`px-2 py-1 rounded-lg text-xs font-medium ${
                  backlog.moduleType === "AUTH" 
                    ? "bg-purple-100 text-purple-700" 
                    : backlog.moduleType === "DB" 
                    ? "bg-orange-100 text-orange-700" 
                    : backlog.moduleType === "API" 
                    ? "bg-cyan-100 text-cyan-700" 
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {backlog.moduleType}
              </Badge>
            )}
          </div>
          <p className="text-gray-600 text-sm mb-3">
            {backlog.content || "No description available"}
          </p>
          <div className="flex items-center text-sm text-gray-500">
            <User className="w-4 h-4 mr-1" />
            Created by {backlog.creator?.name || backlog.creator?.email || "Unknown"}
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="More options">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </Button>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {backlog.roles && backlog.roles.length > 0 ? (
            backlog.roles.map((role, index) => (
              <Badge key={`${backlog.id}-role-${index}`} variant="outline" className="px-2 py-1 text-xs">
                {role.name}
              </Badge>
            ))
          ) : (
            <Badge variant="outline" className="px-2 py-1 text-xs">No roles</Badge>
          )}
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/backlogs/${backlog.id}`}>View</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/backlogs/${backlog.id}/edit`}>Edit</Link>
          </Button>
          {userRole === "SUPERADMIN" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(backlog.id)}
              className="text-red-500 hover:text-red-600"
            >
              Delete
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );

  const RoleCard: React.FC<RoleCardProps> = ({ role, onDelete, userRole }) => (
    <motion.div
      className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-xl"
      whileHover={{ y: -5 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ${
              role.name === "SUPERADMIN" 
                ? "bg-gradient-to-br from-red-500 to-red-600" 
                : role.name === "IM" 
                ? "bg-gradient-to-br from-blue-500 to-blue-600" 
                : "bg-gradient-to-br from-green-500 to-green-600"
            }`}
          >
            <Shield className="w-6 h-6" />
          </div>
          <div className="ml-4">
            <h3 className="font-semibold text-gray-900">{role.name}</h3>
            <p className="text-gray-500 text-sm">Role permissions</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" aria-label="More options">
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </Button>
      </div>
      <div className="flex space-x-2">
        <Button variant="outline" size="sm" asChild className="flex-1">
          <Link href={`/roles/${role.id}/edit`}>Edit</Link>
        </Button>
        {role.name !== "SUPERADMIN" && userRole === "SUPERADMIN" && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(role.id, role.name)}
            className="flex-1 text-red-500 hover:text-red-600"
          >
            Delete
          </Button>
        )}
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <Card className="p-6">
          <CardHeader>
            <CardTitle className="text-red-500 flex items-center gap-2">
              <AlertCircle className="w-6 h-6" />
              Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">
                Dashboard
              </h1>
              <p className="text-gray-600 mt-2">
                Welcome back, {session?.user?.name || session?.user?.email || 'User'}
              </p>
            </div>
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="text-right">
                <p className="text-sm text-gray-500">Signed in as</p>
                <p className="font-medium text-gray-900">{session?.user?.role || 'User'}</p>
              </div>
              <Button asChild className="bg-gradient-to-r from-blue-500 to-purple-600 hover:shadow-xl">
                <Link href="/create" className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Add New
                </Link>
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap gap-2 bg-white rounded-2xl p-2 shadow-sm border border-gray-100">
            <TabButton 
              id="overview" 
              icon={BarChart3} 
              label="Overview" 
              isActive={activeTab === "overview"} 
              onClick={setActiveTab} 
            />
            <TabButton 
              id="users" 
              icon={Users} 
              label="Users" 
              isActive={activeTab === "users"} 
              onClick={setActiveTab} 
            />
            <TabButton 
              id="roles" 
              icon={Shield} 
              label="Roles" 
              isActive={activeTab === "roles"} 
              onClick={setActiveTab} 
            />
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="space-y-8">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <StatCard 
                icon={Users} 
                title="Total Users" 
                value={stats.totalUsers} 
                trend="+12%" 
                color="from-blue-500 to-blue-600" 
              />
              <StatCard 
                icon={FileText} 
                title="Backlogs" 
                value={stats.totalBacklogs} 
                trend="+8%" 
                color="from-green-500 to-green-600" 
              />
              <StatCard 
                icon={Shield} 
                title="Roles" 
                value={stats.totalRoles} 
                trend="+3%" 
                color="from-purple-500 to-purple-600" 
              />
              <StatCard 
                icon={Activity} 
                title="Active Projects" 
                value={stats.activeProjects} 
                trend="+15%" 
                color="from-orange-500 to-orange-600" 
              />
            </div>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {backlogs.slice(0, 3).map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      className="flex items-center p-4 bg-gray-50 rounded-xl"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        {index + 1}
                      </div>
                      <div className="ml-4 flex-1">
                        <p className="font-medium text-gray-900">New backlog: {activity.title}</p>
                        <p className="text-gray-500 text-sm">
                          {formatDateTime(activity.createdAt)}
                        </p>
                      </div>
                      <Clock className="w-5 h-5 text-gray-400" />
                    </motion.div>
                  ))}
                  {backlogs.length === 0 && (
                    <p className="text-gray-500 text-center">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Users Management</h2>
              <div className="flex space-x-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search users..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Button variant="outline" className="flex items-center">
                  <Filter className="w-5 h-5 mr-2" />
                  Filter
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredUsers.map((user) => (
                <UserCard key={user.id} user={user} onDelete={handleDeleteUser} />
              ))}
              {filteredUsers.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No users found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Backlogs Tab */}
        {activeTab === "backlogs" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Backlogs Management</h2>
              <div className="flex space-x-3 w-full sm:w-auto">
                <select
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={selectedModule}
                  onChange={(e) => setSelectedModule(e.target.value)}
                >
                  <option value="all">All Modules</option>
                  <option value="AUTH">Authentication</option>
                  <option value="DB">Database</option>
                  <option value="API">API</option>
                </select>
                <div className="relative flex-1 sm:flex-none">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    type="text"
                    placeholder="Search backlogs..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {filteredBacklogs.map((backlog) => (
                <BacklogCard 
                  key={backlog.id} 
                  backlog={backlog} 
                  onDelete={handleDeleteBacklog}
                  userRole={session?.user?.role}
                />
              ))}
              {filteredBacklogs.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No backlogs found</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Roles Tab */}
        {activeTab === "roles" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-gray-900">Roles Management</h2>
              <Button asChild className="bg-gradient-to-r from-green-500 to-green-600 hover:shadow-xl">
                <Link href="/roles/create" className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Add Role
                </Link>
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {roles.map((role) => (
                <RoleCard 
                  key={role.id} 
                  role={role} 
                  onDelete={handleDeleteRole}
                  userRole={session?.user?.role}
                />
              ))}
              {roles.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">No roles found</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default Dashboard;