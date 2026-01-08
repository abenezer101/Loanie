import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Loanie - AI Loan Intelligence Platform",
  description: "Transform complex loan data into standardized, institution-grade video briefings",
  generator: "v0.app",
  icons: {
    icon: "/lonie-logo.ico",
    apple: "/Loanie logo.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1a1a2e",
}

import { AppSidebar } from "@/components/app-sidebar"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`font-sans antialiased bg-background text-foreground`}>
        <div className="flex min-h-screen">
          <AppSidebar />
          <main className="flex-1 ml-16 transition-all duration-300">
            {children}
          </main>
        </div>
        <Analytics />
      </body>
    </html>
  )
}
