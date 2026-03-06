import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const secretKey = Deno.env.get("PAYSTACK_SECRET_KEY");
    if (!secretKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Paystack secret key not configured." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { reference } = await req.json();
    if (!reference) {
      return new Response(
        JSON.stringify({ success: false, error: "No payment reference provided." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the transaction with Paystack API
    const verifyUrl = `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`;
    console.log("Verifying Paystack transaction:", verifyUrl);

    const verifyRes = await fetch(verifyUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!verifyRes.ok) {
      const errorText = await verifyRes.text();
      console.error("Paystack API HTTP error:", verifyRes.status, errorText);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Paystack API returned HTTP ${verifyRes.status}`,
          details: errorText.substring(0, 300),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifyData = await verifyRes.json();
    console.log("Paystack verify response status:", verifyData.status, "data.status:", verifyData.data?.status);

    if (!verifyData.status || verifyData.data?.status !== "success") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Payment not successful.",
          paystack_status: verifyData.data?.status,
          message: verifyData.message,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Payment verified — return amount in Naira (Paystack returns kobo)
    const amountInNaira = verifyData.data.amount / 100;
    const email = verifyData.data.customer?.email;

    return new Response(
      JSON.stringify({
        success: true,
        amount: amountInNaira,
        reference: verifyData.data.reference,
        email,
        currency: verifyData.data.currency,
        paid_at: verifyData.data.paid_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Paystack verify error:", message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
