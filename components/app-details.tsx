"use client"

import { App } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Download, Server, Loader2, FileCode, Settings2, AlertCircle } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import yaml from 'js-yaml'

export function AppDetails({ app }: { app: App }) {
  const [downloading, setDownloading] = useState(false)
  const [content, setContent] = useState(app.dockerComposeContent || "")
  const [loadingContent, setLoadingContent] = useState(!app.dockerComposeContent && !!app.dockerComposePath)

  useEffect(() => {
    if (!app.dockerComposeContent && app.dockerComposePath) {
      setLoadingContent(true)
      fetch(app.dockerComposePath)
        .then(res => res.text())
        .then(text => {
          setContent(text)
          setLoadingContent(false)
        })
        .catch(() => {
           toast.error("Failed to load docker-compose.yml")
           setLoadingContent(false)
        })
    }
  }, [app.dockerComposePath, app.dockerComposeContent])

  const handleLocalDownload = async () => {
    try {
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
        body: JSON.stringify({
          ...app,
          dockerComposeContent: content
        })
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
        <div className="md:col-span-1 space-y-6">
          <div className="aspect-square relative bg-white rounded-lg overflow-hidden border">
            {app.iconUrl ? (
              <img src={app.iconUrl} alt={app.name} className="w-full h-full object-contain p-8" />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">No Icon</div>
            )}
          </div>
          
          <div className="hidden md:block">
             <h3 className="font-semibold mb-2">About</h3>
             <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {app.description || "No description provided."}
             </p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-6">
          <div className="md:hidden">
            <h1 className="text-4xl font-bold mb-2">{app.name}</h1>
            <p className="text-muted-foreground whitespace-pre-wrap mb-4">
               {app.description || "No description provided."}
            </p>
          </div>
          <div className="hidden md:block">
             <h1 className="text-4xl font-bold">{app.name}</h1>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>
                Customize the application settings before installing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {loadingContent ? (
                  <div className="h-[300px] w-full border rounded-md flex items-center justify-center bg-muted/50">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
              ) : (
                <Tabs defaultValue="form" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="form">
                      <Settings2 className="w-4 h-4 mr-2" /> Easy Setup
                    </TabsTrigger>
                    <TabsTrigger value="code">
                      <FileCode className="w-4 h-4 mr-2" /> Raw YAML
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="form" className="mt-4">
                    <ComposeForm content={content} onChange={setContent} />
                  </TabsContent>
                  
                  <TabsContent value="code" className="mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="compose-editor">docker-compose.yml</Label>
                      <Textarea
                        id="compose-editor"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="font-mono text-sm h-[400px] resize-y bg-slate-950 text-slate-50"
                        spellCheck={false}
                      />
                      <p className="text-xs text-muted-foreground">
                        Edits here will be reflected in the Easy Setup tab (if valid YAML).
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              )}

              <div className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Button onClick={handleLocalDownload} variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button onClick={handleServerDownload} disabled={downloading} className="w-full">
                    {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                    Save to Server
                  </Button>
                </div>
              </div>
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

function ComposeForm({ content, onChange }: { content: string, onChange: (s: string) => void }) {
  const [parsed, setParsed] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const obj = yaml.load(content)
      if (obj && typeof obj === 'object') {
        setParsed(obj)
        setError(null)
      } else {
        throw new Error("Invalid format")
      }
    } catch (e) {
      setError("Unable to parse YAML configuration. Please use the Raw YAML editor.")
    }
  }, [content]) // Note: This might cause re-renders if onChange updates content, but we need to sync.
  // Actually, if we update content via onChange, this effect runs again. 
  // We need to ensure that the new content produces a stable object to avoid flickering if possible.
  // But since we replace the whole object on edit, it's fine.

  const updateService = (serviceName: string, key: string, value: any) => {
    if (!parsed || !parsed.services) return
    const newParsed = JSON.parse(JSON.stringify(parsed))
    if (newParsed.services[serviceName]) {
      newParsed.services[serviceName][key] = value
      const newYaml = yaml.dump(newParsed)
      // This will trigger the effect above, but that's okay.
      onChange(newYaml)
    }
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center p-4 border rounded-md border-red-200 bg-red-50 text-red-800">
        <AlertCircle className="h-8 w-8 mb-2" />
        <p>{error}</p>
        <p className="text-sm mt-2 text-red-600">Switch to "Raw YAML" to fix syntax errors.</p>
      </div>
    )
  }

  if (!parsed || !parsed.services) {
    return <div className="p-4 text-center text-muted-foreground">No services found in configuration.</div>
  }

  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="space-y-6">
        {Object.entries(parsed.services).map(([serviceName, service]: [string, any]) => (
          <div key={serviceName} className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {serviceName}
            </h3>
            
            {/* Environment Variables */}
            <div className="space-y-3">
              <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Environment Variables</Label>
              {service.environment ? (
                <div className="grid gap-3">
                  {Array.isArray(service.environment) ? (
                    service.environment.map((env: string, idx: number) => {
                       const [key, val] = env.split('=')
                       return (
                         <div key={idx} className="flex gap-2 items-center">
                           <Input value={key} disabled className="w-1/3 bg-muted font-mono text-xs" />
                           <span className="text-muted-foreground">=</span>
                           <Input 
                              value={val || ""} 
                              onChange={(e) => {
                                const newEnv = [...service.environment]
                                newEnv[idx] = `${key}=${e.target.value}`
                                updateService(serviceName, 'environment', newEnv)
                              }}
                              className="font-mono text-xs"
                           />
                         </div>
                       )
                    })
                  ) : (
                    Object.entries(service.environment).map(([key, val]) => (
                      <div key={key} className="flex gap-2 items-center">
                         <Input value={key} disabled className="w-1/3 bg-muted font-mono text-xs" />
                         <span className="text-muted-foreground">=</span>
                         <Input 
                            value={String(val)} 
                            onChange={(e) => {
                              const newEnv = { ...service.environment, [key]: e.target.value }
                              updateService(serviceName, 'environment', newEnv)
                            }}
                            className="font-mono text-xs"
                         />
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No environment variables defined.</p>
              )}
            </div>

            {/* Ports */}
            <div className="space-y-3">
              <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Port Mappings</Label>
              {service.ports ? (
                 <div className="grid gap-3">
                   {service.ports.map((port: string | number, idx: number) => {
                     const portStr = String(port)
                     // Handle "80:80" or "80"
                     const parts = portStr.split(':')
                     const hostPort = parts.length > 1 ? parts[0] : ""
                     const containerPort = parts.length > 1 ? parts[1] : parts[0]
                     
                     return (
                       <div key={idx} className="flex gap-2 items-center">
                         <div className="flex-1 flex items-center gap-2">
                           <Label className="text-xs text-muted-foreground">Host</Label>
                           <Input 
                             value={hostPort} 
                             onChange={(e) => {
                               const newPorts = [...service.ports]
                               newPorts[idx] = `${e.target.value}:${containerPort}`
                               updateService(serviceName, 'ports', newPorts)
                             }}
                             className="font-mono text-xs"
                             placeholder="Random"
                           />
                         </div>
                         <span className="text-muted-foreground">:</span>
                         <div className="flex-1 flex items-center gap-2">
                           <Label className="text-xs text-muted-foreground">Container</Label>
                           <Input value={containerPort} disabled className="bg-muted font-mono text-xs" />
                         </div>
                       </div>
                     )
                   })}
                 </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No ports exposed.</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
