import React, { useState } from 'react';
import { useWishlistContext } from '../../contexts/WishlistContext';
import { Plus, Trash2, RefreshCw, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { WishListInfo } from '../../lib/wishlist/types';

/**
 * WishlistSettings Component
 * 
 * Allows users to:
 * - View loaded wishlist sources and roll counts
 * - Add new wishlist URLs
 * - Remove wishlist sources
 * - Refresh wishlists from sources
 * - Clear all wishlists
 */
export const WishlistSettings: React.FC = () => {
    const {
        state,
        loading,
        error,
        addSource,
        removeSource,
        refresh,
        clear
    } = useWishlistContext();

    const [newUrl, setNewUrl] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    const handleAddSource = async () => {
        if (!newUrl.trim()) return;
        await addSource(newUrl.trim());
        setNewUrl('');
        setShowAddForm(false);
    };

    const totalRolls = state?.rolls.length || 0;
    const sources: WishListInfo[] = state?.infos || [];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Wishlists</h3>
                <div className="flex gap-2">
                    <button
                        onClick={refresh}
                        disabled={loading}
                        className="p-2 rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-50 transition-colors"
                        title="Refresh wishlists"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/20 border border-red-500/50 rounded text-red-300 text-sm">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                </div>
            )}

            {/* Roll Count */}
            <div className="p-3 bg-white/5 rounded border border-white/10">
                <div className="text-sm text-gray-400">Loaded Rolls</div>
                <div className="text-2xl font-bold text-white">{totalRolls.toLocaleString()}</div>
                {sources[0]?.title && (
                    <div className="text-xs text-gray-500 mt-1">{sources[0].title}</div>
                )}
            </div>

            {/* Sources List */}
            <div className="space-y-2">
                <div className="text-sm font-medium text-gray-400">Sources</div>
                {sources.length === 0 ? (
                    <div className="text-sm text-gray-500 italic">No sources configured</div>
                ) : (
                    <ul className="space-y-1">
                        {sources.map((info, idx) => (
                            <li key={idx} className="flex items-center justify-between p-2 bg-white/5 rounded text-sm">
                                <div className="flex-1 min-w-0">
                                    {info.url ? (
                                        <a
                                            href={info.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 hover:text-blue-300 truncate flex items-center gap-1"
                                        >
                                            <ExternalLink size={12} />
                                            <span className="truncate">{info.title || info.url.split('/').pop()}</span>
                                        </a>
                                    ) : (
                                        <span className="text-gray-300">{info.title || 'Local File'}</span>
                                    )}
                                    <div className="text-xs text-gray-500">{info.numRolls.toLocaleString()} rolls</div>
                                </div>
                                {info.url && (
                                    <button
                                        onClick={() => removeSource(info.url!)}
                                        className="ml-2 p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                                        title="Remove source"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Add Source Form */}
            {showAddForm ? (
                <div className="space-y-2">
                    <input
                        type="url"
                        value={newUrl}
                        onChange={(e) => setNewUrl(e.target.value)}
                        placeholder="https://raw.githubusercontent.com/..."
                        className="w-full p-2 bg-black/50 border border-white/20 rounded text-white text-sm placeholder-gray-500 focus:border-white/40 focus:outline-none"
                        autoFocus
                    />
                    <div className="flex gap-2">
                        <button
                            onClick={handleAddSource}
                            disabled={loading || !newUrl.trim()}
                            className="flex-1 flex items-center justify-center gap-2 p-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm disabled:opacity-50 transition-colors"
                        >
                            <Check size={14} />
                            Add
                        </button>
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setNewUrl('');
                            }}
                            className="px-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded text-sm transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowAddForm(true)}
                    className="w-full flex items-center justify-center gap-2 p-2 border border-dashed border-white/20 hover:border-white/40 text-gray-400 hover:text-white rounded text-sm transition-colors"
                >
                    <Plus size={14} />
                    Add Wishlist Source
                </button>
            )}

            {/* Clear Button */}
            {totalRolls > 0 && (
                <button
                    onClick={clear}
                    className="w-full p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded text-sm transition-colors"
                >
                    Clear All Wishlists
                </button>
            )}

            {/* Info */}
            <div className="text-xs text-gray-500 leading-relaxed">
                Wishlists highlight god rolls on your items. Add URLs from popular sources like
                <a href="https://github.com/48klocs/dim-wish-list-sources" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 mx-1">
                    Voltron
                </a>
                or create your own using the DIM wishlist format.
            </div>
        </div>
    );
};

export default WishlistSettings;
