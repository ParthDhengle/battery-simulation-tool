# Updated main.py with HDF5 loading and graphing
import h5py
import matplotlib.pyplot as plt
import numpy as np
from data_processor import create_setup_from_json
from electrical_solver import run_electrical_solver

if __name__ == '__main__':
    # Paths to JSON files
    pack_json = 'pack_config.json'
    drive_json = 'drive_config.json'
    sim_json = 'model_config.json'

    print("Loading and processing configs...")
    setup_data = create_setup_from_json(pack_json, drive_json, sim_json)

    print("Running simulation...")
    h5_path = run_electrical_solver(setup_data)

    print("\nSimulation Complete! History saved to", h5_path)

    # Load from HDF5 and display graph
    with h5py.File(h5_path, 'r') as f:
        dt = f['dt'][:]
        time_cum = np.cumsum(dt)
        soc_cell0 = f['SOC'][0, :]
        vterm_cell0 = f['Vterm'][0, :]
        qgen_cell0 = f['Qgen'][0, :]

    fig, axs = plt.subplots(3, 1, figsize=(12, 12), sharex=True)
    
    axs[0].plot(time_cum, soc_cell0)
    axs[0].set_ylabel('SOC')
    axs[0].set_title('SOC for Cell 0 over Time')

    axs[1].plot(time_cum, vterm_cell0)
    axs[1].set_ylabel('Terminal Voltage (V)')
    axs[1].set_title('Terminal Voltage for Cell 0 over Time')

    axs[2].plot(time_cum, qgen_cell0)
    axs[2].set_xlabel('Time (s)')
    axs[2].set_ylabel('Heat Generation (W)')
    axs[2].set_title('Heat Generation for Cell 0 over Time')

    plt.tight_layout()
    plt.show()