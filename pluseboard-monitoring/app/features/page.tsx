import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { FeaturesPage } from "../../components/marketing-pages";

export default function FeaturesRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell">
        <FeaturesPage />
      </main>
      <SiteFooter />
    </AppFrame>
  );
}
