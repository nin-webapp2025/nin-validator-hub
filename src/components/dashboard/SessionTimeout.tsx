import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, LogOut, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function SessionTimeout() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [showWarning, setShowWarning] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes warning
  const [isIdle, setIsIdle] = useState(false);

  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before timeout
  const IDLE_TIMEOUT = 25 * 60 * 1000; // Consider idle after 25 minutes

  useEffect(() => {
    if (!user) return;

    let lastActivity = Date.now();
    let warningTimeout: NodeJS.Timeout;
    let sessionTimeout: NodeJS.Timeout;
    let idleCheckInterval: NodeJS.Timeout;

    const resetTimers = () => {
      lastActivity = Date.now();
      setIsIdle(false);
      setShowWarning(false);
      setShowExpired(false);

      // Clear existing timers
      clearTimeout(warningTimeout);
      clearTimeout(sessionTimeout);

      // Set warning timer (25 minutes of inactivity)
      warningTimeout = setTimeout(() => {
        setShowWarning(true);
        setTimeLeft(300); // 5 minutes
      }, SESSION_TIMEOUT - WARNING_TIME);

      // Set session expiry timer (30 minutes of inactivity)
      sessionTimeout = setTimeout(() => {
        setShowExpired(true);
        setShowWarning(false);
        // Auto sign out after showing expired message
        setTimeout(() => {
          signOut();
          navigate("/auth");
        }, 3000);
      }, SESSION_TIMEOUT);
    };

    const checkIdle = () => {
      const idleTime = Date.now() - lastActivity;
      if (idleTime > IDLE_TIMEOUT) {
        setIsIdle(true);
      }
    };

    // Activity event handlers
    const handleActivity = () => {
      resetTimers();
    };

    // Track user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity);
    });

    // Start timers
    resetTimers();

    // Check idle status every 30 seconds
    idleCheckInterval = setInterval(checkIdle, 30000);

    // Countdown timer for warning
    const countdownInterval = setInterval(() => {
      if (showWarning) {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(countdownInterval);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      clearTimeout(warningTimeout);
      clearTimeout(sessionTimeout);
      clearInterval(idleCheckInterval);
      clearInterval(countdownInterval);
    };
  }, [user, showWarning, signOut, navigate]);

  const handleContinue = () => {
    setShowWarning(false);
    setIsIdle(false);
    // Trigger activity to reset timers
    document.dispatchEvent(new Event("mousedown"));
  };

  const handleSignOut = () => {
    signOut();
    navigate("/auth");
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!user) return null;

  return (
    <>
      {/* Warning Dialog */}
      <Dialog open={showWarning} onOpenChange={setShowWarning}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
              </div>
              <DialogTitle className="text-xl">Session Expiring Soon</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Your session will expire in{" "}
              <span className="font-bold text-yellow-600 dark:text-yellow-400 text-lg">
                {formatTime(timeLeft)}
              </span>{" "}
              due to inactivity.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 my-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Click "Stay Signed In" to continue your session, or "Sign Out" to log out now.
            </p>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full sm:w-auto gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
            <Button
              onClick={handleContinue}
              className="w-full sm:w-auto gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4" />
              Stay Signed In
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Session Expired Dialog */}
      <Dialog open={showExpired} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md" hideClose>
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <DialogTitle className="text-xl">Session Expired</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Your session has expired due to inactivity. You will be redirected to the login page.
            </DialogDescription>
          </DialogHeader>
          
          <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 my-4 text-center">
            <div className="inline-flex items-center justify-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-600 animate-pulse"></div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Signing out...
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Idle Indicator - Subtle Banner */}
      {isIdle && !showWarning && !showExpired && (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 shadow-lg max-w-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
              <p className="text-xs text-yellow-900 dark:text-yellow-100">
                You've been idle. Your session will expire soon.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
