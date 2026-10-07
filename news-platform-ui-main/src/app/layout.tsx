import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/providers/query-provider";

const poppins = Poppins({
   variable: "--font-poppins",
   subsets: ["latin"],
   weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
   title: "News Updates | Stay Informed with the Latest News",
   description:
      "Your trusted platform for breaking stories, in-depth analysis, and real-time news across politics, business, technology, sports, health, and entertainment.",
   icons: {
      icon: "/fav.svg",
      shortcut: "/fav.svg",
      apple: "/fav.svg",
   },
};

export default function RootLayout({
   children,
}: Readonly<{
   children: React.ReactNode;
}>) {
   return (
      <html lang="en" className={poppins.variable} suppressHydrationWarning>
         <body
            suppressHydrationWarning
            className={`${poppins.className} antialiased`}
         >
            <ThemeProvider attribute="class" defaultTheme="light">
               <QueryProvider>{children}</QueryProvider>
            </ThemeProvider>
         </body>
      </html>
   );
}
