import { IdleTimeoutProvider } from "@/components/IdleTimeoutProvider";
import { ThemeHydrator } from "@/components/ThemeHydrator";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <IdleTimeoutProvider>
      <ThemeHydrator />
      {children}
    </IdleTimeoutProvider>
  );
}