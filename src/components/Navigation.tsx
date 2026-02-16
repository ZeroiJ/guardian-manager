import { Link, useLocation } from 'react-router-dom';

export function Navigation() {
    const location = useLocation();
    const isActive = (path: string) => location.pathname === path;

    return (
        <nav className="flex gap-4 text-sm font-medium text-gray-400">
            <Link 
                to="/" 
                className={`transition-colors ${isActive('/') ? 'text-white bg-void-surface px-3 py-1 border border-void-border rounded-sm' : 'hover:text-white'}`}
            >
                Inventory
            </Link>
            <Link 
                to="/progress" 
                className={`transition-colors ${isActive('/progress') ? 'text-white bg-void-surface px-3 py-1 border border-void-border rounded-sm' : 'hover:text-white'}`}
            >
                Progress
            </Link>
            <Link 
                to="/vendors" 
                className={`transition-colors ${isActive('/vendors') ? 'text-white bg-void-surface px-3 py-1 border border-void-border rounded-sm' : 'hover:text-white'}`}
            >
                Vendors
            </Link>
        </nav>
    );
}
