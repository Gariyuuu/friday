import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CameraActiveIndicator } from "@/components/gestures/CameraActiveIndicator";
import { GestureController } from "@/components/gestures/GestureController";
import { Toast } from "@/components/shell/Toast";
import { ToolApprovalModal } from "@/components/tools/ToolApprovalModal";
import { VmPromptModal } from "@/components/tools/VmPromptModal";
import { VoiceActivation } from "@/components/voice/VoiceActivation";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "F.R.I.D.A.Y.",
  description: "Personal Intelligence System",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FRIDAY",
  },
};

export const viewport: Viewport = {
  themeColor: "#050608",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-void text-text">
        {children}
        <VoiceActivation />
        <GestureController />
        <CameraActiveIndicator />
        <ToolApprovalModal />
        <VmPromptModal />
        <Toast />
      </body>
    </html>
  );
}
