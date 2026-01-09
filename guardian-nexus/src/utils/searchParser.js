/**
 * Parses a search query string into structured filters.
 * Supported syntax:
 * - is:exotic, is:legendary (Rarity)
 * - element:void, element:solar, element:arc, element:stasis, element:strand (Damage Type)
 * - type:hand cannon, type:auto rifle (Item Type)
 * - Free text (Name match)
 * 
 * @param {string} query 
 * @returns {object} { text: string, filters: { is: [], element: [], type: [] } }
 */
export function parseQuery(query) {
    const result = {
        text: '',
        filters: {
            is: [],
            element: [],
            type: []
        }
    };

    if (!query) return result;

    const tokens = query.toLowerCase().split(' ');
    const textParts = [];

    tokens.forEach(token => {
        if (token.includes(':')) {
            const [key, value] = token.split(':');
            if (result.filters[key]) {
                result.filters[key].push(value);
            } else {
                // If key is not supported, treat as text or ignore? 
                // For now, let's treat unknown filters as text to be safe, 
                // or just ignore them. Let's ignore strict validation for now.
                if (['is', 'element', 'type'].includes(key)) {
                    // already handled
                } else {
                    textParts.push(token);
                }
            }
        } else {
            textParts.push(token);
        }
    });

    result.text = textParts.join(' ');
    return result;
}
