import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Key, Plus, Trash2, Copy, Loader2, Eye, EyeOff, Power, BookOpen, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Switch } from "@/components/ui/switch";
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

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: string[];
  is_active: boolean;
  total_requests: number;
  last_used_at: string | null;
  created_at: string;
}

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let key = "sk_live_";
  for (let i = 0; i < 40; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function ApiKeyManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);

  const fetchKeys = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("api_keys")
      .select("id, name, key_prefix, permissions, is_active, total_requests, last_used_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (data) setKeys(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchKeys();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = async () => {
    if (!user || !newKeyName.trim()) return;
    setCreating(true);

    const rawKey = generateApiKey();
    const hash = await hashKey(rawKey);
    const prefix = rawKey.slice(0, 12);

    const { error } = await (supabase as any).from("api_keys").insert({
      user_id: user.id,
      name: newKeyName.trim(),
      key_hash: hash,
      key_prefix: prefix,
      permissions: ["read"],
    });

    setCreating(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setNewlyCreatedKey(rawKey);
    setNewKeyName("");
    fetchKeys();
    toast({ title: "API Key Created", description: "Copy the key now — it won't be shown again." });
  };

  const handleDelete = async (id: string) => {
    await (supabase as any).from("api_keys").delete().eq("id", id);
    setKeys((prev) => prev.filter((k) => k.id !== id));
    toast({ title: "Deleted", description: "API key has been revoked." });
  };

  const handleCopyKey = async () => {
    if (!newlyCreatedKey) return;
    await navigator.clipboard.writeText(newlyCreatedKey);
    toast({ title: "Copied", description: "API key copied to clipboard." });
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5 text-primary" />
          API Keys
        </CardTitle>
        <CardDescription>
          Generate API keys for programmatic access to verification endpoints.{" "}
          <Link to="/docs/api" className="inline-flex items-center gap-1 text-blue-600 hover:underline">
            View API Docs <ExternalLink className="h-3 w-3" />
          </Link>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Create new key */}
        <div className="flex gap-2">
          <Input
            placeholder="Key name (e.g. Production)"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            className="dark:bg-slate-900 dark:border-slate-700"
          />
          <Button
            onClick={handleCreate}
            disabled={!newKeyName.trim() || creating}
            className="gap-1 shrink-0"
          >
            {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Create
          </Button>
        </div>

        {/* Display newly created key */}
        {newlyCreatedKey && (
          <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 space-y-2">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Copy your API key now. It won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs font-mono bg-white dark:bg-slate-900 p-2 rounded border truncate">
                {showKey ? newlyCreatedKey : newlyCreatedKey.slice(0, 12) + "••••••••••••••••"}
              </code>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowKey(!showKey)}>
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyKey}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setNewlyCreatedKey(null); setShowKey(false); }}>
              Done
            </Button>
          </div>
        )}

        {/* List existing keys */}
        {loading ? (
          <div className="py-8 text-center">
            <Loader2 className="h-5 w-5 animate-spin mx-auto text-blue-600" />
          </div>
        ) : keys.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            <Key className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No API keys yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{key.name}</p>
                    {!key.is_active && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
                        Inactive
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                    {key.key_prefix}••••••••
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {key.permissions.map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px] px-1.5 py-0">
                        {p}
                      </Badge>
                    ))}
                    <span className="text-[10px] text-slate-400">
                      {key.total_requests ?? 0} requests
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Created {new Date(key.created_at).toLocaleDateString()}
                    </span>
                    {key.last_used_at && (
                      <span className="text-[10px] text-slate-400">
                        Last used {new Date(key.last_used_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <Switch
                  checked={key.is_active}
                  onCheckedChange={async (checked) => {
                    await (supabase as any).from("api_keys").update({ is_active: checked }).eq("id", key.id);
                    setKeys((prev) => prev.map((k) => (k.id === key.id ? { ...k, is_active: checked } : k)));
                    toast({ title: checked ? "Key Activated" : "Key Deactivated" });
                  }}
                  className="shrink-0"
                />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="dark:bg-slate-800 dark:border-slate-700">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently revoke the key "{key.name}". Any integrations using it will stop working.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(key.id)} className="bg-red-600 hover:bg-red-700">
                        Revoke Key
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
