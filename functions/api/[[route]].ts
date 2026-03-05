import { Hono } from "hono";
import { handle } from "hono/cloudflare-pages";
import { setCookie, getCookie } from "hono/cookie";
import { getBungieConfig, Env } from "../config";
import { getManifestMetadata, getManifestTablePath } from "../manifest";
import { refreshBungieTokens } from "../lib/auth";

export const runtime = "edge";

const app = new Hono<{ Bindings: Env }>();

// ============================================================================
// HELPER: Authenticated Bungie API fetch with auto-refresh on 401
// ============================================================================

/**
 * Makes an authenticated request to the Bungie API, automatically refreshing
 * the OAuth token on 401 and retrying once.
 *
 * @returns The Bungie API Response (caller must handle .json() / error checking)
 */
async function authenticatedBungieFetch(
  c: any,
  bungieUrl: string,
  options: { method: string; body?: string },
): Promise<Response> {
  const config = getBungieConfig(c.env);
  const authCookie = getCookie(c, "bungie_auth");
  if (!authCookie) throw new AuthError("No auth cookie");

  let session: any;
  try {
    session = JSON.parse(authCookie);
  } catch {
    throw new AuthError("Invalid auth cookie");
  }

  let access_token = session.t || session.access_token;

  const makeRequest = () =>
    fetch(bungieUrl, {
      method: options.method,
      headers: {
        "X-API-Key": config.apiKey,
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      ...(options.body ? { body: options.body } : {}),
    });

  let response = await makeRequest();

  // If 401, attempt token refresh and retry once
  if (response.status === 401) {
    console.warn(`[AuthFetch] 401 on ${bungieUrl} — attempting token refresh...`);

    const refreshToken = session.r || session.refresh_token;
    if (!refreshToken) throw new AuthError("Session expired — no refresh token");

    try {
      const newTokens = await refreshBungieTokens(refreshToken, c.env);
      console.log("[AuthFetch] Token refresh successful");

      access_token = newTokens.access_token;

      // Update cookie with new tokens
      const newSession = {
        t: newTokens.access_token,
        r: newTokens.refresh_token,
        m: newTokens.membership_id,
        e: Date.now() + newTokens.expires_in * 1000,
      };

      const isSecure = c.req.url.startsWith("https");
      setCookie(c, "bungie_auth", JSON.stringify(newSession), {
        path: "/",
        secure: isSecure,
        httpOnly: true,
        maxAge: 3600 * 24 * 90,
        sameSite: "Lax",
      });

      // Retry with fresh token
      response = await makeRequest();
    } catch (refreshErr) {
      console.error("[AuthFetch] Token refresh failed:", refreshErr);
      throw new AuthError("Session expired — please login again");
    }
  }

  return response;
}

/** Sentinel error class so route handlers can distinguish auth failures. */
class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// Middleware to inject Enviroment Bindings
app.use("*", async (c: any, next: any) => {
  // In Cloudflare Pages, c.env is already populated by the adapter
  await next();
});

// Hardcoded credentials for debugging
// Credentials are now loaded from Env via getBungieConfig

// DEBUG: Log all requests
app.use("*", async (c: any, next: any) => {
  console.log(`[Hono] Request: ${c.req.method} ${c.req.path}`);
  await next();
});

// Explicitly use /api prefix instead of basePath to avoid ambiguity
app.get("/api", (c: any) => {
  return c.text("Guardian Nexus API is running on Pages (Root)!");
});

app.get("/api/debug", (c: any) => {
  return c.json({
    message: "Debug endpoint",
    path: c.req.path,
    url: c.req.url,
    method: c.req.method,
    client_id: c.env.BUNGIE_CLIENT_ID, // Echo back to verify
  });
});

app.get("/api/auth/login", (c: any) => {
  const config = getBungieConfig(c.env);
  const state = crypto.randomUUID();

  // Dynamically determine redirect_uri based on current request origin
  // This allows it to work on both Localhost (if whitelisted) and Production
  const url = new URL(c.req.url);
  const redirectUri = `${url.origin}/api/auth/callback`;

  setCookie(c, "oauth_state", state, {
    path: "/",
    secure: true,
    httpOnly: true,
    maxAge: 600, // 10 minutes
    sameSite: "Lax",
  });

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    state: state,
    redirect_uri: redirectUri,
  });

  return c.redirect(`${config.authUrl}?${params.toString()}`);
});

