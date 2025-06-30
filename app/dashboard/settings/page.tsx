"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Moon, 
  Sun, 
  Monitor,
  Save,
  Eye,
  EyeOff,
  Smartphone,
  Mail,
  Lock,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  ChevronRight,
  Check,
  X,
  AlertTriangle,
  Zap,
  Database,
  Wifi,
  Volume2,
  VolumeX,
  Camera,
  Mic,
  MicOff
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Label } from "../../../components/ui/label";
import { Switch } from "../../../components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../../components/ui/tabs";
import { Badge } from "../../../components/ui/badge";
import { Slider } from "../../../components/ui/slider";
import { Textarea } from "../../../components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "../../../components/ui/avatar";
import { Separator } from "../../../components/ui/separator";
import { toast } from "sonner";

interface SettingsState {
  // Profile
  name: string;
  email: string;
  bio: string;
  avatar: string;
  
  // Preferences
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: string;
  
  // Notifications
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  marketingEmails: boolean;
  weeklyDigest: boolean;
  
  // Privacy & Security
  twoFactorEnabled: boolean;
  profileVisibility: 'public' | 'private' | 'friends';
  activityStatus: boolean;
  dataSharing: boolean;
  
  // App Settings
  soundEnabled: boolean;
  autoSave: boolean;
  compactMode: boolean;
  animationsEnabled: boolean;
  
  // Performance
  cacheSize: number;
  backgroundSync: boolean;
  offlineMode: boolean;
}

const settingsSections = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'preferences', label: 'Preferences', icon: Settings },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'privacy', label: 'Privacy & Security', icon: Shield },
  { id: 'app', label: 'App Settings', icon: Zap },
  { id: 'data', label: 'Data & Storage', icon: Database },
];

