import { ConnectSkeleton } from "@/components/connect/connect-skeleton";

// Shown at once while the page asks the database (and GitHub or Supabase) what is connected.
export default function Loading() {
  return <ConnectSkeleton />;
}
