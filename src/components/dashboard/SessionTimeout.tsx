import { useState, useEffect, useRef } from "react";
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
  const hasExpiredRef = useRef(false);

  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const WARNING_TIME = 5 * 60 * 1000; // Show warning 5 minutes before timeout
  const IDLE_TIMEOUT = 25 * 60 * 1000; // Consider idle after 25 minutes
  const LAST_ACTIVITY_KEY = "sparklabid_last_activity_at";

  useEffect(() => {
    if (!user) {
      sessionStorage.removeItem(LAST_ACTIVITY_KEY);
      hasExpiredRef.current = false;
      return;
    }

    const now = Date.now();
    if (!sessionStorage.getItem(LAST_ACTIVITY_KEY)) {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    }
    hasExpiredRef.current = false;

    const getLastActivity = () => {
      const value = Number(sessionStorage.getItem(LAST_ACTIVITY_KEY));
      return Number.isFinite(value) && value > 0 ? value : now;
    };

    const expireSession = () => {
      if (hasExpiredRef.current) return;
      hasExpiredRef.current = true;
      setShowExpired(true);
      setShowWarning(false);
      setIsIdle(true);

      window.setTimeout(() => {
        void signOut();
        navigate("/auth", { replace: true });
      }, 3000);
    };

    const checkSessionAge = () => {
      const elapsed = Date.now() - getLastActivity();
      const remainingMs = SESSION_TIMEOUT - elapsed;

      if (remainingMs <= 0) {
        expireSession();
        return;
      }

      setIsIdle(elapsed >= IDLE_TIMEOUT);
      setTimeLeft(Math.max(0, Math.ceil(remainingMs / 1000)));
      setShowWarning(remainingMs <= WARNING_TIME);
      setShowExpired(false);
    };

    const recordActivity = () => {
      if (hasExpiredRef.current) return;
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      setIsIdle(false);
      setShowWarning(false);
      setShowExpired(false);
    };

    // Track user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      document.addEventListener(event, recordActivity, { passive: true });
    });

    checkSessionAge();
    const sessionCheckInterval = window.setInterval(checkSessionAge, 1000);

    // Cleanup
    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, recordActivity);
      });
      window.clearInterval(sessionCheckInterval);
    };
  }, [user, signOut, navigate]);

  const handleContinue = () => {
    setShowWarning(false);
    setIsIdle(false);
    sessionStorage.setItem("sparklabid_last_activity_at", String(Date.now()));
  };

  const handleSignOut = () => {
    sessionStorage.removeItem("sparklabid_last_activity_at");
    void signOut();
    navigate("/auth", { replace: true });
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
              <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <DialogTitle className="text-xl">Session Expiring Soon</DialogTitle>
            </div>
            <DialogDescription className="text-base">
              Your session will expire in{" "}
              <span className="font-bold text-amber-600 dark:text-amber-400 text-lg">
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
              className="w-full sm:w-auto gap-2"
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
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 shadow-lg max-w-sm">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <p className="text-xs text-amber-900 dark:text-amber-100">
                You've been idle. Your session will expire soon.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
