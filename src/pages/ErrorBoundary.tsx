import { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: any;
}

export class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: any) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen bg-[#050505] text-red-500 flex flex-col items-center justify-center font-mono p-4">
                    <div className="text-2xl mb-4 font-bold">⚠️ SYSTEM ERROR</div>
                    <div className="bg-red-900/20 border border-red-500/50 p-6 rounded-lg max-w-2xl">
                        <div className="text-lg mb-2 text-red-400">Error Message:</div>
                        <div className="text-sm text-white mb-4 font-mono bg-black/30 p-3 rounded">
                            {this.state.error?.message || 'Unknown error'}
                        </div>
                        
                        {this.state.error?.stack && (
                            <>
                                <div className="text-lg mb-2 text-red-400">Stack Trace:</div>
                                <div className="text-xs text-gray-400 font-mono bg-black/30 p-3 rounded overflow-auto max-h-64">
                                    {this.state.error.stack}
                                </div>
                            </>
                        )}
                    </div>
                    
                    <div className="mt-6 flex gap-4">
                        <button 
                            onClick={() => window.location.href = '/'} 
                            className="px-6 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-bold transition-colors"
                        >
                            RETURN HOME
                        </button>
                        <button 
                            onClick={() => window.location.reload()} 
                            className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded font-bold transition-colors"
                        >
                            RELOAD PAGE
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}