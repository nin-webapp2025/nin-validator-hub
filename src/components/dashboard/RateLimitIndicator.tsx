import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock, CheckCircle } from "lucide-react";

interface RateLimitState {
  requests: number;
  maxRequests: number;
  resetTime: Date;
}

export function RateLimitIndicator() {
  const [rateLimit, setRateLimit] = useState<RateLimitState>({
    requests: 0,
    maxRequests: 100, // Default limit per hour
    resetTime: new Date(Date.now() + 3600000), // 1 hour from now
  });

  // Track API requests from localStorage
  useEffect(() => {
    const trackRequests = () => {
      const stored = localStorage.getItem("api_requests");
      if (stored) {
        const data = JSON.parse(stored);
        const resetTime = new Date(data.resetTime);
        
        // Reset if time has passed
        if (Date.now() > resetTime.getTime()) {
          const newResetTime = new Date(Date.now() + 3600000);
          const newData = { requests: 0, resetTime: newResetTime.toISOString() };
          localStorage.setItem("api_requests", JSON.stringify(newData));
          setRateLimit({
            requests: 0,
            maxRequests: 100,
            resetTime: newResetTime,
          });
        } else {
          setRateLimit({
            requests: data.requests || 0,
            maxRequests: 100,
            resetTime,
          });
        }
      }
    };

    trackRequests();
    const interval = setInterval(trackRequests, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  const percentageUsed = (rateLimit.requests / rateLimit.maxRequests) * 100;
  const remaining = rateLimit.maxRequests - rateLimit.requests;
  const timeUntilReset = Math.max(0, rateLimit.resetTime.getTime() - Date.now());
  const minutesUntilReset = Math.floor(timeUntilReset / 60000);

  const getStatus = () => {
    if (percentageUsed >= 90) return { color: "destructive", icon: AlertTriangle, text: "Critical" };
    if (percentageUsed >= 70) return { color: "warning", icon: Clock, text: "Warning" };
    return { color: "default", icon: CheckCircle, text: "Good" };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  // Don't show if no requests made
  if (rateLimit.requests === 0) return null;

  return (
    <Alert 
      className={`border-l-4 ${
        percentageUsed >= 90 
          ? "border-l-red-500 bg-red-50 dark:bg-red-950/20" 
          : percentageUsed >= 70 
          ? "border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20"
          : "border-l-green-500 bg-green-50 dark:bg-green-950/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <StatusIcon className={`h-5 w-5 mt-0.5 ${
          percentageUsed >= 90 
            ? "text-red-600 dark:text-red-400" 
            : percentageUsed >= 70 
            ? "text-yellow-600 dark:text-yellow-400"
            : "text-green-600 dark:text-green-400"
        }`} />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <AlertDescription className="font-semibold text-slate-900 dark:text-slate-100">
              API Rate Limit
            </AlertDescription>
            <Badge variant={percentageUsed >= 90 ? "destructive" : "outline"}>
              {status.text}
            </Badge>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">
                {rateLimit.requests} / {rateLimit.maxRequests} requests used
              </span>
              <span className="font-medium text-slate-900 dark:text-slate-100">
                {remaining} remaining
              </span>
            </div>
            <Progress 
              value={percentageUsed} 
              className={`h-2 ${
                percentageUsed >= 90 
                  ? "[&>div]:bg-red-600" 
                  : percentageUsed >= 70 
                  ? "[&>div]:bg-yellow-600"
                  : "[&>div]:bg-green-600"
              }`}
            />
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400">
            <Clock className="inline h-3 w-3 mr-1" />
            Resets in {minutesUntilReset} minutes
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500 italic mt-1">
            Note: This is a client-side usage tracker. Actual API rate limits are enforced server-side.
          </p>
        </div>
      </div>
    </Alert>
  );
}

// Helper function to track API requests
export function trackApiRequest() {
  const stored = localStorage.getItem("api_requests");
  let data = stored ? JSON.parse(stored) : { requests: 0, resetTime: new Date(Date.now() + 3600000).toISOString() };
  
  const resetTime = new Date(data.resetTime);
  
  // Reset if time has passed
  if (Date.now() > resetTime.getTime()) {
    data = {
      requests: 1,
      resetTime: new Date(Date.now() + 3600000).toISOString(),
    };
  } else {
    data.requests += 1;
  }
  
  localStorage.setItem("api_requests", JSON.stringify(data));
}
