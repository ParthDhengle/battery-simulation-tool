"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { AlertCircle, TrendingUp, Thermometer } from "lucide-react"

interface SubCycleStep {
  value: string
  isDynamic: boolean
  unit: "A" | "C" | "W" | "V"
  duration: number
  triggerCondition?: string
  repetitions: number
}

interface SubCycle {
  id: string
  name: string
  steps: SubCycleStep[]
}

interface DriveCycleSegment {
  subCycleId: string
  repetitions: number
  ambientTemp: number
  triggerCondition?: string
}

interface DriveCycle {
  id: string
  name: string
  segments: DriveCycleSegment[]
}

interface CalendarRule {
  months: string // comma-separated, e.g., "1,2,3"
  filterType: "weekday" | "date"
  daysOrDates: string // comma-separated, e.g., "Mon,Tue" or "1,15,30"
  driveCycleId: string
}

interface DriveCycleBuilderProps {
  onConfigChange: (config: any) => void
  onNext: () => void
  onPrevious: () => void
}

export function DriveCycleBuilder({ onConfigChange, onNext, onPrevious }: DriveCycleBuilderProps) {
  const [activeTab, setActiveTab] = useState("subcycle")
  const [subCycles, setSubCycles] = useState<SubCycle[]>([])
  const [currentSubCycleId, setCurrentSubCycleId] = useState("")
  const [currentSubCycleName, setCurrentSubCycleName] = useState("")
  const [currentSubCycleSteps, setCurrentSubCycleSteps] = useState<SubCycleStep[]>([])
  const [driveCycles, setDriveCycles] = useState<DriveCycle[]>([])
  const [currentDriveCycleId, setCurrentDriveCycleId] = useState("")
  const [currentDriveCycleName, setCurrentDriveCycleName] = useState("")
  const [currentDriveCycleSegments, setCurrentDriveCycleSegments] = useState<DriveCycleSegment[]>([])
  const [calendarRules, setCalendarRules] = useState<CalendarRule[]>([])
  const [newRuleMonths, setNewRuleMonths] = useState("")
  const [newRuleFilterType, setNewRuleFilterType] = useState<"weekday" | "date">("weekday")
  const [newRuleDaysOrDates, setNewRuleDaysOrDates] = useState("")
  const [newRuleDriveCycleId, setNewRuleDriveCycleId] = useState("")
  const [defaultDriveCycleId, setDefaultDriveCycleId] = useState("")
  const [startingSoc, setStartingSoc] = useState("80")
  const [error, setError] = useState("")

  // Sub-Cycle Handlers
  const addSubCycleStep = () => {
    setCurrentSubCycleSteps([
      ...currentSubCycleSteps,
      { value: "", isDynamic: false, unit: "A", duration: 0, repetitions: 1 },
    ])
  }

  const updateSubCycleStep = (index: number, field: keyof SubCycleStep, value: any) => {
    const updatedSteps = [...currentSubCycleSteps]
    updatedSteps[index] = { ...updatedSteps[index], [field]: value }
    setCurrentSubCycleSteps(updatedSteps)
  }

  const removeSubCycleStep = (index: number) => {
    setCurrentSubCycleSteps(currentSubCycleSteps.filter((_, i) => i !== index))
  }

  const saveSubCycle = () => {
    if (!currentSubCycleId || !currentSubCycleName || currentSubCycleSteps.length === 0) {
      setError("Sub-cycle ID, name, and at least one step are required")
      return
    }
    if (subCycles.some((sc) => sc.id === currentSubCycleId)) {
      setSubCycles(subCycles.map((sc) => (sc.id === currentSubCycleId ? { id: currentSubCycleId, name: currentSubCycleName, steps: currentSubCycleSteps } : sc)))
    } else {
      setSubCycles([...subCycles, { id: currentSubCycleId, name: currentSubCycleName, steps: currentSubCycleSteps }])
    }
    resetSubCycleForm()
  }

  const loadSubCycle = (id: string) => {
    const sc = subCycles.find((sc) => sc.id === id)
    if (sc) {
      setCurrentSubCycleId(sc.id)
      setCurrentSubCycleName(sc.name)
      setCurrentSubCycleSteps(sc.steps)
    }
  }

  const resetSubCycleForm = () => {
    setCurrentSubCycleId("")
    setCurrentSubCycleName("")
    setCurrentSubCycleSteps([])
  }

  // Drive Cycle Handlers
  const addDriveCycleSegment = () => {
    setCurrentDriveCycleSegments([
      ...currentDriveCycleSegments,
      { subCycleId: "", repetitions: 1, ambientTemp: 25 },
    ])
  }

  const updateDriveCycleSegment = (index: number, field: keyof DriveCycleSegment, value: any) => {
    const updatedSegments = [...currentDriveCycleSegments]
    updatedSegments[index] = { ...updatedSegments[index], [field]: value }
    setCurrentDriveCycleSegments(updatedSegments)
  }

  const removeDriveCycleSegment = (index: number) => {
    setCurrentDriveCycleSegments(currentDriveCycleSegments.filter((_, i) => i !== index))
  }

  const saveDriveCycle = () => {
    if (!currentDriveCycleId || !currentDriveCycleName || currentDriveCycleSegments.length === 0) {
      setError("Drive cycle ID, name, and at least one segment are required")
      return
    }
    if (driveCycles.some((dc) => dc.id === currentDriveCycleId)) {
      setDriveCycles(driveCycles.map((dc) => (dc.id === currentDriveCycleId ? { id: currentDriveCycleId, name: currentDriveCycleName, segments: currentDriveCycleSegments } : dc)))
    } else {
      setDriveCycles([...driveCycles, { id: currentDriveCycleId, name: currentDriveCycleName, segments: currentDriveCycleSegments }])
    }
    resetDriveCycleForm()
  }

  const loadDriveCycle = (id: string) => {
    const dc = driveCycles.find((dc) => dc.id === id)
    if (dc) {
      setCurrentDriveCycleId(dc.id)
      setCurrentDriveCycleName(dc.name)
      setCurrentDriveCycleSegments(dc.segments)
    }
  }

  const resetDriveCycleForm = () => {
    setCurrentDriveCycleId("")
    setCurrentDriveCycleName("")
    setCurrentDriveCycleSegments([])
  }

  // Calendar Rule Handlers
  const addCalendarRule = () => {
    if (!newRuleMonths || !newRuleDaysOrDates || !newRuleDriveCycleId) {
      setError("All fields are required for a calendar rule")
      return
    }
    setCalendarRules([
      ...calendarRules,
      {
        months: newRuleMonths,
        filterType: newRuleFilterType,
        daysOrDates: newRuleDaysOrDates,
        driveCycleId: newRuleDriveCycleId,
      },
    ])
    resetRuleForm()
  }

  const removeCalendarRule = (index: number) => {
    setCalendarRules(calendarRules.filter((_, i) => i !== index))
  }

  const resetRuleForm = () => {
    setNewRuleMonths("")
    setNewRuleFilterType("weekday")
    setNewRuleDaysOrDates("")
    setNewRuleDriveCycleId("")
  }

  const isValid = () => {
    return subCycles.length > 0 && driveCycles.length > 0 && calendarRules.length > 0 && defaultDriveCycleId && startingSoc
  }

  const handleNextClick = () => {
    setError("")
    if (isValid()) {
      const config = {
        subCycles,
        driveCycles,
        calendarRules,
        defaultDriveCycleId,
        startingSoc: Number.parseFloat(startingSoc),
      }
      console.log('Generated drive cycle configuration:', config);
      onConfigChange(config)
      onNext()
    } else {
      setError("Please complete all levels: sub-cycles, drive cycles, calendar rules, default DC, and starting SOC")
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Drive Cycle Builder
          </CardTitle>
          <CardDescription>Build complex usage schedules from sub-cycles to full calendar assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="subcycle">1. Sub-Cycles</TabsTrigger>
              <TabsTrigger value="drivecycle">2. Drive Cycles</TabsTrigger>
              <TabsTrigger value="calendar">3. Calendar Assignment</TabsTrigger>
            </TabsList>

            <TabsContent value="subcycle" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subcycle-id">Sub-Cycle ID</Label>
                  <Input id="subcycle-id" value={currentSubCycleId} onChange={(e) => setCurrentSubCycleId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subcycle-name">Name</Label>
                  <Input id="subcycle-name" value={currentSubCycleName} onChange={(e) => setCurrentSubCycleName(e.target.value)} />
                </div>
              </div>
              <Button onClick={addSubCycleStep}>Add Step</Button>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Value</TableHead>
                    <TableHead>Dynamic?</TableHead>
                    <TableHead>Unit</TableHead>
                    <TableHead>Duration (s)</TableHead>
                    <TableHead>Trigger Condition</TableHead>
                    <TableHead>Repetitions</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentSubCycleSteps.map((step, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input value={step.value} onChange={(e) => updateSubCycleStep(index, "value", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Checkbox checked={step.isDynamic} onCheckedChange={(checked) => updateSubCycleStep(index, "isDynamic", checked)} />
                      </TableCell>
                      <TableCell>
                        <Select value={step.unit} onValueChange={(value: "A" | "C" | "W" | "V") => updateSubCycleStep(index, "unit", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="A">A (Current)</SelectItem>
                            <SelectItem value="C">C-rate</SelectItem>
                            <SelectItem value="W">W (Power)</SelectItem>
                            <SelectItem value="V">V (Voltage)</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={step.duration} onChange={(e) => updateSubCycleStep(index, "duration", Number.parseFloat(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Input value={step.triggerCondition || ""} onChange={(e) => updateSubCycleStep(index, "triggerCondition", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={step.repetitions} onChange={(e) => updateSubCycleStep(index, "repetitions", Number.parseInt(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Button variant="destructive" onClick={() => removeSubCycleStep(index)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={saveSubCycle}>Save to Library</Button>
              <div className="space-y-2">
                <Label>Load Existing Sub-Cycle</Label>
                <Select onValueChange={loadSubCycle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select sub-cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {subCycles.map((sc) => (
                      <SelectItem key={sc.id} value={sc.id}>
                        {sc.name} ({sc.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="drivecycle" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="drivecycle-id">Drive Cycle ID</Label>
                  <Input id="drivecycle-id" value={currentDriveCycleId} onChange={(e) => setCurrentDriveCycleId(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="drivecycle-name">Name</Label>
                  <Input id="drivecycle-name" value={currentDriveCycleName} onChange={(e) => setCurrentDriveCycleName(e.target.value)} />
                </div>
              </div>
              <Button onClick={addDriveCycleSegment}>Add Segment</Button>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sub-Cycle ID</TableHead>
                    <TableHead>Repetitions</TableHead>
                    <TableHead>Ambient Temp (°C)</TableHead>
                    <TableHead>Trigger Condition</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentDriveCycleSegments.map((segment, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Select value={segment.subCycleId} onValueChange={(value) => updateDriveCycleSegment(index, "subCycleId", value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {subCycles.map((sc) => (
                              <SelectItem key={sc.id} value={sc.id}>
                                {sc.name} ({sc.id})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={segment.repetitions} onChange={(e) => updateDriveCycleSegment(index, "repetitions", Number.parseInt(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" value={segment.ambientTemp} onChange={(e) => updateDriveCycleSegment(index, "ambientTemp", Number.parseFloat(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Input value={segment.triggerCondition || ""} onChange={(e) => updateDriveCycleSegment(index, "triggerCondition", e.target.value)} />
                      </TableCell>
                      <TableCell>
                        <Button variant="destructive" onClick={() => removeDriveCycleSegment(index)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button onClick={saveDriveCycle}>Save to Library</Button>
              <div className="space-y-2">
                <Label>Load Existing Drive Cycle</Label>
                <Select onValueChange={loadDriveCycle}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select drive cycle" />
                  </SelectTrigger>
                  <SelectContent>
                    {driveCycles.map((dc) => (
                      <SelectItem key={dc.id} value={dc.id}>
                        {dc.name} ({dc.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="calendar" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Months (comma-separated)</Label>
                    <Input value={newRuleMonths} onChange={(e) => setNewRuleMonths(e.target.value)} placeholder="1,2,3" />
                  </div>
                  <div className="space-y-2">
                    <Label>Filter Type</Label>
                    <Select value={newRuleFilterType} onValueChange={(value: "weekday" | "date") => setNewRuleFilterType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekday">Weekday</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Days/Dates (comma-separated)</Label>
                    <Input value={newRuleDaysOrDates} onChange={(e) => setNewRuleDaysOrDates(e.target.value)} placeholder="Mon,Tue or 1,15,30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Drive Cycle ID</Label>
                    <Select value={newRuleDriveCycleId} onValueChange={setNewRuleDriveCycleId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select DC" />
                      </SelectTrigger>
                      <SelectContent>
                        {driveCycles.map((dc) => (
                          <SelectItem key={dc.id} value={dc.id}>
                            {dc.name} ({dc.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button onClick={addCalendarRule}>Add Rule</Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Months</TableHead>
                    <TableHead>Filter Type</TableHead>
                    <TableHead>Days/Dates</TableHead>
                    <TableHead>Drive Cycle ID</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calendarRules.map((rule, index) => (
                    <TableRow key={index}>
                      <TableCell>{rule.months}</TableCell>
                      <TableCell>{rule.filterType}</TableCell>
                      <TableCell>{rule.daysOrDates}</TableCell>
                      <TableCell>{rule.driveCycleId}</TableCell>
                      <TableCell>
                        <Button variant="destructive" onClick={() => removeCalendarRule(index)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="space-y-2">
                <Label>Default Drive Cycle ID (for unmatched days)</Label>
                <Select value={defaultDriveCycleId} onValueChange={setDefaultDriveCycleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select default DC (e.g., DC_IDLE)" />
                  </SelectTrigger>
                  <SelectContent>
                    {driveCycles.map((dc) => (
                      <SelectItem key={dc.id} value={dc.id}>
                        {dc.name} ({dc.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Simulation Parameters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Thermometer className="w-5 h-5" />
            Global Simulation Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 max-w-md">
            <Label htmlFor="starting-soc">Starting SOC (%)</Label>
            <Input
              id="starting-soc"
              type="number"
              placeholder="80"
              value={startingSoc}
              onChange={(e) => setStartingSoc(e.target.value)}
              min="0"
              max="100"
            />
            <p className="text-sm text-muted-foreground">Initial state of charge (0-100%)</p>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onPrevious}>
          Previous: Pack Builder
        </Button>
        <Button onClick={handleNextClick} disabled={!isValid()} className="min-w-32">
          Next: Configure Models
        </Button>
      </div>
    </div>
  )
}