"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { App, Source } from "@/lib/types"
import { AppCard } from "./app-card"
import { SourceManager } from "./source-manager"
import { Input } from "./ui/input"
import { Search } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface StoreInterfaceProps {
  apps: App[]
  sources: Source[]
}

export function StoreInterface({ apps, sources }: StoreInterfaceProps) {
  const router = useRouter()
  const [search, setSearch] = useState("")
  const [selectedSource, setSelectedSource] = useState<string>("all")

  const filteredApps = apps.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(search.toLowerCase()) ||
    (app.description && app.description.toLowerCase().includes(search.toLowerCase()))
    
    const matchesSource = selectedSource === "all" || app.sourceId === selectedSource

    return matchesSearch && matchesSource
  })

  const handleUpdate = () => {
    router.refresh()
  }

  const getSourceName = (source: Source) => {
    if (source.name) return source.name
    try {
      const url = new URL(source.url)
      // Return simpler name: domain or filename
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
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col gap-6 mb-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <h1 className="text-3xl font-bold">Docker App Store</h1>
          <SourceManager onUpdate={handleUpdate} />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search apps..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          
          <Select value={selectedSource} onValueChange={setSelectedSource}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filter by Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              {sources.map(source => (
                <SelectItem key={source.id} value={source.id}>
                  {getSourceName(source)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {apps.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground border-2 border-dashed rounded-lg">
          <p className="text-lg mb-2">No apps found.</p>
          <p className="text-sm">Add a Source URL (JSON or ZIP) to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredApps.map(app => {
            const source = sources.find(s => s.id === app.sourceId)
            return (
              <AppCard 
                key={app.id} 
                app={app} 
                sourceName={source ? getSourceName(source) : undefined} 
              />
            )
          })}
        </div>
      )}
    </div>
  )
}