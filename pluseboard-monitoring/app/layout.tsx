import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "../design-system/theme/theme-provider";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pulseboard — Infrastructure, in focus",
  description: "A calm, dependable view of every service, endpoint, and heartbeat that matters.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col"><ThemeProvider>{children}</ThemeProvider></body>
    </html>
  );
}
