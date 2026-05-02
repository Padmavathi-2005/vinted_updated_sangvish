import './globals.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Providers } from './providers';
import LayoutWrapper from './LayoutWrapper';

export const metadata = {
  title: 'Vinted Marketplace',
  description: 'Buy and sell pre-loved fashion.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'Inter, system-ui, -apple-system, sans-serif' }}>
        <Providers>
          <LayoutWrapper>
            {children}
          </LayoutWrapper>
        </Providers>
      </body>
    </html>
  );
}
