import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Boxes } from 'lucide-react'
import { getSetGroups } from '@/lib/actions/sets'
import { SetsExplorer } from '@/components/sets/sets-explorer'

export const revalidate = 300

export default async function SetsPage() {
  const isDev = process.env.NEXT_PUBLIC_DEVELOPMENT === 'true'
  if (!isDev) redirect('/')

  const { entries, matchedProducts } = await getSetGroups()

  return (
    <main className="min-h-screen bg-background">
      <header className="h-14 border-b border-border/60 flex items-center justify-between px-6 sticky top-0 z-20 bg-gradient-to-b from-background via-background/98 to-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Catalog
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Boxes className="h-5 w-5 text-purple-600" />
          <h1 className="font-semibold">Set Explorer</h1>
          <span className="text-xs text-muted-foreground bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Experimental</span>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6">
        <SetsExplorer entries={entries} matchedProducts={matchedProducts} />
      </div>
    </main>
  )
}
