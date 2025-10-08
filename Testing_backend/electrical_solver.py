# Testing_backend/electrical_solver.py
import numpy as np
import h5py
import time
import matplotlib.pyplot as plt
from scipy.interpolate import RegularGridInterpolator
from battery_params import get_battery_params
from next_soc import calculate_next_soc
from parallel_group_currents import calculate_parallel_group_currents
from module_voltage import calculate_module_voltage
from reversible_heat import calculate_reversible_heat

import matplotlib
matplotlib.use('TkAgg')

def update_plot(t, history, I_module, cells):
    dt = history['dt'][:t+1]
    time_cum = np.cumsum(dt)
    time_days = time_cum / 86400
    soc_cell0 = history['SOC'][0, :t+1]
    vterm_cell0 = history['Vterm'][0, :t+1]
    qgen_cell0 = history['Qgen'][0, :t+1]
    I_module_current = I_module[:t+1]
   
    plt.clf() # Clear the figure to update/overwrite the same graph
    fig, axs = plt.subplots(4, 1, figsize=(14, 12), sharex=True)
    fig.suptitle('Simulation Progress for Cell 0 (Updating Every 2 Seconds)', fontsize=16)
   
    # SOC plot
    axs[0].plot(time_days, soc_cell0, color='blue', label='SOC')
    axs[0].set_ylabel('State of Charge (SOC)', fontsize=12)
    axs[0].set_title('SOC Over Time', fontsize=14)
    axs[0].grid(True, linestyle='--', alpha=0.7)
    axs[0].set_ylim(0, 1)
    axs[0].legend(loc='upper right')
   
    # Terminal Voltage plot
    axs[1].plot(time_days, vterm_cell0, color='green', label='Terminal Voltage')
    axs[1].set_ylabel('Terminal Voltage (V)', fontsize=12)
    axs[1].set_title('Terminal Voltage Over Time', fontsize=14)
    axs[1].grid(True, linestyle='--', alpha=0.7)
    axs[1].set_ylim(0, 5)
    axs[1].legend(loc='upper right')
   
    # Heat Generation plot
    axs[2].plot(time_days, qgen_cell0, color='red', label='Heat Generation')
    axs[2].set_ylabel('Heat Generation (W)', fontsize=12)
    axs[2].set_title('Heat Generation Over Time', fontsize=14)
    axs[2].grid(True, linestyle='--', alpha=0.7)
    axs[2].set_ylim(-1, max(qgen_cell0) * 1.1 if len(qgen_cell0) > 0 and max(qgen_cell0) > 0 else 1)
    axs[2].legend(loc='upper right')
   
    # Module Current plot
    axs[3].plot(time_days, I_module_current, color='purple', label='Module Current')
    axs[3].set_xlabel('Time (Days)', fontsize=12)
    axs[3].set_ylabel('Current (A)', fontsize=12)
    axs[3].set_title('Module Current Over Time', fontsize=14)
    axs[3].grid(True, linestyle='--', alpha=0.7)
    axs[3].legend(loc='upper right')
   
    # No fixed xticks/labels - let matplotlib auto-scale x-axis dynamically to current data range
   
    # Shade vacation periods (from calendarRules, approximate days)
    vacation_periods = [
        (90, 92), (101, 102), # Apr
        (181, 186), (209, 210), # Jul
        # Add for Aug/Dec if in rules, but based on your json, Oct is default
    ]
    for start, end in vacation_periods:
        if start < max(time_days):
            for ax in axs:
                ax.axvspan(max(0, start), min(end, max(time_days)), color='yellow', alpha=0.3, label='Vacation' if start == 90 else None)
   
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    fig.canvas.draw()
    fig.canvas.flush_events()
