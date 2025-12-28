"use client"

import { App, Source } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowLeft, Download, Server, Loader2, FileCode, Settings2, AlertCircle, Trash2, Plus, Ship } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import yaml from 'js-yaml'
import { generateTrueNASValues } from "@/lib/truenas"

export function AppDetails({ app, variants, sources }: { app: App, variants?: App[], sources?: Source[] }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [content, setContent] = useState(app.dockerComposeContent || "")
  const [loadingContent, setLoadingContent] = useState(!app.dockerComposeContent && !!app.dockerComposePath)
  const [settings, setSettings] = useState<any>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(setSettings)
      .catch(() => {})
  }, [])

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

  const getSourceName = (sourceId: string) => {
    const source = sources?.find(s => s.id === sourceId)
    if (!source) return "Unknown Source"
    if (source.name) return source.name
    try {
        const url = new URL(source.url)
        if (source.type === 'zip') {
            const parts = source.url.split('/')
            return parts[parts.length - 1]
        }
        return url.hostname
    } catch {
        return source.url
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
          <div className="flex flex-col gap-4">
             <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-4xl font-bold hidden md:block">{app.name}</h1>
                  <h1 className="text-3xl font-bold md:hidden">{app.name}</h1>
                </div>
                {variants && variants.length > 1 && (
                  <div className="flex items-center gap-2">
                     <Label className="whitespace-nowrap text-xs text-muted-foreground">Source:</Label>
                     <Select value={app.id} onValueChange={(val) => router.push(`/app/${encodeURIComponent(val)}`)}>
                       <SelectTrigger className="w-[180px]">
                         <SelectValue />
                       </SelectTrigger>
                       <SelectContent>
                         {variants.map(v => (
                           <SelectItem key={v.id} value={v.id}>
                             {getSourceName(v.sourceId)}
                           </SelectItem>
                         ))}
                       </SelectContent>
                     </Select>
                  </div>
                )}
             </div>
             <p className="text-muted-foreground whitespace-pre-wrap md:hidden">
                {app.description || "No description provided."}
             </p>
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
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="form">
                      <Settings2 className="w-4 h-4 mr-2" /> Easy Setup
                    </TabsTrigger>
                    <TabsTrigger value="code">
                      <FileCode className="w-4 h-4 mr-2" /> Raw YAML
                    </TabsTrigger>
                    <TabsTrigger value="truenas">
                      <Ship className="w-4 h-4 mr-2" /> TrueNAS
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
                        Edits here will be reflected in the Easy Setup and TrueNAS tabs.
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="truenas" className="mt-4">
                    <TrueNASTemplate content={content} appName={app.name} />
                  </TabsContent>
                </Tabs>
              )}

              <div className="pt-4 space-y-4">
                <div className={`grid gap-4 ${session && !settings?.disableSaveToServer ? 'grid-cols-2' : 'grid-cols-1'}`}>
                  <Button onClick={handleLocalDownload} variant="outline" className="w-full">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  {session && !settings?.disableSaveToServer && (
                    <Button onClick={handleServerDownload} disabled={downloading} className="w-full">
                      {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Server className="mr-2 h-4 w-4" />}
                      Save to Server
                    </Button>
                  )}
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

