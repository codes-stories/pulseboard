"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuth } from "@/components/auth-provider";

export function AuthGate({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  const { status } = useAuth();

  useEffect(() => {
    if (status === "anonymous") {
      router.replace("/login");
    }
  }, [status, router]);

  if (status !== "authenticated") {
    return (
      <div className="page-shell py-6 md:py-8">
        <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="skeleton sticky top-24 h-[480px] rounded-md" />
          </aside>
          <main className="space-y-5">
            <div className="skeleton h-20 rounded-md" />
            <div className="skeleton h-64 rounded-md" />
          </main>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}