import { BatterySimulationWizard } from "@/components/battery-simulation-wizard"

export default function Home() {
  return (
<main className="min-h-screen bg-background">
  <div className="container mx-auto py-8">
    <div className="mb-8 max-w-6xl mx-auto">
      <div className="flex flex-col items-center md:flex-row md:items-center md:gap-6">
        <img
          src="/logo.svg"  // Ensure this path is correct (in public/ or imported)
          alt="Company Logo"
          className="h-12 w-auto mb-4 md:mb-0"
        />
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-bold text-foreground mb-2">Battery Pack Simulation Tool</h1>
          <p className="text-lg text-muted-foreground">
            Design and test battery packs virtually with physics-based simulation models
          </p>
        </div>
      </div>
    </div>
    <BatterySimulationWizard />
  </div>
</main>
  )
}
