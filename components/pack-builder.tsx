"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Battery } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface PackBuilderProps {
  onConfigChange: (config: any) => void
  onNext: () => void
}

export function PackBuilder({ onConfigChange, onNext }: PackBuilderProps) {
  const [cellSelection, setCellSelection] = useState<'library' | 'custom'>('library')
  const [selectedCellName, setSelectedCellName] = useState('Samsung 21700-50E')
  const [customName, setCustomName] = useState('')
  type CellConfig = 
    | {
        name: string;
        formFactor: 'cylindrical';
        dims: { radius: number; height: number; length?: never; width?: never };
        capacity: number;
        columbic_efficiency: number;
        m_cell: number;
        m_jellyroll: number;
        cell_voltage_upper_limit: number;
        cell_voltage_lower_limit: number;
      }
    | {
        name: string;
        formFactor: 'prismatic';
        dims: { length: number; width: number; height: number; radius?: never };
        capacity: number;
        columbic_efficiency: number;
        m_cell: number;
        m_jellyroll: number;
        cell_voltage_upper_limit: number;
        cell_voltage_lower_limit: number;
      };

  const [cellLibrary, setCellLibrary] = useState<CellConfig[]>([
    {
      name: 'Samsung 21700-50E',
      formFactor: 'cylindrical',
      dims: { radius: 10.5, height: 70 },
      capacity: 5,
      columbic_efficiency: 1.0,
      m_cell: 0.06725,
      m_jellyroll: 0.05708,
      cell_voltage_upper_limit: 4.2,
      cell_voltage_lower_limit: 2.5,
    },
    {
      name: 'Tesla 4680',
      formFactor: 'cylindrical',
      dims: { radius: 23, height: 80 },
      capacity: 25,
      columbic_efficiency: 1.0,
      m_cell: 0.09,
      m_jellyroll: 0.08,
      cell_voltage_upper_limit: 4.2,
      cell_voltage_lower_limit: 2.5,
    },
    {
      name: 'Generic Prismatic',
      formFactor: 'prismatic',
      dims: { length: 100, width: 30, height: 200 },
      capacity: 50,
      columbic_efficiency: 1.0,
      m_cell: 0.5,
      m_jellyroll: 0.4,
      cell_voltage_upper_limit: 4.2,
      cell_voltage_lower_limit: 2.5,
    },
  ]);

  const [formFactor, setFormFactor] = useState<'cylindrical' | 'prismatic'>('cylindrical')
  const [dims, setDims] = useState<{ radius?: number; length?: number; width?: number; height: number }>({ height: 70 })
  const [capacity, setCapacity] = useState(5)
  const [columbicEfficiency, setColumbicEfficiency] = useState(1.0)
  const [mCell, setMCell] = useState(0.06725)
  const [mJellyroll, setMJellyroll] = useState(0.05708)
  const [cellUpperVoltage, setCellUpperVoltage] = useState('4.2')
  const [cellLowerVoltage, setCellLowerVoltage] = useState('2.5')
  const [connectionType, setConnectionType] = useState('row_series_column_parallel')
  const [rP, setRP] = useState(0.001)
  const [rS, setRS] = useState(0.001)
  const [moduleUpperVoltage, setModuleUpperVoltage] = useState('60')
  const [moduleLowerVoltage, setModuleLowerVoltage] = useState('')
  const [allowOverlap, setAllowOverlap] = useState(false)
  const [computeNeighbors, setComputeNeighbors] = useState(true)
  const [labelSchema, setLabelSchema] = useState('')
  const [maxWeight, setMaxWeight] = useState('')
  const [maxVolume, setMaxVolume] = useState('')
  const [zPitch, setZPitch] = useState('')
  const [layers, setLayers] = useState<Layer[]>([])
  const [nextId, setNextId] = useState(1)

  interface Layer {
    id: number
    gridType: string
    nRows: string
    nCols: string
    pitchX: string
    pitchY: string
    zMode: 'index_pitch' | 'explicit'
    zCenter: string
  }

  const handleSelectCell = (name: string) => {
    setSelectedCellName(name)
    const cell = cellLibrary.find((c) => c.name === name)
    if (cell) {
      setFormFactor(cell.formFactor)
      setDims(cell.dims)
      setCapacity(cell.capacity)
      setColumbicEfficiency(cell.columbic_efficiency)
      setMCell(cell.m_cell)
      setMJellyroll(cell.m_jellyroll)
      setCellUpperVoltage(cell.cell_voltage_upper_limit.toString())
      setCellLowerVoltage(cell.cell_voltage_lower_limit.toString())
    }
  }

  
  const saveCustomCell = () => {
    if (!customName) {
      alert('Please enter a name for the custom cell');
      return;
    }

    if (formFactor === 'cylindrical') {
      if (!dims.radius || !dims.height) {
        alert('Invalid dimensions for cylindrical cells');
        return;
      }
      const newCell: CellConfig = {
        name: customName,
        formFactor: 'cylindrical',
        dims: { radius: dims.radius, height: dims.height },
        capacity,
        columbic_efficiency: columbicEfficiency,
        m_cell: mCell,
        m_jellyroll: mJellyroll,
        cell_voltage_upper_limit: parseFloat(cellUpperVoltage) || 4.2,
        cell_voltage_lower_limit: parseFloat(cellLowerVoltage) || 2.5,
      };
      setCellLibrary([...cellLibrary, newCell]);
    } else {
      if (!dims.length || !dims.width || !dims.height) {
        alert('Invalid dimensions for prismatic cells');
        return;
      }
      const newCell: CellConfig = {
        name: customName,
        formFactor: 'prismatic',
        dims: { length: dims.length, width: dims.width, height: dims.height },
        capacity,
        columbic_efficiency: columbicEfficiency,
        m_cell: mCell,
        m_jellyroll: mJellyroll,
        cell_voltage_upper_limit: parseFloat(cellUpperVoltage) || 4.2,
        cell_voltage_lower_limit: parseFloat(cellLowerVoltage) || 2.5,
      };
      setCellLibrary([...cellLibrary, newCell]);
    }
    setCustomName('');
    setCellSelection('library');
    setSelectedCellName(customName);
  };

  const addLayer = () => {
    setLayers([...layers, { id: nextId, gridType: 'rectangular', nRows: '', nCols: '', pitchX: '', pitchY: '', zMode: 'index_pitch', zCenter: '' }])
    setNextId(nextId + 1)
  }

  const removeLayer = (id: number) => {
    setLayers(layers.filter((l) => l.id !== id))
  }

  const updateLayer = (id: number, field: keyof Layer, value: string) => {
    setLayers(layers.map((l) => (l.id === id ? { ...l, [field]: value } : l)))
  }

  const handleDimsChange = (field: string, value: string) => {
    setDims({ ...dims, [field]: value === '' ? undefined : parseFloat(value) })
  }

  const useIndexPitch = layers.some((l) => l.zMode === 'index_pitch')

  const gridTypes = formFactor === 'cylindrical'
    ? ['rectangular', 'brick_row_stagger', 'hex_flat', 'hex_pointy']
    : ['rectangular', 'brick_row_stagger']

  const hasWarnings = () => {
    let total = 0
    for (const layer of layers) {
      const nr = parseInt(layer.nRows) || 0
      const nc = parseInt(layer.nCols) || 0
      total += nr * nc
    }
    return total > 1000
  }

  const validateAndGenerate = () => {
    let realDims: { radius?: number; length?: number; width?: number; height: number } = { height: (dims.height || 0) / 1000 }
    if (formFactor === 'cylindrical') {
      if (!dims.radius || dims.radius <= 0 || !dims.height || dims.height <= 0) {
        alert('Invalid dimensions for cylindrical cells')
        return null
      }
      realDims.radius = dims.radius / 1000
    } else {
      if (!dims.length || dims.length <= 0 || !dims.width || dims.width <= 0 || !dims.height || dims.height <= 0) {
        alert('Invalid dimensions for prismatic cells')
        return null
      }
      realDims.length = dims.length / 1000
      realDims.width = dims.width / 1000
    }

    if (layers.length === 0) {
      alert('Add at least one layer')
      return null
    }

    let realZPitch = 0
    if (useIndexPitch) {
      realZPitch = parseFloat(zPitch)
      if (isNaN(realZPitch) || realZPitch <= 0) {
        alert('Invalid z pitch')
        return null
      }
      realZPitch /= 1000
    }

    const zCenters: number[] = []
    for (let li = 0; li < layers.length; li++) {
      const l = li + 1
      const layer = layers[li]
      let z: number
      if (layer.zMode === 'index_pitch') {
        z = (l - 1) * realZPitch
      } else {
        z = parseFloat(layer.zCenter)
        if (isNaN(z)) {
          alert(`Invalid z center for layer ${l}`)
          return null
        }
        z /= 1000
      }
      zCenters.push(z)
    }

    const shift = zCenters[0]
    zCenters.forEach((_, i) => (zCenters[i] -= shift))

    let cells: any[] = []
    let indexMap = new Map<string, number>()
    let globalIndex = 1
    let layerConfigs: any[] = []

    try {
      for (let li = 0; li < layers.length; li++) {
        const l = li + 1
        const layer = layers[li]
        const grid_type = layer.gridType
        const n_rows = parseInt(layer.nRows)
        const n_cols = parseInt(layer.nCols)
        const pitch_x = parseFloat(layer.pitchX) / 1000
        const pitch_y = parseFloat(layer.pitchY) / 1000

        if (isNaN(n_rows) || n_rows <= 0 || isNaN(n_cols) || n_cols <= 0 || isNaN(pitch_x) || pitch_x <= 0 || isNaN(pitch_y) || pitch_y <= 0) {
          throw new Error(`Invalid parameters for layer ${l}`)
        }

        if (!allowOverlap) {
          if (formFactor === 'prismatic') {
            if (pitch_x < realDims.length! || pitch_y < realDims.width!) {
              throw new Error(`Pitch too small for prismatic cells in layer ${l}`)
            }
          } else {
            const d = 2 * realDims.radius!
            let min_dist = Infinity
            if (grid_type === 'rectangular') {
              min_dist = Math.min(pitch_x, pitch_y)
            } else if (grid_type === 'brick_row_stagger' || grid_type === 'hex_flat') {
              const diag = Math.sqrt((0.5 * pitch_x) ** 2 + pitch_y ** 2)
              min_dist = Math.min(pitch_x, pitch_y, diag)
            } else if (grid_type === 'hex_pointy') {
              const diag = Math.sqrt((0.5 * pitch_y) ** 2 + pitch_x ** 2)
              min_dist = Math.min(pitch_x, pitch_y, diag)
            }
            if (min_dist < d) {
              throw new Error(`Pitch settings would cause cell overlap in layer ${l}`)
            }
          }
        }

        const z = zCenters[li]
        layerConfigs.push({
          grid_type,
          n_rows,
          n_cols,
          pitch_x,
          pitch_y,
          z_center: z,
          z_mode: layer.zMode,
        })

        for (let r = 1; r <= n_rows; r++) {
          for (let c = 1; c <= n_cols; c++) {
            let x = 0
            let y = 0
            if (grid_type === 'rectangular') {
              x = (c - 1) * pitch_x
              y = (r - 1) * pitch_y
            } else if (grid_type === 'brick_row_stagger' || grid_type === 'hex_flat') {
              x = (c - 1) * pitch_x + (r % 2 === 0 ? 0.5 * pitch_x : 0)
              y = (r - 1) * pitch_y
            } else if (grid_type === 'hex_pointy') {
              x = (c - 1) * pitch_x
              y = (r - 1) * pitch_y + (c % 2 === 1 ? 0.5 * pitch_y : 0)
            }

            const position = [x, y, z]

            let half_x = 0
            let half_y = 0
            if (formFactor === 'cylindrical') {
              half_x = realDims.radius!
              half_y = realDims.radius!
            } else {
              half_x = realDims.length! / 2
              half_y = realDims.width! / 2
            }

            const bbox_2d = {
              xmin: x - half_x,
              xmax: x + half_x,
              ymin: y - half_y,
              ymax: y + half_y,
            }

            const defaultLabel = `R${r}C${c}L${l}`
            let label = defaultLabel
            if (labelSchema) {
              label = labelSchema
                .replace('{row}', r.toString())
                .replace('{col}', c.toString())
                .replace('{layer}', l.toString())
            }

            const cell = {
              global_index: globalIndex,
              layer_index: l,
              row_index: r,
              col_index: c,
              position,
              dims: { ...realDims },
              bbox_2d,
              neighbors_same_layer: [],
              label,
            }

            cells.push(cell)
            indexMap.set(`${l}-${r}-${c}`, globalIndex)
            globalIndex++
          }
        }
      }

      if (computeNeighbors) {
        for (const cell of cells) {
          const l = cell.layer_index
          const r = cell.row_index
          const c = cell.col_index
          const layerConfig = layerConfigs[l - 1]
          const grid_type = layerConfig.grid_type
          const n_rows = layerConfig.n_rows
          const n_cols = layerConfig.n_cols

          let dirs: [number, number][] = []
          const is_hex = grid_type === 'hex_flat' || grid_type === 'hex_pointy'
          if (is_hex) {
            const is_pointy = grid_type === 'hex_pointy'
            const odd = is_pointy ? c % 2 === 1 : r % 2 === 1
            dirs = [
              [0, -1],
              [0, 1],
            ]
            if (odd) {
              dirs = dirs.concat([[-1, 0], [-1, 1], [1, 0], [1, 1]])
            } else {
              dirs = dirs.concat([[-1, -1], [-1, 0], [1, -1], [1, 0]])
            }
          } else {
            dirs = [
              [0, -1],
              [0, 1],
              [-1, 0],
              [1, 0],
            ]
          }

          const neighbors: number[] = []
          for (const [dr, dc] of dirs) {
            const nr = r + dr
            const nc = c + dc
            if (nr >= 1 && nr <= n_rows && nc >= 1 && nc <= n_cols) {
              const nid = indexMap.get(`${l}-${nr}-${nc}`)
              if (nid) {
                neighbors.push(nid)
              }
            }
          }
          cell.neighbors_same_layer = neighbors
        }
      }

      let xmin = Infinity,
        xmax = -Infinity,
        ymin = Infinity,
        ymax = -Infinity,
        zmin = Infinity,
        zmax = -Infinity
      const half_h = realDims.height / 2
      for (const cell of cells) {
        xmin = Math.min(xmin, cell.bbox_2d.xmin)
        xmax = Math.max(xmax, cell.bbox_2d.xmax)
        ymin = Math.min(ymin, cell.bbox_2d.ymin)
        ymax = Math.max(ymax, cell.bbox_2d.ymax)
        const cz = cell.position[2]
        zmin = Math.min(zmin, cz - half_h)
        zmax = Math.max(zmax, cz + half_h)
      }

      const bbox = { xmin, xmax, ymin, ymax, zmin, zmax }
      const volume = (xmax - xmin) * (ymax - ymin) * (zmax - zmin)
      const weight = cells.length * mCell

      let constraintWarnings: string[] = []
      const parsedMaxVolume = parseFloat(maxVolume)
      const parsedMaxWeight = parseFloat(maxWeight)
      if (!isNaN(parsedMaxVolume) && volume > parsedMaxVolume) {
        constraintWarnings.push(`Pack volume ${volume.toFixed(6)} m³ exceeds maximum ${maxVolume} m³`)
      }
      if (!isNaN(parsedMaxWeight) && weight > parsedMaxWeight) {
        constraintWarnings.push(`Pack weight ${weight.toFixed(3)} kg exceeds maximum ${maxWeight} kg`)
      }
      if (constraintWarnings.length > 0) {
        alert('Design Constraint Warnings:\n' + constraintWarnings.join('\n'))
      }

      const meta = {
        bbox,
        layers: layerConfigs,
        formFactor,
      }

      return {
        cells,
        meta,
        capacity,
        columbic_efficiency: columbicEfficiency,
        connection_type: connectionType,
        R_p: rP,
        R_s: rS,
        voltage_limits: {
          cell_upper: parseFloat(cellUpperVoltage) || NaN,
          cell_lower: parseFloat(cellLowerVoltage) || NaN,
          module_upper: parseFloat(moduleUpperVoltage) || NaN,
          module_lower: parseFloat(moduleLowerVoltage) || NaN,
        },
        masses: {
          cell: mCell,
          jellyroll: mJellyroll,
        },
      }
    } catch (e: any) {
      alert(e.message)
      return null
    }
  }

  const handleNextClick = () => {
    const config = validateAndGenerate()
    if (config) {
      console.log('Generated Pack Configuration:', config);
      onConfigChange(config)
      onNext()
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Battery className="w-5 h-5" />
            Pack Builder
          </CardTitle>
          <CardDescription>Define your battery pack geometry</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Cell Selection Mode</Label>
            <Select value={cellSelection} onValueChange={(v) => setCellSelection(v as 'library' | 'custom')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="library">From Library</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {cellSelection === 'library' && (
            <div className="space-y-3">
              <Label>Select Cell</Label>
              <Select value={selectedCellName} onValueChange={handleSelectCell}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {cellLibrary.map((cell) => (
                    <SelectItem key={cell.name} value={cell.name}>
                      {cell.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-3">
            <Label htmlFor="form-factor">Cell Form Factor</Label>
            <Select value={formFactor} onValueChange={(v) => setFormFactor(v as 'cylindrical' | 'prismatic')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cylindrical">Cylindrical</SelectItem>
                <SelectItem value="prismatic">Prismatic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {formFactor === 'cylindrical' ? (
              <>
                <div className="space-y-3">
                  <Label>Radius (mm)</Label>
                  <Input type="number" value={dims.radius ?? ''} onChange={(e) => handleDimsChange('radius', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Height (mm)</Label>
                  <Input type="number" value={dims.height ?? ''} onChange={(e) => handleDimsChange('height', e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <Label>Length (mm)</Label>
                  <Input type="number" value={dims.length ?? ''} onChange={(e) => handleDimsChange('length', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Width (mm)</Label>
                  <Input type="number" value={dims.width ?? ''} onChange={(e) => handleDimsChange('width', e.target.value)} />
                </div>
                <div className="space-y-3 col-span-2">
                  <Label>Height (mm)</Label>
                  <Input type="number" value={dims.height ?? ''} onChange={(e) => handleDimsChange('height', e.target.value)} />
                </div>
              </>
            )}
          </div>

          <div className="space-y-3">
            <Label>Capacity (Ah)</Label>
            <Input type="number" value={capacity} onChange={(e) => setCapacity(parseFloat(e.target.value) || 0)} />
          </div>

          <div className="space-y-3">
            <Label>Columbic Efficiency</Label>
            <Input type="number" value={columbicEfficiency} onChange={(e) => setColumbicEfficiency(parseFloat(e.target.value) || 1.0)} />
          </div>

          <div className="space-y-3">
            <Label>Cell Mass (kg)</Label>
            <Input type="number" value={mCell} onChange={(e) => setMCell(parseFloat(e.target.value) || 0)} />
          </div>

          <div className="space-y-3">
            <Label>Jellyroll Mass (kg)</Label>
            <Input type="number" value={mJellyroll} onChange={(e) => setMJellyroll(parseFloat(e.target.value) || 0)} />
          </div>

          <div className="space-y-3">
            <Label>Cell Voltage Upper Limit (V)</Label>
            <Input type="number" value={cellUpperVoltage} onChange={(e) => setCellUpperVoltage(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>Cell Voltage Lower Limit (V)</Label>
            <Input type="number" value={cellLowerVoltage} onChange={(e) => setCellLowerVoltage(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>Custom Cell Name (for saving)</Label>
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Enter name to save" />
            <Button onClick={saveCustomCell}>Save Custom Cell</Button>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="allow-overlap" checked={allowOverlap} onCheckedChange={(checked) => setAllowOverlap(checked as boolean)} />
            <Label htmlFor="allow-overlap">Allow cell overlap (for testing only)</Label>
          </div>

          {useIndexPitch && (
            <div className="space-y-3">
              <Label>Z Pitch (mm)</Label>
              <Input type="number" value={zPitch} onChange={(e) => setZPitch(e.target.value)} />
              <p className="text-sm text-muted-foreground">Vertical spacing between layers for index_pitch mode</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Electrical Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Connection Type</Label>
            <Select value={connectionType} onValueChange={setConnectionType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="row_series_column_parallel">Row Series, Column Parallel</SelectItem>
                <SelectItem value="row_parallel_column_series">Row Parallel, Column Series</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>R_p (Ohms) - Parallel Connection Resistance</Label>
            <Input type="number" value={rP} onChange={(e) => setRP(parseFloat(e.target.value) || 0)} />
          </div>

          <div className="space-y-3">
            <Label>R_s (Ohms) - Series Connection Resistance</Label>
            <Input type="number" value={rS} onChange={(e) => setRS(parseFloat(e.target.value) || 0)} />
          </div>

          <div className="space-y-3">
            <Label>Module Voltage Upper Limit (V)</Label>
            <Input type="number" value={moduleUpperVoltage} onChange={(e) => setModuleUpperVoltage(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>Module Voltage Lower Limit (V)</Label>
            <Input type="number" value={moduleLowerVoltage} onChange={(e) => setModuleLowerVoltage(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Advanced Options</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center space-x-2">
            <Checkbox id="compute-neighbors" checked={computeNeighbors} onCheckedChange={(checked) => setComputeNeighbors(checked as boolean)} />
            <Label htmlFor="compute-neighbors">Compute Neighbors</Label>
          </div>

          <div className="space-y-3">
            <Label>Label Schema</Label>
            <Input value={labelSchema} onChange={(e) => setLabelSchema(e.target.value)} placeholder="e.g. R{row}C{col}L{layer}" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Design Constraints (Optional)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label>Maximum Weight (kg)</Label>
            <Input type="number" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} />
          </div>

          <div className="space-y-3">
            <Label>Maximum Volume (m³)</Label>
            <Input type="number" value={maxVolume} onChange={(e) => setMaxVolume(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Layers</CardTitle>
            <Button onClick={addLayer}>Add Layer</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {layers.map((layer, idx) => (
            <div key={layer.id} className="space-y-4 border-b pb-4 last:border-0 last:pb-0">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold">Layer {idx + 1}</h3>
                {layers.length > 1 && (
                  <Button variant="destructive" size="sm" onClick={() => removeLayer(layer.id)}>
                    Remove
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <Label>Grid Type</Label>
                  <Select value={layer.gridType} onValueChange={(v) => updateLayer(layer.id, 'gridType', v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {gridTypes.map((gt) => (
                        <SelectItem key={gt} value={gt}>
                          {gt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <Label>Number of Rows</Label>
                  <Input type="number" value={layer.nRows} onChange={(e) => updateLayer(layer.id, 'nRows', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Number of Columns</Label>
                  <Input type="number" value={layer.nCols} onChange={(e) => updateLayer(layer.id, 'nCols', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Pitch X (mm)</Label>
                  <Input type="number" value={layer.pitchX} onChange={(e) => updateLayer(layer.id, 'pitchX', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Pitch Y (mm)</Label>
                  <Input type="number" value={layer.pitchY} onChange={(e) => updateLayer(layer.id, 'pitchY', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Z Mode</Label>
                  <Select value={layer.zMode} onValueChange={(v) => updateLayer(layer.id, 'zMode', v as 'index_pitch' | 'explicit')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="index_pitch">Index Pitch</SelectItem>
                      <SelectItem value="explicit">Explicit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {layer.zMode === 'explicit' && (
                  <div className="space-y-3">
                    <Label>Z Center (mm)</Label>
                    <Input type="number" value={layer.zCenter} onChange={(e) => updateLayer(layer.id, 'zCenter', e.target.value)} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {layers.length === 0 && <p className="text-center text-muted-foreground">No layers added yet</p>}
        </CardContent>
      </Card>

      {hasWarnings() && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Warning: Large pack configurations may result in longer simulation times or unrealistic setups.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button onClick={handleNextClick} disabled={layers.length === 0} className="min-w-32">
          Next: Define Drive Cycle
        </Button>
      </div>
    </div>
  )
}