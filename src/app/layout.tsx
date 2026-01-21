import "./globals.css";
import Nav from "@/components/Nav";
import { bungeeShade, inter } from "@/app/fonts";

export const metadata = {
  title: "who-wins comix by Skye <3",
  description: "Cross-universe superhero debates + legal comic reading with kthoom.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${bungeeShade.variable} ${inter.variable}`}>
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
