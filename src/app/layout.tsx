import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import CustomCursor from "@/components/ui/CustomCursor";
import Global3DBackground from "@/components/background/Global3DBackground";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "HackBridge | Next-Gen Competitive Hackathon Infrastructure",
  description:
    "Production-ready hackathon hosting platform connecting students with colleges and companies. Automated team validation, timed problem reveals, and GitHub repo sync.",
  keywords: ["hackathon", "developer platform", "competitive coding", "engineering", "college hackathons"],
  authors: [{ name: "HackBridge" }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('hb_theme');
                  if (stored === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                    document.documentElement.style.colorScheme = 'light';
                  } else {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                    document.documentElement.style.colorScheme = 'dark';
                  }
                } catch(e) {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                  document.documentElement.style.colorScheme = 'dark';
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} antialiased bg-transparent text-[#F8FAFC] min-h-screen flex flex-col font-sans selection:bg-[#6366F1]/40 selection:text-white relative`}
      >
        {/* Fixed full-screen Three.js 3D Background */}
        <Global3DBackground />

        {/* Global UI & Navigation */}
        <CustomCursor />
        <Navbar />
        <main className="flex-1 flex flex-col relative z-10 bg-transparent">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
