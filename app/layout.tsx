import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mag 7 Valuations',
  description: 'Live valuations for the Magnificent Seven stocks',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="w-full text-center py-4 px-6 text-xs text-gray-500">
          Mag 7 Valuations is a research and learning tool. Data sourced from Yahoo Finance and may be delayed up to 15 minutes. Not investment advice.
          <br />
          Built by Donovan Young
        </footer>
      </body>
    </html>
  );
}