app.get("/api/auth/callback", async (c: any) => {
  console.log("[OAuth Callback] Starting callback handler...");

  const config = getBungieConfig(c.env);
  const code = c.req.query("code");
  const state = c.req.query("state");
  const storedState = getCookie(c, "oauth_state");

  console.log("[OAuth Callback] Code received:", code ? "YES" : "NO");
  console.log("[OAuth Callback] Config ID:", config.clientId);
  console.log(
    "[OAuth Callback] Config Secret Start:",
    config.clientSecret
      ? config.clientSecret.substring(0, 4) + "..."
      : "MISSING",
  );
  console.log("[OAuth Callback] State received:", state);
  console.log("[OAuth Callback] Stored state:", storedState);

  if (!code || !state || state !== storedState) {
    console.error(
      "[OAuth Callback] Validation failed - Invalid state or missing code",
    );
    return c.text("Invalid state or missing code", 400);
  }

  console.log("[OAuth Callback] Exchanging code for tokens...");
  console.log(
    `[OAuth Callback] Config Check - ClientID: ${config.clientId ? "OK" : "MISSING"}, Secret: ${config.clientSecret ? "OK (len=" + config.clientSecret.length + ")" : "MISSING"}`,
  );

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(
      `[OAuth Callback] Token exchange failed: ${response.status} ${error}`,
    );
    return c.text(`Token exchange failed [${response.status}]: ${error}`, 400);
  }

  const tokens = (await response.json()) as any;
  console.log("[OAuth Callback] Tokens received successfully");

  // SLIM COOKIE: Store only essential data to keep size under 4KB
  // t: access_token, r: refresh_token, m: membership_id, e: expiry_epoch
  const session = {
    t: tokens.access_token,
    r: tokens.refresh_token,
    m: tokens.membership_id,
    e: Date.now() + tokens.expires_in * 1000,
  };

  // Dynamic Secure Flag: Allow localhost (http) to save cookies
  const isSecure = c.req.url.startsWith("https");

  setCookie(c, "bungie_auth", JSON.stringify(session), {
    path: "/",
    secure: isSecure,
    httpOnly: true,
    maxAge: 3600 * 24 * 90, // 90 days (Refresh Token lifespan)
    sameSite: "Lax",
  });

  console.log(
    `[OAuth Callback] Cookie set (Secure=${isSecure}), redirecting to /dashboard`,
  );
  return c.redirect("/dashboard");
});

