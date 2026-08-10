import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import AppLayout from "@/components/AppLayout";

export const metadata: Metadata = {
  title: "LivestoCare | Digital Farm Management",
  description: "Monitor Antimicrobial Usage (AMU) and Maximum Residue Limits (MRL) compliance in livestock.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-gray-900 bg-[#F8FAFC]">
        <AuthProvider>
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