function TrueNASTemplate({ content, appName }: { content: string, appName: string }) {
  const [truenasYaml, setTruenasYaml] = useState("")

  useEffect(() => {
    setTruenasYaml(generateTrueNASValues(content))
  }, [content])

  const handleDownload = () => {
    const blob = new Blob([truenasYaml], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${appName}-truenas-values.yaml`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success("TrueNAS template downloaded")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>TrueNAS SCALE Values Template</Label>
        <Button size="sm" variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" /> Download YAML
        </Button>
      </div>
      <Textarea
        readOnly
        value={truenasYaml}
        className="font-mono text-xs h-[400px] bg-slate-900 text-slate-100"
      />
      <p className="text-xs text-muted-foreground">
        This template is generated from the current Docker Compose configuration and follows the standard TrueNAS SCALE App structure.
      </p>
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
  }, [content]) 

  const updateService = (serviceName: string, key: string, value: any) => {
    if (!parsed || !parsed.services) return
    const newParsed = JSON.parse(JSON.stringify(parsed))
    if (newParsed.services[serviceName]) {
      newParsed.services[serviceName][key] = value
      
      // Auto-manage top-level volumes for named volumes
      const namedVolumes = new Set<string>();
      Object.values(newParsed.services).forEach((svc: any) => {
          if (svc.volumes && Array.isArray(svc.volumes)) {
              svc.volumes.forEach((v: any) => {
                  if (typeof v === 'string') {
                      const hostPart = v.split(':')[0];
                      if (hostPart && !hostPart.startsWith('.') && !hostPart.startsWith('/') && !hostPart.startsWith('~')) {
                          namedVolumes.add(hostPart);
                      }
                  }
              });
          }
      });

      if (namedVolumes.size > 0) {
          newParsed.volumes = newParsed.volumes || {};
          namedVolumes.forEach(v => {
              if (!newParsed.volumes[v]) {
                  newParsed.volumes[v] = {};
              }
          });
      }

      const newYaml = yaml.dump(newParsed)
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
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-6">
        {Object.entries(parsed.services).map(([serviceName, service]: [string, any]) => (
          <div key={serviceName} className="border rounded-lg p-4 space-y-6">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              {serviceName}
            </h3>
            
            <div className="grid gap-2">
              <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Image</Label>
              <Input 
                value={service.image || ""} 
                onChange={(e) => updateService(serviceName, 'image', e.target.value)}
                className="font-mono text-sm"
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Container Name</Label>
              <Input 
                value={service.container_name || ""} 
                onChange={(e) => updateService(serviceName, 'container_name', e.target.value)}
                className="font-mono text-sm"
                placeholder={serviceName}
              />
            </div>

            <div className="grid gap-2">
              <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Restart Policy</Label>
              <Select 
                value={service.restart || "no"} 
                onValueChange={(val) => updateService(serviceName, 'restart', val)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="no">No</SelectItem>
                  <SelectItem value="always">Always</SelectItem>
                  <SelectItem value="on-failure">On Failure</SelectItem>
                  <SelectItem value="unless-stopped">Unless Stopped</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
               <Switch 
                 checked={!!service.privileged} 
                 onCheckedChange={(c) => updateService(serviceName, 'privileged', c)} 
               />
               <Label className="text-sm font-medium">Privileged Mode</Label>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Environment Variables</Label>
                <Button size="sm" variant="ghost" onClick={() => {
                   const currentEnv = service.environment || {};
                   let newEnv = { ...currentEnv };
                   if (Array.isArray(currentEnv)) {
                       newEnv = currentEnv.reduce((acc: any, curr: string) => {
                           const [k, v] = curr.split('=');
                           acc[k] = v;
                           return acc;
                       }, {});
                   }
                   newEnv["NEW_VAR"] = "";
                   updateService(serviceName, 'environment', newEnv);
                }}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {service.environment ? (
                <div className="grid gap-3">
                  {Array.isArray(service.environment) ? (
                    service.environment.map((env: string, idx: number) => {
                       const [key, val] = env.split('=')
                       return (
                         <div key={idx} className="flex gap-2 items-center">
                           <Input 
                             value={key} 
                             onChange={(e) => {
                                const newEnv = [...service.environment];
                                newEnv[idx] = `${e.target.value}=${val || ''}`;
                                updateService(serviceName, 'environment', newEnv);
                             }}
                             className="w-1/3 bg-muted font-mono text-xs" 
                           />
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
                           <Button size="icon" variant="ghost" onClick={() => {
                               const newEnv = service.environment.filter((_: any, i: number) => i !== idx);
                               updateService(serviceName, 'environment', newEnv);
                           }}>
                             <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                         </div>
                       )
                    })
                  ) : (
                    Object.entries(service.environment).map(([key, val]) => (
                      <div key={key} className="flex gap-2 items-center">
                         <Input 
                           value={key} 
                           onChange={(e) => {
                              const newEnv = { ...service.environment };
                              delete newEnv[key];
                              newEnv[e.target.value] = val;
                              updateService(serviceName, 'environment', newEnv);
                           }}
                           className="w-1/3 bg-muted font-mono text-xs" 
                         />
                         <span className="text-muted-foreground">=</span>
                         <Input 
                            value={String(val)} 
                            onChange={(e) => {
                              const newEnv = { ...service.environment, [key]: e.target.value }
                              updateService(serviceName, 'environment', newEnv)
                            }}
                            className="font-mono text-xs"
                         />
                         <Button size="icon" variant="ghost" onClick={() => {
                             const newEnv = { ...service.environment };
                             delete newEnv[key];
                             updateService(serviceName, 'environment', newEnv);
                         }}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No environment variables defined.</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Port Mappings</Label>
                <Button size="sm" variant="ghost" onClick={() => {
                    const newPorts = [...(service.ports || []), "80:80"];
                    updateService(serviceName, 'ports', newPorts);
                }}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {service.ports ? (
                 <div className="grid gap-3">
                   {service.ports.map((port: string | number, idx: number) => {
                     const portStr = String(port)
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
                             className="font-mono text-sm"
                             placeholder="Random"
                           />
                         </div>
                         <span className="text-muted-foreground">:</span>
                         <div className="flex-1 flex items-center gap-2">
                           <Label className="text-xs text-muted-foreground">Container</Label>
                           <Input 
                             value={containerPort} 
                             onChange={(e) => {
                               const newPorts = [...service.ports]
                               newPorts[idx] = `${hostPort}:${e.target.value}`
                               updateService(serviceName, 'ports', newPorts)
                             }}
                             className="font-mono text-sm bg-background" 
                           />
                         </div>
                         <Button size="icon" variant="ghost" onClick={() => {
                             const newPorts = service.ports.filter((_: any, i: number) => i !== idx);
                             updateService(serviceName, 'ports', newPorts);
                         }}>
                           <Trash2 className="h-4 w-4 text-destructive" />
                         </Button>
                       </div>
                     )
                   })}
                 </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No ports exposed.</p>
              )}
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase text-muted-foreground font-semibold tracking-wider">Volumes</Label>
                <Button size="sm" variant="ghost" onClick={() => {
                    const newVols = [...(service.volumes || []), "./data:/data"];
                    updateService(serviceName, 'volumes', newVols);
                }}>
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {service.volumes ? (
                 <div className="grid gap-3">
                   {service.volumes.map((vol: string | any, idx: number) => {
                     const volStr = typeof vol === 'string' ? vol : JSON.stringify(vol);
                     const isComplex = typeof vol !== 'string';
                     
                     if (isComplex) {
                         return <div key={idx} className="text-xs text-muted-foreground italic">Complex volume definition (Raw edit required)</div>;
                     }

                     const parts = volStr.split(':');
                     const hostPart = parts[0];
                     const containerPath = parts.slice(1).join(':');
                     const isNamed = Boolean(hostPart && !hostPart.startsWith('.') && !hostPart.startsWith('/') && !hostPart.startsWith('~'));

                     return (
                       <div key={idx} className="flex flex-col gap-2 p-2 border rounded bg-muted/5">
                         <div className="flex gap-2 items-center">
                           <Input 
                             value={hostPart}
                             onChange={(e) => {
                                 const newVols = [...service.volumes];
                                 newVols[idx] = `${e.target.value}:${containerPath}`;
                                 updateService(serviceName, 'volumes', newVols);
                             }} 
                             placeholder={isNamed ? "Volume Name" : "Host Path"} 
                             className="flex-1 font-mono text-sm" 
                           />
                           <span className="text-muted-foreground">:</span>
                           <Input 
                             value={containerPath} 
                             onChange={(e) => {
                                 const newVols = [...service.volumes];
                                 newVols[idx] = `${hostPart}:${e.target.value}`;
                                 updateService(serviceName, 'volumes', newVols);
                             }} 
                             placeholder="Container Path" 
                             className="flex-1 font-mono text-sm" 
                           />
                           <Button size="icon" variant="ghost" onClick={() => {
                               const newVols = service.volumes.filter((_: any, i: number) => i !== idx);
                               updateService(serviceName, 'volumes', newVols);
                           }}>
                             <Trash2 className="h-4 w-4 text-destructive" />
                           </Button>
                         </div>
                         <div className="flex items-center space-x-2">
                            <Checkbox 
                                id={`named-${idx}`} 
                                checked={isNamed} 
                                onCheckedChange={(checked) => {
                                    const newVols = [...service.volumes];
                                    let newHost = hostPart;
                                    if (checked && (newHost.startsWith('.') || newHost.startsWith('/'))) {
                                        newHost = newHost.replace(/^[\.\/]+/, '');
                                    } else if (!checked && !newHost.startsWith('.') && !newHost.startsWith('/')) {
                                        newHost = `./${newHost}`;
                                    }
                                    newVols[idx] = `${newHost}:${containerPath}`;
                                    updateService(serviceName, 'volumes', newVols);
                                }}
                            />
                            <Label htmlFor={`named-${idx}`} className="text-xs text-muted-foreground">Is Docker Volume (Named)</Label>
                         </div>
                       </div>
                     )
                   })}
                 </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">No volumes defined.</p>
              )}
            </div>

          </div>
        ))}
      </div>
    </ScrollArea>
  )
}