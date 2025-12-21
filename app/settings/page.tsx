"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ArrowLeft, Save, Plus, Trash2, Loader2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

export default function SettingsPage() {
  const [entries, setEntries] = useState<{key: string, value: string}[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        const yachtData = data.yacht || {}
        const mapped = Object.entries(yachtData).map(([k, v]) => ({ key: k, value: v as string }))
        setEntries(mapped)
        setLoading(false)
      })
      .catch(() => {
        toast.error("Failed to load settings")
        setLoading(false)
      })
  }, [])

  const handleSave = async () => {
    try {
      const yacht = entries.reduce((acc, curr) => {
         if (curr.key) acc[curr.key] = curr.value
         return acc
      }, {} as Record<string, string>)

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yacht })
      })
      if (res.ok) {
        toast.success("Settings saved successfully")
      } else {
        throw new Error()
      }
    } catch {
      toast.error("Failed to save settings")
    }
  }

  const updateEntry = (index: number, field: 'key' | 'value', val: string) => {
    const newEntries = [...entries]
    newEntries[index][field] = val
    setEntries(newEntries)
  }

  const removeEntry = (index: number) => {
    const newEntries = [...entries]
    newEntries.splice(index, 1)
    setEntries(newEntries)
  }

  const addEntry = () => {
    setEntries([...entries, { key: '', value: '' }])
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Store
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Settings</h1>
        <Button onClick={handleSave}>
          <Save className="mr-2 h-4 w-4" /> Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yacht Template Labels</CardTitle>
          <CardDescription>
            Define default values for variables used in Yacht templates (e.g., !PUID, !config).
            These values will be automatically substituted when generating the Docker Compose file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            {entries.map((entry, index) => (
              <div key={index} className="flex gap-4 items-center">
                <Input 
                  value={entry.key} 
                  onChange={(e) => updateEntry(index, 'key', e.target.value)}
                  placeholder="Label (e.g. !PUID)"
                  className="w-1/3 font-mono"
                />
                <Input 
                  value={entry.value} 
                  onChange={(e) => updateEntry(index, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 font-mono"
                />
                <Button size="icon" variant="ghost" onClick={() => removeEntry(index)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={addEntry} className="w-full">
            <Plus className="mr-2 h-4 w-4" /> Add Label
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
