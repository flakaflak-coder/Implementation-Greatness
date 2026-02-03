import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { SidebarProvider } from '@/providers/sidebar-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { CommandPaletteProvider } from '@/providers/command-palette-provider'
import { AuthProvider } from '@/providers/auth-provider'
import { Toaster } from 'sonner'

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
        <AuthProvider>
          <SidebarProvider>
            <CommandPaletteProvider>
              <TooltipProvider delayDuration={0}>
                {children}
              </TooltipProvider>
            </CommandPaletteProvider>
          </SidebarProvider>
        </AuthProvider>
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
