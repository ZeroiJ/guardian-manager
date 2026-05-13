import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ItemDetailModal } from '@/components/inventory/ItemDetailModal';
import { useItemPopupStore } from '@/store/useItemPopupStore';
import { useInventoryStore } from '@/store/useInventoryStore';

/**
 * Mirrors DIM's `ItemPopupContainer`: single mounted popup, closes on route change,
 * delegates rendering to `ItemDetailModal` (our `ItemPopup` equivalent).
 */
export function ItemPopupContainer() {
    const { pathname } = useLocation();
    const hide = useItemPopupStore((s) => s.hide);
    const item = useItemPopupStore((s) => s.item);
    const definition = useItemPopupStore((s) => s.definition);
    const definitions = useItemPopupStore((s) => s.definitions);
    const referenceElement = useItemPopupStore((s) => s.referenceElement);

    const profile = useInventoryStore((s) => s.profile);
    const characters = profile?.characters
        ? Object.values(profile.characters)
        : [];

    useEffect(() => {
        hide();
    }, [pathname, hide]);

    if (!item || !definition) {
        return null;
    }

    return (
        <ItemDetailModal
            item={item}
            definition={definition}
            definitions={definitions}
            referenceElement={referenceElement}
            onClose={hide}
            characters={characters}
        />
    );
}
