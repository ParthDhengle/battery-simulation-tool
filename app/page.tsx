import { BatterySimulationWizard } from "@/components/battery-simulation-wizard"

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-foreground mb-2">Battery Pack Simulation Tool</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Design and test battery packs virtually with physics-based simulation models
          </p>
        </div>
        <BatterySimulationWizard />
      </div>
    </main>
  )
}
