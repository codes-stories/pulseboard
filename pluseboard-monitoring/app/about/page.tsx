import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { AboutPage } from "../../components/marketing-pages";

export default function AboutRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell">
        <AboutPage />
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
