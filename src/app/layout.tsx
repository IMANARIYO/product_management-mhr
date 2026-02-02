/* eslint-disable @typescript-eslint/no-unused-vars */
import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { Toaster } from "@/components/ui/sonner"
import { ErrorBoundary } from "@/components/error-boundary"
const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Bar Management System',
  description: 'Complete bar operations and inventory management',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>


        <Toaster
          position="top-right"   // ✅ choose top-right, top-left, bottom-right, bottom-left, top-center, bottom-center
          richColors             // optional: makes colors nicer
          closeButton            // optional: show close button
          duration={4000}        // optional: auto-close after 4s
        />
      </body>
    </html>
  )
}
