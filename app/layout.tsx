import './globals.css';

export const metadata = {
  title: 'Saage Barber',
  description: 'Book trusted barbers and hair stylists near you',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#FFFFFF',
};

// Instagram-style light look is the default; users can switch to dark in Profile.
// Applied before hydration so there is no theme flash.
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('saage-theme');
    document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
