export interface ChangelogEntry {
    version: string;
    date: string;
    sections: { title: string; items: string[] }[];
}

export interface FeatureItem {
    title: string;
    description: string;
}

export const parseChangelog = (markdown: string): ChangelogEntry[] => {
    const entries: ChangelogEntry[] = [];
    const versionRegex = /^## \[(.+?)\] - (.+?)$/gm;
    let match;

    // Find all version headers
    const versionIndices: { index: number, version: string, date: string }[] = [];
    while ((match = versionRegex.exec(markdown)) !== null) {
        versionIndices.push({ index: match.index, version: match[1], date: match[2] });
    }

    // Process each version block
    for (let i = 0; i < versionIndices.length; i++) {
        const start = versionIndices[i].index;
        const end = i < versionIndices.length - 1 ? versionIndices[i + 1].index : markdown.length;
        const content = markdown.slice(start, end).split('\n').slice(1).join('\n'); // Remove header line

        const sections: { title: string; items: string[] }[] = [];
        const sectionRegex = /^### (.+?)$/gm;
        const sectionMatches = [...content.matchAll(sectionRegex)];

        if (sectionMatches.length === 0) continue;

        for (let j = 0; j < sectionMatches.length; j++) {
            const secStart = sectionMatches[j].index!;
            const secEnd = j < sectionMatches.length - 1 ? sectionMatches[j + 1].index! : content.length;
            const secContent = content.slice(secStart, secEnd).split('\n').slice(1);
            
            const items = secContent
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.replace(/^-\s*/, '').trim());

            if (items.length > 0) {
                sections.push({ title: sectionMatches[j][1], items });
            }
        }

        entries.push({
            version: versionIndices[i].version,
            date: versionIndices[i].date,
            sections
        });
    }

    return entries;
};

export const parseFeatures = (markdown: string): FeatureItem[] => {
    const features: FeatureItem[] = [];
    const featuresHeader = "## Features";
    
    const startIndex = markdown.indexOf(featuresHeader);
    if (startIndex === -1) return [];

    const content = markdown.slice(startIndex + featuresHeader.length);
    // Find next main header to stop (##)
    const endIndex = content.search(/\n## /); 
    const featuresSection = endIndex !== -1 ? content.slice(0, endIndex) : content;

    const lines = featuresSection.split('\n');
    for (const line of lines) {
        // Match "- **Title**: Description" or "- **Title** Description"
        const match = line.match(/^-\s*\*\*(.+?)\*\*[:\s]*(.+)$/);
        if (match) {
            features.push({
                title: match[1],
                description: match[2]
            });
        }
    }

    return features;
};
