const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const ManifestItem = require('../models/ManifestItem');

const BUNGIE_API_ROOT = 'https://www.bungie.net';
const MANIFEST_URL = `${BUNGIE_API_ROOT}/Platform/Destiny2/Manifest/`;

let currentManifestVersion = null;

async function checkAndDownloadManifest() {
    try {
        console.log('Checking for manifest updates...');
        const response = await axios.get(MANIFEST_URL, {
            headers: { 'X-API-Key': process.env.BUNGIE_API_KEY }
        });

        const manifestData = response.data.Response;
        const version = manifestData.version;
        const contentPath = manifestData.mobileWorldContentPaths.en; // English only for now

        if (version === currentManifestVersion) {
            console.log('Manifest is up to date.');
            return;
        }

        console.log(`New manifest version found: ${version}. Downloading...`);

        const dbPath = path.join(__dirname, '..', 'manifest.content');
        const writer = fs.createWriteStream(dbPath);

        const fileResponse = await axios({
            url: `${BUNGIE_API_ROOT}${contentPath}`,
            method: 'GET',
            responseType: 'stream'
        });

        fileResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', async () => {
                console.log('Manifest downloaded. Processing...');
                currentManifestVersion = version;
                try {
                    await processManifest(dbPath);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            writer.on('error', reject);
        });

    } catch (error) {
        console.error('Error updating manifest:', error);
    }
}

async function processManifest(dbPath) {
    const db = new sqlite3.Database(dbPath);

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.all("SELECT json FROM DestinyInventoryItemDefinition", async (err, rows) => {
                if (err) {
                    console.error('Error reading SQLite:', err);
                    reject(err);
                    return;
                }

                console.log(`Found ${rows.length} items. Updating MongoDB...`);

                // Batch process to avoid memory issues
                const batchSize = 100;
                for (let i = 0; i < rows.length; i += batchSize) {
                    const batch = rows.slice(i, i + batchSize).map(row => {
                        const item = JSON.parse(row.json);
                        return {
                            updateOne: {
                                filter: { hash: item.hash },
                                update: { $set: { ...item, json: item } }, // Store flat fields + raw json
                                upsert: true
                            }
                        };
                    });

                    try {
                        await ManifestItem.bulkWrite(batch);
                    } catch (writeErr) {
                        console.error('Error writing batch to MongoDB:', writeErr);
                    }

                    if (i % 1000 === 0) console.log(`Processed ${i} items...`);
                }

                console.log('Manifest processing complete.');
                db.close();
                resolve();
            });
        });
    });
}

module.exports = { checkAndDownloadManifest };