export default function ModernSettings() {
  const { data: session } = useSession();
  const [activeSection, setActiveSection] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [settings, setSettings] = useState<SettingsState>({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    bio: '',
    avatar: session?.user?.image || '',
    theme: 'system',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/dd/yyyy',
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    marketingEmails: false,
    weeklyDigest: true,
    twoFactorEnabled: false,
    profileVisibility: 'public',
    activityStatus: true,
    dataSharing: false,
    soundEnabled: true,
    autoSave: true,
    compactMode: false,
    animationsEnabled: true,
    cacheSize: 256,
    backgroundSync: true,
    offlineMode: false,
  });

  const updateSetting = (key: keyof SettingsState, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success("Settings saved successfully!");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsLoading(false);
    }
  };

  const resetToDefaults = () => {
    toast.success("Settings reset to defaults");
    setHasChanges(false);
  };

  const exportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'settings-backup.json';
    link.click();
    toast.success("Settings exported successfully!");
  };

  const sectionVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  const renderProfileSection = () => (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-8"
    >
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-4 border-primary/20">
            <AvatarImage src={settings.avatar} />
            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl">
              {settings.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) || 'U'}
            </AvatarFallback>
          </Avatar>
          <button className="absolute bottom-0 right-0 p-2 bg-primary rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-4 w-4 text-white" />
          </button>
        </div>
        <div className="flex-1 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Display Name</Label>
              <Input
                id="name"
                value={settings.name}
                onChange={(e) => updateSetting('name', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => updateSetting('email', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              value={settings.bio}
              onChange={(e) => updateSetting('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              className="mt-1 resize-none"
              rows={3}
            />
          </div>
        </div>
      </div>
      
      <Separator />
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Password & Security
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="current-password">Current Password</Label>
            <div className="relative mt-1">
              <Input
                id="current-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              placeholder="Enter new password"
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );

  const renderPreferencesSection = () => (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Theme</Label>
              <Select value={settings.theme} onValueChange={(value: any) => updateSetting('theme', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Light
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Dark
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      System
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Compact Mode</Label>
              <Switch
                checked={settings.compactMode}
                onCheckedChange={(checked) => updateSetting('compactMode', checked)}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label>Animations</Label>
              <Switch
                checked={settings.animationsEnabled}
                onCheckedChange={(checked) => updateSetting('animationsEnabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Localization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Language</Label>
              <Select value={settings.language} onValueChange={(value) => updateSetting('language', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="de">Deutsch</SelectItem>
                  <SelectItem value="ja">日本語</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Timezone</Label>
              <Select value={settings.timezone} onValueChange={(value) => updateSetting('timezone', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UTC">UTC</SelectItem>
                  <SelectItem value="EST">Eastern Time</SelectItem>
                  <SelectItem value="PST">Pacific Time</SelectItem>
                  <SelectItem value="GMT">Greenwich Mean Time</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Date Format</Label>
              <Select value={settings.dateFormat} onValueChange={(value) => updateSetting('dateFormat', value)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MM/dd/yyyy">MM/dd/yyyy</SelectItem>
                  <SelectItem value="dd/MM/yyyy">dd/MM/yyyy</SelectItem>
                  <SelectItem value="yyyy-MM-dd">yyyy-MM-dd</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </motion.div>
  );

  const renderNotificationsSection = () => (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive notifications via email</p>
              </div>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => updateSetting('emailNotifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive push notifications on your device</p>
              </div>
            </div>
            <Switch
              checked={settings.pushNotifications}
              onCheckedChange={(checked) => updateSetting('pushNotifications', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>SMS Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive important updates via SMS</p>
              </div>
            </div>
            <Switch
              checked={settings.smsNotifications}
              onCheckedChange={(checked) => updateSetting('smsNotifications', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Marketing Emails</Label>
              <p className="text-sm text-muted-foreground">Receive promotional content and updates</p>
            </div>
            <Switch
              checked={settings.marketingEmails}
              onCheckedChange={(checked) => updateSetting('marketingEmails', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Weekly Digest</Label>
              <p className="text-sm text-muted-foreground">Get a summary of your weekly activity</p>
            </div>
            <Switch
              checked={settings.weeklyDigest}
              onCheckedChange={(checked) => updateSetting('weeklyDigest', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderPrivacySection = () => (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy & Security Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <Label>Two-Factor Authentication</Label>
              <p className="text-sm text-muted-foreground">Add an extra layer of security to your account</p>
            </div>
            <div className="flex items-center gap-2">
              {settings.twoFactorEnabled && <Badge variant="secondary" className="bg-green-100 text-green-800">Enabled</Badge>}
              <Switch
                checked={settings.twoFactorEnabled}
                onCheckedChange={(checked) => updateSetting('twoFactorEnabled', checked)}
              />
            </div>
          </div>
          
          <div>
            <Label>Profile Visibility</Label>
            <Select value={settings.profileVisibility} onValueChange={(value: any) => updateSetting('profileVisibility', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" />
                    Public
                  </div>
                </SelectItem>
                <SelectItem value="friends">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Friends Only
                  </div>
                </SelectItem>
                <SelectItem value="private">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Private
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Show Activity Status</Label>
              <p className="text-sm text-muted-foreground">Let others see when you&apos;re online</p>
            </div>
            <Switch
              checked={settings.activityStatus}
              onCheckedChange={(checked) => updateSetting('activityStatus', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Data Sharing</Label>
              <p className="text-sm text-muted-foreground">Share anonymized usage data to improve the service</p>
            </div>
            <Switch
              checked={settings.dataSharing}
              onCheckedChange={(checked) => updateSetting('dataSharing', checked)}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Danger Zone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Delete Account</Label>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all data</p>
            </div>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderAppSection = () => (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            App Behavior
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {settings.soundEnabled ? <Volume2 className="h-5 w-5 text-muted-foreground" /> : <VolumeX className="h-5 w-5 text-muted-foreground" />}
              <div>
                <Label>Sound Effects</Label>
                <p className="text-sm text-muted-foreground">Play sounds for interactions and notifications</p>
              </div>
            </div>
            <Switch
              checked={settings.soundEnabled}
              onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Save className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Auto-Save</Label>
                <p className="text-sm text-muted-foreground">Automatically save your work</p>
              </div>
            </div>
            <Switch
              checked={settings.autoSave}
              onCheckedChange={(checked) => updateSetting('autoSave', checked)}
            />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderDataSection = () => (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage & Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Cache Size: {settings.cacheSize}MB</Label>
              <Badge variant="outline">{Math.round((settings.cacheSize / 1024) * 100)}% of 1GB</Badge>
            </div>
            <Slider
              value={[settings.cacheSize]}
              onValueChange={([value]) => updateSetting('cacheSize', value)}
              max={1024}
              min={64}
              step={64}
              className="mt-2"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wifi className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label>Background Sync</Label>
                <p className="text-sm text-muted-foreground">Sync data when app is in background</p>
              </div>
            </div>
            <Switch
              checked={settings.backgroundSync}
              onCheckedChange={(checked) => updateSetting('backgroundSync', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Offline Mode</Label>
              <p className="text-sm text-muted-foreground">Allow app to work without internet connection</p>
            </div>
            <Switch
              checked={settings.offlineMode}
              onCheckedChange={(checked) => updateSetting('offlineMode', checked)}
            />
          </div>
          
          <Separator />
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportSettings} className="flex-1">
              <Download className="h-4 w-4 mr-2" />
              Export Settings
            </Button>
            <Button variant="outline" className="flex-1">
              <Upload className="h-4 w-4 mr-2" />
              Import Settings
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderActiveSection = () => {
    switch (activeSection) {
      case 'profile': return renderProfileSection();
      case 'preferences': return renderPreferencesSection();
      case 'notifications': return renderNotificationsSection();
      case 'privacy': return renderPrivacySection();
      case 'app': return renderAppSection();
      case 'data': return renderDataSection();
      default: return renderProfileSection();
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Settings Navigation */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-0">
            <nav className="space-y-1">
              {settingsSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50 ${
                      isActive ? 'bg-accent text-accent-foreground border-r-2 border-primary' : ''
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1">{section.label}</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'rotate-90' : ''}`} />
                  </button>
                );
              })}
            </nav>
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="lg:col-span-3">
          <AnimatePresence mode="wait">
            {renderActiveSection()}
          </AnimatePresence>
          
          {/* Action Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: hasChanges ? 1 : 0, y: hasChanges ? 0 : 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Card className="border-primary/50 shadow-2xl">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    You have unsaved changes
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={resetToDefaults}>
                      <X className="h-4 w-4 mr-2" />
                      Reset
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={isLoading}>
                      {isLoading ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}