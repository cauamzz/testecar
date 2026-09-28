import type { Metadata } from "next";
import localFont from "next/font/local";
import "./admin.css";
const exo = localFont({
  src: [
    {
      path: "../../../node_modules/@fontsource-variable/exo-2/files/exo-2-latin-wght-normal.woff2",
      weight: "100 900",
      style: "normal",
    },
    {
      path: "../../../node_modules/@fontsource-variable/exo-2/files/exo-2-latin-wght-italic.woff2",
      weight: "100 900",
      style: "italic",
    },
  ],
  display: "swap",
});
export const metadata: Metadata = {
  title: "Área da loja",
  robots: { index: false, follow: false },
};
export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return <div className={`admin-theme ${exo.className}`}>{children}</div>;
}
