"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, Plus, Trash2, Loader2, Moon, Sun, Monitor, Palette } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { useTheme } from "next-themes"

const THEME_COLORS = [
  { name: "Zinc", value: "zinc" },
  { name: "Slate", value: "slate" },
  { name: "Stone", value: "stone" },
  { name: "Gray", value: "gray" },
  { name: "Neutral", value: "neutral" },
  { name: "Red", value: "red" },
  { name: "Rose", value: "rose" },
  { name: "Orange", value: "orange" },
  { name: "Amber", value: "amber" },
  { name: "Yellow", value: "yellow" },
  { name: "Lime", value: "lime" },
  { name: "Green", value: "green" },
  { name: "Emerald", value: "emerald" },
  { name: "Teal", value: "teal" },
  { name: "Cyan", value: "cyan" },
  { name: "Sky", value: "sky" },
  { name: "Blue", value: "blue" },
  { name: "Indigo", value: "indigo" },
  { name: "Violet", value: "violet" },
  { name: "Purple", value: "purple" },
  { name: "Fuchsia", value: "fuchsia" },
  { name: "Pink", value: "pink" },
]

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [entries, setEntries] = useState<{key: string, value: string}[]>([])
  const [disableSaveToServer, setDisableSaveToServer] = useState(false)
  const [themeColor, setThemeColor] = useState("zinc")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Apply theme color class to body for live preview
    const body = document.body
    const currentClasses = Array.from(body.classList)
    currentClasses.forEach(cls => {
      if (cls.startsWith('theme-')) body.classList.remove(cls)
    })
    body.classList.add(`theme-${themeColor}`)
  }, [themeColor])

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        const yachtData = data.yacht || {}
        const mapped = Object.entries(yachtData).map(([k, v]) => ({ key: k, value: v as string }))
        setEntries(mapped)
        setDisableSaveToServer(!!data.disableSaveToServer)
        setThemeColor(data.themeColor || "zinc")
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
        body: JSON.stringify({ yacht, disableSaveToServer, themeColor })
      })
      if (res.ok) {
        toast.success("Settings saved successfully")
        router.refresh()
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

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
            <CardDescription>
              Configure global application behavior.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="disable-save">Disable Save to Server</Label>
                <p className="text-sm text-muted-foreground">
                  Hide the option to save Docker Compose files directly to the server.
                </p>
              </div>
              <Switch
                id="disable-save"
                checked={disableSaveToServer}
                onCheckedChange={setDisableSaveToServer}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize the look and feel of the application.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Theme Mode</Label>
              <div className="flex gap-2">
                <Button 
                  variant={theme === 'light' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setTheme('light')}
                  className="flex-1"
                >
                  <Sun className="mr-2 h-4 w-4" /> Light
                </Button>
                <Button 
                  variant={theme === 'dark' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setTheme('dark')}
                  className="flex-1"
                >
                  <Moon className="mr-2 h-4 w-4" /> Dark
                </Button>
                <Button 
                  variant={theme === 'system' ? 'default' : 'outline'} 
                  size="sm" 
                  onClick={() => setTheme('system')}
                  className="flex-1"
                >
                  <Monitor className="mr-2 h-4 w-4" /> System
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="theme-color">Theme Color</Label>
              <Select value={themeColor} onValueChange={setThemeColor}>
                <SelectTrigger id="theme-color">
                  <Palette className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  {THEME_COLORS.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      {color.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Color changes are applied immediately for preview and saved upon clicking "Save Changes".
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Yacht Template Labels</CardTitle>
            <CardDescription>
              Define default values for variables used in Yacht templates.
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
    </div>
  )
}
