import { AppFrame, SiteFooter, SiteHeader } from "../components/site-shell";
import { LandingPage } from "../components/marketing-pages";

export default function Home() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell">
        <LandingPage />
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
