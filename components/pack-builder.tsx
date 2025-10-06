"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { AlertCircle, Battery } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

// New imports for 3D visualization
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

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
  // New state for preview
  const [previewCells, setPreviewCells] = useState<any[]>([])

  interface Layer {
    id: number
    gridType: string
    nRows: number
    nCols: number
    pitchX: number
    pitchY: number
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
  const getMinPitchX = (formFactor: string, dims: any) => {
    if (formFactor === "cylindrical") return 2 * (dims.radius ?? 0);
    if (formFactor === "prismatic") return (dims.length ?? 0);
    return 0;
  };

  const getMinPitchY = (formFactor: string, dims: any) => {
    if (formFactor === "cylindrical") return 2 * (dims.radius ?? 0);
    if (formFactor === "prismatic") return (dims.width ?? 0);
    return 0;
  }; 
 
  const addLayer = () => {
    const minPitchX = getMinPitchX(formFactor, dims);
    const minPitchY = getMinPitchY(formFactor, dims);

    const lastLayer = layers[layers.length - 1];
    const baseZ = lastLayer ? Number(lastLayer.zCenter) || 0 : 0;
    const height = lastLayer ? dims.height+5 || 0 : 0;

    setLayers([...layers, { id: nextId, gridType: 'rectangular', nRows: 3, nCols: 3, pitchX: minPitchX+2, pitchY: minPitchY+2, zMode: 'explicit', zCenter: (baseZ + height).toString() }])
    setNextId(nextId + 1)
  }
  const removeLayer = (id: number) => {
    const removedIdx = layers.findIndex(l => l.id === id);
    if (removedIdx === -1) return;
    const removedLayer = layers[removedIdx];
    let newLayers = layers.filter((l) => l.id !== id);
    let shiftAmount = 0;
    const pitch = parseFloat(zPitch) || 0;
    let prevZ = 0;
    if (removedIdx > 0) {
      const prevLayer = layers[removedIdx - 1];
      if (prevLayer.zMode === 'explicit') {
        prevZ = parseFloat(prevLayer.zCenter) || 0;
      } else {
        prevZ = (removedIdx - 1) * pitch;
      }
    }
    if (removedLayer.zMode === 'explicit') {
      const removedZ = parseFloat(removedLayer.zCenter) || 0;
      shiftAmount = removedZ - prevZ;
    } else {
      shiftAmount = pitch;
    }
    newLayers = newLayers.map((layer, newIdx) => {
      if (newIdx >= removedIdx && layer.zMode === 'explicit') {
        const currentZ = parseFloat(layer.zCenter) || 0;
        const newZ = currentZ - shiftAmount;
        return { ...layer, zCenter: newZ.toString() };
      }
      return layer;
    });
    setLayers(newLayers);
  }
  const updateLayer = (id: number, field: keyof Layer, value: string) => {
    setLayers(prevLayers =>
      prevLayers.map((l, idx) => {
        if (l.id !== id) return l;

        let updated = { ...l, [field]: value };

        // 👉 Enforce Z Center stacking
        if (field === "zCenter") {
          const prevLayer = prevLayers[idx - 1];
          if (prevLayer) {
            const minZ = Number(prevLayer.zCenter) || 0;
            if (Number(value) <= minZ) {
              // force it above the previous layer
              updated.zCenter = (minZ + getMinPitchY(formFactor, dims)).toString();
            }
          }
        }

        return updated;
      })
    );
  };
  const handleDimsChange = (field: string, value: string) => {
    const num = parseFloat(value)
    if (num < 0) return;
    setDims({ ...dims, [field]: value === '' ? undefined : parseFloat(value) })
  }
  const useIndexPitch = layers.some((l) => l.zMode === 'index_pitch')
  const gridTypes = formFactor === 'cylindrical'
    ? ['rectangular', 'brick_row_stagger', 'hex_flat', 'hex_pointy']
    : ['rectangular', 'brick_row_stagger']
  
  const getPitchXCondition = (formFactor: string) => {
    if (formFactor === "cylindrical") return "greater than diameter";
    if (formFactor === "prismatic") return "greater than length";
    return "";
  };
  const getPitchYCondition = (formFactor: string) => {
    if (formFactor === "cylindrical") return "greater than diameter";
    if (formFactor === "prismatic") return "greater than width";
    return "";
  };

  const hasWarnings = () => {
    let total = 0
    for (const layer of layers) {
      const nr = parseInt(layer.nRows.toString()) || 0
      const nc = parseInt(layer.nCols.toString()) || 0
      total += nr * nc
    }
    return total > 1000
  }
  const validateAndGenerate = (isPreview: boolean = false) => {
    let realDims: { radius?: number; length?: number; width?: number; height: number } = { height: (dims.height || 0) / 1000 }
    if (formFactor === 'cylindrical') {
      if (!dims.radius || dims.radius <= 0 || !dims.height || dims.height <= 0) {
        if (!isPreview) alert('Invalid dimensions for cylindrical cells')
        return null
      }
      realDims.radius = dims.radius / 1000
    } else {
      if (!dims.length || dims.length <= 0 || !dims.width || dims.width <= 0 || !dims.height || dims.height <= 0) {
        if (!isPreview) alert('Invalid dimensions for prismatic cells')
        return null
      }
      realDims.length = dims.length / 1000
      realDims.width = dims.width / 1000
    }
    if (layers.length === 0) {
      if (!isPreview) alert('Add at least one layer')
      return null
    }
    let realZPitch = 0
    if (useIndexPitch) {
      realZPitch = parseFloat(zPitch)
      if (isNaN(realZPitch) || realZPitch <= 0) {
        if (!isPreview) alert('Invalid z pitch')
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
          if (!isPreview) alert(`Invalid z center for layer ${l}`)
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
        const n_rows = parseInt(layer.nRows.toString())
        const n_cols = parseInt(layer.nCols.toString())
        const pitch_x = parseFloat(layer.pitchX.toString()) / 1000
        const pitch_y = parseFloat(layer.pitchY.toString()) / 1000
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
              min_dist = Math.min(pitch_x, diag)
            } else if (grid_type === 'hex_pointy') {
              const diag = Math.sqrt((0.5 * pitch_y) ** 2 + pitch_x ** 2)
              min_dist = Math.min(pitch_y, diag)
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
      if (!isPreview && constraintWarnings.length > 0) {
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
      if (!isPreview) alert(e.message)
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

  // New useEffect for real-time preview updates
  useEffect(() => {
    const config = validateAndGenerate(true) // Preview mode: no alerts
    setPreviewCells(config?.cells || [])
  }, [formFactor, dims, layers, zPitch, allowOverlap, computeNeighbors, labelSchema])

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
          <div className="grid grid-cols-2 gap-4">
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
          </div>
          
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
          <div className="grid grid-cols-3 gap-4">
            {formFactor === 'cylindrical' ? (
              <>
                <div className="space-y-3">
                  <Label>Radius (mm)</Label>
                  <Input type="number" min="0" value={dims.radius ?? ''} onChange={(e) => handleDimsChange('radius', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Height (mm)</Label>
                  <Input type="number" min="0" value={dims.height ?? ''} onChange={(e) => handleDimsChange('height', e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <Label>Length (mm)</Label>
                  <Input type="number" min="0" value={dims.length ?? ''} onChange={(e) => handleDimsChange('length', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Width (mm)</Label>
                  <Input type="number" min="0" value={dims.width ?? ''} onChange={(e) => handleDimsChange('width', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Height (mm)</Label>
                  <Input type="number" min="0" value={dims.height ?? ''} onChange={(e) => handleDimsChange('height', e.target.value)} />
                </div>
              </>
            )}
          </div>
          {/* New: Single Cell 3D Preview placed here, right after dimensions */}
          <CellPreview3D formFactor={formFactor} dims={dims} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Capacity (Ah)</Label>
              <Input type="number" min="0" value={capacity} onChange={(e) => setCapacity(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-3">
              <Label>Columbic Efficiency</Label>
              <Input type="number" value={columbicEfficiency} onChange={(e) => setColumbicEfficiency(parseFloat(e.target.value) || 1.0)} />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Cell Mass (kg)</Label>
              <Input type="number" min="0" value={mCell} onChange={(e) => setMCell(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-3">
              <Label>Jellyroll Mass (kg)</Label>
              <Input type="number" min="0" value={mJellyroll} onChange={(e) => setMJellyroll(parseFloat(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Cell Voltage Upper Limit (V)</Label>
              <Input type="number" value={cellUpperVoltage} onChange={(e) => setCellUpperVoltage(e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label>Cell Voltage Lower Limit (V)</Label>
              <Input type="number" value={cellLowerVoltage} onChange={(e) => setCellLowerVoltage(e.target.value)} />
            </div>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>R_p (Ohms) - Parallel Connection Resistance</Label>
              <Input type="number" value={rP} onChange={(e) => setRP(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="space-y-3">
              <Label>R_s (Ohms) - Series Connection Resistance</Label>
              <Input type="number" value={rS} onChange={(e) => setRS(parseFloat(e.target.value) || 0)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Module Voltage Upper Limit (V)</Label>
              <Input type="number" value={moduleUpperVoltage} onChange={(e) => setModuleUpperVoltage(e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label>Module Voltage Lower Limit (V)</Label>
              <Input type="number" value={moduleLowerVoltage} onChange={(e) => setModuleLowerVoltage(e.target.value)} />
            </div>
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-3">
              <Label>Maximum Weight (kg)</Label>
              <Input type="number" value={maxWeight} onChange={(e) => setMaxWeight(e.target.value)} />
            </div>
            <div className="space-y-3">
              <Label>Maximum Volume (m³)</Label>
              <Input type="number" value={maxVolume} onChange={(e) => setMaxVolume(e.target.value)} />
            </div>
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
                          {gt.replace(/_/g, ' ')}
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
                  <Label>Pitch X (mm)  [{getPitchXCondition(formFactor)}]</Label>
                  <Input type="number" value={layer.pitchX} onChange={(e) => updateLayer(layer.id, 'pitchX', e.target.value)} />
                </div>
                <div className="space-y-3">
                  <Label>Pitch Y (mm) [{getPitchYCondition(formFactor)}]</Label>
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
      {/* New: Full Pack 3D Preview placed here, after the Layers card */}
      <Card>
        <CardHeader>
          <CardTitle>Pack 3D Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <PackLayout3D cells={previewCells} formFactor={formFactor} />
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

// New Component: Single Cell 3D Preview
function CellPreview3D({ formFactor, dims }: { formFactor: 'cylindrical' | 'prismatic', dims: { radius?: number; length?: number; width?: number; height: number } }) {
  // Scale dimensions to meters for consistency (as in config)
  const realHeight = (dims.height || 0) / 1000
  let geometry
  const rotation: [number, number, number] = formFactor === 'cylindrical' ? [0, 0, 0] : [Math.PI / 2, 0, 0]
  if (formFactor === 'cylindrical') {
    const realRadius = (dims.radius || 0) / 1000
    geometry = <cylinderGeometry args={[realRadius, realRadius, realHeight, 32]} />
  } else {
    const realLength = (dims.length || 0) / 1000
    const realWidth = (dims.width || 0) / 1000
    geometry = <boxGeometry args={[realLength, realWidth, realHeight]} />
  }

  return (
    <div className="w-full h-64 bg-gray-100 rounded-md overflow-hidden">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 0.5]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[1, 1, 1]} />
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          {geometry}
          <meshStandardMaterial color="steelblue" />
        </mesh>
        <OrbitControls />
      </Canvas>
    </div>
  )
}

// New Component: Full Pack Layout 3D Preview
function PackLayout3D({ cells, formFactor }: { cells: any[], formFactor: 'cylindrical' | 'prismatic' }) {
  if (!cells.length) {
    return <p className="text-center text-muted-foreground">No valid pack configuration yet. Adjust parameters to preview.</p>
  }

  return (
    <div className="w-full h-96 bg-gray-100 rounded-md overflow-hidden">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0.5, 0.5, 0.5]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[1, 1, 1]} />
        {cells.map((cell) => {
          const pos = cell.position
          const dims = cell.dims
          let geometry
          const rotation: [number, number, number] = formFactor === 'cylindrical' ? [0, 0, 0] : [Math.PI / 2, 0, 0]
          if (formFactor === 'cylindrical') {
            geometry = <cylinderGeometry args={[dims.radius, dims.radius, dims.height, 32]} />
          } else {
            geometry = <boxGeometry args={[dims.length, dims.width, dims.height]} />
          }
          return (
            <mesh
              key={cell.global_index}
              position={[pos[0], pos[2], pos[1]]} // Remap: x, z (up as y), y (as z depth)
              rotation={rotation}
            >
              {geometry}
              <meshStandardMaterial color="steelblue" />
            </mesh>
          )
        })}
        <OrbitControls />
      </Canvas>
    </div>
  )
}