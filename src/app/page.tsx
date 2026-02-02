export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          MedCatalog
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          Medical Product Price Comparison
        </p>
        <div className="p-6 bg-muted rounded-md border border-border">
          <p className="text-sm text-muted-foreground">
            Catalog coming soon. Configure Supabase credentials to get started.
          </p>
        </div>
      </div>
    </main>
  );
}