def run_electrical_solver(setup_data):
    cells = setup_data['cells']
    N_cells = len(cells)
    time_array = setup_data['time']
    I_module = setup_data['I_module']
    time_steps = len(time_array)
    capacity = setup_data['capacity']
    coulombic_efficiency = setup_data['columbic_efficiency']
    R_p = setup_data['R_p']
    R_s = setup_data['R_s']
    cell_voltage_upper_limit = setup_data['voltage_limits']['cell_upper']
    cell_voltage_lower_limit = setup_data['voltage_limits']['cell_lower']
    BatteryData_SOH1 = setup_data['BatteryData_SOH1']
    BatteryData_SOH2 = setup_data['BatteryData_SOH2']
    BatteryData_SOH3 = setup_data['BatteryData_SOH3']
    parallel_groups = sorted(set(cell['parallel_group'] for cell in cells))
    sim_SOC = np.array([cell['SOC'] for cell in cells])
    sim_Temp = np.array([cell['temperature'] for cell in cells])
    sim_SOH = np.array([cell['SOH'] for cell in cells])
    sim_DCIR_AgingFactor = np.array([cell['DCIR_AgingFactor'] for cell in cells])
    sim_V_RC1 = np.zeros(N_cells)
    sim_V_RC2 = np.zeros(N_cells)
    sim_V_term = np.zeros(N_cells)
    sim_V_OCV = np.zeros(N_cells)
    sim_V_R0 = np.zeros(N_cells)
    sim_V_R1 = np.zeros(N_cells)
    sim_V_R2 = np.zeros(N_cells)
    sim_V_C1 = np.zeros(N_cells)
    sim_V_C2 = np.zeros(N_cells)
    # History dict for in-memory temp storage; will write to HDF5 in chunks
    history = {
        'Vterm': np.zeros((N_cells, time_steps), dtype='float32'),
        'SOC': np.zeros((N_cells, time_steps), dtype='float32'),
        'OCV': np.zeros((N_cells, time_steps), dtype='float32'),
        'Qgen': np.zeros((N_cells, time_steps), dtype='float32'),
        'Qirrev': np.zeros((N_cells, time_steps), dtype='float32'),
        'Qrev': np.zeros((N_cells, time_steps), dtype='float32'),
        'dt': np.zeros(time_steps, dtype='float32'),
        'V_RC1': np.zeros((N_cells, time_steps), dtype='float32'),
        'V_RC2': np.zeros((N_cells, time_steps), dtype='float32'),
        'V_R0': np.zeros((N_cells, time_steps), dtype='float32'),
        'V_R1': np.zeros((N_cells, time_steps), dtype='float32'),
        'V_R2': np.zeros((N_cells, time_steps), dtype='float32'),
        'V_C1': np.zeros((N_cells, time_steps), dtype='float32'),
        'V_C2': np.zeros((N_cells, time_steps), dtype='float32'),
        'energy_throughput': np.zeros((N_cells, time_steps), dtype='float32'),
        'Qgen_cumulative': np.zeros((N_cells, time_steps), dtype='float32'),
    }
    I_cells_matrix = np.zeros((N_cells, time_steps), dtype='float32')
    V_parallel_matrix = np.zeros((N_cells, time_steps), dtype='float32')
    V_terminal_module_matrix = np.zeros(time_steps, dtype='float32')
    # Create HDF5 file and pre-allocate
    h5_path = 'simulation_results.h5'
    with h5py.File(h5_path, 'w') as f:
        for key, arr in history.items():
            f.create_dataset(key, shape=arr.shape, dtype='float32', compression='gzip', chunks=True)
   
    # Pre-create interpolators for each mode (using SOH1 since all SOH >=0.9)
    interps = {}
    temp_keys = ['T05', 'T15', 'T25', 'T35', 'T45', 'T55']
    temp_vals = [5, 15, 25, 35, 45, 55]
    Temp_grid = np.array(temp_vals)
    for mode in ['CHARGE', 'DISCHARGE']:
        Data_Temp = BatteryData_SOH1[mode]
        parameter_grids = []
        for col in range(1, 7):
            grid = np.stack([Data_Temp[temp][:, col] for temp in temp_keys], axis=1)
            parameter_grids.append(grid)
        SOC_grid = Data_Temp['T05'][:, 0]
        interps[mode] = [
            RegularGridInterpolator((SOC_grid, Temp_grid), parameter_grids[i], bounds_error=False, fill_value=None)
            for i in range(6)
        ]
   
    # Set up dynamic plotting
    plt.ion() # Turn on interactive mode
    fig = plt.figure(figsize=(14, 12))
    start_time = time.time()
    last_plot_time = start_time
   
    chunk_size = 1000 # Adjust based on memory
    for t in range(time_steps - 1):
        dt = time_array[t + 1] - time_array[t]
        history['dt'][t] = dt
        I_module_current = I_module[t]
        mode = 'CHARGE' if I_module_current < 0 else 'DISCHARGE'

        def compute_voltages(I_mod, mode):
            V_OCV = np.zeros(N_cells)
            R0_arr = np.zeros(N_cells)
            R1_arr = np.zeros(N_cells)
            R2_arr = np.zeros(N_cells)
            C1_arr = np.zeros(N_cells)
            C2_arr = np.zeros(N_cells)
            V_RC1_new = np.zeros(N_cells)
            V_RC2_new = np.zeros(N_cells)
            V_term = np.zeros(N_cells)
            I_cell_arr = np.zeros(N_cells)
            V_parallel = np.zeros(N_cells)
            for group_id in parallel_groups:
                group_cells = [i for i, cell in enumerate(cells) if cell['parallel_group'] == group_id]
                N = len(group_cells)
                A = np.zeros((N + 1, N + 1))
                b = np.zeros(N + 1)
                for i, cell_idx in enumerate(group_cells):
                    SOC = sim_SOC[cell_idx]
                    Temp_C = sim_Temp[cell_idx] - 273.15
                    SOH = sim_SOH[cell_idx]
                    DCIR = sim_DCIR_AgingFactor[cell_idx]
                    V_rc1 = sim_V_RC1[cell_idx]
                    V_rc2 = sim_V_RC2[cell_idx]
                    OCV, R0, R1, R2, C1, C2 = [interps[mode][j]((SOC, Temp_C)) for j in range(6)]
                    R0 *= DCIR
                    R1 *= DCIR
                    R2 *= DCIR
                    V_OCV[cell_idx] = OCV
                    R0_arr[cell_idx] = R0
                    R1_arr[cell_idx] = R1
                    R2_arr[cell_idx] = R2
                    C1_arr[cell_idx] = C1
                    C2_arr[cell_idx] = C2
                    tau1 = R1 * C1
                    tau2 = R2 * C2
                    K = OCV - (V_rc1 * np.exp(-dt / tau1) + V_rc2 * np.exp(-dt / tau2))
                    R_eff = R0 + 2 * R_p + R1 * (1 - np.exp(-dt / tau1)) + R2 * (1 - np.exp(-dt / tau2))
                    A[i, i] = R_eff
                    A[i, -1] = 1
                    b[i] = K
                A[-1, :N] = 1
                b[-1] = I_mod
                x = np.linalg.solve(A, b)
                V_par = x[-1]
                for i, cell_idx in enumerate(group_cells):
                    I_cell = x[i]
                    I_cell_arr[cell_idx] = I_cell
                    R1 = R1_arr[cell_idx]
                    R2 = R2_arr[cell_idx]
                    C1 = C1_arr[cell_idx]
                    C2 = C2_arr[cell_idx]
                    tau1 = R1 * C1
                    tau2 = R2 * C2
                    V_RC1_new[cell_idx] = sim_V_RC1[cell_idx] * np.exp(-dt / tau1) + R1 * I_cell * (1 - np.exp(-dt / tau1))
                    V_RC2_new[cell_idx] = sim_V_RC2[cell_idx] * np.exp(-dt / tau2) + R2 * I_cell * (1 - np.exp(-dt / tau2))
                    OCV = V_OCV[cell_idx]
                    R0 = R0_arr[cell_idx]
                    V_term[cell_idx] = OCV - I_cell * R0 - V_RC1_new[cell_idx] - V_RC2_new[cell_idx]
                    V_term[cell_idx] = round(V_term[cell_idx], 5)
                    V_parallel[cell_idx] = V_par
            return V_term, V_RC1_new, V_RC2_new, I_cell_arr, V_OCV, R0_arr, R1_arr, R2_arr, C1_arr, C2_arr, V_parallel

        # Compute with proposed I_module_current
        V_term, V_RC1, V_RC2, I_cells, sim_V_OCV, sim_V_R0, sim_V_R1, sim_V_R2, sim_V_C1, sim_V_C2, V_parallel_temp = compute_voltages(I_module_current, mode)
        V_parallel_matrix[:, t] = V_parallel_temp

        if mode == 'CHARGE' and np.max(V_term) > cell_voltage_upper_limit:
            print(f"Adjusting charging current at step {t} to prevent overvoltage.")
            low = 0.0
            high = abs(I_module_current)
            for _ in range(20):
                mid = (low + high) / 2
                I_test = -mid
                V_term_test, _, _, _, _, _, _, _, _, _, _ = compute_voltages(I_test, mode)
                if np.max(V_term_test) > cell_voltage_upper_limit:
                    high = mid
                else:
                    low = mid
            I_module_current = -low
            I_module[t] = I_module_current
            # Recompute with adjusted
            V_term, V_RC1, V_RC2, I_cells, sim_V_OCV, sim_V_R0, sim_V_R1, sim_V_R2, sim_V_C1, sim_V_C2, V_parallel_temp = compute_voltages(I_module_current, mode)
            V_parallel_matrix[:, t] = V_parallel_temp

        if mode == 'DISCHARGE' and not np.isnan(cell_voltage_lower_limit) and np.min(V_term) < cell_voltage_lower_limit:
            print(f"Adjusting discharge current at step {t} to prevent undervoltage.")
            low = 0.0
            high = I_module_current
            for _ in range(20):
                mid = (low + high) / 2
                I_test = mid
                V_term_test, _, _, _, _, _, _, _, _, _, _ = compute_voltages(I_test, mode)
                if np.min(V_term_test) < cell_voltage_lower_limit:
                    high = mid
                else:
                    low = mid
            I_module_current = low
            I_module[t] = I_module_current
            # Recompute with adjusted
            V_term, V_RC1, V_RC2, I_cells, sim_V_OCV, sim_V_R0, sim_V_R1, sim_V_R2, sim_V_C1, sim_V_C2, V_parallel_temp = compute_voltages(I_module_current, mode)
            V_parallel_matrix[:, t] = V_parallel_temp

        # Update sim states
        sim_V_term[:] = V_term
        sim_V_RC1[:] = V_RC1
        sim_V_RC2[:] = V_RC2

        for cell_idx in range(N_cells):
            I_cell = I_cells[cell_idx]
            next_SOC = calculate_next_soc(I_cell, dt, capacity, sim_SOC[cell_idx],
                                          coulombic_efficiency, sim_SOH[cell_idx])
            q_irr = I_cell ** 2 * sim_V_R0[cell_idx]
            temp_K = sim_Temp[cell_idx]
            q_rev = calculate_reversible_heat(temp_K, I_cell, sim_SOC[cell_idx])
            q_gen = q_irr + q_rev
            sim_SOC[cell_idx] = next_SOC
            energy = abs(I_cell * sim_V_term[cell_idx] * dt) / (3600 * 1000)
            I_cells_matrix[cell_idx, t] = I_cell
            history['SOC'][cell_idx, t] = next_SOC
            history['Vterm'][cell_idx, t] = sim_V_term[cell_idx]
            history['Qgen'][cell_idx, t] = q_gen
            history['Qirrev'][cell_idx, t] = q_irr
            history['Qrev'][cell_idx, t] = q_rev
            history['OCV'][cell_idx, t] = sim_V_OCV[cell_idx]
            history['V_RC1'][cell_idx, t] = sim_V_RC1[cell_idx]
            history['V_RC2'][cell_idx, t] = sim_V_RC2[cell_idx]
            history['V_R0'][cell_idx, t] = sim_V_R0[cell_idx]
            history['V_R1'][cell_idx, t] = sim_V_R1[cell_idx]
            history['V_R2'][cell_idx, t] = sim_V_R2[cell_idx]
            history['V_C1'][cell_idx, t] = sim_V_C1[cell_idx]
            history['V_C2'][cell_idx, t] = sim_V_C2[cell_idx]
            history['energy_throughput'][cell_idx, t] = (
                history['energy_throughput'][cell_idx, t - 1] + energy if t > 0 else energy
            )
            history['Qgen_cumulative'][cell_idx, t] = (
                history['Qgen_cumulative'][cell_idx, t - 1] + q_gen if t > 0 else q_gen
            )
        V_terminal_module_matrix = calculate_module_voltage(
            cells, V_parallel_matrix, I_module, R_s, t, V_terminal_module_matrix
        )
        # Chunk save
        if t % chunk_size == 0 and t > 0:
            start = t - chunk_size + 1
            end = t + 1
            with h5py.File(h5_path, 'a') as f:
                for key in history:
                    if history[key].ndim == 2:
                        f[key][:, start:end] = history[key][:, start:end]
                    else:
                        f[key][start:end] = history[key][start:end]
       
        # Dynamic plot update every 2 seconds
        current_time = time.time()
        if current_time - last_plot_time >= 10:
            update_plot(t, history, I_module, cells)
            last_plot_time = current_time
   
    # Final save
    with h5py.File(h5_path, 'a') as f:
        for key in history:
            f[key][:] = history[key][:]
   
    plt.ioff() 
    return h5_path