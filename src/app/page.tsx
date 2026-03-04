
import { Dashboard } from "@/components/Dashboard";
import { Toaster } from "@/components/ui/toaster";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Dashboard />
      <Toaster />
    </div>
  );
}
