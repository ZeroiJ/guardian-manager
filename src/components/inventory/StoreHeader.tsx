import React, { useMemo } from 'react';
import { bungieNetPath, BungieImage } from '../ui/BungieImage';
import { StatHashes } from '@/lib/destiny-constants';
import { PROFILE_CURRENCY_DISPLAY_ORDER } from '@/data/profileCurrencyOrder';
import { Shield } from 'lucide-react';

interface StoreHeaderProps {
    storeId: string;
    character?: any;
    vaultCount?: number;
    vaultMax?: number;
    /** Seasonal artifact bonus (profile-wide) */
    artifactPower?: number;
    /** Best power for this class (DIM-style secondary number) */
    maxPower?: number;
    /** Equipped helmet (middle-row icon) */
    helmetItem?: { itemHash: number } | null;
    /** `profileCurrencies.data.items` from Bungie profile */
    currencyItems?: Array<{ itemHash: number; quantity: number }>;
    definitions?: Record<string, any>;
}

const STAT_ROW: { label: string; hash: number }[] = [
    { label: 'Mob', hash: StatHashes.Mobility },
    { label: 'Res', hash: StatHashes.Resilience },
    { label: 'Rec', hash: StatHashes.Recovery },
    { label: 'Dis', hash: StatHashes.Discipline },
    { label: 'Int', hash: StatHashes.Intellect },
    { label: 'Str', hash: StatHashes.Strength },
];

function classAccent(classType: number): string {
    switch (classType) {
        case 0:
            return 'text-red-400';
        case 1:
            return 'text-green-400';
        case 2:
            return 'text-violet-400';
        default:
            return 'text-gray-400';
    }
}

function sortCurrencyRows(
    items: Array<{ itemHash: number; quantity: number }>,
): Array<{ itemHash: number; quantity: number }> {
    const withQty = items.filter((i) => i.quantity > 0);
    return [...withQty].sort((a, b) => {
        const ia = PROFILE_CURRENCY_DISPLAY_ORDER.indexOf(a.itemHash);
        const ib = PROFILE_CURRENCY_DISPLAY_ORDER.indexOf(b.itemHash);
        if (ia !== -1 || ib !== -1) {
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        }
        return a.itemHash - b.itemHash;
    });
}

