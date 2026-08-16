import type { Metadata } from 'next';
import { AppProviders } from '../providers/AppProviders';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIAVRO Billing OS',
  description: 'Production Enterprise SaaS ERP & Billing OS',
  icons: {
    icon: '/favicon.ico'
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
