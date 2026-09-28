import { GA_MEASUREMENT_ID, analyticsPath } from "./analytics-config";

declare global {
  interface Window {
    dataLayer?: unknown[];
    [key: `ga-disable-${string}`]: boolean;
  }
}
type AnalyticsWindow = Window;
let initialized = false;
let enabled = false;
let lastPage: string | null = null;

function command(...args: unknown[]) {
  const target = window as AnalyticsWindow;
  target.dataLayer ??= [];
  // gtag consumes Arguments objects, not ordinary arrays.
  target.dataLayer.push(
    (function (...values: unknown[]) {
      void values;
      // eslint-disable-next-line prefer-rest-params -- gtag requires an Arguments object.
      return arguments;
    })(...args),
  );
}

export function stopAnalytics() {
  if (!GA_MEASUREMENT_ID || typeof window === "undefined") return;
  enabled = false;
  lastPage = null;
  (window as AnalyticsWindow)[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  if (initialized)
    command("consent", "update", { analytics_storage: "denied" });
}

export function recordPageView(pathname: string, hasConsent: () => boolean) {
  const id = GA_MEASUREMENT_ID;
  const path = analyticsPath(pathname);
  if (!id || !path || !hasConsent()) {
    stopAnalytics();
    return;
  }
  const target = window as AnalyticsWindow;
  target[`ga-disable-${id}`] = false;
  if (!initialized) {
    command("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    command("js", new Date());
    command("config", id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      cookie_domain: "none",
      cookie_expires: 60 * 60 * 24 * 180,
      cookie_update: false,
      page_location: location.origin + path,
      page_referrer: "",
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(script);
    initialized = true;
  }
  if (!enabled) command("consent", "update", { analytics_storage: "granted" });
  enabled = true;
  if (!hasConsent()) {
    stopAnalytics();
    return;
  }
  if (lastPage === path) return;
  command("event", "page_view", {
    send_to: id,
    page_location: location.origin + path,
    page_referrer: lastPage ? location.origin + lastPage : "",
    page_title: path === "/" ? "Início" : path,
  });
  lastPage = path;
}
