import "bootstrap/dist/css/bootstrap.css";

import { Breadcrumbs, Footer } from "./_layout";
import { metadataForPage } from "./metadata";

export const metadata = metadataForPage();

/** The root layout. */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="d-flex flex-column justify-content-between vh-100 p-2">
          <div>
            <Breadcrumbs />
            {children}
          </div>
          <Footer />
        </div>
      </body>
    </html>
  );
}
