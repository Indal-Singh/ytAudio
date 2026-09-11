import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PlayerProvider } from "@/context/PlayerContext";
import { SsrPreloaderClient } from "@/components/SsrPreloaderClient";
import { PwaRegister } from "@/components/PwaRegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://yta.indalsingh.dev"),
  title: {
    default: "YTaudio — Free YouTube Audio Streamer & Background Player",
    template: "%s | YTaudio",
  },
  description:
    "Listen to YouTube music in the background without video data drain. Free YouTube audio streamer with lock-screen playback, playlist queue, MP3/MP4 conversion, and audio visualizer.",
  keywords: [
    "youtube audio streamer",
    "youtube music background player",
    "listen to youtube with screen off",
    "save mobile data streaming music",
    "convert youtube to mp3",
    "youtube music web player",
    "ytaudio",
  ],
  authors: [{ name: "YTaudio Team" }],
  creator: "YTaudio",
  applicationName: "YTaudio",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "YTaudio — Free YouTube Audio Streamer & Background Player",
    description:
      "Listen to YouTube music in the background without video data drain. Save data, battery, and enjoy distraction-free high-fidelity sound.",
    siteName: "YTaudio",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "YTaudio — Free YouTube Audio Streamer & Background Player",
    description:
      "Stream YouTube music with screen off. Save data & battery with high-fidelity audio.",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "YTaudio",
  },
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0b0e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        {/* Critical inline CSS so the preloader is styled instantaneously before any CSS chunk loads */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              #ssr-preloader {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                z-index: 999999;
                background-color: #0a0b0e;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 20px;
                font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                transition: opacity 0.35s ease, visibility 0.35s ease;
                pointer-events: all;
              }
              #ssr-preloader.loaded {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
              }
              .ssr-loader-brand {
                display: flex;
                align-items: center;
                gap: 12px;
              }
              .ssr-loader-icon {
                width: 50px;
                height: 50px;
                border-radius: 14px;
                background: linear-gradient(135deg, #ff0033 0%, #ff5252 50%, #9d4edd 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 0 35px rgba(255, 0, 51, 0.45);
              }
              .ssr-loader-title {
                font-size: 1.55rem;
                font-weight: 800;
                color: #ffffff;
                letter-spacing: -0.02em;
                display: flex;
                align-items: center;
              }
              .ssr-loader-badge {
                font-size: 0.72rem;
                font-weight: 700;
                color: #00f0ff;
                background: rgba(0, 240, 255, 0.12);
                border: 1px solid rgba(0, 240, 255, 0.3);
                padding: 2px 8px;
                border-radius: 9999px;
                margin-left: 8px;
                text-transform: uppercase;
              }
              .ssr-spinner-ring {
                width: 36px;
                height: 36px;
                border: 3px solid rgba(255, 255, 255, 0.1);
                border-top-color: #ff0033;
                border-right-color: #00f0ff;
                border-radius: 50%;
                animation: ssr-spin 0.85s linear infinite;
              }
              @keyframes ssr-spin {
                to { transform: rotate(360deg); }
              }
              .ssr-loader-msg {
                font-size: 0.85rem;
                color: #9ea4b4;
                letter-spacing: 0.02em;
              }
            `,
          }}
        />
      </head>
      <body suppressHydrationWarning style={{ backgroundColor: "#0a0b0e" }}>
        {/* Full-screen SSR Preloader rendered in initial HTML */}
        <div id="ssr-preloader">
          <div className="ssr-loader-brand">
            <div className="ssr-loader-icon">
              <svg
                width="26"
                height="26"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#ffffff"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" fill="#ffffff" />
                <circle cx="18" cy="16" r="3" fill="#ffffff" />
              </svg>
            </div>
            <div className="ssr-loader-title">
              <span>YTaudio</span>
              <span className="ssr-loader-badge">PRO</span>
            </div>
          </div>
          <div className="ssr-spinner-ring" />
          <div className="ssr-loader-msg">Loading audio streams...</div>
        </div>

        {/* Client Hydration Handler to smoothly dismiss the preloader */}
        <SsrPreloaderClient />

        <PlayerProvider>
          {children}
          <PwaRegister />
        </PlayerProvider>
      </body>
    </html>
  );
}
