import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { cookies } from "next/headers";
import { ACCESS_TOKEN_COOKIE, parseJwt } from "@/lib/auth-utils";
import { StoreInitializer } from "@/components/store-initializer";

export const metadata: Metadata = {
  title: "Tamsang - Transparent Charity Ecosystem",
  description: "Transparent Charity Ecosystem powered by Blockchain and AI.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  const userPayload = token ? parseJwt(token) : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <StoreInitializer user={userPayload} />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
