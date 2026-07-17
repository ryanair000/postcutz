import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "PostCutz", template: "%s | PostCutz" },
  description: "Private poster library with credits, previews and secure downloads."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
