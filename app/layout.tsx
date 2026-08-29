import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Korama — Trade corridor prototype",
  description: "A private investor prototype for Korama's West African trade corridor.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
