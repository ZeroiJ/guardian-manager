import React from 'react';
import { TopBar } from '@/components/layout/TopBar';
import { useSettingsStore, type ItemSortOrder } from '@/store/settingsStore';

/**
 * Settings Page — User preferences hub
 *
 * Sections: Display, Wishlist, Data Management, About
 */
export default function Settings() {
    const {
        itemSortOrder,
        wishlistUrl,
        badgeType,
        inventoryColumns,
        showElements,
        update,
    } = useSettingsStore();

    return (
        <div className="min-h-screen bg-gradient-to-b from-[#0a0a12] via-[#0e0e1a] to-[#12121f] text-gray-200">
            {/* Header */}
            <header className="backdrop-blur-sm bg-[#0e0e1a]/80 border-b border-white/5 sticky top-0 z-50">
                <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xl font-bold bg-gradient-to-r from-white via-gray-300 to-gray-400 bg-clip-text text-transparent">
                            SETTINGS
                        </span>
                    </div>
                    <TopBar />
                </div>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                {/* Display */}
                <SettingsSection title="Display">
                    <SettingsRow label="Item Sort Order" description="How items are sorted within each bucket">
                        <select
                            value={itemSortOrder}
                            onChange={e => update({ itemSortOrder: e.target.value as ItemSortOrder })}
                            className="bg-[#1a1a2e] border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:border-[#7af48b]/50 focus:outline-none transition-colors"
                        >
                            <option value="power">Power Level</option>
                            <option value="rarity">Rarity</option>
                            <option value="name">Name</option>
                            <option value="type">Type</option>
                        </select>
                    </SettingsRow>

                    <SettingsRow label="Inventory Columns" description="Number of columns in the inventory grid">
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={3}
                                max={8}
                                value={inventoryColumns}
                                onChange={e => update({ inventoryColumns: parseInt(e.target.value) })}
                                className="w-32 accent-[#7af48b]"
                            />
                            <span className="text-sm text-white font-mono w-4">{inventoryColumns}</span>
                        </div>
                    </SettingsRow>

                    <SettingsRow label="Badge Type" description="What to show on item badges">
                        <select
                            value={badgeType}
                            onChange={e => update({ badgeType: e.target.value as 'power' | 'tag' | 'none' })}
                            className="bg-[#1a1a2e] border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:border-[#7af48b]/50 focus:outline-none transition-colors"
                        >
                            <option value="power">Power Level</option>
                            <option value="tag">Tag</option>
                            <option value="none">None</option>
                        </select>
                    </SettingsRow>

                    <SettingsToggle
                        label="Show Element Icons"
                        description="Display element damage type icons on weapon tiles"
                        checked={showElements}
                        onChange={v => update({ showElements: v })}
                    />
                </SettingsSection>

                {/* Wishlist */}
                <SettingsSection title="Wishlist">
                    <SettingsRow label="Wishlist Source URL" description="Custom wishlist URL. Leave empty for default Voltron community list.">
                        <input
                            type="text"
                            value={wishlistUrl}
                            onChange={e => update({ wishlistUrl: e.target.value })}
                            placeholder="https://raw.githubusercontent.com/..."
                            className="bg-[#1a1a2e] border border-white/10 rounded px-3 py-1.5 text-sm text-white w-full max-w-md focus:border-[#7af48b]/50 focus:outline-none transition-colors placeholder:text-gray-600"
                        />
                    </SettingsRow>
                </SettingsSection>

                {/* Data Management */}
                <SettingsSection title="Data Management">
                    <SettingsRow label="Clear Profile Cache" description="Force a fresh download from Bungie on next load">
                        <button
                            onClick={async () => {
                                try {
                                    const { del } = await import('idb-keyval');
                                    const keys = await (await import('idb-keyval')).keys();
                                    for (const key of keys) {
                                        if (String(key).startsWith('profile-')) {
                                            await del(key);
                                        }
                                    }
                                    alert('Profile cache cleared. Refresh the page.');
                                } catch {
                                    alert('Failed to clear cache.');
                                }
                            }}
                            className="px-4 py-1.5 text-sm rounded bg-[#1a1a2e] border border-white/10 hover:border-red-500/50 hover:text-red-400 transition-colors"
                        >
                            Clear Cache
                        </button>
                    </SettingsRow>

                    <SettingsRow label="Force Sync" description="Push local data to cloud immediately">
                        <button
                            onClick={async () => {
                                try {
                                    const { useSyncStore } = await import('@/store/syncStore');
                                    await useSyncStore.getState().flush();
                                    alert('Sync complete.');
                                } catch {
                                    alert('Sync failed.');
                                }
                            }}
                            className="px-4 py-1.5 text-sm rounded bg-[#1a1a2e] border border-white/10 hover:border-[#7af48b]/50 hover:text-[#7af48b] transition-colors"
                        >
                            Sync Now
                        </button>
                    </SettingsRow>
                </SettingsSection>

                {/* About */}
                <SettingsSection title="About">
                    <div className="text-sm text-gray-500 space-y-1">
                        <p><span className="text-gray-400">Version:</span> 0.37.0</p>
                        <p><span className="text-gray-400">Built with:</span> React + Vite + Zustand + Cloudflare Workers</p>
                        <p>
                            <span className="text-gray-400">Inspired by:</span>{' '}
                            <a href="https://destinyitemmanager.com" target="_blank" rel="noreferrer" className="text-[#7af48b]/80 hover:text-[#7af48b] transition-colors">
                                Destiny Item Manager (DIM)
                            </a>
                        </p>
                    </div>
                </SettingsSection>
            </main>
        </div>
    );
}

// ============================================================================
// Sub-Components
// ============================================================================

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="bg-[#111122]/60 border border-white/5 rounded-lg overflow-hidden">
            <h2 className="px-5 py-3 text-sm font-bold uppercase tracking-wider text-[#7af48b] border-b border-white/5 bg-[#0e0e1a]/60">
                {title}
            </h2>
            <div className="divide-y divide-white/5">{children}</div>
        </section>
    );
}

function SettingsRow({
    label,
    description,
    children,
}: {
    label: string;
    description?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="px-5 py-4 flex items-center justify-between gap-6">
            <div>
                <div className="text-sm font-medium text-white">{label}</div>
                {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

function SettingsToggle({
    label,
    description,
    checked,
    onChange,
}: {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <SettingsRow label={label} description={description}>
            <button
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    checked ? 'bg-[#7af48b]' : 'bg-gray-700'
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        checked ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
        </SettingsRow>
    );
}
