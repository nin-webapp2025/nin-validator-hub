import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Gift, Search, Loader2, UserCog, History } from "lucide-react";
import { formatNaira } from "@/lib/wallet";
import { logAuditEvent } from "@/lib/audit";
import type { UserRole } from "@/hooks/useRole";

interface AdminUserRow {
  id: string;
  email: string;
  role: UserRole;
}

interface RecentGrant {
  id: string;
  user_id: string;
  amount: number;
  description: string | null;
  created_at: string;
  recipient_email: string;
}

function extractErrorMessage(error: unknown) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object") {
    const anyError = error as { message?: string; details?: string; hint?: string };
    return [anyError.message, anyError.details, anyError.hint].filter(Boolean).join(" | ") || "Unknown error";
  }
  return "Unknown error";
}

export function AdminCreditGrant() {
  const { toast } = useToast();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recentGrants, setRecentGrants] = useState<RecentGrant[]>([]);
  const [isLoadingGrants, setIsLoadingGrants] = useState(true);

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const { data, error } = await (supabase as any).rpc("get_admin_users_with_roles");
      if (error) throw error;
      setUsers(
        (data || []).map((row: any) => ({
          id: row.id,
          email: row.email || "No email",
          role: (row.role as UserRole) || "user",
        })),
      );
    } catch (error) {
      toast({
        title: "Unable to load users",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const fetchRecentGrants = async () => {
    try {
      setIsLoadingGrants(true);
      const { data: transactions, error } = await (supabase as any)
        .from("wallet_transactions")
        .select("id, user_id, amount, description, created_at, reference")
        .eq("type", "top_up")
        .like("reference", "admin-grant:%")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const userIds = Array.from(new Set((transactions || []).map((t: any) => t.user_id)));
      let emailByUserId: Record<string, string> = {};

      if (userIds.length > 0) {
        const { data: profiles, error: profilesError } = await (supabase as any)
          .from("profiles")
          .select("id, email")
          .in("id", userIds);

        if (profilesError) throw profilesError;

        emailByUserId = Object.fromEntries(
          (profiles || []).map((p: { id: string; email: string | null }) => [p.id, p.email || "Unknown"]),
        );
      }

      setRecentGrants(
        (transactions || []).map((t: any) => ({
          id: t.id,
          user_id: t.user_id,
          amount: Number(t.amount),
          description: t.description,
          created_at: t.created_at,
          recipient_email: emailByUserId[t.user_id] || "Unknown",
        })),
      );
    } catch (error) {
      toast({
        title: "Unable to load recent grants",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoadingGrants(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
    void fetchRecentGrants();
  }, []);

  const filteredUsers = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    if (!trimmed) return users;
    return users.filter((user) => user.email.toLowerCase().includes(trimmed));
  }, [users, searchTerm]);

  const numAmount = parseFloat(amount) || 0;

  const handleGrant = async () => {
    if (!selectedUser) {
      toast({ title: "Select a user", description: "Choose who should receive the credit.", variant: "destructive" });
      return;
    }
    if (numAmount <= 0) {
      toast({ title: "Enter an amount", description: "Amount must be greater than zero.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    try {
      const reference = `admin-grant:${crypto.randomUUID()}`;
      const description = note.trim() ? `Admin credit grant: ${note.trim()}` : "Admin credit grant";

      const { data, error } = await (supabase as any).rpc("wallet_apply_top_up", {
        p_user_id: selectedUser.id,
        p_amount: numAmount,
        p_reference: reference,
        p_description: description,
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || "Credit grant failed.");

      toast({
        title: "Credit granted",
        description: `${formatNaira(numAmount)} added to ${selectedUser.email}'s wallet. New balance: ${formatNaira(Number(data.balance ?? 0))}.`,
      });

      logAuditEvent({
        action: "wallet_credit_grant",
        target_type: "wallet",
        target_id: selectedUser.id,
        metadata: { amount: numAmount, recipient_email: selectedUser.email, reference, note: note.trim() || null },
      });

      window.dispatchEvent(new Event("wallet-updated"));
      setAmount("");
      setNote("");
      setSelectedUser(null);
      void fetchRecentGrants();
    } catch (error) {
      toast({
        title: "Credit grant failed",
        description: extractErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle className="text-slate-900 dark:text-slate-100">Grant Free Credit</CardTitle>
          </div>
          <CardDescription>
            Add wallet balance to any user on the platform at no charge — useful for goodwill credits, refunds, or promotions.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label>Recipient</Label>
            {selectedUser ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex min-w-0 items-center gap-2">
                  <UserCog className="h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{selectedUser.email}</p>
                    <Badge variant="outline" className="mt-1 text-[10px] uppercase">{selectedUser.role}</Badge>
                  </div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
                  Change
                </Button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
                  <Input
                    placeholder="Search users by email..."
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5 dark:border-slate-800">
                  {isLoadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">No users found</p>
                  ) : (
                    filteredUsers.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUser(user)}
                        className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <span className="truncate text-slate-700 dark:text-slate-300">{user.email}</span>
                        <Badge variant="outline" className="shrink-0 text-[10px] uppercase">{user.role}</Badge>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-amount">Amount (₦)</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-muted-foreground">₦</span>
              <Input
                id="grant-amount"
                type="number"
                min={1}
                step={100}
                placeholder="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="h-12 pl-9 font-mono text-xl font-semibold tabular-nums"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="grant-note">Note (optional)</Label>
            <Textarea
              id="grant-note"
              placeholder="Reason for this credit, e.g. goodwill credit for a failed verification..."
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={handleGrant} disabled={isSubmitting || !selectedUser || numAmount <= 0} className="w-full">
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Granting Credit...
              </>
            ) : (
              <>
                <Gift className="mr-2 h-4 w-4" />
                Grant Credit
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            <CardTitle className="text-slate-900 dark:text-slate-100">Recent Grants</CardTitle>
          </div>
          <CardDescription>The last 10 credit grants issued by admins.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingGrants ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : recentGrants.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400">
              No credit grants issued yet.
            </div>
          ) : (
            <div className="space-y-2">
              {recentGrants.map((grant) => (
                <div
                  key={grant.id}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm dark:border-slate-700 dark:bg-slate-800/50"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate font-medium text-slate-900 dark:text-slate-100">{grant.recipient_email}</p>
                    <Badge className="shrink-0 bg-emerald-500">{formatNaira(grant.amount)}</Badge>
                  </div>
                  {grant.description && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{grant.description}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    {new Date(grant.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
