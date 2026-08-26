import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AgroErpProvider } from "@/context/AgroErpContext";
import { ToastProvider } from "@/components/ui/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <ToastProvider>
          <AgroErpProvider>{children}</AgroErpProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