app.get("/api/profile", async (c: any) => {
  console.log("[Profile API] Starting profile fetch...");

  const config = getBungieConfig(c.env);
  const authCookie = getCookie(c, "bungie_auth");

  // DEBUG: Check if cookie is arriving
  console.log("[Profile API] Cookie Header Present:", !!c.req.header("Cookie"));

  if (!authCookie) {
    console.error("[Profile API] No auth cookie found");
    return c.text("Unauthorized", 401);
  }

  let session;
  try {
    session = JSON.parse(authCookie);
  } catch (err) {
    console.error("[Profile API] Failed to parse auth cookie:", err);
    return c.text("Invalid auth cookie", 401);
  }

  // Helper to fetch Memberships with manual Retry logic
  // Read from Slim Cookie (t=access_token, r=refresh_token)
  let access_token = session.t || session.access_token; // Fallback for old cookies
  let didRefresh = false;

  // 1. Fetch Memberships
  console.log("[Profile API] Fetching memberships...");
  let membershipsRes = await fetch(
    "https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/",
    {
      headers: {
        "X-API-Key": config.apiKey,
        Authorization: `Bearer ${access_token}`,
      },
    },
  );

  // CATCH 401 - Expired Token
  if (membershipsRes.status === 401) {
    console.warn(
      "[Profile API] 401 Unauthorized on Memberships. Attempting Token Refresh...",
    );

    try {
      // Import dynamically or assume it's available since we are in same project
      const { refreshBungieTokens } = await import("../lib/auth");

      // Read refresh token from slim key 'r'
      const refreshToken = session.r || session.refresh_token;

      if (!refreshToken) throw new Error("No refresh token available");

      const newTokens = await refreshBungieTokens(refreshToken, c.env);
      console.log("[Profile API] Token Refresh Successful!");

      // Update Local Vars
      access_token = newTokens.access_token;

      // Update Cookie (Store as SLIM)
      const newSession = {
        t: newTokens.access_token,
        r: newTokens.refresh_token,
        m: newTokens.membership_id,
        e: Date.now() + newTokens.expires_in * 1000,
      };

      const isSecure = c.req.url.startsWith("https");

      setCookie(c, "bungie_auth", JSON.stringify(newSession), {
        path: "/",
        secure: isSecure,
        httpOnly: true,
        maxAge: 3600 * 24 * 90,
        sameSite: "Lax",
      });
      didRefresh = true;

      // RETRY REQUEST
      membershipsRes = await fetch(
        "https://www.bungie.net/Platform/User/GetMembershipsForCurrentUser/",
        {
          headers: {
            "X-API-Key": config.apiKey,
            Authorization: `Bearer ${access_token}`,
          },
        },
      );
    } catch (refreshErr) {
      console.error("[Profile API] Token Refresh Failed:", refreshErr);
      return c.text("Session expired - Please login again", 401);
    }
  }

  if (!membershipsRes.ok) {
    const errorText = await membershipsRes.text();
    console.error(
      `[Profile API] Failed to fetch memberships: ${membershipsRes.status} - ${errorText}`,
    );
    return c.text(
      `Failed to fetch memberships: ${errorText}`,
      membershipsRes.status as any,
    );
  }

  const membershipsData = (await membershipsRes.json()) as any;
  // ... (rest of logic) ...

  if (!membershipsData.Response?.destinyMemberships?.length) {
    console.error("[Profile API] No Destiny membership found");
    return c.text("No Destiny membership found", 404);
  }

  const destinyMembership = membershipsData.Response.destinyMemberships[0];
  const { membershipType, membershipId } = destinyMembership;
  console.log(
    `[Profile API] Using membership: Type=${membershipType}, ID=${membershipId}`,
  );

  // Component numbers:
  // Core Profile: 100,102,104,200,201,202,205,700,900,1100,1200
  // Item Details: 102,201,205,300,301,302,304,305,309,310
  
  // Bungie silently drops heavy components (309, 310) if requested alongside
  // the entire profile. We must split into two parallel requests.
  // CRITICAL: The item details request MUST include the inventory components (102, 201, 205) 
  // otherwise Bungie doesn't know *which* items to fetch components for!
  const coreComponents = "100,102,104,200,201,202,205,700,900,1100,1200";
  const itemComponentsList = "102,201,205,300,301,302,304,305,309,310";

  const coreUrl = `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=${coreComponents}`;
  const itemUrl = `https://www.bungie.net/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=${itemComponentsList}`;

  // 2. Fetch Profile and Items in parallel
  console.log('[Profile API] Fetching core profile and item details in parallel...');
  const [coreRes, itemRes] = await Promise.all([
    fetch(coreUrl, {
      headers: { "X-API-Key": config.apiKey, Authorization: `Bearer ${access_token}` },
    }),
    fetch(itemUrl, {
      headers: { "X-API-Key": config.apiKey, Authorization: `Bearer ${access_token}` },
    })
  ]);

  if (!coreRes.ok) {
    const errorText = await coreRes.text();
    console.error(`[Profile API] Failed to fetch core profile: ${coreRes.status} - ${errorText}`);
    return c.text(`Failed to fetch profile: ${errorText}`, coreRes.status as any);
  }

  if (!itemRes.ok) {
    // If item details fail but core succeeds, that's weird, but we should fail the whole thing
    const errorText = await itemRes.text();
    console.error(`[Profile API] Failed to fetch item details: ${itemRes.status} - ${errorText}`);
    return c.text(`Failed to fetch item details: ${errorText}`, itemRes.status as any);
  }

  // We need to parse them to merge them, so we can't stream directly anymore.
  // However, since we're splitting the load, memory pressure should be much lower.
  const coreData = await coreRes.json() as any;
  const itemData = await itemRes.json() as any;

  if (coreData.ErrorCode !== 1) {
    return c.json(coreData); // Pass bungie error through
  }

  // Merge itemComponents into the core response
  if (itemData.Response && itemData.Response.itemComponents) {
    coreData.Response.itemComponents = itemData.Response.itemComponents;
  }

  // Return the merged object. Client still expects the Bungie envelope { Response: ... }
  return new Response(JSON.stringify(coreData), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
});

app.get("/api/manifest/version", async (c: any) => {
  const config = getBungieConfig(c.env);
  const cacheKey = "manifest_version";
  const cached = await c.env.guardian_kv.get(cacheKey);

  if (cached) {
    return c.json(JSON.parse(cached));
  }

  try {
    const manifest = await getManifestMetadata(config.apiKey);
    await c.env.guardian_kv.put(cacheKey, JSON.stringify(manifest), {
      expirationTtl: 3600,
    });
    return c.json(manifest);
  } catch (error) {
    return c.text("Failed to fetch manifest", 500);
  }
});

app.get("/api/manifest/definitions/:table", async (c: any) => {
  const config = getBungieConfig(c.env);
  const table = c.req.param("table");
  const path = await getManifestTablePath(table, config.apiKey);

  if (!path) {
    return c.text("Table not found", 404);
  }

  const fullUrl = `https://www.bungie.net${path}`;

  const response = await fetch(fullUrl);

  return new Response(response.body, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=86400",
    },
  });
});

