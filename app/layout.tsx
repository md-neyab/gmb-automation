import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PinPilot | Local SEO Command Center",
  description: "Autonomous AI Google Business Profile management and local SEO dashboard.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className="h-full antialiased font-sans"
    >
      <body className="min-h-full bg-zinc-950 text-zinc-50">{children}</body>
    </html>
  );
}
