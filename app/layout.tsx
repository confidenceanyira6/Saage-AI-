import './globals.css';

export const metadata = {
  title: 'Saage Barber',
  description: 'Book trusted barbers and hair stylists near you',
};

// Inline script prevents theme flash by applying the saved preference
// before React hydrates (per spec: no theme flashing on load).
const themeInitScript = `
(function(){
  try {
    var t = localStorage.getItem('saage-theme');
    if (t === 'dark') document.documentElement.setAttribute('data-theme','dark');
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
