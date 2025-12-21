import Link from "next/link"
import Image from "next/image"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { App } from "@/lib/types"
import { FileCode } from "lucide-react"

interface AppCardProps {
  app: App
  sourceName?: string
}

export function AppCard({ app, sourceName }: AppCardProps) {
  return (
    <Card className="flex flex-col h-full hover:shadow-lg transition-shadow">
      <CardHeader className="p-0">
        <div className="aspect-video w-full relative bg-muted flex items-center justify-center overflow-hidden rounded-t-lg">
          {app.iconUrl ? (
            <img 
              src={app.iconUrl} 
              alt={app.name} 
              className="object-cover w-full h-full"
            />
          ) : (
            <FileCode className="h-16 w-16 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex-1 p-4">
        <div className="flex justify-between items-start mb-2 gap-2">
            <CardTitle className="line-clamp-1">{app.name}</CardTitle>
            {sourceName && (
                <Badge variant="outline" className="shrink-0 max-w-[50%] truncate" title={sourceName}>
                    {sourceName}
                </Badge>
            )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {app.description || "No description available."}
        </p>
      </CardContent>
      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full">
          <Link href={`/app/${encodeURIComponent(app.id)}`}>
            View Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  )
}
