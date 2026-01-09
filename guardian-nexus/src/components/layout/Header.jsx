import { Search, User, Menu, Bell } from 'lucide-react';
// import { Button } from './ui/button'; // We need to create these UI components or mock them
// import { Input } from './ui/input';

// Simple Button Mock for now
const Button = ({ className, children, ...props }) => (
    <button className={`px-4 py-2 rounded ${className}`} {...props}>
        {children}
    </button>
);

// Simple Input Mock for now
const Input = ({ className, ...props }) => (
    <input className={`px-4 py-2 rounded ${className}`} {...props} />
);


export function Header({ onMenuClick }) {
    return (
        <header className="sticky top-0 z-40 border-b border-[#252a38]/50 backdrop-blur-xl bg-[#0a0e14]/80">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-between h-20">
                    {/* Left Section */}
                    <div className="flex items-center gap-6">
                        <button
                            onClick={onMenuClick}
                            className="lg:hidden p-2 hover:bg-[#252a38]/50 rounded-lg transition-colors"
                        >
                            <Menu className="size-6" />
                        </button>

                        <div className="flex items-center gap-3">
                            <div className="size-10 bg-gradient-to-br from-[#4a9eff] to-[#00d4ff] rounded-lg flex items-center justify-center">
                                <div className="size-6 bg-[#0a0e14] rounded-sm" />
                            </div>
                            <div>
                                <h1 className="text-xl tracking-tight">GUARDIAN HUB</h1>
                                <p className="text-xs text-[#9199a8]">Community Platform</p>
                            </div>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden lg:flex items-center gap-1 ml-8">
                            {['Dashboard', 'Arsenal', 'Collections', 'Clans', 'Trials'].map((item) => (
                                <button
                                    key={item}
                                    className="px-4 py-2 text-sm text-[#9199a8] hover:text-[#e8e9ed] hover:bg-[#252a38]/50 rounded-lg transition-all"
                                >
                                    {item}
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Right Section */}
                    <div className="flex items-center gap-4">
                        {/* Search */}
                        <div className="hidden md:block relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[#9199a8]" />
                            <Input
                                type="text"
                                placeholder="Search guardians, weapons..."
                                className="w-80 pl-10 bg-[#1a1f2e]/80 border-[#252a38] text-[#e8e9ed] placeholder:text-[#9199a8] focus:border-[#4a9eff] focus:ring-1 focus:ring-[#4a9eff]"
                            />
                        </div>

                        {/* Notifications */}
                        <button className="relative p-2 hover:bg-[#252a38]/50 rounded-lg transition-colors group">
                            <Bell className="size-5 text-[#9199a8] group-hover:text-[#e8e9ed]" />
                            <span className="absolute top-1 right-1 size-2 bg-[#ff8c42] rounded-full" />
                        </button>

                        {/* User Profile */}
                        <Button className="bg-gradient-to-r from-[#4a9eff] to-[#00d4ff] hover:from-[#3a8eef] hover:to-[#00c4ef] text-white border-0 shadow-lg shadow-[#4a9eff]/20">
                            <User className="size-4 mr-2" />
                            Sign In
                        </Button>
                    </div>
                </div>
            </div>
        </header>
    );
}
