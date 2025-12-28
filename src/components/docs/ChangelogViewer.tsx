import React, { useMemo, useState } from 'react';
import { parseChangelog } from '../../utils/markdownParser';
// @ts-ignore
import changelogRaw from '../../../CHANGELOG.md?raw';
import { ChevronDown, ChevronRight, Clock } from 'lucide-react';

export const ChangelogViewer: React.FC = () => {
    const entries = useMemo(() => parseChangelog(changelogRaw), []);
    const [expandedVersion, setExpandedVersion] = useState<string | null>(entries[0]?.version || null);

    return (
        <div className="space-y-4">
            {entries.map((entry) => (
                <div key={entry.version} className="border border-white/5 rounded-lg overflow-hidden bg-[#0a0a0a]">
                    <button
                        onClick={() => setExpandedVersion(expandedVersion === entry.version ? null : entry.version)}
                        className="w-full flex items-center justify-between p-4 bg-[#111] hover:bg-[#161616] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            {expandedVersion === entry.version ? <ChevronDown size={18} className="text-[#f5dc56]" /> : <ChevronRight size={18} className="text-gray-500" />}
                            <span className="font-mono font-bold text-lg text-white">v{entry.version}</span>
                            <span className="px-2 py-0.5 text-[10px] bg-white/5 rounded text-gray-400 font-mono flex items-center gap-1">
                                <Clock size={10} />
                                {entry.date}
                            </span>
                        </div>
                    </button>

                    {expandedVersion === entry.version && (
                        <div className="p-4 space-y-4 border-t border-white/5">
                            {entry.sections.map((section) => (
                                <div key={section.title}>
                                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">{section.title}</h4>
                                    <ul className="space-y-2">
                                        {section.items.map((item, idx) => (
                                            <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                                                <span className="text-[#f5dc56] mt-1.5 w-1 h-1 rounded-full bg-current block flex-shrink-0" />
                                                <span dangerouslySetInnerHTML={{ __html: item.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/`(.+?)`/g, '<code class="bg-white/10 px-1 rounded text-xs font-mono text-[#f5dc56]">$1</code>') }} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};
