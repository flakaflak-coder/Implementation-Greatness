import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { SidebarProvider } from '@/providers/sidebar-provider'
import { TooltipProvider } from '@/components/ui/tooltip'

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Onboarding Command Center',
  description: 'Digital Employee onboarding management for Freeday',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        <SidebarProvider>
          <TooltipProvider delayDuration={0}>
            {children}
          </TooltipProvider>
        </SidebarProvider>
      </body>
    </html>
  )
}
