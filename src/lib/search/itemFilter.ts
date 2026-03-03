import { parseQuery, QueryAST } from './query-parser';

// Stat mapping
const STAT_HASHES: Record<string, number> = {
    mobility: 2996146975,
    resilience: 392767087,
    recovery: 1943323491,
    discipline: 1735777505,
    intellect: 144602215,
    strength: 4244567218,
    mob: 2996146975,
    res: 392767087,
    rec: 1943323491,
    dis: 1735777505,
    int: 144602215,
    str: 4244567218,
    total: -1
};

export function filterItems(items: any[], query: string, definitions: any, dupeInstanceIds?: Set<string>): any[] {
    if (!query || !query.trim()) return items;
    
    let ast: QueryAST;
    try {
        ast = parseQuery(query);
    } catch (e) {
        console.error("Search parse error:", e);
        return items;
    }

    if (ast.op === 'noop') return items;

    function evaluateNode(node: QueryAST, item: any, def: any): boolean {
        switch (node.op) {
            case 'and':
                return node.operands.every(child => evaluateNode(child, item, def));
            case 'or':
                return node.operands.some(child => evaluateNode(child, item, def));
            case 'not':
                return !evaluateNode(node.operand, item, def);
            case 'filter':
                return evaluateFilter(node.type, node.args, item, def);
            case 'noop':
                return true;
            default:
                return true;
        }
    }

    function evaluateFilter(type: string, args: string, item: any, def: any): boolean {
        const lowerArgs = args.toLowerCase();
        
        if (type === 'keyword') {
            const name = def.displayProperties?.name?.toLowerCase() || '';
            const itemType = def.itemTypeDisplayName?.toLowerCase() || '';
            return name.includes(lowerArgs) || itemType.includes(lowerArgs);
        }

        if (type === 'is') {
            if (lowerArgs === 'dupe') {
                return dupeInstanceIds ? dupeInstanceIds.has(item.itemInstanceId) : false;
            }
            if (lowerArgs === 'exotic') return def.inventory?.tierType === 6;
            if (lowerArgs === 'legendary') return def.inventory?.tierType === 5;
            if (lowerArgs === 'rare') return def.inventory?.tierType === 4;
            if (lowerArgs === 'common') return def.inventory?.tierType === 2;
            
            if (lowerArgs === 'weapon') return def.itemType === 3;
            if (lowerArgs === 'armor') return def.itemType === 2;
            
            if (lowerArgs === 'kinetic') return item.instanceData?.damageType === 1 || def.defaultDamageType === 1;
            if (lowerArgs === 'arc') return item.instanceData?.damageType === 2 || def.defaultDamageType === 2;
            if (lowerArgs === 'solar') return item.instanceData?.damageType === 3 || def.defaultDamageType === 3;
            if (lowerArgs === 'void') return item.instanceData?.damageType === 4 || def.defaultDamageType === 4;
            if (lowerArgs === 'stasis') return item.instanceData?.damageType === 6 || def.defaultDamageType === 6;
            if (lowerArgs === 'strand') return item.instanceData?.damageType === 7 || def.defaultDamageType === 7;
            
            // Also support crafted, deepsight, masterwork, locked, equipped
            if (lowerArgs === 'crafted') return item.state && (item.state & 8) === 8;
            if (lowerArgs === 'masterwork') return item.state && (item.state & 4) === 4;
            if (lowerArgs === 'locked') return item.state && (item.state & 1) === 1;
            if (lowerArgs === 'equipped') return item.isEquipped === true;
            if (lowerArgs === 'deepsight') return item.tooltipNotificationIndexes && item.tooltipNotificationIndexes.length > 0;
            
            return false;
        }

        if (type === 'perk') {
            if (!item.sockets?.sockets) return false;
            return item.sockets.sockets.some((socket: any) => {
                if (!socket.plugHash) return false;
                const plugDef = definitions[socket.plugHash];
                return plugDef?.displayProperties?.name?.toLowerCase().includes(lowerArgs);
            });
        }

        if (type === 'power') {
            const match = lowerArgs.match(/^([<>=]+)?(\d+)$/);
            if (!match) return false;

            const op = match[1] || '=';
            const targetVal = parseInt(match[2], 10);
            if (isNaN(targetVal)) return false;

            const power = item.instanceData?.primaryStat?.value || item.primaryStat?.value || 0;

            if (op === '>') return power > targetVal;
            if (op === '<') return power < targetVal;
            if (op === '>=') return power >= targetVal;
            if (op === '<=') return power <= targetVal;
            if (op === '=') return power === targetVal;
            
            return false;
        }

        if (type === 'stat') {
            // regex: (statName):([<>=]+)(\d+) -> stat:res:>90
            // Wait, query parser handles it differently.
            // If the query was stat:res:>90, type is 'stat', args is 'res:>90'
            const match = lowerArgs.match(/^([a-z]+):([<>=]+)?(\d+)$/);
            if (!match) return false;

            const [, statName, opStr, valStr] = match;
            const op = opStr || '=';
            const targetVal = parseInt(valStr, 10);
            if (isNaN(targetVal)) return false;

            const statHash = STAT_HASHES[statName];
            if (!statHash && statName !== 'total') return false;

            let statValue = 0;
            if (statName === 'total') {
                if (item.stats) {
                    statValue = Object.values(item.stats).reduce((acc: number, s: any) => acc + (s.value || 0), 0);
                }
            } else {
                statValue = item.stats?.[statHash]?.value || 0;
            }

            if (op === '>') return statValue > targetVal;
            if (op === '<') return statValue < targetVal;
            if (op === '>=') return statValue >= targetVal;
            if (op === '<=') return statValue <= targetVal;
            if (op === '=') return statValue === targetVal;
            
            return false;
        }

        return false;
    }

    return items.filter(item => {
        const def = definitions[item.itemHash];
        if (!def) return false;
        return evaluateNode(ast, item, def);
    });
}
