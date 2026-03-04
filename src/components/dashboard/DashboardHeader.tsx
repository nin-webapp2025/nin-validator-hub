import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Bell, Moon, Sun, Command, BellOff, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { markNotificationRead, markAllNotificationsRead, type Notification } from "@/lib/notifications";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { WalletBalance } from "@/components/dashboard/WalletBalance";

interface DashboardHeaderProps {
  onNavigateToProfile?: () => void;
  onNavigateToWallet?: () => void;
}

export function DashboardHeader({ onNavigateToProfile, onNavigateToWallet }: DashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [showSignOutDialog, setShowSignOutDialog] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const { data } = await (supabase as any)
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) {
        setNotifications(data as Notification[]);
        setUnreadCount((data as Notification[]).filter((n: Notification) => !n.read).length);
      }
    };
    fetchNotifications();
    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const handleSignOut = () => {
    setShowSignOutDialog(true);
  };

  const confirmSignOut = () => {
    setShowSignOutDialog(false);
    signOut();
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.svg" 
            alt="SparkID" 
            className="h-10 w-auto dark:brightness-110"
          />
          <Badge 
            variant="outline" 
            className="hidden md:flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700"
          >
            <Command className="h-3 w-3" />
            <span>K</span>
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          <WalletBalance onClick={onNavigateToWallet} />

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {theme === "light" ? (
              <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
            ) : (
              <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
            )}
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hidden sm:flex"
              >
                <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0 border-slate-200 dark:border-slate-700 dark:bg-slate-900">
              <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h4>
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleMarkAllRead}>
                    <Check className="h-3 w-3 mr-1" /> Mark all read
                  </Button>
                )}
              </div>
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <BellOff className="h-8 w-8 text-slate-300 dark:text-slate-600 mb-2" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">No notifications yet</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${!n.read ? "bg-blue-50/50 dark:bg-blue-950/20" : ""}`}
                      onClick={() => !n.read && handleMarkRead(n.id)}
                    >
                      <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${!n.read ? "bg-blue-500" : "bg-transparent"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{n.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(n.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 p-0">
                <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700">
                  <AvatarFallback className="bg-blue-600 text-white font-semibold text-xs">
                    {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 p-2 border-slate-200 dark:border-slate-700 dark:bg-slate-900 shadow-lg rounded-xl">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 mb-2">
                <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                  <AvatarFallback className="bg-blue-600 text-white font-semibold text-sm">
                    {user?.email ? getInitials(user.email) : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400 truncate">{user?.email}</p>
                </div>
              </div>
              <DropdownMenuSeparator className="my-2 bg-slate-200 dark:bg-slate-700" />
              <DropdownMenuItem 
                onClick={onNavigateToProfile}
                className="cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 px-3 focus:bg-slate-50 dark:focus:bg-slate-800"
              >
                <User className="mr-2 h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">View Profile</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 bg-slate-200 dark:bg-slate-700" />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 py-2.5 px-3 text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50 focus:text-red-600 dark:focus:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="text-sm font-semibold">Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Sign-out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="dark:bg-slate-800 dark:border-slate-700">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to sign out of your account? You'll need to sign in again to access your dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSignOut} className="bg-red-600 hover:bg-red-700">
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}