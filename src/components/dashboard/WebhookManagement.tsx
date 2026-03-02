import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Webhook, Plus, Trash2, Loader2, Globe, Copy } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WebhookEndpoint {
  id: string;
  url: string;
  description: string | null;
  events: string[];
  active: boolean;
  secret: string;
  last_triggered_at: string | null;
  created_at: string;
}

const AVAILABLE_EVENTS = [
  "verification.completed",
  "verification.failed",
  "bvn.completed",
  "clearance.completed",
  "credits.low",
];

function generateSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let secret = "whsec_";
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}

export function WebhookManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [newUrl, setNewUrl] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchEndpoints = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("webhook_endpoints")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setEndpoints(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchEndpoints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newUrl.trim()) return;
    try {
      new URL(newUrl); // validate URL
    } catch {
      toast({ title: "Invalid URL", description: "Please enter a valid webhook URL.", variant: "destructive" });
      return;
    }

    setCreating(true);
    const secret = generateSecret();

    const { error } = await (supabase as any).from("webhook_endpoints").insert({
      user_id: user.id,
      url: newUrl.trim(),
      description: newDescription.trim() || null,
      events: ["verification.completed"],
      secret,
      active: true,
    });

    setCreating(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setNewUrl("");
    setNewDescription("");
    fetchEndpoints();
    toast({ title: "Webhook Created", description: "Your endpoint is now active." });
  };

  const handleToggle = async (id: string, active: boolean) => {
    await (supabase as any).from("webhook_endpoints").update({ active }).eq("id", id);
    setEndpoints((prev) => prev.map((ep) => (ep.id === id ? { ...ep, active } : ep)));
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("webhook_endpoints").delete().eq("id", id);
    setEndpoints((prev) => prev.filter((ep) => ep.id !== id));
    toast({ title: "Deleted", description: "Webhook endpoint removed." });
  };

  const handleCopySecret = async (secret: string) => {
    await navigator.clipboard.writeText(secret);
    toast({ title: "Copied", description: "Webhook secret copied to clipboard." });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Webhook className="h-5 w-5 text-primary" />
          Webhooks
        </CardTitle>
        <CardDescription>
          Receive real-time HTTP callbacks when verification events occur.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new webhook */}
        <div className="space-y-2 p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <Label className="text-sm font-semibold">Add Endpoint</Label>
          <div className="flex gap-2">
            <Input
              placeholder="https://your-server.com/webhook"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              className="dark:bg-slate-900 dark:border-slate-700"
            />
          </div>
          <Input
            placeholder="Description (optional)"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            className="dark:bg-slate-900 dark:border-slate-700"
          />
          <Button
            onClick={handleCreate}
            disabled={!newUrl.trim() || creating}
            size="sm"
            className="gap-1"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Webhook
          </Button>
        </div>

        {/* List existing endpoints */}
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
          </div>
        ) : endpoints.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Globe className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No webhook endpoints configured</p>
          </div>
        ) : (
          <div className="space-y-3">
            {endpoints.map((ep) => (
              <div
                key={ep.id}
                className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono text-slate-900 dark:text-slate-100 truncate">
                      {ep.url}
                    </p>
                    {ep.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{ep.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={ep.active} onCheckedChange={(v) => handleToggle(ep.id, v)} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="dark:bg-slate-800 dark:border-slate-700">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This endpoint will no longer receive event callbacks.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(ep.id)} className="bg-red-600 hover:bg-red-700">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={ep.active ? "default" : "secondary"} className="text-[10px]">
                    {ep.active ? "Active" : "Paused"}
                  </Badge>
                  {ep.events.map((ev) => (
                    <Badge key={ev} variant="outline" className="text-[10px] px-1.5 py-0">
                      {ev}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  <code className="text-[10px] text-slate-400 font-mono">
                    Secret: {ep.secret.slice(0, 10)}••••••
                  </code>
                  <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleCopySecret(ep.secret)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
