import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { ThemeProvider } from "../design-system/theme/theme-provider";
import { Providers } from "../components/providers";
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
      <body className="min-h-full flex flex-col">
        <Script id="pulseboard-theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("pulseboard-theme");var d=t==="dark"||t==="light"?t:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=d;}catch(e){document.documentElement.dataset.theme="light";}})();`}
        </Script>
        <ThemeProvider>
          <Providers>{children}</Providers>
        </ThemeProvider>
      </body>
    </html>
  );
}
