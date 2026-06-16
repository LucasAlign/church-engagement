import './globals.css';

export const metadata = { title: 'Arlo', description: 'Focused. Faithful. Free.' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
