# Updated main.py to handle partial data from early stop
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
    I_module = setup_data['I_module']  # Get before simulation
    print("Running simulation...")
    h5_path = run_electrical_solver(setup_data)
    print("\nSimulation Complete! History saved to", h5_path)
    # Load from HDF5 and display graph
    with h5py.File(h5_path, 'r') as f:
        dt = f['dt'][:]
        soc_cell0 = f['SOC'][0, :]
        vterm_cell0 = f['Vterm'][0, :]
        qgen_cell0 = f['Qgen'][0, :]
    # Find effective end (last non-zero dt index +1)
    effective_end = np.where(dt > 0)[0][-1] + 1 if np.any(dt > 0) else 0
    dt = dt[:effective_end]
    soc_cell0 = soc_cell0[:effective_end]
    vterm_cell0 = vterm_cell0[:effective_end]
    qgen_cell0 = qgen_cell0[:effective_end]
    I_module = I_module[:effective_end]
    time_cum = np.cumsum(dt)
    time_days = time_cum / 86400  # Convert to days
    fig, axs = plt.subplots(4, 1, figsize=(14, 12), sharex=True)
    fig.suptitle('Simulation Results for Cell 0 Over 1 Year (Calendar Time)', fontsize=16)
    # SOC plot
    axs[0].plot(time_days, soc_cell0, color='blue', label='SOC')
    axs[0].set_ylabel('State of Charge (SOC)', fontsize=12)
    axs[0].set_title('SOC Over Time', fontsize=14)
    axs[0].grid(True, linestyle='--', alpha=0.7)
    axs[0].set_ylim(0, 1)  # Force full SOC range
    axs[0].legend(loc='upper right')
    # Terminal Voltage plot
    axs[1].plot(time_days, vterm_cell0, color='green', label='Terminal Voltage')
    axs[1].set_ylabel('Terminal Voltage (V)', fontsize=12)
    axs[1].set_title('Terminal Voltage Over Time', fontsize=14)
    axs[1].grid(True, linestyle='--', alpha=0.7)
    axs[1].set_ylim(0, 5)  # Reasonable voltage range
    axs[1].legend(loc='upper right')
    # Heat Generation plot
    axs[2].plot(time_days, qgen_cell0, color='red', label='Heat Generation')
    axs[2].set_ylabel('Heat Generation (W)', fontsize=12)
    axs[2].set_title('Heat Generation Over Time', fontsize=14)
    axs[2].grid(True, linestyle='--', alpha=0.7)
    # Safe ylim handling
    if len(qgen_cell0) > 0:
        q_max = np.max(qgen_cell0)
        axs[2].set_ylim(-1, q_max * 1.1 if q_max > 0 else 1)  # Use np.max
    else:
        axs[2].set_ylim(-1, 1)  # Default if empty
    axs[2].legend(loc='upper right')
    # Module Current plot (added for clarity on activity)
    axs[3].plot(time_days, I_module, color='purple', label='Module Current')
    axs[3].set_xlabel('Time (Days)', fontsize=12)
    axs[3].set_ylabel('Current (A)', fontsize=12)
    axs[3].set_title('Module Current Over Time', fontsize=14)
    axs[3].grid(True, linestyle='--', alpha=0.7)
    axs[3].legend(loc='upper right')
    # Month labels
    month_starts = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334]
    month_labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    axs[3].set_xticks(month_starts)
    axs[3].set_xticklabels(month_labels, rotation=45, ha='right')
    # Shade vacation periods (from calendarRules)
    vacation_periods = [  # Approximate day ranges based on rules
        (90, 92), (101, 102), # Apr 1-2, 13-14
        (181, 186), (209, 210), # Jul 3-5,29-30
    ]
    for start, end in vacation_periods:
        for ax in axs:
            ax.axvspan(start, end, color='yellow', alpha=0.3, label='Vacation' if start == 90 else None)
    axs[0].legend(loc='upper right') # Update legend if shaded
    plt.tight_layout(rect=[0, 0.03, 1, 0.95])
    plt.savefig('simulation_plot.png') # Save to file for zoom/view
    plt.show()