const axios = require('axios');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const BUNGIE_API_ROOT = 'https://www.bungie.net';
const MANIFEST_URL = `${BUNGIE_API_ROOT}/Platform/Destiny2/Manifest/`;

// Vercel only allows writing to /tmp
const IS_VERCEL = process.env.VERCEL === '1';
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(__dirname, '..', 'data');
const MANIFEST_DB_PATH = path.join(DATA_DIR, 'manifest.content');

let currentManifestVersion = null;
let db = null;

async function checkAndDownloadManifest() {
    try {
        console.log('Checking for manifest updates...');
        const response = await axios.get(MANIFEST_URL, {
            headers: { 'X-API-Key': process.env.BUNGIE_API_KEY }
        });

        const manifestData = response.data.Response;
        const version = manifestData.version;
        const contentPath = manifestData.mobileWorldContentPaths.en;

        // Check if file exists and version matches
        if (version === currentManifestVersion && fs.existsSync(MANIFEST_DB_PATH)) {
            console.log('Manifest is up to date.');
            return;
        }

        console.log(`New manifest version found: ${version}. Downloading to ${MANIFEST_DB_PATH}...`);

        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }

        const writer = fs.createWriteStream(MANIFEST_DB_PATH);

        const fileResponse = await axios({
            url: `${BUNGIE_API_ROOT}${contentPath}`,
            method: 'GET',
            responseType: 'stream'
        });

        fileResponse.data.pipe(writer);

        return new Promise((resolve, reject) => {
            writer.on('finish', () => {
                console.log('Manifest downloaded.');
                currentManifestVersion = version;
                if (db) {
                    db.close();
                    db = null;
                }
                resolve();
            });
            writer.on('error', reject);
        });

    } catch (error) {
        console.error('Error updating manifest:', error);
    }
}

function getManifestDb() {
    if (!db) {
        if (fs.existsSync(MANIFEST_DB_PATH)) {
            db = new sqlite3.Database(MANIFEST_DB_PATH, sqlite3.OPEN_READONLY, (err) => {
                if (err) console.error('Error opening manifest DB:', err);
            });
        } else {
            console.warn('Manifest DB not found. Please wait for download.');
            // Trigger download if missing (lazy load)
            checkAndDownloadManifest();
            return null;
        }
    }
    return db;
}

function getDefinition(tableName, hash) {
    return new Promise((resolve, reject) => {
        const database = getManifestDb();
        if (!database) return resolve(null);

        let signedHash = hash >> 0;

        database.get(`SELECT json FROM ${tableName} WHERE id = ? OR id = ?`, [hash, signedHash], (err, row) => {
            if (err) return reject(err);
            if (!row) return resolve(null);
            resolve(JSON.parse(row.json));
        });
    });
}

module.exports = { checkAndDownloadManifest, getDefinition };
