import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { PricingPage } from "../../components/marketing-pages";

export default function PricingRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell">
        <PricingPage />
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
