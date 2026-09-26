import type { Metadata, Viewport } from 'next';
import { Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css'; // Global styles

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0284c7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'Life OS — Habit & Daily To-Do Manager',
  description: 'Modern Habit and Daily To-Do Manager for daily planning, progress, and streak tracking.',
  applicationName: 'LifeOS',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'LifeOS',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: 'Life OS — Habit & Daily To-Do Manager',
    description: 'Modern Habit and Daily To-Do Manager for daily planning, progress, and streak tracking.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Life OS — Habit & Daily To-Do Manager',
    description: 'Modern Habit and Daily To-Do Manager for daily planning, progress, and streak tracking.',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var settingsStr = localStorage.getItem('life_os_settings_v1');
                  var theme = 'light';
                  if (settingsStr) {
                    var parsed = JSON.parse(settingsStr);
                    if (parsed && parsed.theme) {
                      theme = parsed.theme;
                    }
                  }
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                } catch (e) {}

                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', function() {
                    navigator.serviceWorker.register('/sw.js').then(function(reg) {
                      // Register Background Sync if supported
                      if ('sync' in reg) {
                        reg.sync.register('sync-lifeos-data').catch(function() {});
                      }
                    }).catch(function(err) {
                      console.warn('Service worker registration failed:', err);
                    });
                  });
                }
              })();
            `,
          }}
        />
      </head>
      <body
        suppressHydrationWarning
        className={`${sansFont.variable} ${monoFont.variable} font-sans antialiased selection:bg-sky-500 selection:text-white bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 min-h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
