const https = require('https');

// Apotheosis Veil (Warlock Helmet, Small Hash): 1096253259
const hash = 1096253259;

const options = {
  hostname: 'www.bungie.net',
  path: `/Platform/Destiny2/Manifest/DestinyInventoryItemDefinition/${hash}/`,
  method: 'GET',
  headers: {
    'X-API-Key': '18745be24a1c4b7bb0a5741eb4f2f6c2'
  }
};

console.log(`Fetching data for Item Hash: ${hash}...`);

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      if (json.Response && json.Response.displayProperties) {
        const r = json.Response;
        console.log("\n--- BUNGIE API ITEM DATA ---");
        console.log("Name:      ", r.displayProperties.name);
        console.log("Class:     ", r.classType === 2 ? 'Warlock' : r.classType); // 2 is Warlock
        console.log("Type:      ", r.itemTypeDisplayName);
        console.log("Tier:      ", r.inventory.tierTypeName);
        console.log("Icon URL:  ", "https://www.bungie.net" + r.displayProperties.icon);
        console.log("Screenshot:", "https://www.bungie.net" + r.screenshot);
        console.log("----------------------------\n");
      } else {
        console.log("Raw Response (Error?):", JSON.stringify(json, null, 2));
      }
    } catch (e) {
      console.error("Parse Error:", e);
    }
  });
});

req.on('error', error => {
  console.error("Request Error:", error);
});

req.end();
