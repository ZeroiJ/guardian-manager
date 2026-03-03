import re

with open("functions/api/[[route]].ts", "r") as f:
    content = f.read()

new_route = """
app.post("/api/actions/equipLoadout", async (c: any) => {
  const config = getBungieConfig(c.env);
  const authCookie = getCookie(c, "bungie_auth");
  if (!authCookie) return c.text("Unauthorized", 401);

  let session;
  try {
    session = JSON.parse(authCookie);
  } catch {
    return c.text("Invalid auth cookie", 401);
  }

  const access_token = session.t || session.access_token;
  const body = (await c.req.json()) as any;

  if (body.loadoutIndex === undefined || !body.characterId || !body.membershipType) {
    return c.text("Missing required fields (loadoutIndex, characterId, membershipType)", 400);
  }

  console.log(`[EquipLoadout] Equipping loadout index ${body.loadoutIndex} on character ${body.characterId}`);

  const response = await fetch(
    "https://www.bungie.net/Platform/Destiny2/Actions/Loadouts/EquipLoadout/",
    {
      method: "POST",
      headers: {
        "X-API-Key": config.apiKey,
        Authorization: `Bearer ${access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        loadoutIndex: body.loadoutIndex,
        characterId: body.characterId,
        membershipType: body.membershipType,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[EquipLoadout] Bungie API error ${response.status}: ${errorText}`);
    return c.text(errorText, response.status as any);
  }

  const data = await response.json();
  console.log(`[EquipLoadout] Success`);
  return c.json(data);
});

// Catch-all 404 handler"""

content = content.replace("// Catch-all 404 handler", new_route)

with open("functions/api/[[route]].ts", "w") as f:
    f.write(content)
