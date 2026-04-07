import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChatRTC',
  description: '即時聊天室',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
