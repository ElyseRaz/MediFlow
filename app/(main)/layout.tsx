import type { ReactNode } from "react";
import Sidebar from "@/app/_components/Sidebar";
import Navbar from "@/app/_components/Navbar";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#f6f7fa]">
      <Sidebar />
      <div className="flex-1 ml-[240px] flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
