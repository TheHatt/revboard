import type { Metadata } from "next";
import { AppShell } from "@/components/sidebar";

export const metadata: Metadata = { title: "Revboard", description: "Dashboard" };

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}