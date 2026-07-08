import { supabase } from "@/integrations/supabase/client";

interface RpcError {
  message: string;
}

interface RpcClient {
  rpc<T = unknown>(
    functionName: string,
    args?: Record<string, unknown>,
  ): Promise<{ data: T | null; error: RpcError | null }>;
}

export const rpcClient = supabase as unknown as RpcClient;

