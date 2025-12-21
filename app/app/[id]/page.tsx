import { getSources } from "@/lib/sources";
import { getAllApps } from "@/lib/processor";
import { AppDetails } from "@/components/app-details";
import { notFound } from "next/navigation";

export const dynamic = 'force-dynamic';

export default async function AppFromPage({ params }: { params: Promise<{ id: string }> }) {
  // Await params as required by Next.js 15+ convention for dynamic routes
  const { id } = await params;
  const decodedId = decodeURIComponent(id);
  
  const sources = getSources();
  const apps = await getAllApps(sources);
  
  const app = apps.find(a => a.id === decodedId);

  if (!app) {
    notFound();
  }

  const variants = apps.filter(a => a.name === app.name);

  return <AppDetails app={app} variants={variants} sources={sources} />;
}