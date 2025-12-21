"use client"

import { App } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ArrowLeft, Download, Server } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useState } from "react"

export function AppDetails({ app }: { app: App }) {
  const [downloading, setDownloading] = useState(false)

  const handleLocalDownload = async () => {
    try {
      let content = app.dockerComposeContent
      
      if (!content && app.dockerComposePath) {
        const res = await fetch(app.dockerComposePath)
        if (!res.ok) throw new Error("Failed to fetch file")
        content = await res.text()
      }

      if (!content) throw new Error("No content available")

      const blob = new Blob([content], { type: 'text/yaml' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${app.name}-docker-compose.yml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success("Download started")
    } catch (e) {
      toast.error("Failed to download file")
    }
  }

  const handleServerDownload = async () => {
    setDownloading(true)
    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(app)
      })
      
      if (res.ok) {
        const data = await res.json()
        toast.success(`Saved to server at: ${data.path}`)
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save to server")
      }
    } catch (e) {
      toast.error("Error connecting to server")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Store
      </Link>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="aspect-square relative bg-muted rounded-lg overflow-hidden border">
            {app.iconUrl ? (
              <img src={app.iconUrl} alt={app.name} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No Icon</div>
            )}
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div>
            <h1 className="text-4xl font-bold mb-2">{app.name}</h1>
            <p className="text-muted-foreground text-lg whitespace-pre-wrap">
              {app.description || "No description provided for this application."}
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Installation Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleLocalDownload} className="w-full" variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Download docker-compose.yml
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or</span>
                </div>
              </div>

              <Button onClick={handleServerDownload} disabled={downloading} className="w-full">
                <Server className="mr-2 h-4 w-4" />
                {downloading ? "Saving..." : "Download to Server"}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Saves to configured server path
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {app.screenshots && app.screenshots.length > 0 && (
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Screenshots</h2>
          <ScrollArea className="w-full whitespace-nowrap rounded-lg border bg-muted/50 p-4">
            <div className="flex w-max space-x-4">
              {app.screenshots.map((src, i) => (
                <div key={i} className="shrink-0 overflow-hidden rounded-md border shadow-sm bg-background">
                  <img
                    src={src}
                    alt={`${app.name} screenshot ${i + 1}`}
                    className="h-64 w-auto object-contain"
                  />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
