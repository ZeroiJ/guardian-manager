/**
 * ClarityInsight — Renders Clarity community perk descriptions.
 *
 * Shows exact stat bonuses, cooldown timers, and damage percentages
 * that Bungie's API does not expose. Data is fetched from the Clarity
 * public database (https://d2clarity.com).
 *
 * Ported from DIM: src/app/clarity/descriptions/ClarityDescriptions.tsx
 */
import React from 'react';
import { useClarityStore, type ClarityPerk, type ClarityLine, type ClarityLineContent } from '@/store/clarityStore';

// ─── Text formatting: bold numbers & percentages ─────────────────────
const BOLD_REGEX = /(?:^|\b)[+-]?(?:\d*\.)?\d+(?:[xs]|ms|HP)?(?:[%°+]|\b|$)/g;

function formatText(text: string | undefined): React.ReactNode {
    if (!text) return null;
    if (text === '🡅') return null; // Arrow placeholder — skip

    const segments: React.ReactNode[] = [];
    const matches = [...text.matchAll(BOLD_REGEX)];
    let startIndex = 0;

    for (let n = 0; n < matches.length; n++) {
        const match = matches[n];
        if (match.index === undefined) continue;
        segments.push(text.substring(startIndex, match.index));
        segments.push(
            <strong key={n} className="text-white font-bold">
                {match[0]}
            </strong>
        );
        startIndex = match.index + match[0].length;
    }
    if (startIndex < text.length) {
        segments.push(text.substring(startIndex));
    }
    return segments;
}

// ─── CSS class mapping (from Clarity's class names) ──────────────────
const CLASS_MAP: Record<string, string> = {
    blue: 'text-blue-400',
    green: 'text-emerald-400',
    yellow: 'text-amber-300',
    purple: 'text-purple-400',
    pvp: 'text-red-400',
    pve: 'text-blue-400',
    bold: 'font-bold',
    title: 'text-[11px] font-bold uppercase tracking-wider text-gray-300 mt-1',
    background: 'bg-white/[0.04] px-2 py-1 rounded-sm',
    center: 'text-center',
    breakSpaces: 'whitespace-pre-wrap',
    spacer: 'h-1',
    descriptionDivider: 'border-t border-white/10 my-1.5',
    enhancedArrow: 'text-cyan-400 font-bold',
};

function getClassName(classNames?: string[]): string {
    if (!classNames) return '';
    return classNames.map((cn) => CLASS_MAP[cn] || '').filter(Boolean).join(' ');
}

// ─── Component ───────────────────────────────────────────────────────

interface ClarityInsightProps {
    /** The perk hash to look up in the Clarity database. */
    perkHash: number;
    /** Optional compact mode for inline display. */
    compact?: boolean;
}

/**
 * Renders Clarity community insight for a given perk hash.
 * Returns null if no Clarity data is available.
 */
export const ClarityInsight: React.FC<ClarityInsightProps> = ({ perkHash, compact }) => {
    const perk = useClarityStore((s) => s.getPerkDescription(perkHash));

    if (!perk) return null;

    const description = perk.descriptions.en;
    if (!description || description.length === 0) return null;

    return (
        <div className={`${compact ? 'mt-1' : 'mt-2 p-2 rounded-lg bg-white/[0.02] border border-cyan-500/10'}`}>
            {!compact && (
                <div className="flex items-center gap-1.5 mb-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-cyan-400/70 font-rajdhani">
                        Community Insight
                    </span>
                </div>
            )}
            <div className="text-[11px] text-gray-400 leading-relaxed space-y-0.5">
                {description.map((line: ClarityLine, i: number) => (
                    <div key={i} className={getClassName(line.classNames)}>
                        {line.linesContent?.map((content: ClarityLineContent, j: number) => {
                            if (content.link) {
                                return (
                                    <a
                                        key={j}
                                        href={content.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                                    >
                                        {content.text}
                                    </a>
                                );
                            }
                            return (
                                <span key={j} className={getClassName(content.classNames)}>
                                    {formatText(content.text)}
                                </span>
                            );
                        })}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ClarityInsight;
