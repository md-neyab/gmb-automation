import { connection, NextResponse } from "next/server";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ACCOUNT_API_URL = "https://mybusinessaccountmanagement.googleapis.com/v1/accounts";
const LOCATION_API_URL = "https://mybusinessbusinessinformation.googleapis.com/v1";
const LOCATION_READ_MASK =
  "name,title,storeCode,categories,phoneNumbers,websiteUri,regularHours,metadata,profile";

type GoogleAccountsResponse = {
  accounts?: Array<{
    name?: string;
    [key: string]: unknown;
  }>;
};

type GoogleLocationsResponse = {
  locations?: Array<{
    name?: string;
    [key: string]: unknown;
  }>;
};

async function getErrorMessage(response: Response) {
  try {
    const cloned = response.clone();
    const body = await cloned.json().catch(() => null);
    const message =
      body &&
      typeof body === "object" &&
      "error" in body &&
      typeof body.error === "object" &&
      body.error !== null &&
      "message" in body.error &&
      typeof body.error.message === "string"
        ? body.error.message
        : response.statusText;

    return message || `Google API request failed with status ${response.status}.`;
  } catch {
    return response.statusText || `Google API request failed with status ${response.status}.`;
  }
}

export async function GET() {
  await connection();
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json(
      {
        error:
          "Google OAuth configuration is incomplete. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in .env.local.",
      },
      { status: 500 },
    );
  }

  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      cache: "no-store",
    });

    if (!tokenResponse.ok) {
      return NextResponse.json(
        { error: `Google OAuth token exchange failed: ${await getErrorMessage(tokenResponse)}` },
        { status: 502 },
      );
    }

    const tokenData = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenData.access_token) {
      return NextResponse.json(
        { error: "Google OAuth token exchange succeeded but returned no access_token." },
        { status: 502 },
      );
    }

    const authorization = { Authorization: `Bearer ${tokenData.access_token}` };
    const accountsResponse = await fetch(ACCOUNT_API_URL, {
      headers: authorization,
      cache: "no-store",
    });

    if (!accountsResponse.ok) {
      return NextResponse.json(
        { error: `Google accounts request failed: ${await getErrorMessage(accountsResponse)}` },
        { status: 502 },
      );
    }

    const rawAccountData = (await accountsResponse.json()) as GoogleAccountsResponse;
    const firstAccount = rawAccountData.accounts?.[0];

    if (!firstAccount?.name) {
      return NextResponse.json({
        envToCopy: {
          GMB_ACCOUNT_ID: "",
          GMB_LOCATION_ID: "",
        },
        rawAccountData,
        rawLocationsData: null,
      });
    }

    const accountResourceName = firstAccount.name.startsWith("accounts/")
      ? firstAccount.name
      : `accounts/${firstAccount.name}`;
    const accountId = firstAccount.name.replace(/^accounts\//, "");

    const locationsUrl = new URL(
      `${LOCATION_API_URL}/${accountResourceName}/locations`,
    );
    locationsUrl.searchParams.set("readMask", LOCATION_READ_MASK);

    const locationsResponse = await fetch(locationsUrl.toString(), {
      headers: authorization,
      cache: "no-store",
    });

    if (!locationsResponse.ok) {
      const errorMsg = await getErrorMessage(locationsResponse);
      const locationsBody = await locationsResponse.clone().json().catch(() => null);

      return NextResponse.json({
        envToCopy: {
          GMB_ACCOUNT_ID: accountId,
          GMB_LOCATION_ID: "",
        },
        rawAccountData,
        rawLocationsData: locationsBody ?? { error: errorMsg },
        warning: `Location details could not be retrieved (${locationsResponse.status}): ${errorMsg}`,
      });
    }

    const rawLocationsData = (await locationsResponse.json()) as GoogleLocationsResponse;
    const firstLocationName = rawLocationsData.locations?.[0]?.name ?? "";

    return NextResponse.json({
      envToCopy: {
        GMB_ACCOUNT_ID: accountId,
        GMB_LOCATION_ID: firstLocationName.replace(/^locations\//, ""),
      },
      rawAccountData,
      rawLocationsData,
    });
  } catch (error) {
    console.error("GMB discovery failed:", error);
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: `GMB discovery failed: ${message}` },
      { status: 502 },
    );
  }
}
