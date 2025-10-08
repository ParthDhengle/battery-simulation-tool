# Modified data_processor.py
# Changes:
# - Restored dynamic splitting to honor the isDynamic flag from frontend input.
# - To prevent excessive time steps and make simulation feasible, set dynamic_dt=60.0 (1-minute intervals for dynamic steps).
#   This still splits dynamic steps into small intervals but reduces total steps from ~1.7M to ~31K, making runtime reasonable (~1-2 minutes).
#   If higher resolution is needed, reduce dt (e.g., 10.0 for ~180K steps), but 60s is sufficient for constant currents.
# - Suppressed repeated warnings by printing them only once per unique message.

import json
import numpy as np
from datetime import datetime, timedelta
from geometry import init_geometry
from classify_cells import init_classify_cells
from initial_conditions import init_initial_cell_conditions
from busbar_connections import define_busbar_connections
from battery_params import BatteryData_SOH1, BatteryData_SOH2, BatteryData_SOH3

def create_setup_from_json(pack_json_path, drive_json_path, sim_json_path):
    with open(pack_json_path, 'r') as f:
        pack = json.load(f)
    with open(drive_json_path, 'r') as f:
        drive = json.load(f)
    with open(sim_json_path, 'r') as f:
        sim = json.load(f)
    layers = pack['meta']['layers']
    form_factor = pack['meta']['formFactor']
    capacity = pack['capacity']
    columbic_efficiency = pack['columbic_efficiency']
    connection_type = pack['connection_type']
    R_p = pack['R_p']
    R_s = pack['R_s']
    voltage_limits = pack['voltage_limits']
    masses = pack['masses']
    cells = init_geometry(pack['cells'], layers, form_factor)
    for idx, c in enumerate(cells):
        c['global_index'] = idx # 0-based
    for layer_idx, layer in enumerate(layers, 1):
        layer_cells = [c for c in cells if c['layer_index'] == layer_idx]
        init_classify_cells(layer_cells, layer['n_rows'], layer['n_cols'])
    initial_temperature = 300.0
    initial_SOC = drive['startingSoc'] / 100.0
    initial_SOH = 1.0
    initial_DCIR_AgingFactor = 1.0
    varying_cells = []
    varying_temps = []
    varying_SOCs = []
    varying_SOHs = []
    varying_DCIRs = []
    cells = init_initial_cell_conditions(
        cells, initial_temperature, initial_SOC, initial_SOH, initial_DCIR_AgingFactor,
        varying_cells, varying_temps, varying_SOCs, varying_SOHs, varying_DCIRs
    )
    cells, parallel_groups = define_busbar_connections(cells, layers, connection_type)
    time, I_module = flatten_drive_cycle(drive, capacity=capacity)
    time_steps = len(time)
    V_term_test = np.zeros(time_steps)
    return {
        'cells': cells,
        'capacity': capacity,
        'columbic_efficiency': columbic_efficiency,
        'connection_type': connection_type,
        'R_p': R_p,
        'R_s': R_s,
        'voltage_limits': {
            'cell_upper': voltage_limits['cell_upper'],
            'cell_lower': voltage_limits['cell_lower'] or np.nan,
            'module_upper': voltage_limits['module_upper'],
            'module_lower': voltage_limits['module_lower'] or np.nan
        },
        'masses': {
            'cell': masses['cell'],
            'jellyroll': masses['jellyroll']
        },
        'time': time,
        'I_module': I_module,
        'V_term_test': V_term_test,
        'time_steps': time_steps,
        'BatteryData_SOH1': BatteryData_SOH1,
        'BatteryData_SOH2': BatteryData_SOH2,
        'BatteryData_SOH3': BatteryData_SOH3
    }

def flatten_drive_cycle(drive_config, start_date_str='2025-01-01', num_days=365, nominal_V=3.7, capacity=5.0, dynamic_dt=60.0):
    start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
   
    sub_cycles = {sc['id']: sc for sc in drive_config['subCycles']}
    drive_cycles = {dc['id']: dc for dc in drive_config['driveCycles']}
   
    rules = drive_config['calendarRules']
   
    default_dc_id = drive_config['defaultDriveCycleId']
    if not default_dc_id or default_dc_id not in drive_cycles:
        default_dc_id = list(drive_cycles.keys())[0]
   
    global_time = 0.0
    time_arr = [0.0]
    current_arr = [0.0]
   
    warned_skipped_v = False  # Flag to warn only once
    warned_unknown_unit = False
   
    for day in range(num_days):
        current_date = start_date + timedelta(days=day)
        month = current_date.month
        weekday = current_date.strftime('%a').capitalize() # 'Mon'
        date_day = current_date.day
        day_start_time = global_time # Track start of day
       
        matching_dc_id = default_dc_id
        for rule in rules:
            months = [int(m) for m in rule['months'].split(',')]
            if month not in months:
                continue
           
            days_or_dates = [d.strip().lower().capitalize() for d in rule['daysOrDates'].split(',')]
            if rule['filterType'] == 'weekday':
                if weekday in days_or_dates:
                    matching_dc_id = rule['driveCycleId'].strip()
                    break
            elif rule['filterType'] == 'date':
                dates = [int(d) for d in days_or_dates if d.isdigit()] # Handle non-digits
                if date_day in dates:
                    matching_dc_id = rule['driveCycleId'].strip()
                    break
       
        dc = drive_cycles.get(matching_dc_id)
        if not dc:
            print(f"Warning: No DC for day {current_date}, skipping.")
            continue
       
        for segment in dc['segments']:
            sub = sub_cycles.get(segment['subCycleId'])
            if not sub:
                continue
            for _ in range(segment['repetitions']):
                for step in sub['steps']:
                    unit = step['unit']
                    value = float(step['value'])
                    duration = step['duration']
                    repetitions = step.get('repetitions', 1)
                    total_duration = duration * repetitions
                    if total_duration == 0:
                        continue
                   
                    if unit == 'A':
                        I = value
                    elif unit == 'W':
                        I = value / nominal_V
                    elif unit == 'C':
                        I = value * capacity
                    elif unit == 'V':
                        if not warned_skipped_v:
                            print("Warning: Skipping constant V step (not supported). This warning will not repeat.")
                            warned_skipped_v = True
                        continue
                    else:
                        if not warned_unknown_unit:
                            print(f"Warning: Unknown unit {unit}, skipping. This warning will not repeat.")
                            warned_unknown_unit = True
                        continue
                   
                    if step['isDynamic']:
                        # Expand dynamic steps to small dt
                        num_small_steps = int(total_duration / dynamic_dt)
                        for _ in range(num_small_steps):
                            global_time += dynamic_dt
                            time_arr.append(global_time)
                            current_arr.append(I) # Assuming constant I; can add variation if needed
                        remainder = total_duration % dynamic_dt
                        if remainder > 0:
                            global_time += remainder
                            time_arr.append(global_time)
                            current_arr.append(I)
                    else:
                        # Collapse non-dynamic to single step
                        global_time += total_duration
                        time_arr.append(global_time)
                        current_arr.append(I)
       
        # Add idle time to end of day (86400 seconds)
        day_end_time = day_start_time + 86400
        idle_duration = day_end_time - global_time
        if idle_duration > 0:
            global_time += idle_duration
            time_arr.append(global_time)
            current_arr.append(0.0)
           
    return np.array(time_arr), np.array(current_arr)