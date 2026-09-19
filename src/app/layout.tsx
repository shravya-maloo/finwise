import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FinWise: Ask your financial aid documents",
  description: "A free, RAG-powered assistant that answers questions grounded in your uploaded financial aid and scholarship documents.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
