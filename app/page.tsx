import { getSources } from "@/lib/sources";
import { getAllApps } from "@/lib/processor";
import { StoreInterface } from "@/components/store-interface";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const sources = getSources();
  const apps = await getAllApps(sources);

  return (
    <main className="min-h-screen bg-background">
      <StoreInterface apps={apps} sources={sources} />
    </main>
  );
}