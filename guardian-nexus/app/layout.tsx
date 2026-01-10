import type { Metadata } from 'next'
import { Space_Grotesk, Playfair_Display } from 'next/font/google'
import './globals.css'

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-sans' })
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-serif' })

export const metadata: Metadata = {
    title: 'Guardian Nexus',
    description: 'Advanced Destiny 2 Item Manager',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className={`${spaceGrotesk.variable} ${playfair.variable} antialiased bg-[#050505] text-[#e8e9ed]`}>
                {children}
            </body>
        </html>
    )
}
