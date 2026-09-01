import type { Metadata, Viewport } from "next";
import "./globals.css";
// app/legacy.css carries the styles for components/PrototypeWorkspace.tsx only.
// It is imported after globals.css and lives in the `legacy` cascade layer.
// Delete both this import and the file in Phase 10.
import "./legacy.css";
import { fontVariables } from "@/app/fonts";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export const metadata: Metadata = {
  title: "Korama — Commerce across West Africa",
  description:
    "Shop and operate traceable commerce across the Ghana–Nigeria corridor.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6f2" },
    { media: "(prefers-color-scheme: dark)", color: "#0c1612" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning is required: the server renders no theme class,
    // and next-themes' blocking inline script adds one before first paint.
    <html lang="en" suppressHydrationWarning className={fontVariables}>
      <body
        data-density="comfortable"
        className="min-h-svh bg-background text-foreground"
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>{children}</TooltipProvider>
          {/* richColors would introduce sonner's own red/green/amber and break
              the single-accent rule; success/error map to our own tokens. */}
          <Toaster position="bottom-right" closeButton richColors={false} />
        </ThemeProvider>
      </body>
    </html>
  );
}
