import { AppFrame, SiteFooter, SiteHeader } from "../../components/site-shell";
import { VerifyEmailPage } from "../../components/marketing-pages";

export default function VerifyEmailRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="page-shell"> <VerifyEmailPage /> </main>
      <SiteFooter />
    </AppFrame>
  );
}
