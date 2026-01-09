import { DestinyManifest } from 'bungie-api-ts/destiny2';

export const getManifestMetadata = async (apiKey: string): Promise<DestinyManifest> => {
  const response = await fetch('https://www.bungie.net/Platform/Destiny2/Manifest/', {
    headers: {
      'X-API-Key': apiKey
    }
  });
  if (!response.ok) {
    throw new Error('Failed to fetch manifest metadata');
  }
  const data = await response.json() as any;
  return data.Response as DestinyManifest;
};

export const getManifestTablePath = async (table: string, apiKey: string, language: string = 'en'): Promise<string | undefined> => {
  const manifest = await getManifestMetadata(apiKey);
  const paths = manifest.jsonWorldComponentContentPaths[language];
  return paths ? (paths as any)[table] : undefined;
};
