import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROBOSTTECH_API_URL = "https://robosttech.com/api";

interface RequestBody {
  action: "validate" | "validation_status" | "personalization" | "personalization_status";
  nin?: string;
  tracking_id?: string;
  data?: Record<string, unknown>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("ROBOSTTECH_API_KEY");
    
    if (!apiKey) {
      console.error("ROBOSTTECH_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: RequestBody = await req.json();
    console.log("Received request:", { action: body.action, nin: body.nin ? "***" : undefined });

    let endpoint = "";
    let method = "POST";
    let requestBody: Record<string, unknown> | null = null;

    switch (body.action) {
      case "validate":
        endpoint = "/validation";
        requestBody = { nin: body.nin };
        break;
      case "validation_status":
        endpoint = "/validation_status";
        requestBody = { nin: body.nin };
        break;
      case "personalization":
        endpoint = "/personalization";
        requestBody = body.data ?? null;
        break;
      case "personalization_status":
        endpoint = "/personalization_status";
        requestBody = { tracking_id: body.tracking_id };
        break;
      default:
        return new Response(
          JSON.stringify({ error: "Invalid action" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
    }

    console.log(`Making request to ${ROBOSTTECH_API_URL}${endpoint}`);

    const response = await fetch(`${ROBOSTTECH_API_URL}${endpoint}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    });

    const raw = await response.text();
    let data: unknown = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { success: false, error: "Upstream returned invalid JSON", raw };
    }

    console.log("API response status:", response.status);

    // Supabase `functions.invoke` treats non-2xx as exceptions. For upstream 4xx (business errors like
    // insufficient balance), return 200 so the client can handle the payload without a hard error.
    const outgoingStatus = response.status >= 400 && response.status < 500 ? 200 : response.status;

    if (outgoingStatus !== response.status) {
      if (data && typeof data === "object" && !Array.isArray(data)) {
        (data as Record<string, unknown>).__upstream_status = response.status;
      } else {
        data = { data, __upstream_status: response.status };
      }
    }

    return new Response(JSON.stringify(data), {
      status: outgoingStatus,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Edge function error:", errorMessage);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});