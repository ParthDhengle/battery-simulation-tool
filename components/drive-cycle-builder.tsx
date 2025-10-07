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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface SubCycleStep {
  value: number
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

interface Config {
  subCycles: SubCycle[]
  driveCycles: DriveCycle[]
  calendarRules: CalendarRule[]
  defaultDriveCycleId: string
  startingSoc: number
}

interface NamedConfig {
  name: string
  config: Config
}

interface DriveCycleBuilderProps {
  onConfigChange: (config: any) => void
  onNext: () => void
  onPrevious: () => void
}

export function DriveCycleBuilder({ onConfigChange, onNext, onPrevious }: DriveCycleBuilderProps) {
  const [configMethod, setConfigMethod] = useState("manual")
  const [subCycles, setSubCycles] = useState<SubCycle[]>([])
  const [currentSubCycleName, setCurrentSubCycleName] = useState("")
  const [currentSubCycleSteps, setCurrentSubCycleSteps] = useState<SubCycleStep[]>([])
  const [driveCycles, setDriveCycles] = useState<DriveCycle[]>([])
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
  const [savedConfigs, setSavedConfigs] = useState<NamedConfig[]>([])
  const [currentStep, setCurrentStep] = useState(1) // 1: Sub-Cycle, 2: Drive Cycle, 3: Calendar
  const [open, setOpen] = useState(false)
  const [currentSubCycleId, setCurrentSubCycleId] = useState("SC-001")
  const [currentDriveCycleId, setCurrentDriveCycleId] = useState("DC-001")
  const months = [
    { num: 1, label: "Jan" },
    { num: 2, label: "Feb" },
    { num: 3, label: "Mar" },
    { num: 4, label: "Apr" },
    { num: 5, label: "May" },
    { num: 6, label: "Jun" },
    { num: 7, label: "Jul" },
    { num: 8, label: "Aug" },
    { num: 9, label: "Sep" },
    { num: 10, label: "Oct" },
    { num: 11, label: "Nov" },
    { num: 12, label: "Dec" },
  ]
  
  const predefinedConfigs: NamedConfig[] = [
    {
      name: "Idle Cycle",
      config: {
        subCycles: [
          {
            id: "IDLE",
            name: "Idle",
            steps: [
              { value: 0, isDynamic: false, unit: "A", duration: 86400, repetitions: 1 }
            ]
          }
        ],
        driveCycles: [
          {
            id: "DC_IDLE",
            name: "Idle Day",
            segments: [
              { subCycleId: "IDLE", repetitions: 1, ambientTemp: 25 }
            ]
          }
        ],
        calendarRules: [],
        defaultDriveCycleId: "DC_IDLE",
        startingSoc: 80
      }
    },
    {
      name: "Standard Drive Cycle",
      config: {
        subCycles: [
          {
            id: "DRIVE",
            name: "Driving",
            steps: [
              { value: -10, isDynamic: false, unit: "A", duration: 3600, repetitions: 1 }
            ]
          },
          {
            id: "CHARGE",
            name: "Charging",
            steps: [
              { value: 5, isDynamic: false, unit: "A", duration: 7200, repetitions: 1 }
            ]
          }
        ],
        driveCycles: [
          {
            id: "DC_IDLE",
            name: "Idle Day",
            segments: [
              { subCycleId: "IDLE", repetitions: 1, ambientTemp: 25 }
            ]
          },
          {
            id: "DC_STANDARD",
            name: "Standard Day",
            segments: [
              { subCycleId: "DRIVE", repetitions: 2, ambientTemp: 25 },
              { subCycleId: "CHARGE", repetitions: 1, ambientTemp: 25 }
            ]
          }
        ],
        calendarRules: [
          {
            months: "1,2,3,4,5,6,7,8,9,10,11,12",
            filterType: "weekday",
            daysOrDates: "Mon,Tue,Wed,Thu,Fri",
            driveCycleId: "DC_STANDARD"
          }
        ],
        defaultDriveCycleId: "DC_IDLE",
        startingSoc: 80
      }
    },
    {
      name: "Weekend Cycle",
      config: {
        subCycles: [
          {
            id: "LONG_DRIVE",
            name: "Long Driving",
            steps: [
              { value: -15, isDynamic: false, unit: "A", duration: 10800, repetitions: 1 }
            ]
          },
          {
            id: "FAST_CHARGE",
            name: "Fast Charging",
            steps: [
              { value: 10, isDynamic: false, unit: "A", duration: 3600, repetitions: 1 }
            ]
          }
        ],
        driveCycles: [
          {
            id: "DC_IDLE",
            name: "Idle Day",
            segments: [
              { subCycleId: "IDLE", repetitions: 1, ambientTemp: 25 }
            ]
          },
          {
            id: "DC_WEEKEND",
            name: "Weekend Day",
            segments: [
              { subCycleId: "LONG_DRIVE", repetitions: 1, ambientTemp: 25 },
              { subCycleId: "FAST_CHARGE", repetitions: 1, ambientTemp: 25 }
            ]
          }
        ],
        calendarRules: [
          {
            months: "1,2,3,4,5,6,7,8,9,10,11,12",
            filterType: "weekday",
            daysOrDates: "Sat,Sun",
            driveCycleId: "DC_WEEKEND"
          }
        ],
        defaultDriveCycleId: "DC_IDLE",
        startingSoc: 80
      }
    }
  ]

  // Helper to get current config
  const getCurrentConfig = (): Config => ({
    subCycles,
    driveCycles,
    calendarRules,
    defaultDriveCycleId,
    startingSoc: Number.parseFloat(startingSoc)
  })

  // Helper to load config into state
  const loadConfig = (config: Config) => {
    setSubCycles(config.subCycles)
    setDriveCycles(config.driveCycles)
    setCalendarRules(config.calendarRules)
    setDefaultDriveCycleId(config.defaultDriveCycleId)
    setStartingSoc(config.startingSoc.toString())
    setError("")
    setConfigMethod("manual") // Switch to manual after loading
    resetSubCycleForm()
    resetDriveCycleForm()
  }

  // Sub-Cycle Handlers
  const addSubCycleStep = () => {
    setCurrentSubCycleSteps([
      ...currentSubCycleSteps,
      { value: 0, isDynamic: false, unit: "A", duration: 0, repetitions: 1 },
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

  const generateSubCycleId = (subCycles: SubCycle[]) => {
    let maxNum = 0;
    subCycles.forEach(({ id }) => {
      const match = id.match(/^SC-(\d{3})$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `SC-${String(maxNum + 2).padStart(3, "0")}`;
  }

  const generateDriveCycleId = (driveCycles: DriveCycle[]) => {
    let maxNum = 0;
    driveCycles.forEach(({ id }) => {
      const match = id.match(/^DC-(\d{3})$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `DC-${String(maxNum + 2).padStart(3, "0")}`;
  }

  const saveSubCycle = () => {
    let newId = currentSubCycleId

    if (!newId) {
      newId = generateSubCycleId(subCycles)
      setCurrentSubCycleId(newId)
    }

    if (!newId || !currentSubCycleName || currentSubCycleSteps.length === 0) {
      setError("Sub-cycle ID, name, and at least one step are required")
      return
    }

    if (subCycles.some((sc) => sc.id === newId)) {
      setSubCycles(
        subCycles.map((sc) =>
          sc.id === newId
            ? { id: newId, name: currentSubCycleName, steps: currentSubCycleSteps }
            : sc
        )
      )
    } else {
      setSubCycles([
        ...subCycles,
        { id: newId, name: currentSubCycleName, steps: currentSubCycleSteps },
      ])
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
    setCurrentSubCycleId(generateSubCycleId(subCycles))
    setCurrentSubCycleName("")
    setCurrentSubCycleSteps([])
    setError("")
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
    let newId = currentDriveCycleId
    if (!newId) {
      newId = generateDriveCycleId(driveCycles)
      setCurrentDriveCycleId(newId)
    }
    if (!newId || !currentDriveCycleName || currentDriveCycleSegments.length === 0) {
      setError("Drive cycle ID, name, and at least one segment are required")
      return
    }
    if (driveCycles.some((dc) => dc.id === newId)) {
      setDriveCycles(driveCycles.map((dc) => (dc.id === newId ? { id: newId, name: currentDriveCycleName, segments: currentDriveCycleSegments } : dc)))
    } else {
      setDriveCycles([...driveCycles, { id: newId, name: currentDriveCycleName, segments: currentDriveCycleSegments }])
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
    setCurrentDriveCycleId(generateDriveCycleId(driveCycles))
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
      const config = getCurrentConfig()
      console.log('Generated drive cycle configuration:', config);
      onConfigChange(config)
      onNext()
    } else {
      setError("Please complete all levels: sub-cycles, drive cycles, calendar rules, default DC, and starting SOC")
    }
  }

  const handleSave = () => {
    const name = prompt("Enter config name")
    if (name) {
      const config = getCurrentConfig()
      setSavedConfigs([...savedConfigs, { name, config }])
    }
  }

  const handleDownload = () => {
    const config = getCurrentConfig()
    const json = JSON.stringify(config, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = href
    link.download = 'drive_cycle_config.json'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(href)
  }

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const file = e.target.files[0]
    const reader = new FileReader()
    reader.onload = (event) => {
      if (event.target?.result) {
        try {
          const config = JSON.parse(event.target.result as string)
          loadConfig(config)
        } catch (err) {
          setError("Invalid JSON file")
        }
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Drive Cycle Configuration
          </CardTitle>
          <CardDescription>Choose a method to configure your drive cycle: predefined, upload, or manual building.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={configMethod} onValueChange={setConfigMethod}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="predefined">1. Predefined</TabsTrigger>
              <TabsTrigger value="upload">2. Upload JSON</TabsTrigger>
              <TabsTrigger value="manual">3. Manual Builder</TabsTrigger>
            </TabsList>

            <TabsContent value="predefined" className="mt-6">
              <Label>Select Predefined or Saved Config</Label>
              <Select
                onValueChange={(value) => {
                  const allConfigs = [...predefinedConfigs, ...savedConfigs]
                  const selected = allConfigs.find((c) => c.name === value)?.config
                  if (selected) loadConfig(selected)
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select config" />
                </SelectTrigger>
                <SelectContent>
                  {predefinedConfigs.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name} (Predefined)
                    </SelectItem>
                  ))}
                  {savedConfigs.map((c) => (
                    <SelectItem key={c.name} value={c.name}>
                      {c.name} (Saved)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-sm text-muted-foreground">Select a config to load it. You can then edit it in the Manual tab.</p>
            </TabsContent>

            <TabsContent value="upload" className="mt-6">
              <Label>Upload Config JSON</Label>
              <Input type="file" accept=".json" onChange={handleUpload} className="mt-2" />
              <p className="mt-2 text-sm text-muted-foreground">Upload a JSON file matching the config structure. It will load automatically.</p>
            </TabsContent>

            <TabsContent value="manual" className="mt-6">
              <div className="space-y-6">
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold">1. Sub-Cycle Builder</h2>
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
                          <TableRow key={index} className="bg-muted/40 hover:bg-muted/70">
                            <TableCell>
                              <Input className="bg-white border border-gray-200" value={step.value} onChange={(e) => updateSubCycleStep(index, "value", e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Checkbox className="bg-white border border-gray-200" checked={step.isDynamic} onCheckedChange={(checked) => updateSubCycleStep(index, "isDynamic", checked)} />
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
                              <Input className="bg-white border border-gray-200" type="number" min="0" value={step.duration} onChange={(e) => updateSubCycleStep(index, "duration", Number.parseFloat(e.target.value))} />
                            </TableCell>
                            <TableCell>
                              <Input className="bg-white border border-gray-200" value={step.triggerCondition || ""} onChange={(e) => updateSubCycleStep(index, "triggerCondition", e.target.value)} />
                            </TableCell>
                            <TableCell>
                              <Input className="bg-white border border-gray-200" type="number" min="0" value={step.repetitions} onChange={(e) => updateSubCycleStep(index, "repetitions", Number.parseInt(e.target.value))} />
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
                    <div className="flex justify-end">
                      <Button onClick={() => setCurrentStep(2)}>Next: Drive Cycle Builder</Button>
                    </div>
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold">2. Drive Cycle Builder</h2>
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
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                      <Button onClick={() => setCurrentStep(3)}>Next: Calendar Assignment</Button>
                    </div>
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold">3. Calendar Assignment</h2>
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
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={() => setCurrentStep(2)}>Back</Button>
                      <div className="flex space-x-4">
                        <Button onClick={handleSave}>Save Config</Button>
                        <Button onClick={handleDownload}>Download JSON</Button>
                      </div>
                    </div>
                  </div>
                )}
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