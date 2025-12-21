"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Play, Square, RefreshCw, Save, Terminal, Trash2 } from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"

interface InstalledApp {
  name: string
  path: string
  valid: boolean
  id?: string
  description?: string
  iconUrl?: string
}

export default function ManagePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/')
    }
  }, [status, router])

  const fetchApps = async () => {
    try {
      const res = await fetch('/api/manage/apps')
      if (res.ok) {
        const data = await res.json()
        setApps(data)
      }
    } catch (e) {
      toast.error("Failed to load apps")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) fetchApps()
  }, [session])

  if (loading || !session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Checking authorization...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Store
          </Link>
          <h1 className="text-3xl font-bold">App Management</h1>
        </div>
        <Button variant="outline" onClick={fetchApps}>
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {apps.length === 0 ? (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">No apps found in the server download directory.</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {apps.map((app) => (
              <AccordionItem key={app.name} value={app.name} className="border rounded-lg px-4 mb-2">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0 border">
                      {app.iconUrl ? (
                        <img src={app.iconUrl} alt={app.name} className="w-full h-full object-contain p-1 bg-white" />
                      ) : (
                        <Terminal className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg truncate">{app.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {app.description || "Local Application"}
                      </p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                  <AppManager appName={app.name} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </div>
  )
}

function AppManager({ appName }: { appName: string }) {
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteImages, setDeleteImages] = useState(false)
  const [deleteVolumes, setDeleteVolumes] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/manage/apps/${appName}`)
      .then(res => res.json())
      .then(data => {
        setContent(data.content || "")
        setLoading(false)
      })
      .catch(() => {
        toast.error("Failed to load compose file")
        setLoading(false)
      })
  }, [appName])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/manage/apps/${appName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      })
      if (res.ok) toast.success("File saved")
      else throw new Error()
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (action: string) => {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/manage/apps/${appName}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      })
      const data = await res.json()
      
      if (res.ok) {
        toast.success(`Action '${action}' completed`)
      } else {
        toast.error(`Action failed: ${data.details || data.error}`)
      }
    } catch {
      toast.error("Action failed")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/manage/apps/${appName}/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deleteImages, deleteVolumes })
      })
      if (res.ok) {
        toast.success("App deleted")
        window.location.reload()
      } else {
        throw new Error()
      }
    } catch {
      toast.error("Failed to delete app")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return (
    <div className="p-12 text-center">
      <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
      <p className="text-sm text-muted-foreground">Loading configuration...</p>
    </div>
  )

  return (
    <div className="pt-2 space-y-6">
      <div className="flex justify-between items-start">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 flex-1 mr-4">
          <Button variant="outline" size="sm" onClick={() => handleAction('up')} disabled={!!actionLoading} className="bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/20">
            <Play className={`mr-2 h-4 w-4 ${actionLoading === 'up' ? 'animate-spin' : ''}`} /> Up
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAction('stop')} disabled={!!actionLoading} className="bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
            <Square className={`mr-2 h-4 w-4 ${actionLoading === 'stop' ? 'animate-spin' : ''}`} /> Stop
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAction('restart')} disabled={!!actionLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${actionLoading === 'restart' ? 'animate-spin' : ''}`} /> Restart
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAction('start')} disabled={!!actionLoading}>
            <Play className={`mr-2 h-4 w-4 ${actionLoading === 'start' ? 'animate-spin' : ''}`} /> Start
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleAction('down')} disabled={!!actionLoading} className="bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/20">
            <Trash2 className={`mr-2 h-4 w-4 ${actionLoading === 'down' ? 'animate-spin' : ''}`} /> Down
          </Button>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> Delete App
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the application files from the server. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="flex flex-col gap-4 py-4">
              <div className="flex items-center space-x-2">
                <Checkbox id="images" checked={deleteImages} onCheckedChange={(c) => setDeleteImages(!!c)} />
                <Label htmlFor="images">Delete Docker Images</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="volumes" checked={deleteVolumes} onCheckedChange={(c) => setDeleteVolumes(!!c)} />
                <Label htmlFor="volumes">Delete Docker Volumes (Data)</Label>
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                {deleting ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">docker-compose.yml</Label>
          <Button size="sm" variant="secondary" onClick={handleSave} disabled={saving}>
            <Save className={`mr-2 h-4 w-4 ${saving ? 'animate-spin' : ''}`} /> Save Config
          </Button>
        </div>
        <Textarea 
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="font-mono text-xs min-h-[400px] bg-slate-950 text-slate-50 resize-y p-4 leading-relaxed"
          spellCheck={false}
        />
      </div>
    </div>
  )
}