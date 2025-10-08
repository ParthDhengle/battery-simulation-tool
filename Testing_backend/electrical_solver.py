# Updated and optimized electrical_solver.py with HDF5 chunking
import numpy as np
import h5py
from battery_params import get_battery_params
from next_soc import calculate_next_soc
from parallel_group_currents import calculate_parallel_group_currents
from module_voltage import calculate_module_voltage
from reversible_heat import calculate_reversible_heat

def run_electrical_solver(setup_data):
    cells = setup_data['cells']
    N_cells = len(cells)
    time = setup_data['time']
    I_module = setup_data['I_module']
    time_steps = len(time)
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

    chunk_size = 1000  # Adjust based on memory
    for t in range(time_steps - 1):
        dt = time[t + 1] - time[t]
        history['dt'][t] = dt
        I_module_current = I_module[t]
        mode = 'CHARGE' if I_module_current < 0 else 'DISCHARGE'

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

                OCV, R0, R1, R2, C1, C2 = get_battery_params(SOC, Temp_C, mode, SOH, DCIR,
                                                             BatteryData_SOH1, BatteryData_SOH2, BatteryData_SOH3)

                tau1 = R1 * C1
                tau2 = R2 * C2
                K = OCV - (V_rc1 * np.exp(-dt / tau1) + V_rc2 * np.exp(-dt / tau2))
                R_eff = R0 + 2 * R_p + R1 * (1 - np.exp(-dt / tau1)) + R2 * (1 - np.exp(-dt / tau2))

                A[i, i] = R_eff
                A[i, -1] = 1
                b[i] = K

                sim_V_OCV[cell_idx] = OCV
                sim_V_R0[cell_idx] = R0
                sim_V_R1[cell_idx] = R1
                sim_V_R2[cell_idx] = R2
                sim_V_C1[cell_idx] = C1
                sim_V_C2[cell_idx] = C2

            A[-1, :N] = 1
            b[-1] = I_module[t]

            x = np.linalg.solve(A, b)
            V_parallel = x[-1]

            for i, cell_idx in enumerate(group_cells):
                I_cell = x[i]
                OCV = sim_V_OCV[cell_idx]
                R0 = sim_V_R0[cell_idx]
                R1 = sim_V_R1[cell_idx]
                R2 = sim_V_R2[cell_idx]
                C1 = sim_V_C1[cell_idx]
                C2 = sim_V_C2[cell_idx]

                tau1 = R1 * C1
                tau2 = R2 * C2

                V_rc1 = sim_V_RC1[cell_idx] * np.exp(-dt / tau1) + R1 * I_cell * (1 - np.exp(-dt / tau1))
                V_rc2 = sim_V_RC2[cell_idx] * np.exp(-dt / tau2) + R2 * I_cell * (1 - np.exp(-dt / tau2))
                Vterm = OCV - I_cell * R0 - V_rc1 - V_rc2
                Vterm = round(Vterm, 5)

                if Vterm > cell_voltage_upper_limit or (not np.isnan(cell_voltage_lower_limit) and Vterm < cell_voltage_lower_limit):
                    print(f"Simulation stopped: Cell {cell_idx} terminal voltage cutoff at step {t}, V = {Vterm:.4f} V")
                    # Save current state before return
                    with h5py.File(h5_path, 'a') as f:
                        for key in history:
                            f[key][:] = history[key][:]
                    return h5_path

                next_SOC = calculate_next_soc(I_cell, dt, capacity, sim_SOC[cell_idx],
                                              coulombic_efficiency, sim_SOH[cell_idx])
                q_irr = I_cell ** 2 * R0
                temp_K = sim_Temp[cell_idx]
                q_rev = calculate_reversible_heat(temp_K, I_cell, sim_SOC[cell_idx])
                q_gen = q_irr + q_rev

                sim_SOC[cell_idx] = next_SOC
                sim_V_RC1[cell_idx] = V_rc1
                sim_V_RC2[cell_idx] = V_rc2
                sim_V_term[cell_idx] = Vterm

                energy = abs(I_cell * Vterm * dt) / (3600 * 1000)

                I_cells_matrix[cell_idx, t] = I_cell
                V_parallel_matrix[cell_idx, t] = V_parallel
                history['SOC'][cell_idx, t] = next_SOC
                history['Vterm'][cell_idx, t] = Vterm
                history['Qgen'][cell_idx, t] = q_gen
                history['Qirrev'][cell_idx, t] = q_irr
                history['Qrev'][cell_idx, t] = q_rev
                history['OCV'][cell_idx, t] = OCV
                history['V_RC1'][cell_idx, t] = sim_V_RC1[cell_idx]
                history['V_RC2'][cell_idx, t] = sim_V_RC2[cell_idx]
                history['V_R0'][cell_idx, t] = R0
                history['V_R1'][cell_idx, t] = R1
                history['V_R2'][cell_idx, t] = R2
                history['V_C1'][cell_idx, t] = C1
                history['V_C2'][cell_idx, t] = C2
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

    # Final save
    with h5py.File(h5_path, 'a') as f:
        for key in history:
            f[key][:] = history[key][:]

    return h5_path