// Image Proxy to bypass Bungie CDN issues
app.get("/api/image", async (c: any) => {
  const path = c.req.query("path");
  if (!path) return c.text("Missing path", 400);

  // Validate path is partial
  const cleanPath = path.startsWith("http") ? new URL(path).pathname : path;
  const targetUrl = `https://www.bungie.net${cleanPath}`;

  const response = await fetch(targetUrl);

  return new Response(response.body, {
    headers: {
      "Content-Type": response.headers.get("Content-Type") || "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
      "Access-Control-Allow-Origin": "*",
    },
  });
});

app.post("/api/actions/transfer", async (c: any) => {
  try {
    const body = (await c.req.json()) as any;

    const response = await authenticatedBungieFetch(c,
      "https://www.bungie.net/Platform/Destiny2/Actions/Items/TransferItem/",
      { method: "POST", body: JSON.stringify(body) },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Transfer] Bungie API error ${response.status}: ${errorText}`);
      return c.text(errorText, response.status as any);
    }

    const data = await response.json();
    return c.json(data);
  } catch (err: any) {
    if (err instanceof AuthError) return c.text(err.message, 401);
    console.error("[Transfer] Unexpected error:", err);
    return c.text(err.message || "Internal error", 500);
  }
});

app.get("/api/metadata", async (c: any) => {
  const authCookie = getCookie(c, "bungie_auth");
  if (!authCookie) return c.json({ tags: {}, notes: {} });

  const session = JSON.parse(authCookie);
  const membershipId = session.m || session.membership_id; // Slim vs Old

  const metadata = await c.env.guardian_db
    .prepare(
      "SELECT tags, notes FROM UserMetadata WHERE bungieMembershipId = ?",
    )
    .bind(membershipId)
    .first();

  if (!metadata) {
    return c.json({ tags: {}, notes: {} });
  }

  return c.json({
    tags: JSON.parse((metadata.tags as string) || "{}"),
    notes: JSON.parse((metadata.notes as string) || "{}"),
  });
});

app.post("/api/metadata", async (c: any) => {
  const authCookie = getCookie(c, "bungie_auth");
  if (!authCookie) return c.text("Unauthorized", 401);

  const session = JSON.parse(authCookie);
  const membershipId = session.m || session.membership_id;
  const { itemId, type, value } = (await c.req.json()) as any;

  // 1. Get existing metadata
  const existing = await c.env.guardian_db
    .prepare(
      "SELECT tags, notes FROM UserMetadata WHERE bungieMembershipId = ?",
    )
    .bind(membershipId)
    .first();

  let tags = JSON.parse((existing?.tags as string) || "{}");
  let notes = JSON.parse((existing?.notes as string) || "{}");

  // 2. Update specific field
  if (type === "tag") {
    if (value) tags[itemId] = value;
    else delete tags[itemId];
  } else if (type === "note") {
    if (value) notes[itemId] = value;
    else delete notes[itemId];
  }

  // 3. Save back to D1
  if (!existing) {
    await c.env.guardian_db
      .prepare(
        "INSERT INTO UserMetadata (bungieMembershipId, tags, notes) VALUES (?, ?, ?)",
      )
      .bind(membershipId, JSON.stringify(tags), JSON.stringify(notes))
      .run();
  } else {
    await c.env.guardian_db
      .prepare(
        "UPDATE UserMetadata SET tags = ?, notes = ?, updatedAt = CURRENT_TIMESTAMP WHERE bungieMembershipId = ?",
      )
      .bind(JSON.stringify(tags), JSON.stringify(notes), membershipId)
      .run();
  }

  return c.json({ success: true });
});

app.post("/api/actions/insertPlugFree", async (c: any) => {
  try {
    const body = (await c.req.json()) as any;

    if (!body.itemId || !body.plug || !body.characterId || body.membershipType === undefined) {
      return c.text("Missing required fields for insertPlugFree", 400);
    }

    const response = await authenticatedBungieFetch(c,
      "https://www.bungie.net/Platform/Destiny2/Actions/Items/InsertSocketPlugFree/",
      { method: "POST", body: JSON.stringify(body) },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[InsertPlugFree] Bungie API error ${response.status}: ${errorText}`);
      return c.text(errorText, response.status as any);
    }

    const data = await response.json();
    return c.json(data);
  } catch (err: any) {
    if (err instanceof AuthError) return c.text(err.message, 401);
    console.error("[InsertPlugFree] Unexpected error:", err);
    return c.text(err.message || "Internal error", 500);
  }
});