export const StoreHeader: React.FC<StoreHeaderProps> = ({
    storeId,
    character,
    vaultCount,
    vaultMax = 600,
    artifactPower = 0,
    maxPower,
    helmetItem,
    currencyItems = [],
    definitions = {},
}) => {
    const currencyRows = useMemo(
        () => sortCurrencyRows(currencyItems).slice(0, 6),
        [currencyItems],
    );

    if (storeId === 'vault') {
        return (
            <div className="store-row store-header flex h-full min-w-0 flex-col overflow-hidden border border-dim-border-light bg-dim-surface text-dim-text select-none">
                <div className="relative z-20 flex h-[34px] shrink-0 items-center justify-between border-b border-dim-border bg-dim-bg px-2">
                    <div className="flex items-center gap-1.5">
                        <Shield className="size-4 shrink-0 text-dim-text-muted" aria-hidden />
                        <span className="text-[11px] font-bold uppercase tracking-wide text-dim-text">
                            Vault
                        </span>
                    </div>
                    <div className="font-mono text-[13px] font-bold tabular-nums text-power-gold">
                        {vaultCount}{' '}
                        <span className="text-[10px] font-semibold text-dim-text-muted">/ {vaultMax}</span>
                    </div>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-x-1.5 gap-y-1 bg-dim-bg p-1.5 text-[9px] leading-tight">
                    {currencyRows.length === 0 ? (
                        <div className="col-span-3 py-2 text-center text-[10px] text-dim-text-muted">
                            Currencies load with profile…
                        </div>
                    ) : (
                        currencyRows.map((c) => {
                            const def = definitions[c.itemHash] as any;
                            const icon = def?.displayProperties?.icon;
                            const name =
                                (def?.displayProperties?.name as string | undefined)?.slice(0, 10) ||
                                '—';
                            const qty =
                                c.quantity >= 100000
                                    ? `${Math.floor(c.quantity / 1000)}k`
                                    : c.quantity.toLocaleString();
                            return (
                                <div
                                    key={c.itemHash}
                                    className="flex min-w-0 items-center gap-1"
                                    title={def?.displayProperties?.name}
                                >
                                    {icon ? (
                                        <BungieImage
                                            src={icon}
                                            className="size-3.5 shrink-0 rounded-sm bg-black/40 object-cover"
                                            alt=""
                                        />
                                    ) : (
                                        <div className="size-3.5 shrink-0 rounded-sm bg-dim-border" />
                                    )}
                                    <div className="min-w-0 flex-1">
                                        <div className="truncate font-semibold uppercase text-dim-text-muted">
                                            {name}
                                        </div>
                                        <div className="font-mono font-bold tabular-nums text-dim-text">
                                            {qty}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    }

    if (!character) return null;

    const classType = character.classType ?? 0;
    const raceType = character.raceType ?? 0;
    const emblemBackgroundPath = character.emblemBackgroundPath;
    const stats = character.stats || {};

    const raceNames: Record<number, string> = { 0: 'Human', 1: 'Awoken', 2: 'Exo' };
    const classNames: Record<number, string> = { 0: 'Titan', 1: 'Hunter', 2: 'Warlock' };
    const classNameText = classNames[classType] ?? 'Guardian';
    const raceName = raceNames[raceType] ?? '';

    const light = typeof character.light === 'number' ? character.light : 0;
    const basePower = Math.max(0, light - (artifactPower || 0));
    const helmetDef = helmetItem ? definitions[helmetItem.itemHash] : null;
    const helmetIcon = helmetDef?.displayProperties?.icon;

    return (
        <div className="store-row store-header flex h-full min-w-0 flex-col overflow-hidden border border-dim-border-light bg-dim-surface text-dim-text select-none">
            <div
                className="relative z-20 flex h-[34px] shrink-0 items-center bg-cover bg-center bg-no-repeat px-2"
                style={{
                    backgroundImage: emblemBackgroundPath
                        ? `url(${bungieNetPath(emblemBackgroundPath)})`
                        : undefined,
                }}
            >
                <div className="absolute inset-0 bg-black/75" />

                <div className="relative z-10 flex w-full items-center justify-between gap-1">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                        <div className="shrink-0">
                            {character.emblemPath ? (
                                <BungieImage
                                    src={character.emblemPath}
                                    className="size-5 rounded-sm border border-white/15 object-cover"
                                    alt=""
                                />
                            ) : (
                                <div
                                    className={`flex size-5 items-center justify-center rounded-sm border border-white/10 bg-black/50 text-[9px] font-bold ${classAccent(classType)}`}
                                >
                                    {classNameText.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div className="min-w-0 leading-tight">
                            <div
                                className={`truncate text-[11px] font-bold uppercase tracking-wide ${classAccent(classType)}`}
                            >
                                {classNameText}
                            </div>
                            <div className="truncate text-[9px] font-medium uppercase tracking-wider text-gray-400">
                                {raceName}
                            </div>
                        </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-0.5">
                        <span className="text-[10px] text-power-gold/90">✦</span>
                        <span className="font-mono text-[15px] font-bold tabular-nums leading-none text-power-gold">
                            {light}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex h-[28px] shrink-0 items-center gap-2 border-b border-dim-border bg-dim-bg px-2">
                <div className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-white/10 bg-black/40">
                    {helmetIcon ? (
                        <BungieImage
                            src={helmetIcon}
                            className="size-full object-cover"
                            alt=""
                        />
                    ) : (
                        <Shield className="size-3.5 text-dim-text-muted" aria-hidden />
                    )}
                </div>
                <div className="flex min-w-0 flex-1 items-baseline justify-between gap-2 font-mono text-[11px] tabular-nums">
                    <span className="text-dim-text">
                        {basePower}
                        {artifactPower ? (
                            <span className="text-arc"> +{artifactPower}</span>
                        ) : null}
                    </span>
                    {maxPower != null && maxPower > 0 ? (
                        <span
                            className="shrink-0 text-[10px] text-dim-text-muted"
                            title="Account max power (this class)"
                        >
                            {maxPower.toFixed(1)}
                        </span>
                    ) : null}
                </div>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-between gap-0.5 bg-dim-bg px-1 py-1">
                {STAT_ROW.map(({ label, hash }) => {
                    const raw = stats[hash] ?? stats[String(hash) as unknown as number];
                    const value = typeof raw === 'number' ? raw : 0;
                    const isTierMax = value >= 100;
                    return (
                        <div
                            key={hash}
                            className="flex min-w-0 flex-1 flex-col items-center leading-none"
                            title={`${label} ${value}`}
                        >
                            <span className="text-[8px] font-semibold uppercase text-dim-text-muted">
                                {label}
                            </span>
                            <span
                                className={`font-mono text-[10px] font-bold tabular-nums ${isTierMax ? 'text-masterwork' : 'text-dim-text'}`}
                            >
                                {value}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
