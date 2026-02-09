import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { WishlistProvider } from './contexts/WishlistContext'
import { ToastProvider } from './contexts/ToastContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ToastProvider>
            <WishlistProvider>
                <App />
            </WishlistProvider>
        </ToastProvider>
    </React.StrictMode>,
)
