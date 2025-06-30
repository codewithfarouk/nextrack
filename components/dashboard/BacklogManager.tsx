"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { ScrollArea } from "../../components/ui/scroll-area";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import {
  Save,
  Trash2,
  Download,
  FolderOpen,
  Clock,
  User,
  Users,
  FileText,
  Filter,
  History,
  Loader2,
  Star,
  Pin,
} from "lucide-react";
import { toast } from "sonner";
import { Backlog } from "../../hooks/use-backlogs";
import { useSession } from "next-auth/react";

interface Role {
  id: number;
  name: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface ActiveHistorique {
  backlogId: string;
  backlog: Backlog;
  activatedAt: string;
  activatedBy: {
    id: string;
    name: string;
    email: string;
  };
}

interface ExtendedBacklog extends Backlog {
  isHistorique?: boolean;
  activatedAt?: string;
  activatedBy?: { id: string; name: string; email: string };
  creator?: {
    id: string;
    name: string;
    email?: string;
    role?: {
      id: number;
      name: string;
    };
  };
}


interface BacklogManagerProps {
  backlogs: ExtendedBacklog[];
  onSave: (name: string, roleIds: number[], createdById: string) => void;
  onDelete: (id: string) => void;
  onLoad: (id: string) => void;
  onExport: (id: string) => void;
  onHistorique?: (backlogId: string | null) => void;
  currentData: any[];
}

export function BacklogManager({
  backlogs,
  onSave,
  onDelete,
  onLoad,
  onExport,
  onHistorique,
  currentData,
}: BacklogManagerProps) {
  const { data: session } = useSession();
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeHistorique, setActiveHistorique] = useState<ActiveHistorique | null>(null);
  const [isLoadingHistorique, setIsLoadingHistorique] = useState(false);
  const [isLoadingBacklogs, setIsLoadingBacklogs] = useState(true);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [historiqueLoaded, setHistoriqueLoaded] = useState(false);

  // Use refs to prevent infinite loops
  const intervalRef = useRef<NodeJS.Timeout>();
  const mountedRef = useRef(true);

  const [newBacklogName] = useState(() => {
    const now = new Date();
    return `backlog_${format(now, "yyyy-MM-dd_HH'h'mm'm'ss's'")}`;
  });

  // Memoize permission checks to prevent unnecessary recalculations
  const canViewHistorique = useMemo(() => !!session?.user, [session?.user]);
  const canManageHistorique = useMemo(
    () => ["IM", "SDM"].includes(session?.user?.role || ""),
    [session?.user?.role]
  );
  const canDeleteBacklog = useMemo(
    () => ["SUPERADMIN", "IM", "SDM"].includes(session?.user?.role || ""),
    [session?.user?.role]
  );

  // Stable fetch functions with proper dependencies
  const fetchActiveHistorique = useCallback(async () => {
    if (!canViewHistorique || !mountedRef.current) return;
    
    try {
      setIsLoadingHistorique(true);
      const response = await fetch("/api/historique");
      if (response.ok) {
        const data = await response.json();
        if (mountedRef.current) {
          setActiveHistorique(data.activeHistorique);
          setHistoriqueLoaded(true);
        }
      } else if (mountedRef.current) {
        toast.error("Failed to fetch active historique");
      }
    } catch (error) {
      console.error("Error fetching active historique:", error);
      if (mountedRef.current) {
        toast.error("Error fetching active historique");
      }
    } finally {
      if (mountedRef.current) {
        setIsLoadingHistorique(false);
      }
    }
  }, [canViewHistorique]);

  const fetchUsers = useCallback(async () => {
    if (!mountedRef.current || usersLoaded) return;
    
    try {
      const response = await fetch("/api/users");
      if (response.ok) {
        const data = await response.json();
        if (mountedRef.current) {
          setUsers(data);
          setUsersLoaded(true);
        }
      } else if (mountedRef.current) {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      if (mountedRef.current) {
        toast.error("Error fetching users");
      }
    }
  }, [usersLoaded]);

  // Setup polling for historique data only
  const setupHistoriquePolling = useCallback(() => {
    if (!canViewHistorique) return;

    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      if (mountedRef.current && canViewHistorique) {
        fetchActiveHistorique();
      }
    }, 10000); // Increased to 10 seconds to reduce server load

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [canViewHistorique, fetchActiveHistorique]);

