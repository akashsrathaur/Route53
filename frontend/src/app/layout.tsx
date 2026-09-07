import type { Metadata } from 'next';
import '@/styles/globals.css';
import { ThemeProvider } from '@/context/ThemeContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { AuthProvider } from '@/context/AuthContext';
import ConsoleLayoutClient from './ConsoleLayoutClient';

export const metadata: Metadata = {
  title: 'Route 53 - AWS Management Console',
  description: 'Scalable and highly available Domain Name System (DNS) web service.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body>
        <ThemeProvider>
          <NotificationProvider>
            <AuthProvider>
              <ConsoleLayoutClient>{children}</ConsoleLayoutClient>
            </AuthProvider>
          </NotificationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
