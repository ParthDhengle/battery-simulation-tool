"use client"

import React from "react"
import { DriveCycleBuilder } from "@/components/drive-cycle-builder" // or just inline if in same file

export default function DriveCyclePage() {
  const handleConfigChange = (config: any) => {
    console.log("Config updated:", config)
  }

  const handleNext = () => {
    console.log("Next clicked")
  }

  const handlePrevious = () => {
    console.log("Previous clicked")
  }

  return (
    <DriveCycleBuilder
      onConfigChange={handleConfigChange}
      onNext={handleNext}
      onPrevious={handlePrevious}
    />
  )
}