  // Initial data fetching
  useEffect(() => {
    let isMounted = true;
    mountedRef.current = true;

    const initializeData = async () => {
      try {
        // Fetch users only once
        if (!usersLoaded) {
          await fetchUsers();
        }

        // Fetch historique data
        if (canViewHistorique && !historiqueLoaded) {
          await fetchActiveHistorique();
        }

        if (isMounted) {
          setIsLoadingBacklogs(false);
        }
      } catch (error) {
        console.error("Error initializing data:", error);
        if (isMounted) {
          setIsLoadingBacklogs(false);
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
      mountedRef.current = false;
    };
  }, [fetchUsers, fetchActiveHistorique, canViewHistorique, usersLoaded, historiqueLoaded]);

  // Setup polling separately
  useEffect(() => {
    const cleanup = setupHistoriquePolling();
    return cleanup;
  }, [setupHistoriquePolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleSave = useCallback(() => {
    if (!newBacklogName.trim()) {
      toast.error("Backlog name cannot be empty");
      return;
    }
    if (currentData.length === 0) {
      toast.error("No data to save");
      return;
    }
    if (selectedRoleIds.length === 0) {
      toast.error("Please select at least one role");
      return;
    }
    if (!session?.user?.id) {
      toast.error("User session not found");
      return;
    }
    onSave(newBacklogName.trim(), selectedRoleIds, session.user.id);
    setSelectedRoleIds([]);
    setSaveDialogOpen(false);
    toast.success("Backlog saved successfully");
  }, [newBacklogName, currentData.length, selectedRoleIds, session?.user?.id, onSave]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (!mountedRef.current) return;

      try {
        const response = await fetch(`/api/backlogs/${id}`, {
          method: "DELETE",
        });
        if (response.ok && mountedRef.current) {
          onDelete(id);
          toast.success("Backlog deleted successfully");
        } else if (mountedRef.current) {
          const errorData = await response.json();
          toast.error(errorData.error || "Failed to delete backlog");
        }
      } catch (error) {
        console.error("Error deleting backlog:", error);
        if (mountedRef.current) {
          toast.error("Error deleting backlog");
        }
      }
    },
    [onDelete]
  );

  const handleLoad = useCallback(
    (id: string) => {
      onLoad(id);
      toast.success("Backlog loaded successfully");
    },
    [onLoad]
  );

  const handleHistorique = useCallback(
    async (id: string) => {
      if (isLoadingHistorique || !canManageHistorique || !mountedRef.current) return;
      
      setIsLoadingHistorique(true);
      try {
        const isCurrentlyActive = activeHistorique?.backlogId === id;
        const method = isCurrentlyActive ? "DELETE" : "POST";
        const response = await fetch("/api/historique", {
          method,
          headers: { "Content-Type": "application/json" },
          body: isCurrentlyActive
            ? undefined
            : JSON.stringify({ backlogId: id }),
        });

        if (response.ok && mountedRef.current) {
          const data = isCurrentlyActive ? null : await response.json();
          setActiveHistorique(data?.activeHistorique || null);
          toast.success(
            isCurrentlyActive
              ? "Historique deactivated"
              : "Historique activated for this backlog"
          );
          if (onHistorique) {
            onHistorique(isCurrentlyActive ? null : id);
          }
        } else if (mountedRef.current) {
          const errorData = await response.json();
          toast.error(errorData.error || "Failed to manage historique");
        }
      } catch (error) {
        console.error("Error managing historique:", error);
        if (mountedRef.current) {
          toast.error("Error managing historique");
        }
      } finally {
        if (mountedRef.current) {
          setIsLoadingHistorique(false);
        }
      }
    },
    [activeHistorique?.backlogId, canManageHistorique, isLoadingHistorique, onHistorique]
  );

  const handleRoleToggle = useCallback((roleId: number) => {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  }, []);

  const formatRelativeTime = useCallback(
    (date: string | Date | undefined): string => {
      if (!date) return "Unknown";
      try {
        const parsedDate = typeof date === "string" ? new Date(date) : date;
        if (isNaN(parsedDate.getTime())) return "Invalid date";
        return formatDistanceToNow(parsedDate, { addSuffix: true });
      } catch (error) {
        return "Error formatting date";
      }
    },
    []
  );

  const formatPreciseTime = useCallback(
    (date: string | Date | undefined): string => {
      if (!date) return "Unknown date";
      try {
        const parsedDate = typeof date === "string" ? new Date(date) : date;
        if (isNaN(parsedDate.getTime())) return "Invalid date";
        return format(parsedDate, "PPP 'at' p");
      } catch (error) {
        return "Error formatting date";
      }
    },
    []
  );

  const accessibleBacklogs = useMemo(
    () =>
      backlogs.filter((backlog) =>
        backlog.roles.some((role) => role.name === session?.user?.role)
      ),
    [backlogs, session?.user?.role]
  );

  const filteredBacklogs = useMemo(() => {
    let filtered = accessibleBacklogs;

    if (activeTab === "mine" && session?.user?.id) {
      filtered = filtered.filter(
        (backlog) => backlog.creator?.id === session.user.id
      );
    } else if (activeTab === "recent") {
      const isPrivilegedUser = ["SUPERADMIN", "IM", "SDM"].includes(session?.user?.role || "");
      
      if (isPrivilegedUser) {
        // Privileged users: show up to 5 recent backlogs
        filtered = [...filtered]
          .sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          .slice(0, 5);
      } else {
        // Non-privileged users: show historique + most recent backlog from IM/SDM + their own backlogs
        const historiqueBacklogs = filtered.filter((b) => b.isHistorique);
        const nonHistoriqueBacklogs = filtered.filter((b) => !b.isHistorique);
        
        // Get the most recent backlog created by IM/SDM (should already be filtered by backend)
        const recentFromPrivileged = nonHistoriqueBacklogs
          .filter((b) => ["IM", "SDM"].includes(b.creator?.role?.name || ""))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 1);
        
        // Get user's own backlogs
        const userOwnBacklogs = nonHistoriqueBacklogs
          .filter((b) => b.creator?.id === session?.user?.id);
        
        // Combine results
        const combinedResults = [
          ...historiqueBacklogs,
          ...recentFromPrivileged,
          ...userOwnBacklogs.filter(b => !recentFromPrivileged.some(r => r.id === b.id))
        ];
        
        filtered = combinedResults.sort((a, b) => {
          if (a.isHistorique) return -1;
          if (b.isHistorique) return 1;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
      }
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (backlog) =>
          backlog.title.toLowerCase().includes(term) ||
          backlog.creator?.name?.toLowerCase().includes(term) ||
          backlog.roles.some((role) => role.name.toLowerCase().includes(term))
      );
    }

    // Pin historique at the top
    return filtered.sort((a, b) => {
      if (a.isHistorique) return -1;
      if (b.isHistorique) return 1;
      return 0;
    });
  }, [accessibleBacklogs, activeTab, searchTerm, session?.user?.role, session?.user?.id]);
  const rolesWithUsers = useMemo(
    () =>
      Array.from(new Set(users.map((user) => user.role.id)))
        .map((roleId) => ({
          role: users.find((user) => user.role.id === roleId)?.role,
          users: users.filter((user) => user.role.id === roleId),
        }))
        .filter((group) => group.role) as { role: Role; users: User[] }[],
    [users]
  );

  const renderSkeletonCard = () => (
    <Card className="animate-pulse">
      <CardHeader>
        <div className="h-6 bg-muted rounded w-3/4"></div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="h-4 bg-muted rounded w-full"></div>
          <div className="h-4 bg-muted rounded w-5/6"></div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="h-8 bg-muted rounded w-full"></div>
      </CardFooter>
    </Card>
  );

  const renderBacklogCard = (backlog: ExtendedBacklog) => {
    const isHistoriqueActive = backlog.isHistorique;
    const isCreator = backlog.creator?.id === session?.user?.id;

    return (
      <Card
        key={backlog.id}
        className={`overflow-hidden hover:shadow-lg transition-all duration-300 h-full flex flex-col ${
          isHistoriqueActive
            ? "ring-2 ring-amber-500 bg-gradient-to-br from-amber-50/80 to-orange-50/80 dark:from-amber-950/20 dark:to-orange-950/20"
            : ""
        }`}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex justify-between items-start gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="line-clamp-1 text-base font-semibold">
                {backlog.title}
              </div>
              {isCreator && (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600 text-xs"
                >
                  <Star className="h-3 w-3 mr-1" />
                  Your Backlog
                </Badge>
              )}
              {isHistoriqueActive && (
                <Badge
                  variant="default"
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
                >
                  <Pin className="h-3 w-3 mr-1" />
                  Pinned
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="shrink-0 text-xs">
              {backlog.content.length} items
            </Badge>
          </CardTitle>
          {isHistoriqueActive && backlog.activatedAt && backlog.activatedBy && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
              Pinned by {backlog.activatedBy.name}{" "}
              {formatRelativeTime(backlog.activatedAt)}
            </p>
          )}
        </CardHeader>
        <CardContent className="pb-0 pt-2 flex-grow">
          <div className="flex items-center text-sm text-muted-foreground mb-1.5">
            <Clock className="h-3.5 w-3.5 mr-1.5" />
            <div className="flex flex-col">
              <span>{formatRelativeTime(backlog.createdAt)}</span>
              <span className="text-xs opacity-70">
                {formatPreciseTime(backlog.createdAt)}
              </span>
            </div>
          </div>
          <div className="flex items-center text-sm text-muted-foreground mb-1.5">
            <User className="h-3.5 w-3.5 mr-1.5" />
            <span>{backlog.creator?.name || "Unknown"}</span>
          </div>
          <div className="flex items-center text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            <div className="flex flex-wrap gap-1">
              {backlog.roles.map((role) => (
                <Badge key={role.id} variant="secondary" className="text-xs">
                  {role.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-4 mt-2">
          <div className="flex items-center gap-2 w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLoad(backlog.id)}
              className="flex-1 text-xs"
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1" />
              Load
            </Button>
            {canManageHistorique && (
              <Button
                variant={isHistoriqueActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleHistorique(backlog.id)}
                disabled={isLoadingHistorique}
                className={`flex-1 text-xs ${
                  isHistoriqueActive
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                }`}
                title={
                  isHistoriqueActive
                    ? "Unpin this backlog"
                    : "Pin as active historique"
                }
              >
                {isLoadingHistorique ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <History className="h-3.5 w-3.5 mr-1" />
                )}
                {isHistoriqueActive ? "Unpin" : "Pin"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport(backlog.id)}
              className="flex-1 text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
            {canDeleteBacklog && (
              <Button
                variant="outline"
                size="sm"
                className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(backlog.id)}
                disabled={isHistoriqueActive}
                title={
                  isHistoriqueActive
                    ? "Cannot delete pinned backlog"
                    : "Delete backlog"
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    );
  };

  const renderBacklogListItem = (backlog: ExtendedBacklog) => {
    const isHistoriqueActive = backlog.isHistorique;
    const isCreator = backlog.creator?.id === session?.user?.id;

    return (
      <div
        key={backlog.id}
        className={`flex items-center justify-between p-4 rounded-lg border bg-card hover:shadow-sm transition-all duration-200 ${
          isHistoriqueActive
            ? "ring-2 ring-amber-500 bg-gradient-to-r from-amber-50/80 to-orange-50/80 dark:from-amber-950/20 dark:to-orange-950/20"
            : ""
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10 hidden sm:flex">
            <FileText className="h-4 w-4 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-medium text-sm">{backlog.title}</h4>
              <Badge variant="outline" className="text-xs">
                {backlog.content.length} items
              </Badge>
              {isCreator && (
                <Badge
                  variant="outline"
                  className="text-green-600 border-green-600 text-xs"
                >
                  <Star className="h-3 w-3 mr-1" />
                  Your Backlog
                </Badge>
              )}
              {isHistoriqueActive && (
                <Badge
                  variant="default"
                  className="bg-amber-500 hover:bg-amber-600 text-white text-xs"
                >
                  <Pin className="h-3 w-3 mr-1" />
                  Pinned
                </Badge>
              )}
            </div>
            {isHistoriqueActive &&
              backlog.activatedAt &&
              backlog.activatedBy && (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Pinned by {backlog.activatedBy.name}{" "}
                  {formatRelativeTime(backlog.activatedAt)}
                </p>
              )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <div className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                <span>{formatRelativeTime(backlog.createdAt)}</span>
              </div>
              <div className="flex items-center">
                <User className="h-3 w-3 mr-1" />
                <span>{backlog.creator?.name || "Unknown"}</span>
              </div>
              <div className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                <div className="flex flex-wrap gap-1">
                  {backlog.roles.map((role) => (
                    <Badge
                      key={role.id}
                      variant="secondary"
                      className="text-xs"
                    >
                      {role.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="hidden sm:flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleLoad(backlog.id)}
              className="text-xs"
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1" />
              Load
            </Button>
            {canManageHistorique && (
              <Button
                variant={isHistoriqueActive ? "default" : "outline"}
                size="sm"
                onClick={() => handleHistorique(backlog.id)}
                disabled={isLoadingHistorique}
                className={`text-xs ${
                  isHistoriqueActive
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                }`}
                title={
                  isHistoriqueActive
                    ? "Unpin this backlog"
                    : "Pin as active historique"
                }
              >
                {isLoadingHistorique ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <History className="h-3.5 w-3.5 mr-1" />
                )}
                {isHistoriqueActive ? "Unpin" : "Pin"}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExport(backlog.id)}
              className="text-xs"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              Export
            </Button>
          </div>
          <div className="sm:hidden flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleLoad(backlog.id)}
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </Button>
            {canManageHistorique && (
              <Button
                variant={isHistoriqueActive ? "default" : "outline"}
                size="icon"
                className={`h-7 w-7 ${
                  isHistoriqueActive
                    ? "bg-amber-500 hover:bg-amber-600 text-white"
                    : "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300"
                }`}
                onClick={() => handleHistorique(backlog.id)}
                disabled={isLoadingHistorique}
                title={
                  isHistoriqueActive
                    ? "Unpin this backlog"
                    : "Pin as active historique"
                }
              >
                {isLoadingHistorique ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <History className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-7 w-7"
              onClick={() => onExport(backlog.id)}
            >
              <Download className="h-3.5 w-3.5" />
            </Button>
          </div>
          {(isCreator || canDeleteBacklog) && (
            <Button
              variant="outline"
              size="sm"
              className="w-8 h-8 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleDelete(backlog.id)}
              disabled={isHistoriqueActive}
              title={
                isHistoriqueActive
                  ? "Cannot delete pinned backlog"
                  : "Delete backlog"
              }
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Backlog Library
          </h3>
          <p className="text-sm text-muted-foreground">
            {accessibleBacklogs.length} backlogs available
            {canManageHistorique && (
              <span className="ml-2 text-amber-600 font-medium">
                • Pinning enabled
              </span>
            )}
            {activeHistorique && (
              <span className="ml-2 text-amber-700 font-medium">
                • &quot;{activeHistorique.backlog.title}&quot; pinned
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 self-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
            className="w-9 h-9 p-0"
          >
            {viewMode === "grid" ? (
              <FileText className="h-4 w-4" />
            ) : (
              <div className="grid grid-cols-2 gap-0.5">
                <div className="bg-primary w-1 h-1 rounded-sm"></div>
                <div className="bg-primary w-1 h-1 rounded-sm"></div>
                <div className="bg-primary w-1 h-1 rounded-sm"></div>
                <div className="bg-primary w-1 h-1 rounded-sm"></div>
              </div>
            )}
          </Button>
          <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="default"
                size="sm"
                className="relative overflow-hidden group text-xs h-9"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center">
                  <Save className="h-3.5 w-3.5 mr-1" />
                  Save Backlog
                </div>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Save Backlog</DialogTitle>
                <DialogDescription>
                  Save the current backlog with a timestamped name and assign
                  role access.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Save className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <Label
                      htmlFor="backlogName"
                      className="text-sm font-medium"
                    >
                      Backlog Name
                    </Label>
                    <Input
                      id="backlogName"
                      value={newBacklogName}
                      readOnly
                      disabled
                      className="mt-1 cursor-not-allowed opacity-70 text-xs"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center mb-2">
                    <Users className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <Label className="font-medium text-sm">Role Access</Label>
                  </div>
                  <ScrollArea className="border rounded-md max-h-[250px] pr-2">
                    <div className="space-y-3 p-2">
                      {rolesWithUsers.map(({ role, users }) => (
                        <div
                          key={role.id}
                          className="pb-2 border-b last:border-b-0"
                        >
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`role-${role.id}`}
                              checked={selectedRoleIds.includes(role.id)}
                              onChange={() => handleRoleToggle(role.id)}
                              className="rounded text-primary focus:ring-primary h-4 w-4"
                            />
                            <label
                              htmlFor={`role-${role.id}`}
                              className="text-sm font-medium flex items-center"
                            >
                              <Badge
                                variant={
                                  selectedRoleIds.includes(role.id)
                                    ? "default"
                                    : "outline"
                                }
                                className="text-xs"
                              >
                                {role.name}
                              </Badge>
                              <span className="ml-1.5 text-muted-foreground text-xs">
                                ({users.length})
                              </span>
                            </label>
                          </div>
                          {selectedRoleIds.includes(role.id) && (
                            <div className="ml-6 mt-1 text-xs text-muted-foreground grid grid-cols-2 gap-1">
                              {users.slice(0, 4).map((user) => (
                                <div
                                  key={user.id}
                                  className="flex items-center"
                                >
                                  <div className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center mr-1">
                                    <User className="h-2.5 w-2.5 text-primary" />
                                  </div>
                                  <span className="truncate">
                                    {user.name || user.email}
                                  </span>
                                </div>
                              ))}
                              {users.length > 4 && (
                                <div className="text-xs text-muted-foreground">
                                  +{users.length - 4} more
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
                <div className="bg-muted/50 p-2 rounded-md text-xs">
                  <div className="flex items-center">
                    <FileText className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                    <span>
                      Saving <strong>{currentData.length}</strong> items
                    </span>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSaveDialogOpen(false)}
                  className="text-xs h-8"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  className="relative overflow-hidden group text-xs h-8"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative">Save</span>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <Tabs
            defaultValue="all"
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-3 w-full sm:w-auto h-9">
              <TabsTrigger value="all" className="text-xs">
                All
              </TabsTrigger>
              <TabsTrigger value="mine" className="text-xs">
                Mine
              </TabsTrigger>
              <TabsTrigger value="recent" className="text-xs">
                Recent
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="relative w-full sm:w-56">
            <Input
              placeholder="Search backlogs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-9"
            />
            <Filter className="h-3.5 w-3.5 text-muted-foreground absolute left-2.5 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>
        {isLoadingBacklogs ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i}>{renderSkeletonCard()}</div>
            ))}
          </div>
        ) : filteredBacklogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 bg-muted/20 rounded-lg border border-dashed">
            <div className="p-2 rounded-full bg-muted">
              <FolderOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <h3 className="mt-3 text-sm font-medium">No backlogs found</h3>
            <p className="text-xs text-muted-foreground mt-1 text-center">
              {searchTerm
                ? "No backlogs match your search."
                : activeTab === "mine"
                ? "You haven't created any backlogs."
                : "No backlogs available for your role."}
            </p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredBacklogs.map(renderBacklogCard)}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredBacklogs.map(renderBacklogListItem)}
          </div>
        )}
      </div>
    </div>
  );
}