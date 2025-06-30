"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Badge } from "../../../components/ui/badge";
import { Camera, Save, X, CheckCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface Backlog {
  users?: Array<{ id: number; name?: string; }> | null;
  creatorId: number;
  id: number;
  title: string;
  moduleType: string;
  createdAt: string;
}

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(session?.user?.name || "");
  const [backlogs, setBacklogs] = useState<Backlog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(session?.user?.image || "");
  const [isUploading, setIsUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      fetchBacklogs();
      setName(session?.user?.name || "");
      setCurrentImage(session?.user?.image || "");
      setIsLoading(false);
    }
  }, [status, session]);

  const fetchBacklogs = async () => {
    try {
      const response = await fetch("/api/backlogs");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Ensure data is an array and has proper structure
      if (Array.isArray(data)) {
        setBacklogs(data);
      } else {
        console.error("Invalid backlogs data:", data);
        setBacklogs([]);
        toast.error("Invalid data received from server");
      }
    } catch (error) {
      console.error("Error fetching backlogs:", error);
      setBacklogs([]); // Set empty array on error
      toast.error("Failed to load backlogs");
    }
  };

  const handleSaveProfile = async () => {
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        toast.success("Profile updated successfully");
        setIsEditing(false);
        // Update the session
        await update({ name });
      } else {
        toast.error("Failed to update profile");
      }
    } catch (error) {
      toast.error("Error updating profile");
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("/api/profile/image", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        // Update the local state immediately
        setCurrentImage(data.image);
        
        // Update the session with the new image
        await update({ 
          ...session?.user,
          image: data.image 
        });
        
        toast.success(data.message || "Profile image updated successfully");
        
        // Force a page refresh after a short delay to ensure everything updates
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        toast.error(data.error || "Failed to update profile image");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Error uploading image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="h-8 w-8 border-4 border-t-blue-600 border-gray-200 rounded-full"
        />
      </div>
    );
  }

  if (!session) {
    router.push("/login");
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto py-8 px-4 md:px-6 max-w-4xl"
    >
      <Card className="backdrop-blur-md bg-background/95 border-none shadow-xl">
        <CardHeader className="relative">
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-700 opacity-10 rounded-t-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.1 }}
            transition={{ duration: 1 }}
          />
          <CardTitle className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
            User Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <div className="relative group">
                <Avatar className="h-24 w-24 md:h-32 md:w-32 border-4 border-primary/20">
                  <AvatarImage 
                    src={currentImage || ""} 
                    alt="Profile" 
                    key={currentImage} // Force re-render when image changes
                  />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-700 text-white text-xl md:text-2xl">
                    {session.user.name?.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2) || "U"}
                  </AvatarFallback>
                </Avatar>
                
                {/* Upload overlay */}
                <label 
                  htmlFor="image-upload" 
                  className={`absolute bottom-0 right-0 p-2 bg-primary rounded-full cursor-pointer transition-opacity ${
                    isUploading ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  {isUploading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1 }}
                      className="h-4 w-4 border-2 border-t-white border-white/30 rounded-full"
                    />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
              </div>
              <Badge variant="outline" className="text-sm capitalize">
                {session.user.role}
              </Badge>
            </motion.div>

            <div className="flex-1 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium w-24">Name</Label>
                  {isEditing ? (
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="flex-1"
                    />
                  ) : (
                    <span className="flex-1">{session.user.name || "N/A"}</span>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium w-24">Email</Label>
                  <span className="flex-1">{session.user.email}</span>
                </div>
                <div className="flex items-center gap-4">
                  <Label className="text-sm font-medium w-24">Permissions</Label>
                  <div className="flex flex-wrap gap-2">
                    {session.user.permissions?.map((perm) => (
                      <Badge key={perm} variant="secondary">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
                {isEditing ? (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} size="sm">
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button onClick={() => setIsEditing(true)} size="sm">
                    Edit Profile
                  </Button>
                )}
              </div>

              <Tabs defaultValue="created" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="created">Created Backlogs</TabsTrigger>
                  <TabsTrigger value="assigned">Assigned Backlogs</TabsTrigger>
                </TabsList>
                <TabsContent value="created">
                  <div className="space-y-4 mt-4">
                    {backlogs.filter(b => b.creatorId === parseInt(session.user.id)).map((backlog) => (
                      <motion.div
                        key={backlog.id}
                        className="p-4 border rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{backlog.title}</h3>
                            <p className="text-sm text-muted-foreground">{backlog.moduleType}</p>
                          </div>
                          <Badge>{new Date(backlog.createdAt).toLocaleDateString()}</Badge>
                        </div>
                      </motion.div>
                    ))}
                    {backlogs.filter(b => b.creatorId === parseInt(session.user.id)).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No created backlogs found.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
                <TabsContent value="assigned">
                  <div className="space-y-4 mt-4">
                    {backlogs.filter(b => b.users && Array.isArray(b.users) && b.users.some((u: { id: number; }) => u.id === parseInt(session.user.id))).map((backlog) => (
                      <motion.div
                        key={backlog.id}
                        className="p-4 border rounded-lg"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{backlog.title}</h3>
                            <p className="text-sm text-muted-foreground">{backlog.moduleType}</p>
                          </div>
                          <Badge>{new Date(backlog.createdAt).toLocaleDateString()}</Badge>
                        </div>
                      </motion.div>
                    ))}
                    {backlogs.filter(b => b.users && Array.isArray(b.users) && b.users.some((u: { id: number; }) => u.id === parseInt(session.user.id))).length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>No assigned backlogs found.</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}