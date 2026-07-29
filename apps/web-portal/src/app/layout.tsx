import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AgriShield | Digital Farm Management",
  description: "Monitor Antimicrobial Usage (AMU) and Maximum Residue Limits (MRL) compliance in livestock.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" 
        />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
