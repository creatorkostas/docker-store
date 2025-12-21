"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Trash2, RefreshCw, Plus, Ship, Pencil, X } from "lucide-react"

type Source = {
  id: string
  url: string
  type: 'zip' | 'json'
  status?: string
  lastUpdated?: string
  error?: string
  isYacht?: boolean
  isCasaOS?: boolean
}

export function SourceManager({ onUpdate }: { onUpdate: () => void }) {
  const [sources, setSources] = useState<Source[]>([])
  const [newUrl, setNewUrl] = useState("")
  const [isYacht, setIsYacht] = useState(false)
  const [isCasaOS, setIsCasaOS] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchSources = async () => {
    try {
      const res = await fetch('/api/sources')
      if (res.ok) {
        const data = await res.json()
        setSources(data)
      }
    } catch (e) {
      toast.error("Failed to load sources")
    }
  }

  useEffect(() => {
    if (open) fetchSources()
  }, [open])

  const startEdit = (source: Source) => {
    setNewUrl(source.url)
    setIsYacht(!!source.isYacht)
    setIsCasaOS(!!source.isCasaOS)
    setEditingId(source.id)
  }

  const cancelEdit = () => {
    setNewUrl("")
    setIsYacht(false)
    setIsCasaOS(false)
    setEditingId(null)
  }

  const handleSaveSource = async () => {
    if (!newUrl) return
    setLoading(true)
    try {
      const method = editingId ? 'PUT' : 'POST'
      const body: any = { url: newUrl, isYacht, isCasaOS }
      if (editingId) body.id = editingId

      const res = await fetch('/api/sources', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      
      if (res.ok) {
        toast.success(editingId ? "Source updated" : "Source added")
        cancelEdit()
        fetchSources()
        onUpdate()
      } else {
        const err = await res.json()
        toast.error(err.error || "Operation failed")
      }
    } catch (e) {
      toast.error("Error saving source")
    } finally {
      setLoading(false)
    }
  }

  const deleteSource = async (id: string) => {
    try {
      const res = await fetch(`/api/sources?id=${id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success("Source removed")
        fetchSources()
        onUpdate()
      }
    } catch (e) {
      toast.error("Failed to remove source")
    }
  }

  const refreshSource = async (id: string) => {
    try {
      toast.info("Refreshing source...")
      const res = await fetch(`/api/sources/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      })
      if (res.ok) {
        toast.success("Source refreshed")
        fetchSources()
        onUpdate()
      } else {
        toast.error("Failed to refresh")
      }
    } catch (e) {
      toast.error("Error refreshing source")
    }
  }

  return (
    <Dialog open={open} onOpenChange={(val) => { setOpen(val); if(!val) cancelEdit(); }}>
      <DialogTrigger asChild>
        <Button variant="outline">Manage Sources</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Manage App Sources</DialogTitle>
          <DialogDescription>
            Add or edit URLs for JSON app lists or ZIP files.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="flex flex-col gap-4 border p-4 rounded-md bg-muted/20">
            <div className="flex items-end gap-2">
              <div className="grid w-full gap-1.5">
                <Label htmlFor="url">Source URL</Label>
                <Input 
                  id="url" 
                  placeholder="https://example.com/apps.zip" 
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                />
              </div>
              <Button onClick={handleSaveSource} disabled={loading}>
                {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : (editingId ? <RefreshCw className="h-4 w-4" /> : <Plus className="h-4 w-4" />)}
              </Button>
              {editingId && (
                <Button variant="ghost" onClick={cancelEdit}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                 <Switch id="yacht-mode" checked={isYacht} onCheckedChange={(c) => { setIsYacht(c); if(c) setIsCasaOS(false); }} />
                 <Label htmlFor="yacht-mode" className="flex items-center gap-2">
                   Is Yacht Template? <Badge variant="outline" className="text-[10px] h-5">JSON Only</Badge>
                 </Label>
              </div>
              <div className="flex items-center space-x-2">
                 <Switch id="casaos-mode" checked={isCasaOS} onCheckedChange={(c) => { setIsCasaOS(c); if(c) setIsYacht(false); }} />
                 <Label htmlFor="casaos-mode" className="flex items-center gap-2">
                   Is CasaOS App? <Badge variant="outline" className="text-[10px] h-5">ZIP Only</Badge>
                 </Label>
              </div>
            </div>
          </div>

          <div className="border rounded-md">
            <ScrollArea className="h-[300px] p-4">
              {sources.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  No sources added yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {sources.map((source) => (
                    <div key={source.id} className={`flex items-center justify-between space-x-4 border-b pb-4 last:border-0 last:pb-0 ${editingId === source.id ? 'bg-muted/50 -mx-2 px-2 rounded-md' : ''}`}>
                      <div className="space-y-1 overflow-hidden min-w-0 flex-1">
                        <p className="text-sm font-medium leading-none truncate" title={source.url}>
                          {source.url}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary">{source.type.toUpperCase()}</Badge>
                          {source.isYacht && <Badge variant="default" className="bg-blue-600 hover:bg-blue-700">Yacht</Badge>}
                          {source.isCasaOS && <Badge variant="default" className="bg-teal-600 hover:bg-teal-700">CasaOS</Badge>}
                          <span>
                            {source.status === 'success' ? 'Active' : source.status}
                          </span>
                          {source.lastUpdated && (
                             <span>• {new Date(source.lastUpdated).toLocaleDateString()}</span>
                          )}
                        </div>
                        {source.error && (
                          <p className="text-xs text-red-500">{source.error}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(source)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {source.type === 'zip' && (
                          <Button size="icon" variant="ghost" onClick={() => refreshSource(source.id)}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="destructive" onClick={() => deleteSource(source.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}