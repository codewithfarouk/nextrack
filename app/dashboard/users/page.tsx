"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../../components/ui/dialog";
import { DashboardLayout } from "../../../components/layout/DashboardLayout";
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  UserPlus,
  Loader2,
  Search,
  Users,
  Shield,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../../components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../../components/ui/alert-dialog";
import { Badge } from "../../../components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../../components/ui/tooltip";
import { debounce } from "lodash";

interface User {
  id: number;
  email: string;
  name: string | null;
  role: { id: number; name: string };
}

interface Role {
  id: number;
  name: string;
}

interface ApiError {
  error: string;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [userForm, setUserForm] = useState({
    id: 0,
    email: "",
    name: "",
    password: "",
    roleId: 0,
  });
  const [roleForm, setRoleForm] = useState({ name: "" });
  const [isEditingUser, setIsEditingUser] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userToDelete, setUserToDelete] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState<number | null>(null);
  const [isRoleDeleteDialogOpen, setIsRoleDeleteDialogOpen] = useState(false);
  const [isDeletingRole, setIsDeletingRole] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.role.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }
    if (status === "authenticated" && session?.user?.role !== "SUPERADMIN") {
      router.push("/dashboard");
      return;
    }
    if (status === "authenticated") {
      fetchUsers();
      fetchRoles();
    }
  }, [status, session, router]);

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const response = await fetch("/api/users");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setUsers(data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Fetch users error:", error);
      setFetchError("Failed to fetch users. Please try again.");
      toast.error("Failed to fetch users");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const response = await fetch("/api/roles");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setRoles(data);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (error) {
      console.error("Fetch roles error:", error);
      setFetchError("Failed to fetch roles. Please try again.");
      toast.error("Failed to fetch roles");
    }
  }, []);

  const handleUserSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);

      const method = isEditingUser ? "PUT" : "POST";
      const body = isEditingUser
        ? {
            id: userForm.id,
            email: userForm.email.trim(),
            name: userForm.name.trim() || null,
            roleId: userForm.roleId,
            password: userForm.password.trim() || undefined,
          }
        : {
            email: userForm.email.trim(),
            name: userForm.name.trim() || null,
            roleId: userForm.roleId,
          };

      try {
        const response = await fetch("/api/users", {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });

        if (response.ok) {
          toast.success(
            isEditingUser
              ? "User updated successfully! 🎉"
              : "Utilisateur créé ! Un email a été envoyé pour définir son mot de passe."
          );
          fetchUsers();
          resetUserForm();
          setIsUserFormOpen(false);
        } else {
          const errorData: ApiError = await response.json();
          toast.error(
            errorData.error ||
              (isEditingUser
                ? "Failed to update user"
                : "Failed to create user")
          );
        }
      } catch (error) {
        console.error("User submit error:", error);
        toast.error("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
    },
    [isEditingUser, userForm, fetchUsers]
  );

  const handleRoleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!roleForm.name.trim()) {
        toast.error("Role name is required");
        return;
      }

      setIsSubmitting(true);
      try {
        const response = await fetch("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: roleForm.name.trim() }),
        });

        if (response.ok) {
          toast.success("Role created successfully! 🎉");
          fetchRoles();
          setRoleForm({ name: "" });
          setIsRoleDialogOpen(false);
        } else {
          const errorData: ApiError = await response.json();
          toast.error(errorData.error || "Failed to create role");
        }
      } catch (error) {
        console.error("Role submit error:", error);
        toast.error("An unexpected error occurred");
      } finally {
        setIsSubmitting(false);
      }
    },
    [roleForm, fetchRoles]
  );

  const handleEditUser = useCallback((user: User) => {
    setUserForm({
      id: user.id,
      email: user.email,
      name: user.name || "",
      password: "",
      roleId: user.role.id,
    });
    setIsEditingUser(true);
    setIsUserFormOpen(true);
  }, []);

  const handleDeleteUser = useCallback((id: number) => {
    setUserToDelete(id);
    setIsDeleteDialogOpen(true);
  }, []);

  const confirmDeleteUser = useCallback(async () => {
    if (userToDelete === null) return;

    try {
      const response = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userToDelete }),
      });

      if (response.ok) {
        toast.success("User deleted successfully");
        fetchUsers();
      } else {
        const errorData: ApiError = await response.json();
        toast.error(errorData.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Delete user error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  }, [userToDelete, fetchUsers]);

  const handleDeleteRole = useCallback((id: number) => {
    setRoleToDelete(id);
    setIsRoleDeleteDialogOpen(true);
  }, []);

  const confirmDeleteRole = useCallback(async () => {
    if (roleToDelete === null) return;

    setIsDeletingRole(true);
    try {
      const response = await fetch("/api/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: roleToDelete }),
      });

      if (response.ok) {
        toast.success("Role deleted successfully");
        fetchRoles();
      } else {
        const errorData: ApiError = await response.json();
        toast.error(errorData.error || "Failed to delete role");
      }
    } catch (error) {
      console.error("Delete role error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsDeletingRole(false);
      setIsRoleDeleteDialogOpen(false);
      setRoleToDelete(null);
    }
  }, [roleToDelete, fetchRoles]);

  const resetUserForm = useCallback(() => {
    setUserForm({ id: 0, email: "", name: "", password: "", roleId: 0 });
    setIsEditingUser(false);
    setShowPassword(false);
  }, []);

  const handleInputChange = useCallback(
    (field: keyof typeof userForm, value: string | number) => {
      setUserForm((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const getRoleBadgeColor = useCallback((roleName: string) => {
    const lowerName = roleName.toLowerCase();
    if (lowerName.includes("superadmin"))
      return "bg-gradient-to-r from-red-500 to-pink-500 text-white border-0";
    if (lowerName.includes("admin"))
      return "bg-gradient-to-r from-orange-500 to-red-500 text-white border-0";
    if (lowerName.includes("manager"))
      return "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-0";
    if (lowerName.includes("user"))
      return "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0";
    return "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-0";
  }, []);

  const roleUserCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    roles.forEach((role) => {
      counts[role.id] = users.filter((user) => user.role.id === role.id).length;
    });
    return counts;
  }, [users, roles]);

  const getRoleToDeleteName = useMemo(() => {
    if (roleToDelete === null) return "";
    const role = roles.find((r) => r.id === roleToDelete);
    return role?.name || "";
  }, [roleToDelete, roles]);

  const stats = useMemo(
    () => ({
      totalUsers: users.length,
      totalRoles: roles.length,
      activeUsers: users.filter((user) => user.email).length,
    }),
    [users, roles]
  );

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900">
          <div className="p-6 space-y-8">
            {/* Header Section with Animation */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0 animate-in slide-in-from-top duration-500">
              <div className="space-y-2">
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  User Management
                </h1>
                <p className="text-muted-foreground text-lg">
                  Manage system users and roles with ease
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={fetchUsers}
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 hover:scale-105 transition-all duration-200 border-2 hover:border-blue-300 hover:shadow-md"
                      disabled={isLoading}
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                      />
                      <span>Refresh</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh user and role data</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() => {
                        resetUserForm();
                        setIsUserFormOpen(true);
                      }}
                      className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                      size="sm"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span>Add User</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Create a new user</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom duration-700">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-blue-50 dark:from-slate-800 dark:to-blue-900 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="p-6 flex items-center space-x-4">
                  <div className="p-3 bg-blue-500 rounded-full">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Total Users
                    </p>
                    <p className="text-3xl font-bold text-blue-600">
                      {stats.totalUsers}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-indigo-50 dark:from-slate-800 dark:to-indigo-900 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="p-6 flex items-center space-x-4">
                  <div className="p-3 bg-indigo-500 rounded-full">
                    <Shield className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      System Roles
                    </p>
                    <p className="text-3xl font-bold text-indigo-600">
                      {stats.totalRoles}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-green-50 dark:from-slate-800 dark:to-green-900 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <CardContent className="p-6 flex items-center space-x-4">
                  <div className="p-3 bg-green-500 rounded-full">
                    <UserPlus className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Active Users
                    </p>
                    <p className="text-3xl font-bold text-green-600">
                      {stats.activeUsers}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Error Display */}
            {fetchError && (
              <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 animate-in slide-in-from-top duration-300">
                <CardContent className="pt-6 flex justify-between items-center">
                  <p className="text-red-600 dark:text-red-400">{fetchError}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fetchUsers();
                      fetchRoles();
                    }}
                    className="border-red-300 text-red-600 hover:bg-red-100"
                  >
                    Retry
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Main Content */}
            <Tabs
              defaultValue="users"
              className="w-full animate-in fade-in duration-500"
            >
              <TabsList className="grid w-full grid-cols-2 mb-8 bg-white dark:bg-slate-800 shadow-lg rounded-xl p-1 border-0">
                <TabsTrigger
                  value="users"
                  className="rounded-lg font-medium transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Users Directory
                </TabsTrigger>
                <TabsTrigger
                  value="roles"
                  className="rounded-lg font-medium transition-all duration-200 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white data-[state=active]:shadow-lg"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  System Roles
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users" className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                  <CardHeader className="pb-4 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
                      <div>
                        <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white">
                          User Directory
                        </CardTitle>
                        <CardDescription className="text-base">
                          View, edit, and manage system users
                        </CardDescription>
                      </div>

                      {/* Search Bar */}
                      <div className="relative lg:w-80">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input
                          placeholder="Search users by name, email, or role..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 bg-white dark:bg-slate-700 border-2 focus:border-blue-400 transition-all duration-200"
                        />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="flex justify-center items-center py-20">
                        <div className="text-center space-y-4">
                          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
                          <p className="text-muted-foreground">
                            Loading users...
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-slate-700 dark:to-slate-600 border-b-2">
                              <TableHead className="font-semibold text-gray-700 dark:text-gray-200">
                                Email Address
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 dark:text-gray-200">
                                Full Name
                              </TableHead>
                              <TableHead className="font-semibold text-gray-700 dark:text-gray-200">
                                Role
                              </TableHead>
                              <TableHead className="text-right font-semibold text-gray-700 dark:text-gray-200">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers.length === 0 ? (
                              <TableRow>
                                <TableCell
                                  colSpan={4}
                                  className="text-center py-12"
                                >
                                  <div className="space-y-3">
                                    <Users className="h-12 w-12 text-muted-foreground mx-auto" />
                                    <p className="text-lg text-muted-foreground">
                                      {searchTerm
                                        ? "No users found matching your search"
                                        : "No users found"}
                                    </p>
                                    {searchTerm && (
                                      <Button
                                        variant="outline"
                                        onClick={() => setSearchTerm("")}
                                        className="mt-2"
                                      >
                                        Clear Search
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ) : (
                              filteredUsers.map((user, index) => (
                                <TableRow
                                  key={user.id}
                                  className="hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 dark:hover:from-slate-700 dark:hover:to-slate-600 transition-all duration-200 border-b border-gray-100 dark:border-slate-700"
                                  style={{ animationDelay: `${index * 50}ms` }}
                                >
                                  <TableCell className="font-medium text-gray-800 dark:text-gray-200">
                                    {user.email}
                                  </TableCell>
                                  <TableCell className="text-gray-600 dark:text-gray-300">
                                    {user.name || (
                                      <span className="italic text-muted-foreground">
                                        Not provided
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      className={`${getRoleBadgeColor(
                                        user.role.name
                                      )} shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105`}
                                    >
                                      {user.role.name}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleEditUser(user)}
                                            className="h-9 w-9 p-0 hover:bg-blue-100 dark:hover:bg-blue-900 text-blue-600 hover:text-blue-700 transform hover:scale-110 transition-all duration-200"
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Edit user
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              handleDeleteUser(user.id)
                                            }
                                            className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900 transform hover:scale-110 transition-all duration-200"
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          Delete user
                                        </TooltipContent>
                                      </Tooltip>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="roles" className="space-y-6">
                <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                  <CardHeader className="pb-6 border-b border-gray-100 dark:border-slate-700">
                    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
                      <div className="space-y-2">
                        <CardTitle className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                          <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-lg">
                            <Shield className="h-6 w-6 text-white" />
                          </div>
                          System Roles Management
                        </CardTitle>
                        <CardDescription className="text-base text-gray-600 dark:text-gray-300">
                          Define and manage user access levels and permissions
                          across the system
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">
                            Total Roles
                          </p>
                          <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                            {roles.length}
                          </p>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => setIsRoleDialogOpen(true)}
                              className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                              size="sm"
                            >
                              <Plus className="h-4 w-4" />
                              <span>New Role</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Create a new role</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-8">
                    {roles.length === 0 ? (
                      <div className="text-center py-16">
                        <div className="space-y-6">
                          <div className="mx-auto w-24 h-24 bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 rounded-full flex items-center justify-center">
                            <Shield className="h-12 w-12 text-indigo-500" />
                          </div>
                          <div className="space-y-2">
                            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                              No Roles Found
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                              Get started by creating your first role to define
                              user access levels in your system.
                            </p>
                          </div>
                          <Button
                            onClick={() => setIsRoleDialogOpen(true)}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create First Role
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-8">
                        {/* Role Statistics Overview */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-500 rounded-lg">
                                <Users className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                  Most Used Role
                                </p>
                                <p className="font-semibold text-blue-900 dark:text-blue-100">
                                  {roles.length > 0
                                    ? roles.reduce((max, role) =>
                                        (roleUserCounts[role.id] || 0) >
                                        (roleUserCounts[max.id] || 0)
                                          ? role
                                          : max
                                      ).name
                                    : "N/A"}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 p-4 rounded-xl border border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-green-500 rounded-lg">
                                <Shield className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-green-700 dark:text-green-300">
                                  Active Roles
                                </p>
                                <p className="font-semibold text-green-900 dark:text-green-100">
                                  {
                                    roles.filter(
                                      (role) =>
                                        (roleUserCounts[role.id] || 0) > 0
                                    ).length
                                  }{" "}
                                  of {roles.length}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950 p-4 rounded-xl border border-purple-200 dark:border-purple-800">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-purple-500 rounded-lg">
                                <UserPlus className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                                  Avg Users/Role
                                </p>
                                <p className="font-semibold text-purple-900 dark:text-purple-100">
                                  {roles.length > 0
                                    ? Math.round(
                                        stats.totalUsers / roles.length
                                      )
                                    : 0}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Roles Grid */}
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                              Role Directory
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {roles.length} role{roles.length !== 1 ? "s" : ""}{" "}
                              configured
                            </p>
                          </div>

                          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                            {roles.map((role, index) => {
                              const userCount = roleUserCounts[role.id] || 0;
                              const isSystemRole = role.name === "SUPERADMIN";
                              const usagePercentage =
                                stats.totalUsers > 0
                                  ? (userCount / stats.totalUsers) * 100
                                  : 0;

                              return (
                                <Card
                                  key={role.id}
                                  className={`group relative border-0 shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden ${
                                    isSystemRole
                                      ? "bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 dark:from-red-950 dark:via-pink-950 dark:to-rose-950"
                                      : "bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-slate-800 dark:via-slate-750 dark:to-slate-700"
                                  }`}
                                  style={{ animationDelay: `${index * 100}ms` }}
                                >
                                  {/* Background Pattern */}
                                  <div className="absolute inset-0 opacity-5">
                                    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/10" />
                                  </div>

                                  {/* System Role Badge */}
                                  {isSystemRole && (
                                    <div className="absolute top-0 right-0">
                                      <div className="bg-gradient-to-br from-red-500 to-pink-500 text-white px-3 py-1 text-xs font-semibold transform rotate-12 translate-x-2 -translate-y-1 shadow-lg">
                                        SYSTEM
                                      </div>
                                    </div>
                                  )}

                                  <CardHeader className="relative pb-4">
                                    <div className="flex items-start justify-between">
                                      <div className="flex items-center gap-3">
                                        <div
                                          className={`p-3 rounded-xl shadow-lg ${
                                            isSystemRole
                                              ? "bg-gradient-to-br from-red-500 to-pink-500"
                                              : "bg-gradient-to-br from-indigo-500 to-purple-500"
                                          }`}
                                        >
                                          <Shield className="h-6 w-6 text-white" />
                                        </div>
                                        <div className="space-y-1">
                                          <CardTitle className="text-xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                            {role.name}
                                          </CardTitle>
                                          <p className="text-sm text-gray-600 dark:text-gray-400">
                                            Role ID: #{role.id}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Action Button */}
                                      <div className="opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              onClick={() =>
                                                handleDeleteRole(role.id)
                                              }
                                              className="h-9 w-9 p-0 text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900 transform hover:scale-110 transition-all duration-200"
                                              disabled={isSystemRole}
                                            >
                                              <Trash2 className="h-4 w-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            {isSystemRole
                                              ? "Cannot delete system role"
                                              : "Delete role"}
                                          </TooltipContent>
                                        </Tooltip>
                                      </div>
                                    </div>
                                  </CardHeader>

                                  <CardContent className="space-y-6">
                                    {/* User Count Display */}
                                    <div className="space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                          Assigned Users
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <Users className="h-4 w-4 text-gray-500" />
                                          <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                            {userCount}
                                          </span>
                                        </div>
                                      </div>

                                      {/* Usage Bar */}
                                      <div className="space-y-2">
                                        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                                          <span>Usage</span>
                                          <span>
                                            {usagePercentage.toFixed(1)}%
                                          </span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                                          <div
                                            className={`h-3 rounded-full transition-all duration-700 ease-out ${
                                              isSystemRole
                                                ? "bg-gradient-to-r from-red-500 to-pink-500"
                                                : "bg-gradient-to-r from-indigo-500 to-purple-500"
                                            }`}
                                            style={{
                                              width: `${Math.min(
                                                usagePercentage,
                                                100
                                              )}%`,
                                              transitionDelay: `${
                                                index * 100
                                              }ms`,
                                            }}
                                          />
                                        </div>
                                      </div>
                                    </div>

                                    {/* Role Status */}
                                    <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-600 dark:text-gray-400">
                                          Status
                                        </span>
                                        <Badge
                                          className={`${
                                            userCount > 0
                                              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                                              : "bg-gradient-to-r from-gray-500 to-slate-500 text-white border-0"
                                          } transition-all duration-200`}
                                        >
                                          {userCount > 0 ? "Active" : "Unused"}
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Enhanced User Form Dialog */}
            <Dialog open={isUserFormOpen} onOpenChange={setIsUserFormOpen}>
              <DialogContent className="sm:max-w-lg border-0 shadow-2xl bg-white dark:bg-slate-800">
                <DialogHeader className="pb-6 border-b border-gray-100 dark:border-slate-700">
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {isEditingUser ? "Edit User" : "Create New User"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleUserSubmit} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                      >
                        Email Address *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={userForm.email}
                        onChange={(e) =>
                          handleInputChange("email", e.target.value)
                        }
                        placeholder="user../../../../example.com"
                        className="border-2 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-slate-700"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="name"
                        className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                      >
                        Full Name
                      </Label>
                      <Input
                        id="name"
                        value={userForm.name}
                        onChange={(e) =>
                          handleInputChange("name", e.target.value)
                        }
                        placeholder="John Doe"
                        className="border-2 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-slate-700"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="password"
                        className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                      >
                        {isEditingUser
                          ? "Nouveau mot de passe (optionnel)"
                          : "Mot de passe"}
                      </Label>

                      {isEditingUser ? (
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={userForm.password}
                            onChange={(e) =>
                              handleInputChange("password", e.target.value)
                            }
                            placeholder="Laisser vide pour conserver l'existant"
                            className="border-2 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-slate-700 pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-500" />
                            )}
                          </Button>
                        </div>
                      ) : (
                        <p className="text-sm italic text-muted-foreground">
                          Un email sera automatiquement envoyé à l&apos;utilisateur
                          pour définir son mot de passe.
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="role"
                        className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                      >
                        Role *
                      </Label>
                      <Select
                        value={
                          userForm.roleId ? userForm.roleId.toString() : ""
                        }
                        onValueChange={(value) =>
                          handleInputChange("roleId", parseInt(value))
                        }
                      >
                        <SelectTrigger className="border-2 focus:border-blue-400 transition-all duration-200 bg-white dark:bg-slate-700">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem
                              key={role.id}
                              value={role.id.toString()}
                            >
                              <div className="flex items-center gap-2">
                                <Shield className="h-4 w-4" />
                                {role.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter className="pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        resetUserForm();
                        setIsUserFormOpen(false);
                      }}
                      className="flex-1 border-2 hover:border-gray-400 transition-all duration-200"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          {isEditingUser ? "Updating..." : "Creating..."}
                        </>
                      ) : isEditingUser ? (
                        "Update User"
                      ) : (
                        "Create User"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Enhanced Role Dialog */}
            <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
              <DialogContent className="sm:max-w-md border-0 shadow-2xl bg-white dark:bg-slate-800">
                <DialogHeader className="pb-6 border-b border-gray-100 dark:border-slate-700">
                  <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Create New Role
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRoleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="roleName"
                      className="text-sm font-semibold text-gray-700 dark:text-gray-200"
                    >
                      Role Name *
                    </Label>
                    <Input
                      id="roleName"
                      value={roleForm.name}
                      onChange={(e) => setRoleForm({ name: e.target.value })}
                      placeholder="Enter role name (e.g., Manager, Editor)"
                      className="border-2 focus:border-indigo-400 transition-all duration-200 bg-white dark:bg-slate-700"
                      required
                    />
                  </div>
                  <DialogFooter className="pt-6 border-t border-gray-100 dark:border-slate-700">
                    <Button
                      type="submit"
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 shadow-lg hover:shadow-xl transition-all duration-200"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Creating Role...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Role
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Enhanced Delete User Dialog */}
            <AlertDialog
              open={isDeleteDialogOpen}
              onOpenChange={setIsDeleteDialogOpen}
            >
              <AlertDialogContent className="border-0 shadow-2xl bg-white dark:bg-slate-800">
                <AlertDialogHeader className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                      <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        Delete User
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-600 dark:text-gray-300 mt-1">
                        This action cannot be undone. This will permanently
                        delete the user and remove their data from the system.
                      </AlertDialogDescription>
                    </div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel className="border-2 hover:border-gray-400 transition-all duration-200">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteUser}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete User
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Enhanced Delete Role Dialog */}
            <AlertDialog
              open={isRoleDeleteDialogOpen}
              onOpenChange={setIsRoleDeleteDialogOpen}
            >
              <AlertDialogContent className="border-0 shadow-2xl bg-white dark:bg-slate-800">
                <AlertDialogHeader className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                      <Shield className="h-6 w-6 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <AlertDialogTitle className="text-xl font-bold text-gray-900 dark:text-white">
                        Delete Role: {getRoleToDeleteName}
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-600 dark:text-gray-300 mt-1">
                        This action cannot be undone. Ensure no users are
                        assigned to the role {getRoleToDeleteName} before
                        deleting.
                      </AlertDialogDescription>
                    </div>
                  </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                  <AlertDialogCancel className="border-2 hover:border-gray-400 transition-all duration-200">
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={confirmDeleteRole}
                    className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={isDeletingRole}
                  >
                    {isDeletingRole ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Role
                      </>
                    )}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