app.post("/api/actions/equip", async (c: any) => {
  try {
    const body = (await c.req.json()) as any;

    // Validate required fields
    if (!body.itemIds || !Array.isArray(body.itemIds) || body.itemIds.length === 0) {
      return c.text("itemIds array is required", 400);
    }
    if (!body.characterId) {
      return c.text("characterId is required", 400);
    }
    if (body.membershipType === undefined || body.membershipType === null) {
      return c.text("membershipType is required", 400);
    }

    console.log(
      `[EquipItems] Equipping ${body.itemIds.length} items on character ${body.characterId}`,
    );

    const response = await authenticatedBungieFetch(c,
      "https://www.bungie.net/Platform/Destiny2/Actions/Items/EquipItems/",
      {
        method: "POST",
        body: JSON.stringify({
          itemIds: body.itemIds,
          characterId: body.characterId,
          membershipType: body.membershipType,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EquipItems] Bungie API error ${response.status}: ${errorText}`);
      return c.text(errorText, response.status as any);
    }

    const data = await response.json();
    console.log(`[EquipItems] Success`);
    return c.json(data);
  } catch (err: any) {
    if (err instanceof AuthError) return c.text(err.message, 401);
    console.error("[EquipItems] Unexpected error:", err);
    return c.text(err.message || "Internal error", 500);
  }
});


app.post("/api/actions/equipLoadout", async (c: any) => {
  try {
    const body = (await c.req.json()) as any;

    if (body.loadoutIndex === undefined || !body.characterId || !body.membershipType) {
      return c.text("Missing required fields (loadoutIndex, characterId, membershipType)", 400);
    }

    console.log(`[EquipLoadout] Equipping loadout index ${body.loadoutIndex} on character ${body.characterId}`);

    const response = await authenticatedBungieFetch(c,
      "https://www.bungie.net/Platform/Destiny2/Actions/Loadouts/EquipLoadout/",
      {
        method: "POST",
        body: JSON.stringify({
          loadoutIndex: body.loadoutIndex,
          characterId: body.characterId,
          membershipType: body.membershipType,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[EquipLoadout] Bungie API error ${response.status}: ${errorText}`);
      return c.text(errorText, response.status as any);
    }

    const data = await response.json();
    console.log(`[EquipLoadout] Success`);
    return c.json(data);
  } catch (err: any) {
    if (err instanceof AuthError) return c.text(err.message, 401);
    console.error("[EquipLoadout] Unexpected error:", err);
    return c.text(err.message || "Internal error", 500);
  }
});

// Catch-all 404 handler
app.all("*", (c: any) => {
  return c.json(
    {
      error: "Not Found (Hono Catch-All)",
      path: c.req.path,
      method: c.req.method,
    },
    404,
  );
});

export const onRequest = handle(app);
