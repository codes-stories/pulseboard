import { AppFrame, SiteHeader } from "../../../components/site-shell";
import { ApiWorkspace } from "../../../components/api-tester";

export default function APITesterRoute() {
  return (
    <AppFrame>
      <SiteHeader />
      <main className="h-[calc(100dvh-4rem)]">
        <ApiWorkspace />
      </main>
    </AppFrame>
  );
}