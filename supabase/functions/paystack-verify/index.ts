import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!secretKey || !supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({
        success: false,
        error: "Payment verification is not configured correctly.",
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ success: false, error: "Authentication required." }, 401);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return json({ success: false, error: "Unable to verify your session." }, 401);
    }

    let body: { reference?: string };
    try {
      body = await req.json();
    } catch {
      return json({
        success: false,
        error: "Invalid request body. Expected JSON with { reference }.",
      });
    }

    const reference = body.reference?.trim();
    if (!reference) {
      return json({ success: false, error: "No payment reference provided." });
    }

    const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
    const verifyRes = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!verifyRes.ok) {
      const errorText = await verifyRes.text();
      return json({
        success: false,
        error: `Paystack API returned HTTP ${verifyRes.status}`,
        details: errorText.substring(0, 300),
      });
    }

    const verifyData = await verifyRes.json();
    if (!verifyData.status || verifyData.data?.status !== "success") {
      return json({
        success: false,
        error: "Payment not successful.",
        paystack_status: verifyData.data?.status,
        message: verifyData.message,
      });
    }

    const metadataFields = Array.isArray(verifyData.data?.metadata?.custom_fields)
      ? verifyData.data.metadata.custom_fields
      : [];
    const metadataUserId = metadataFields.find(
      (field: { variable_name?: string; value?: string }) => field?.variable_name === "user_id"
    )?.value;

    if (metadataUserId && metadataUserId !== user.id) {
      return json({
        success: false,
        error: "This payment reference does not belong to the current account.",
      }, 403);
    }

    const customerEmail = verifyData.data?.customer?.email;
    if (!metadataUserId && customerEmail && user.email && customerEmail !== user.email) {
      return json({
        success: false,
        error: "This payment reference does not belong to the current account.",
      }, 403);
    }

    const amountInNaira = Number(verifyData.data.amount ?? 0) / 100;
    const { data: walletResult, error: walletError } = await serviceClient.rpc(
      "wallet_apply_top_up",
      {
        p_user_id: user.id,
        p_amount: amountInNaira,
        p_reference: verifyData.data.reference,
        p_description: "Wallet top-up",
      }
    );

    if (walletError || !walletResult?.success) {
      return json({
        success: false,
        error: walletError?.message || walletResult?.message || "Failed to credit wallet.",
      });
    }

    return json({
      success: true,
      amount: amountInNaira,
      balance: Number(walletResult.balance ?? 0),
      reference: verifyData.data.reference,
      email: customerEmail,
      currency: verifyData.data.currency,
      paid_at: verifyData.data.paid_at,
      already_processed: !!walletResult.already_processed,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Paystack verify error:", message);
    return json({ success: false, error: message });
  }
});
