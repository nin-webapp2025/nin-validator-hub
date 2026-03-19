import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTheme } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import { useRole } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BookOpen,
  Key,
  Zap,
  Shield,
  ArrowRight,
  Copy,
  Check,
  Moon,
  Sun,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Clock,
  Code2,
  Terminal,
  Globe,
  Play,
  Loader2,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Pricing & endpoint data ─────────────────────────────── */
const ENDPOINTS = [
  {
    id: "validate",
    name: "NIN Validation",
    method: "POST",
    description: "Submit a NIN for full NIMC validation. Returns approval status and tracking info.",
    price: 2000,
    body: { action: "validate", nin: "12345678901" },
    response: {
      message: "Validation Submission Successfull",
      approved: true,
      category: "new",
      success: true,
      nin: "12345678901",
    },
  },
  {
    id: "validation_status",
    name: "Validation Status",
    method: "POST",
    description: "Check the status of a previously submitted NIN validation.",
    price: 0,
    body: { action: "validation_status", nin: "12345678901" },
    response: {
      message: "Uploaded",
      status: "sent",
      success: false,
      "in-progress": true,
    },
  },
  {
    id: "clearance",
    name: "Clearance",
    method: "POST",
    description: "Submit a NIN for clearance processing.",
    price: 1500,
    body: { action: "clearance", tracking_id: "CKW49TGENXXXXXX" },
    response: {
      message: "Clearance Submission Successfull",
      approved: true,
      success: true,
      nin: "12345678901",
    },
  },
  {
    id: "clearance_status",
    name: "Clearance Status",
    method: "POST",
    description: "Check the status of a previously submitted clearance request.",
    price: 0,
    body: { action: "clearance_status", tracking_id: "CKW49TGENXXXXXX" },
    response: {
      message: "Clearance Status Successfull",
      status: "completed",
      success: true,
    },
  },
  {
    id: "personalization",
    name: "Personalization",
    method: "POST",
    description: "Submit a tracking ID for personalization. Returns NIN holder details.",
    price: 200,
    body: { action: "personalization", tracking_id: "CKW49TGENXXXXXX" },
    response: {
      message: "Personalization Submission Successfull",
      approved: true,
      category: "to_get_slip",
      success: true,
      tracking_id: "CKW49TGENXXXXXX",
    },
  },
  {
    id: "personalization_status",
    name: "Personalization Status",
    method: "POST",
    description: "Check the status of a personalization request.",
    price: 0,
    body: { action: "personalization_status", tracking_id: "CKW49TGENXXXXXX" },
    response: {
      message: "Personalization Successfull",
      personalized: true,
      success: true,
      status: "completed",
    },
  },
  {
    id: "nin_search",
    name: "NIN Search",
    method: "POST",
    description: "Search for identity information using a NIN.",
    price: 200,
    body: { action: "nin_search", nin: "12345678901" },
    response: {
      message: "NIN Search Successfull",
      success: true,
      data: { nin: "12345678901", firstName: "John", lastName: "Doe" },
    },
  },
  {
    id: "nin_phone",
    name: "NIN Phone Lookup",
    method: "POST",
    description: "Look up a NIN using a registered phone number.",
    price: 200,
    body: { action: "nin_phone", phone: "08012345678" },
    response: {
      message: "NIN Phone Lookup Successfull",
      success: true,
      nin: "12345678901",
    },
  },
  {
    id: "nin_advance",
    name: "NIN Advanced Lookup",
    method: "POST",
    description: "Advanced NIN verification with full biographical data (Prembly).",
    price: 200,
    body: { action: "nin_advance", number: "12345678901" },
    response: {
      success: true,
      data: {
        nin: "12345678901",
        firstname: "JOHN",
        surname: "DOE",
        middlename: "",
        birthdate: "01-01-1990",
        gender: "Male",
        telephoneno: "08012345678",
        photo: "/9j/4AAQ...(base64)",
      },
    },
  },
  {
    id: "bvn_advance",
    name: "BVN Verification",
    method: "POST",
    description: "Verify a Bank Verification Number with full details (Prembly).",
    price: 250,
    body: { action: "bvn_advance", number: "22222222222" },
    response: {
      success: true,
      data: {
        bvn: "22222222222",
        first_name: "JOHN",
        last_name: "DOE",
        dob: "01-Jan-90",
        phone: "08012345678",
      },
    },
  },
  {
    id: "print_nin_slip_premium",
    name: "Print Premium NIN Slip",
    method: "POST",
    description: "Fetch full NIN data required to render a Premium (CR80 card-style) digital NIN slip. Returns biographical data and base64 photo.",
    price: 600,
    body: { action: "print_nin_slip_premium", nin: "12345678901" },
    response: {
      success: true,
      data: {
        nin: "12345678901",
        firstname: "JOHN",
        surname: "DOE",
        birthdate: "01-01-1990",
        gender: "Male",
        photo: "/9j/4AAQ...(base64)",
      },
    },
  },
  {
    id: "print_nin_slip_long",
    name: "Print Long NIN Slip (NINS)",
    method: "POST",
    description: "Fetch full NIN data required to render the official Long Format NIMC NIN Slip (NINS table layout). Returns biographical data and base64 photo.",
    price: 400,
    body: { action: "print_nin_slip_long", nin: "12345678901" },
    response: {
      success: true,
      data: {
        nin: "12345678901",
        firstname: "JOHN",
        surname: "DOE",
        birthdate: "01-01-1990",
        gender: "Male",
        photo: "/9j/4AAQ...(base64)",
      },
    },
  },
];

