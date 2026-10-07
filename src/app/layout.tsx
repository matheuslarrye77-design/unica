import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "latin-ext"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "Única",
  description: "Espaço interno do Centro Universitário Única",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${manrope.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
