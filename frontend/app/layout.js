import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
    title: 'CAN 2025 - Fan Notifications',
    description: 'Plateforme de notifications pour les fans de la CAN 2025',
}

export default function RootLayout({ children }) {
    return (
        <html lang="fr">
            <body className={inter.className}>{children}</body>
        </html>
    )
}