const ERROR_CODES = [
  { code: 200, meaning: "Success", description: "Request completed successfully." },
  { code: 400, meaning: "Bad Request", description: "Missing or invalid action / parameters." },
  { code: 401, meaning: "Unauthorized", description: "Missing or invalid API key." },
  { code: 402, meaning: "Payment Required", description: "Insufficient wallet balance for this action." },
  { code: 403, meaning: "Forbidden", description: "API key has been deactivated." },
  { code: 429, meaning: "Too Many Requests", description: "Rate limit exceeded. Default: 100 req/min." },
  { code: 503, meaning: "Service Unavailable", description: "Upstream API is not configured or unavailable." },
];

/* ─── Code snippet component ──────────────────────────────── */
function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative group">
      <pre className="overflow-x-auto rounded-lg bg-slate-950 dark:bg-slate-900 text-slate-100 p-4 text-sm font-mono leading-relaxed border border-slate-800">
        <code className={`language-${language}`}>{code}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 hover:bg-slate-700 text-slate-300 rounded p-1.5"
        title="Copy"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

/* ─── Endpoint card ───────────────────────────────────────── */
function EndpointCard({ ep }: { ep: (typeof ENDPOINTS)[0] }) {
  const [expanded, setExpanded] = useState(false);

  const BASE_URL = "https://eyntzaodrljvnzetvfdb.supabase.co/functions/v1/api-gateway";

  const curlSnippet = `curl -X POST ${BASE_URL} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sk_live_YOUR_KEY_HERE" \\
  -d '${JSON.stringify(ep.body, null, 2)}'`;

  const jsSnippet = `const response = await fetch("${BASE_URL}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "sk_live_YOUR_KEY_HERE",
  },
  body: JSON.stringify(${JSON.stringify(ep.body, null, 4)}),
});

const data = await response.json();
console.log(data);`;

  const pythonSnippet = `import requests

response = requests.post(
    "${BASE_URL}",
    headers={
        "Content-Type": "application/json",
        "x-api-key": "sk_live_YOUR_KEY_HERE",
    },
    json=${JSON.stringify(ep.body, null, 4).replace(/"/g, '"')},
)

print(response.json())`;

  return (
    <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className="font-mono text-xs bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
              >
                {ep.method}
              </Badge>
              <CardTitle className="text-base">{ep.name}</CardTitle>
              {ep.price > 0 ? (
                <Badge variant="secondary" className="text-xs">
                  ₦{ep.price.toLocaleString()}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs text-green-600 dark:text-green-400 border-green-300 dark:border-green-700">
                  Free
                </Badge>
              )}
            </div>
            {expanded ? (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronRight className="h-4 w-4 text-slate-400" />
            )}
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {ep.description}
          </p>
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="pt-0 space-y-4">
          {/* Request body */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Request Body
            </h4>
            <CodeBlock code={JSON.stringify(ep.body, null, 2)} language="json" />
          </div>

          {/* Example response */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Example Response
            </h4>
            <CodeBlock code={JSON.stringify(ep.response, null, 2)} language="json" />
          </div>

          {/* Code samples */}
          <div>
            <h4 className="text-sm font-semibold mb-2 text-slate-700 dark:text-slate-300">
              Code Examples
            </h4>
            <Tabs defaultValue="curl" className="w-full">
              <TabsList className="grid grid-cols-3 w-full max-w-xs">
                <TabsTrigger value="curl" className="text-xs gap-1">
                  <Terminal className="h-3 w-3" /> cURL
                </TabsTrigger>
                <TabsTrigger value="js" className="text-xs gap-1">
                  <Code2 className="h-3 w-3" /> JavaScript
                </TabsTrigger>
                <TabsTrigger value="python" className="text-xs gap-1">
                  <Code2 className="h-3 w-3" /> Python
                </TabsTrigger>
              </TabsList>
              <TabsContent value="curl" className="mt-3">
                <CodeBlock code={curlSnippet} language="bash" />
              </TabsContent>
              <TabsContent value="js" className="mt-3">
                <CodeBlock code={jsSnippet} language="javascript" />
              </TabsContent>
              <TabsContent value="python" className="mt-3">
                <CodeBlock code={pythonSnippet} language="python" />
              </TabsContent>
            </Tabs>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/* ─── Main page ───────────────────────────────────────────── */
export default function ApiDocs() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { role } = useRole();
  const navigate = useNavigate();

  // Map role → dashboard path with api-keys tab hash
  const apiKeysPath = (() => {
    if (!user) return "/auth";
    const base = role === "admin" ? "/dashboard/admin"
      : role === "staff" ? "/dashboard/staff"
      : role === "vip" ? "/dashboard/vip"
      : "/dashboard/user";
    return `${base}?tab=api-keys`;
  })();

  const handleGetApiKey = () => {
    if (!user) { navigate("/auth"); return; }
    const base = role === "admin" ? "/dashboard/admin"
      : role === "staff" ? "/dashboard/staff"
      : role === "vip" ? "/dashboard/vip"
      : "/dashboard/user";
    navigate(base, { state: { tab: "api-keys" } });
  };

  /* ─── Playground state ────────────────────────────────── */
  const BASE_URL = "https://eyntzaodrljvnzetvfdb.supabase.co/functions/v1/api-gateway";

  const [playAction, setPlayAction] = useState(ENDPOINTS[0].id);
  const [playBody, setPlayBody] = useState(
    JSON.stringify(ENDPOINTS[0].body, null, 2)
  );
  const [playKey, setPlayKey] = useState("");
  const [playSending, setPlaySending] = useState(false);
  const [playResponse, setPlayResponse] = useState<{
    status: number;
    ms: number;
    body: unknown;
  } | null>(null);
  const [playError, setPlayError] = useState<string | null>(null);

  // Auto-fill first test key found for this user
  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("api_keys")
      .select("key_prefix")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }: { data: { key_prefix: string }[] | null }) => {
        if (!data) return;
        const testKey = data.find((k) => k.key_prefix.startsWith("sk_t"));
        if (testKey) setPlayKey(testKey.key_prefix + "… (paste full key)");
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handlePlaySend = async () => {
    setPlayError(null);
    setPlayResponse(null);

    if (!playKey.trim()) {
      setPlayError("Paste your API key (sk_test_… or sk_live_…) above.");
      return;
    }
    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(playBody);
    } catch {
      setPlayError("Request body is not valid JSON.");
      return;
    }

    setPlaySending(true);
    const t0 = Date.now();
    try {
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": playKey.trim(),
        },
        body: JSON.stringify(parsedBody),
      });
      const ms = Date.now() - t0;
      let body: unknown;
      try { body = await res.json(); } catch { body = { raw: await res.text() }; }
      setPlayResponse({ status: res.status, ms, body });
    } catch (err: unknown) {
      setPlayError(err instanceof Error ? err.message : "Network error");
    } finally {
      setPlaySending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20">
      {/* ── Top nav ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 h-14">
            <Link to="/">
              <img src="/logo.svg" alt="SparkID" className="h-7" />
            </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="h-8 w-8"
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button size="sm" onClick={handleGetApiKey} className="gap-1">
                Get API Key <ArrowRight className="h-3.5 w-3.5" />
              </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="text-center space-y-4">
          <Badge variant="outline" className="text-xs gap-1 px-3 py-1">
            <Globe className="h-3 w-3" /> REST API v1
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-white">
            SparkID Developer API
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Integrate Nigerian identity verification into your application. Validate NINs, verify BVNs,
            run clearance checks, and more — all with a single API key.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button className="gap-1.5" onClick={handleGetApiKey}>
                <Key className="h-4 w-4" /> Get Your API Key
              </Button>
            <a href="#endpoints">
              <Button variant="outline" className="gap-1.5">
                <BookOpen className="h-4 w-4" /> View Endpoints
              </Button>
            </a>
          </div>
        </section>

        {/* ── Quick start ───────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" /> Quick Start
          </h2>

          <div className="grid sm:grid-cols-3 gap-4">
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5 space-y-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                  1
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Create an Account</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Sign up at{" "}
                  <Link to="/auth" className="text-blue-600 hover:underline">
                    sparkid.ng
                  </Link>{" "}
                  and log into your dashboard.
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5 space-y-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                  2
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Generate an API Key</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Go to the <strong>API Keys</strong> tab in your dashboard and create a new key.
                </p>
              </CardContent>
            </Card>
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-5 space-y-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                  3
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white">Fund Your Wallet</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Top up via Paystack from the <strong>Wallet</strong> tab. API calls deduct automatically.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* ── Authentication ────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" /> Authentication
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            All API requests require your secret key in the <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono">x-api-key</code> header.
            Keys start with <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono">sk_live_</code> and are tied to your wallet balance.
          </p>
          <CodeBlock
            code={`# Every request must include your API key
curl -X POST https://eyntzaodrljvnzetvfdb.supabase.co/functions/v1/api-gateway \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sk_live_YOUR_KEY_HERE" \\
  -d '{"action": "validate", "nin": "12345678901"}'`}
          />
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800 dark:text-amber-300">
              <strong>Keep your key secret.</strong> Never expose it in client-side code or public repositories.
              If compromised, revoke it immediately from your dashboard and create a new one.
            </div>
          </div>
        </section>

        {/* ── Test Mode ─────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-violet-500" /> Test Mode
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Test keys start with{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono">sk_test_</code>{" "}
            and return realistic mock responses — <strong>no wallet deduction, no upstream API calls.</strong>{" "}
            Use them to build and test your integration before switching to a live key.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/20">
              <p className="text-sm font-semibold text-violet-800 dark:text-violet-300 mb-1">sk_test_ key behaviour</p>
              <ul className="text-sm text-violet-700 dark:text-violet-400 space-y-1 list-disc list-inside">
                <li>Returns hardcoded mock data instantly</li>
                <li>No wallet balance required</li>
                <li>Requests are logged to your usage stats</li>
                <li>All actions supported</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">sk_live_ key behaviour</p>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>Calls real NIMC / Prembly APIs</li>
                <li>Deducts wallet per operation</li>
                <li>Returns real identity data</li>
                <li>Use in production only</li>
              </ul>
            </div>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Create a test key from the <strong>API Keys</strong> tab in your dashboard by enabling the{" "}
            <em>Test mode key</em> toggle before clicking Create.
          </p>
          <CodeBlock
            code={`# Test key — free, returns mock data
curl -X POST https://eyntzaodrljvnzetvfdb.supabase.co/functions/v1/api-gateway \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: sk_test_YOUR_TEST_KEY_HERE" \\
  -d '{"action": "validate", "nin": "12345678901"}'

# Response includes "_test_mode": true to confirm test environment
# { "success": true, "approved": true, "nin": "00000000000", "_test_mode": true }`}
          />
        </section>

        {/* ── Base URL ──────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="h-5 w-5 text-purple-500" /> Base URL
          </h2>
          <CodeBlock code="https://eyntzaodrljvnzetvfdb.supabase.co/functions/v1/api-gateway" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            All endpoints use <strong>POST</strong>. The <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono">action</code> field
            in the JSON body determines which verification service is called.
          </p>
        </section>

        {/* ── Pricing ───────────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" /> Pricing
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Each API call deducts from your wallet. Status-check endpoints are free.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                    Action
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                    Description
                  </th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                    Cost
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {ENDPOINTS.map((ep) => (
                  <tr key={ep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5 font-mono text-xs text-blue-600 dark:text-blue-400">
                      {ep.id}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">{ep.name}</td>
                    <td className="px-4 py-2.5 text-right">
                      {ep.price > 0 ? (
                        <span className="font-semibold text-slate-900 dark:text-white">
                          ₦{ep.price.toLocaleString()}
                        </span>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 text-xs"
                        >
                          Free
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Rate Limits ───────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500" /> Rate Limits
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Each API key has a rate limit of <strong>100 requests per minute</strong> by default.
            If you exceed this, you'll receive a <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono">429</code> response.
          </p>
          <CodeBlock
            code={`// 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "limit": 100,
  "window": "60s"
}`}
            language="json"
          />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Need higher limits? Contact{" "}
            <a href="mailto:support@sparkid.ng" className="text-blue-600 hover:underline">
              support@sparkid.ng
            </a>
            .
          </p>
        </section>

        {/* ── Endpoints ─────────────────────────────────────── */}
        <section id="endpoints" className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-indigo-500" /> Endpoints
          </h2>
          <p className="text-slate-600 dark:text-slate-400">
            Click an endpoint to expand its documentation, request body, response, and code examples.
          </p>
          <div className="space-y-3">
            {ENDPOINTS.map((ep) => (
              <EndpointCard key={ep.id} ep={ep} />
            ))}
          </div>
        </section>

        {/* ── Error Codes ───────────────────────────────────── */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" /> Error Codes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60">
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                    Meaning
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-700 dark:text-slate-300">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {ERROR_CODES.map((e) => (
                  <tr key={e.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "font-mono text-xs",
                          e.code < 300
                            ? "text-green-600 border-green-300"
                            : e.code < 500
                              ? "text-amber-600 border-amber-300"
                              : "text-red-600 border-red-300"
                        )}
                      >
                        {e.code}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-900 dark:text-white">
                      {e.meaning}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                      {e.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Playground ────────────────────────────────────── */}
        <section id="playground" className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-violet-500" /> API Playground
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Send live requests directly from this page. Use a{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono">sk_test_</code>{" "}
            key to test for free with mock responses, or a{" "}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono">sk_live_</code>{" "}
            key to hit real APIs.
          </p>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* ── Left: request builder ── */}
            <div className="space-y-3">
              {/* Action selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Action
                </label>
                <Select
                  value={playAction}
                  onValueChange={(val) => {
                    setPlayAction(val);
                    const ep = ENDPOINTS.find((e) => e.id === val);
                    if (ep) setPlayBody(JSON.stringify(ep.body, null, 2));
                    setPlayResponse(null);
                    setPlayError(null);
                  }}
                >
                  <SelectTrigger className="dark:bg-slate-900 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ENDPOINTS.map((ep) => (
                      <SelectItem key={ep.id} value={ep.id}>
                        <span className="font-mono text-xs mr-2 text-slate-500">{ep.id}</span>
                        {ep.name}
                        {ep.price === 0 && (
                          <span className="ml-2 text-[10px] text-green-600 dark:text-green-400">free</span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* API Key input */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  API Key
                </label>
                <input
                  type="password"
                  value={playKey}
                  onChange={(e) => setPlayKey(e.target.value)}
                  placeholder="sk_test_… or sk_live_…"
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
                <p className="text-[11px] text-slate-400">
                  Use a <span className="font-mono">sk_test_</span> key for free mock responses. Keys are never stored or logged here.
                </p>
              </div>

              {/* Request body */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Request Body (JSON)
                </label>
                <Textarea
                  value={playBody}
                  onChange={(e) => setPlayBody(e.target.value)}
                  rows={8}
                  spellCheck={false}
                  className="font-mono text-xs dark:bg-slate-900 dark:border-slate-700 resize-none"
                />
              </div>

              <Button
                onClick={handlePlaySend}
                disabled={playSending}
                className="w-full gap-2"
              >
                {playSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                {playSending ? "Sending…" : "Send Request"}
              </Button>

              {playError && (
                <div className="p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-sm text-red-700 dark:text-red-400">
                  {playError}
                </div>
              )}
            </div>

            {/* ── Right: response panel ── */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Response
                </label>
                {playResponse && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "font-mono text-xs",
                        playResponse.status < 300
                          ? "text-green-600 border-green-300 dark:text-green-400 dark:border-green-700"
                          : playResponse.status < 500
                            ? "text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700"
                            : "text-red-600 border-red-300 dark:text-red-400 dark:border-red-700"
                      )}
                    >
                      {playResponse.status}
                    </Badge>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {playResponse.ms}ms
                    </span>
                  </div>
                )}
              </div>

              <div className="relative min-h-[280px] rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-950 dark:bg-slate-900">
                {!playResponse && !playSending && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <FlaskConical className="h-8 w-8 opacity-30" />
                    <p className="text-sm">Response will appear here</p>
                  </div>
                )}
                {playSending && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
                  </div>
                )}
                {playResponse && (
                  <pre className="p-4 overflow-auto text-xs font-mono text-slate-100 leading-relaxed h-full max-h-[480px]">
                    {JSON.stringify(playResponse.body, null, 2)}
                  </pre>
                )}
              </div>

              {playResponse?.body && typeof playResponse.body === "object" &&
                "_test_mode" in (playResponse.body as object) && (
                <div className="flex items-center gap-2 text-xs text-violet-600 dark:text-violet-400">
                  <FlaskConical className="h-3.5 w-3.5" />
                  Test mode — mock response, no charge
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── Best Practices ────────────────────────────────── */}
        <section className="space-y-4 pb-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Best Practices</h2>
          <ul className="space-y-2 text-slate-600 dark:text-slate-400">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
              <span>Store your API key in environment variables — never hard-code it.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
              <span>Use status endpoints to poll for results instead of re-submitting the same request.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
              <span>Handle 402 (insufficient balance) gracefully — prompt users to top up.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
              <span>Implement exponential back-off when receiving 429 rate limit responses.</span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 mt-1 shrink-0" />
              <span>If a request fails, the wallet charge is automatically refunded.</span>
            </li>
          </ul>
        </section>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            &copy; {new Date().getFullYear()} SparkID. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm text-slate-500 dark:text-slate-400">
            <Link to="/privacy" className="hover:text-blue-600 transition-colors">
              Privacy
            </Link>
            <Link to="/terms" className="hover:text-blue-600 transition-colors">
              Terms
            </Link>
            <a href="mailto:support@sparkid.ng" className="hover:text-blue-600 transition-colors">
              Support
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
