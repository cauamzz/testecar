"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useCookieConsent, hasAnalyticsConsent } from "./cookie-consent";
import { recordPageView, stopAnalytics } from "@/lib/analytics";

export function GoogleAnalytics() {
  const pathname = usePathname();
  const { consent } = useCookieConsent();
  useEffect(() => {
    recordPageView(pathname, hasAnalyticsConsent);
  }, [pathname, consent]);
  useEffect(() => () => stopAnalytics(), []);
  return null;
}
