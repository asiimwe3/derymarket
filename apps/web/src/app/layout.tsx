import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { Header, BottomNav } from '@/components/shell';

export const metadata: Metadata = {
  title: 'DeryMarket — Buy & sell anything, safely',
  description: 'All-in-one trade ecosystem for Uganda: market, deals, wholesale, services, agriculture.',
  themeColor: '#0B6B3A'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-6xl px-4 pb-20 pt-4 md:pb-8">{children}</main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}
