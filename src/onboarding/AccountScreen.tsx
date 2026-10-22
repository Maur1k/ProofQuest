import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Brand } from "./Brand";
import { AccountDemoNotice } from "./AccountForms";
import { ART } from "./slides";

/** Shared frame for the sample-only login/register screens. */
export function AccountScreen({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[430px] px-1 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <Link
          to="/welcome"
          className="-ml-2 inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <span aria-hidden>←</span> Back
        </Link>
        <Link
          to="/"
          className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-primary"
        >
          Continue as guest
        </Link>
      </div>
      <div className="mt-2 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <Brand size="sm" />
          <h1 className="mt-3 text-2xl font-bold text-foreground">{title}</h1>
        </div>
        <img src={ART.study} alt="" width={96} height={96} className="h-24 w-24 shrink-0 object-contain" />
      </div>
      <div className="mt-3">
        <AccountDemoNotice />
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
