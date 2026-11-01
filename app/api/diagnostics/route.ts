import { connection, NextResponse } from "next/server";
import dns from "dns";

try {
  dns.setDefaultResultOrder("ipv4first");
  dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch {
  // Ignore in restricted environments
}

import { connectToDatabase } from "@/lib/mongodb";
import mongoose from "mongoose";
import Groq from "groq-sdk";
import { getAccessToken } from "@/lib/gmb-client";

export interface ServiceDiagnostic {
  id: "mongodb" | "groq" | "unsplash" | "googleAuth" | "gmbApi";
  name: string;
  category: "Database" | "AI Engine" | "Media Engine" | "OAuth" | "Core Integration";
  status: "pass" | "fail";
  latencyMs?: number;
  details: string;
  fixSteps?: string[];
  fixUrl?: string;
  fixUrlLabel?: string;
}

export interface DiagnosticsResponse {
  ok: boolean;
  healthScore: number;
  passedCount: number;
  totalCount: number;
  isAllPassed: boolean;
  timestamp: string;
  services: ServiceDiagnostic[];
}

// 1. MONGODB CHECK: Test mongoose connection state
async function testMongoDB(): Promise<ServiceDiagnostic> {
  const start = Date.now();
  const uri = process.env.MONGODB_URI?.trim();

  if (!uri) {
    return {
      id: "mongodb",
      name: "MongoDB Atlas",
      category: "Database",
      status: "fail",
      latencyMs: 0,
      details: "MONGODB_URI connection string is not set in environment variables.",
      fixSteps: [
        "Create or open your MongoDB Atlas cluster at cloud.mongodb.com.",
        "Copy your connection string (e.g., mongodb+srv://user:pass@cluster.mongodb.net/pinpilot).",
        "Add MONGODB_URI to your .env.local file.",
        "Ensure Network Access in MongoDB Atlas allows IP 0.0.0.0/0 (Allow from Anywhere).",
      ],
      fixUrl: "https://cloud.mongodb.com/v2#/security/network/accessList",
      fixUrlLabel: "MongoDB Atlas Network Access",
    };
  }

  // If already connected
  if ((mongoose.connection.readyState as number) === 1) {
    const dbName = mongoose.connection.name || "pinpilot";
    return {
      id: "mongodb",
      name: "MongoDB Atlas",
      category: "Database",
      status: "pass",
      latencyMs: Date.now() - start,
      details: `Connected to MongoDB Atlas cluster (Database: ${dbName}, readyState: 1). Read/Write active.`,
    };
  }

  try {
    // If already in the process of connecting (state 2), await the in-flight connection
    if ((mongoose.connection.readyState as number) === 2) {
      await mongoose.connection.asPromise();
    } else if ((mongoose.connection.readyState as number) !== 1) {
      // Attempt direct connection with explicit timeout
      await mongoose.connect(uri, {
        bufferCommands: false,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
    }

    const latency = Date.now() - start;
    if ((mongoose.connection.readyState as number) === 1) {
      const dbName = mongoose.connection.name || "pinpilot";
      return {
        id: "mongodb",
        name: "MongoDB Atlas",
        category: "Database",
        status: "pass",
        latencyMs: latency,
        details: `Connected to MongoDB Atlas cluster (Database: ${dbName}, readyState: 1). Read/Write active.`,
      };
    }

    throw new Error(`Mongoose connection state: ${mongoose.connection.readyState}`);
  } catch (error) {
    const latency = Date.now() - start;
    const msg = error instanceof Error ? error.message : String(error);
    const isWhitelistError =
      msg.toLowerCase().includes("whitelist") ||
      msg.toLowerCase().includes("ip") ||
      msg.toLowerCase().includes("could not connect to any servers");

    if (isWhitelistError) {
      return {
        id: "mongodb",
        name: "MongoDB Atlas",
        category: "Database",
        status: "fail",
        latencyMs: latency,
        details: "MongoDB Atlas IP Access Blocked: Your current IP address is not whitelisted in MongoDB Atlas Network Access.",
        fixSteps: [
          "Log in to MongoDB Atlas (cloud.mongodb.com).",
          "Go to 'Network Access' under Security in the left sidebar.",
          "Click '+ ADD IP ADDRESS' and select 'ALLOW ACCESS FROM ANYWHERE' (0.0.0.0/0), or add your current public IP.",
          "Click 'Confirm' and wait 30-60 seconds for Atlas to update the firewall rules.",
          "Click 'Re-run Diagnostics' at the top of this page once applied.",
        ],
        fixUrl: "https://cloud.mongodb.com/v2#/security/network/accessList",
        fixUrlLabel: "Open Atlas Network Access",
      };
    }

    return {
      id: "mongodb",
      name: "MongoDB Atlas",
      category: "Database",
      status: "fail",
      latencyMs: latency,
      details: `MongoDB connection error: ${msg}`,
      fixSteps: [
        "Verify your MONGODB_URI in .env.local.",
        "Ensure your Atlas cluster is active (not paused or terminating).",
        "Check that your database username and password in MONGODB_URI are valid.",
        "Add IP 0.0.0.0/0 under Network Access in MongoDB Atlas.",
      ],
      fixUrl: "https://cloud.mongodb.com/v2#/security/network/accessList",
      fixUrlLabel: "MongoDB Atlas Console",
    };
  }
}

// 2. GROQ AI CHECK: Send minimal ping ("Say hi") using first available key in multi-key array
async function testGroqAI(): Promise<ServiceDiagnostic> {
  const start = Date.now();
  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY2,
    process.env.GROQ_API_KEY3,
  ]
    .map((k) => k?.trim())
    .filter((k): k is string => Boolean(k && k.length > 5));

  if (keys.length === 0) {
    return {
      id: "groq",
      name: "Groq AI Engine",
      category: "AI Engine",
      status: "fail",
      latencyMs: 0,
      details: "No Groq API keys found in environment (GROQ_API_KEY).",
      fixSteps: [
        "Invalid API Key. Get a new one at console.groq.com.",
        "Add GROQ_API_KEY=gsk_... to your .env.local file.",
        "You can also add GROQ_API_KEY2 and GROQ_API_KEY3 for automatic multi-key load balancing.",
      ],
      fixUrl: "https://console.groq.com/keys",
      fixUrlLabel: "Get Groq API Key",
    };
  }

  const primaryKey = keys[0];

  try {
    const groq = new Groq({ apiKey: primaryKey });
    // Minimal ping ("Say hi")
    const completion = await groq.chat.completions.create({
      model: "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: "Say hi" }],
      max_tokens: 5,
    });

    const latency = Date.now() - start;
    const reply = completion.choices?.[0]?.message?.content?.trim() || "hi";

    return {
      id: "groq",
      name: "Groq AI Engine",
      category: "AI Engine",
      status: "pass",
      latencyMs: latency,
      details: `Groq AI inference ping verified (${latency}ms). Pool: ${keys.length} key(s) active. Response: "${reply}".`,
    };
  } catch (error: any) {
    const latency = Date.now() - start;
    const statusCode = error?.status || error?.statusCode || 0;
    const msg = error instanceof Error ? error.message : String(error);

    const is429 =
      statusCode === 429 ||
      msg.includes("429") ||
      msg.toLowerCase().includes("rate_limit") ||
      msg.toLowerCase().includes("rate limit") ||
      msg.toLowerCase().includes("tokens per minute");

    const is401 =
      statusCode === 401 ||
      msg.includes("401") ||
      msg.toLowerCase().includes("invalid_api_key") ||
      msg.toLowerCase().includes("unauthorized") ||
      msg.toLowerCase().includes("invalid api key");

    if (is429) {
      return {
        id: "groq",
        name: "Groq AI Engine",
        category: "AI Engine",
        status: "fail",
        latencyMs: latency,
        details: `Groq 429 Rate Limit exceeded: ${msg}`,
        fixSteps: [
          "Rate limit exceeded on Groq key (429).",
          "Add a second key as GROQ_API_KEY2 in .env.local to activate instant round-robin failover.",
          "Or upgrade your quota tier in Groq Console > Billing.",
        ],
        fixUrl: "https://console.groq.com/settings/billing",
        fixUrlLabel: "Groq Billing & Quota",
      };
    }

    if (is401) {
      return {
        id: "groq",
        name: "Groq AI Engine",
        category: "AI Engine",
        status: "fail",
        latencyMs: latency,
        details: "Groq 401 Unauthorized: Invalid API Key.",
        fixSteps: [
          "Invalid API Key. Get a new one at console.groq.com.",
          "Generate a new key at console.groq.com/keys.",
          "Update GROQ_API_KEY in .env.local.",
        ],
        fixUrl: "https://console.groq.com/keys",
        fixUrlLabel: "Generate New Groq Key",
      };
    }

    return {
      id: "groq",
      name: "Groq AI Engine",
      category: "AI Engine",
      status: "fail",
      latencyMs: latency,
      details: `Groq error: ${msg}`,
      fixSteps: [
        "Invalid API Key. Get a new one at console.groq.com.",
        "Verify network connectivity to api.groq.com.",
        "Check that your API key starts with 'gsk_'.",
      ],
      fixUrl: "https://console.groq.com/keys",
      fixUrlLabel: "Groq Console",
    };
  }
}

// 3. UNSPLASH API CHECK: Ping search endpoint for 1 image & catch 403/429
async function testUnsplash(): Promise<ServiceDiagnostic> {
  const start = Date.now();
  const rawKey = process.env.UNSPLASH_API_KEY || process.env.UNSPLASH_ACCESS_KEY || "";
  const apiKey = rawKey.trim().replace(/^["']|["']$/g, "");

  if (!apiKey) {
    return {
      id: "unsplash",
      name: "Unsplash Photo API",
      category: "Media Engine",
      status: "fail",
      latencyMs: 0,
      details: "UNSPLASH_API_KEY or UNSPLASH_ACCESS_KEY is missing in .env.local.",
      fixSteps: [
        "Visit unsplash.com/oauth/applications and create a Developer App.",
        "Copy your Access Key.",
        "Add UNSPLASH_API_KEY=your_access_key to .env.local.",
      ],
      fixUrl: "https://unsplash.com/oauth/applications",
      fixUrlLabel: "Unsplash Developer Portal",
    };
  }

  try {
    const res = await fetch(
      "https://api.unsplash.com/search/photos?query=interior&per_page=1&orientation=landscape",
      {
        headers: { Authorization: `Client-ID ${apiKey}` },
        cache: "no-store",
      },
    );

    const latency = Date.now() - start;

    if (res.status === 403 || res.status === 429) {
      return {
        id: "unsplash",
        name: "Unsplash Photo API",
        category: "Media Engine",
        status: "fail",
        latencyMs: latency,
        details: `Unsplash HTTP ${res.status}: Hourly demo rate limit reached (50 req/hr cap).`,
        fixSteps: [
          "You have hit the 50 req/hr demo limit. Apply for Production status in your Unsplash dashboard.",
          "Production status grants 5,000 requests/hour.",
          "Wait until the top of the hour for the current demo rate limit window to reset.",
        ],
        fixUrl: "https://unsplash.com/oauth/applications",
        fixUrlLabel: "Apply for Production on Unsplash",
      };
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return {
        id: "unsplash",
        name: "Unsplash Photo API",
        category: "Media Engine",
        status: "fail",
        latencyMs: latency,
        details: `Unsplash API HTTP ${res.status}: ${errText || res.statusText}`,
        fixSteps: [
          "Check that your Access Key in .env.local has not been revoked or regenerated.",
          "Ensure your Unsplash app is set to Active in the developer dashboard.",
        ],
        fixUrl: "https://unsplash.com/oauth/applications",
        fixUrlLabel: "Unsplash Dashboard",
      };
    }

    const remaining = res.headers.get("x-ratelimit-remaining") || "Active";
    return {
      id: "unsplash",
      name: "Unsplash Photo API",
      category: "Media Engine",
      status: "pass",
      latencyMs: latency,
      details: `Search API verified (${latency}ms). Rate limit quota remaining: ${remaining}/50 req/hr.`,
    };
  } catch (error) {
    const latency = Date.now() - start;
    const msg = error instanceof Error ? error.message : "Fetch failed";
    return {
      id: "unsplash",
      name: "Unsplash Photo API",
      category: "Media Engine",
      status: "fail",
      latencyMs: latency,
      details: `Unsplash connection failed: ${msg}`,
      fixSteps: [
        "Check network connectivity to api.unsplash.com.",
        "Ensure DNS can resolve api.unsplash.com.",
      ],
      fixUrl: "https://unsplash.com/oauth/applications",
      fixUrlLabel: "Unsplash Status",
    };
  }
}

// 4. GOOGLE CLOUD AUTH CHECK: Check if GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are populated
function testGoogleCloudAuth(): ServiceDiagnostic {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

  const missing: string[] = [];
  if (!clientId) missing.push("GOOGLE_CLIENT_ID");
  if (!clientSecret) missing.push("GOOGLE_CLIENT_SECRET");

  if (!clientId || !clientSecret || missing.length > 0) {
    return {
      id: "googleAuth",
      name: "Google Cloud Auth",
      category: "OAuth",
      status: "fail",
      details: `Missing required Google Cloud auth variables in .env: ${missing.join(", ")}.`,
      fixSteps: [
        "Go to Google Cloud Console (console.cloud.google.com).",
        "Select your project and navigate to APIs & Services > Credentials.",
        "Create OAuth 2.0 Client ID (Web application) or copy existing credentials.",
        `Add ${missing.join(", ")} to your .env.local file.`,
      ],
      fixUrl: "https://console.cloud.google.com/apis/credentials",
      fixUrlLabel: "GCP Credentials Console",
    };
  }

  const maskedClientId = clientId.length > 16 ? `...${clientId.slice(-14)}` : clientId;
  return {
    id: "googleAuth",
    name: "Google Cloud Auth",
    category: "OAuth",
    status: "pass",
    details: `Google Cloud credentials configured (Client ID: ${maskedClientId}).`,
  };
}

// 5. GOOGLE BUSINESS PROFILE APIS: Attempt to fetch user's location list
// Special case: 403 or Quota 0 error returns state indicating need to fill out Google Business Profile API Access Request Form
function handleGmb403OrQuotaError(errBody: any, latency: number): ServiceDiagnostic {
  const rawMsg = errBody?.error?.message || "Google Cloud Project does not have GMB API access / Quota 0.";
  return {
    id: "gmbApi",
    name: "Google Business Profile API",
    category: "Core Integration",
    status: "fail",
    latencyMs: latency,
    details: `Google API Quota Zero / HTTP 403: ${rawMsg}`,
    fixSteps: [
      "Your Google Cloud Project does not have GMB API access yet. [Link to Google's API Request Form]. Fill this out and wait for Google's approval.",
      "Submit the official Google Business Profile API Access Request Form with your GCP Project ID.",
      "Wait for Google's approval email (typically 2-5 business days).",
      "After approval, enable 'My Business Business Information API' and 'My Business Account Management API' in Google Cloud Console.",
    ],
    fixUrl: "https://support.google.com/business/contact/api_default",
    fixUrlLabel: "Google Business Profile API Access Request Form",
  };
}

async function testGoogleBusinessProfile(): Promise<ServiceDiagnostic> {
  const start = Date.now();

  try {
    // 1. Obtain OAuth token
    const token = await getAccessToken();

    // 2. Resolve account ID
    let accountId = process.env.GMB_ACCOUNT_ID?.trim();
    if (accountId && accountId.startsWith("accounts/")) {
      accountId = accountId.replace(/^accounts\//, "");
    }

    if (!accountId) {
      // Query account management API to find account
      const accRes = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });

      if (accRes.status === 403) {
        const errBody = await accRes.json().catch(() => null);
        return handleGmb403OrQuotaError(errBody, Date.now() - start);
      }

      if (accRes.ok) {
        const accData = await accRes.json();
        const firstAcc = accData.accounts?.[0];
        if (firstAcc?.name) {
          accountId = firstAcc.name.replace(/^accounts\//, "");
        }
      }
    }

    if (!accountId) {
      return {
        id: "gmbApi",
        name: "Google Business Profile API",
        category: "Core Integration",
        status: "fail",
        latencyMs: Date.now() - start,
        details: "No Google Business Profile account ID configured or discovered.",
        fixSteps: [
          "Ensure your Google account is owner or manager of a Google Business Profile.",
          "Add GMB_ACCOUNT_ID=your_account_id to .env.local.",
        ],
        fixUrl: "https://business.google.com/",
        fixUrlLabel: "Google Business Profile Manager",
      };
    }

    // 3. Attempt to fetch user's location list
    const locationListUrl = `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?readMask=name,title,storeCode`;
    const res = await fetch(locationListUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    const latency = Date.now() - start;

    if (res.status === 403) {
      const errBody = await res.json().catch(() => null);
      return handleGmb403OrQuotaError(errBody, latency);
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      const msg = errBody?.error?.message || res.statusText;
      const isQuotaZero =
        msg.toLowerCase().includes("quota") ||
        msg.toLowerCase().includes("access not configured") ||
        msg.toLowerCase().includes("permission denied") ||
        msg.toLowerCase().includes("insufficient");

      if (isQuotaZero) {
        return handleGmb403OrQuotaError(errBody, latency);
      }

      return {
        id: "gmbApi",
        name: "Google Business Profile API",
        category: "Core Integration",
        status: "fail",
        latencyMs: latency,
        details: `Google Business Profile API error (HTTP ${res.status}): ${msg}`,
        fixSteps: [
          "Verify your GMB_ACCOUNT_ID and GMB_LOCATION_ID in .env.local.",
          "Ensure your Google account is an Owner or Primary Owner of the verified business location.",
        ],
        fixUrl: "https://business.google.com/",
        fixUrlLabel: "GMB Dashboard",
      };
    }

    const data = await res.json();
    const locations = Array.isArray(data.locations) ? data.locations : [];
    const locationTitles = locations.map((l: { title?: string }) => l.title).filter(Boolean);
    const locationSummary =
      locationTitles.length > 0
        ? `Found ${locations.length} location(s): "${locationTitles.join(", ")}"`
        : "Location list fetched successfully (0 locations returned).";

    return {
      id: "gmbApi",
      name: "Google Business Profile API",
      category: "Core Integration",
      status: "pass",
      latencyMs: latency,
      details: `Google Business Profile APIs connected & verified (${latency}ms). ${locationSummary}`,
    };
  } catch (error: unknown) {
    const latency = Date.now() - start;
    const msg = error instanceof Error ? error.message : String(error);
    const isQuotaOr403 =
      msg.includes("403") ||
      msg.toLowerCase().includes("quota") ||
      msg.toLowerCase().includes("access not configured") ||
      msg.toLowerCase().includes("permission denied");

    if (isQuotaOr403) {
      return handleGmb403OrQuotaError({ error: { message: msg } }, latency);
    }

    return {
      id: "gmbApi",
      name: "Google Business Profile API",
      category: "Core Integration",
      status: "fail",
      latencyMs: latency,
      details: `Google Business Profile connection error: ${msg}`,
      fixSteps: [
        "Check that GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN are valid in .env.local.",
        "Verify your refresh token has the 'https://www.googleapis.com/auth/business.manage' scope.",
      ],
      fixUrl: "https://console.cloud.google.com/apis/credentials",
      fixUrlLabel: "GCP Credentials",
    };
  }
}

// MAIN GET ROUTE - Concurrently tests all 5 services or rechecks a single target service
export async function GET(request: Request) {
  await connection();

  const { searchParams } = new URL(request.url);
  const targetService = searchParams.get("service");

  // Single-service targeted recheck for instant snappy UI feedback
  if (targetService) {
    let serviceResult: ServiceDiagnostic | null = null;
    if (targetService === "mongodb") serviceResult = await testMongoDB();
    else if (targetService === "groq") serviceResult = await testGroqAI();
    else if (targetService === "unsplash") serviceResult = await testUnsplash();
    else if (targetService === "googleAuth") serviceResult = testGoogleCloudAuth();
    else if (targetService === "gmbApi") serviceResult = await testGoogleBusinessProfile();

    if (serviceResult) {
      return NextResponse.json({
        ok: true,
        service: serviceResult,
        timestamp: new Date().toISOString(),
      });
    }
  }

  try {
    // Run all 5 diagnostic checks concurrently
    const [mongoRes, groqRes, unsplashRes, gauthRes, gmbRes] = await Promise.all([
      testMongoDB(),
      testGroqAI(),
      testUnsplash(),
      Promise.resolve(testGoogleCloudAuth()),
      testGoogleBusinessProfile(),
    ]);

    const services: ServiceDiagnostic[] = [
      mongoRes,
      groqRes,
      unsplashRes,
      gauthRes,
      gmbRes,
    ];

    const passedCount = services.filter((s) => s.status === "pass").length;
    const totalCount = services.length;
    const healthScore = Math.round((passedCount / totalCount) * 100);
    const isAllPassed = passedCount === totalCount;

    const response: DiagnosticsResponse = {
      ok: true,
      healthScore,
      passedCount,
      totalCount,
      isAllPassed,
      timestamp: new Date().toISOString(),
      services,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Diagnostics route unhandled failure:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Diagnostics execution failed",
      },
      { status: 500 },
    );
  }
}
