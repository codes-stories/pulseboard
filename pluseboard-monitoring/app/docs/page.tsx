import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { DocsPage } from "../../components/marketing-pages";

export default function DocsRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell">
        <DocsPage />
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
