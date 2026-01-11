import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut, User, Bell, Settings, Moon, Sun, Command } from "lucide-react";
import { motion } from "framer-motion";
import { useTheme } from "@/components/theme-provider";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface DashboardHeaderProps {
  onNavigateToProfile?: () => void;
  onNavigateToSettings?: () => void;
}

export function DashboardHeader({ onNavigateToProfile, onNavigateToSettings }: DashboardHeaderProps) {
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
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

          <Button
            variant="ghost"
            size="icon"
            className="relative h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hidden sm:flex"
          >
            <Bell className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-blue-600" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 hidden md:flex"
          >
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-slate-600 dark:text-slate-400" />
          </Button>

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
              <DropdownMenuItem 
                onClick={onNavigateToSettings}
                className="cursor-pointer rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 py-2.5 px-3 focus:bg-slate-50 dark:focus:bg-slate-800"
              >
                <Settings className="mr-2 h-4 w-4 text-slate-600 dark:text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 bg-slate-200 dark:bg-slate-700" />
              <DropdownMenuItem onClick={signOut} className="cursor-pointer rounded-lg hover:bg-red-50 dark:hover:bg-red-950/50 py-2.5 px-3 text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-950/50 focus:text-red-600 dark:focus:text-red-400">
                <LogOut className="mr-2 h-4 w-4" />
                <span className="text-sm font-semibold">Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}