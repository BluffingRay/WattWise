import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Login from './components/Login'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wattwise | Energy Monitoring System",
  description: "Real-time IoT electrical parameter and compliance monitoring system.",
  icons: {
    // This tells the browser to use your existing Wattwise image as the tab logo!
    icon: "/wattwise.png", 
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {/* Wrap children with the Login component */}
        <Login>
          {children}
        </Login>
      </body>
    </html>
  )
}
