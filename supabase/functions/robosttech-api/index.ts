import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ROBOSTTECH_API_URL = "https://robosttech.com/api";
const PREMBLY_API_URL = "https://api.prembly.com/verification";

interface RequestBody {
  action: "validate" | "validation_status" | "personalization" | "personalization_status" | "clearance" | "clearance_status" | "nin_search" | "nin_phone" | "nin_demo" | "nin_basic" | "nin_advance" | "bvn_basic" | "bvn_advance";
  nin?: string;
  tracking_id?: string;
  trackingId?: string;
  phone?: string;
  number?: string;
  bvn?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const robosttechApiKey = Deno.env.get("ROBOSTTECH_API_KEY");
    const premblyApiKey = Deno.env.get("PREMBLY_API_KEY");
    const premblyAppId = Deno.env.get("PREMBLY_APP_ID");
    
    const body: RequestBody = await req.json();
    console.log("Received request:", { action: body.action, body: JSON.stringify(body) });

    // Determine which API to use based on action
    const isPrembly = ["nin_basic", "nin_advance", "bvn_basic", "bvn_advance"].includes(body.action);
    const apiKey = isPrembly ? premblyApiKey : robosttechApiKey;
    const apiUrl = isPrembly ? PREMBLY_API_URL : ROBOSTTECH_API_URL;
    
    console.log(`Using ${isPrembly ? "Prembly" : "RobostTech"} API`);
    console.log(`API Key exists: ${!!apiKey}`);
    console.log(`Prembly Key exists: ${!!premblyApiKey}`);
    console.log(`RobostTech Key exists: ${!!robosttechApiKey}`);
    
    if (!apiKey) {
      console.error(`${isPrembly ? "PREMBLY" : "ROBOSTTECH"}_API_KEY not configured`);
      return new Response(
        JSON.stringify({ 
          error: "API key not configured", 
          success: false,
          debug: {
            isPrembly,
            action: body.action,
            premblyKeyExists: !!premblyApiKey,
            robosttechKeyExists: !!robosttechApiKey
          }
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let endpoint = "";
    let method = "POST";
    let requestBody: Record<string, unknown> | null = null;
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    switch (body.action) {
      case "validate":
        endpoint = "/validation";
        requestBody = { nin: body.nin };
        headers["api-key"] = apiKey!;
        break;
      case "validation_status":
        endpoint = "/validation_status";
        requestBody = { nin: body.nin };
        headers["api-key"] = apiKey!;
        break;
      case "personalization":
        endpoint = "/personalization";
        requestBody = { tracking_id: body.tracking_id };
        headers["api-key"] = apiKey!;
        break;
      case "personalization_status":
        endpoint = "/personalization_status";
        requestBody = { tracking_id: body.tracking_id };
        headers["api-key"] = apiKey!;
        break;
      case "clearance":
        endpoint = "/clearance";
        requestBody = { trackingId: body.trackingId || body.tracking_id };
        headers["api-key"] = apiKey!;
        break;
      case "clearance_status":
        endpoint = "/clearance_status";
        requestBody = { trackingId: body.trackingId || body.tracking_id };
        headers["api-key"] = apiKey!;
        break;
      case "nin_search":
        endpoint = "/nin_search";
        requestBody = { nin: body.nin };
        headers["api-key"] = apiKey!;
        break;
      case "nin_phone":
        endpoint = "/nin_phone";
        requestBody = { phone: body.phone };
        headers["api-key"] = apiKey!;
        break;
      case "nin_demo":
        endpoint = "/nin_demo";
        requestBody = { nin: body.nin };
        headers["api-key"] = apiKey!;
        break;
      case "nin_basic":
        endpoint = "/vnin-basic";
        requestBody = { number: body.nin || body.number };
        headers["x-api-key"] = apiKey!;
        headers["accept"] = "application/json";
        break;
      case "nin_advance":
        endpoint = "/nin_advance";
        requestBody = { number: body.nin || body.number };
        headers["api-key"] = apiKey!;
        headers["app-id"] = premblyAppId!;
        headers["accept"] = "application/json";
        break;
      case "bvn_basic":
        endpoint = "/bvn_validation";
        requestBody = { number: body.bvn || body.number };
        headers["x-api-key"] = apiKey!;
        headers["accept"] = "application/json";
        break;
      case "bvn_advance":
        endpoint = "/bvn";
        requestBody = { number: body.bvn || body.number };
        headers["api-key"] = apiKey!;
        headers["app-id"] = premblyAppId!;
        headers["accept"] = "application/json";
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

    console.log(`Making request to ${apiUrl}${endpoint}`);
    console.log("Request body:", JSON.stringify(requestBody));

    const response = await fetch(`${apiUrl}${endpoint}`, {
      method,
      headers,
      body: JSON.stringify(requestBody),
    });

    const raw = await response.text();
    console.log("Raw response:", raw.substring(0, 500));
    
    let data: unknown = null;
    try {
      data = raw ? JSON.parse(raw) : null;
    } catch {
      data = { success: false, error: "Upstream returned invalid JSON", raw };
    }

    console.log("API response status:", response.status);
    console.log("API response data:", JSON.stringify(data).substring(0, 500));

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
    console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
    return new Response(
      JSON.stringify({ 
        error: "Internal server error", 
        message: errorMessage,
        success: false 
      }),
      {
        status: 200, // Return 200 so client can handle gracefully
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});