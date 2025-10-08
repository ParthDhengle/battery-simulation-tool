import matplotlib.pyplot as plt

def init_initial_cell_conditions(
    cells,
    initial_temperature,
    initial_SOC,
    initial_SOH,
    initial_DCIR_AgingFactor,
    varying_cells=None,
    varying_temps=None,
    varying_SOCs=None,
    varying_SOHs=None,
    varying_DCIRs=None
):
    for cell in cells:
        cell['temperature'] = initial_temperature
        cell['SOC'] = initial_SOC
        cell['SOH'] = initial_SOH
        cell['DCIR_AgingFactor'] = initial_DCIR_AgingFactor

    if all(v is not None for v in [varying_cells, varying_temps, varying_SOCs, varying_SOHs, varying_DCIRs]):
        if len(varying_cells) != len(varying_temps) == len(varying_SOCs) == len(varying_SOHs) == len(varying_DCIRs):
            raise ValueError("All varying_* lists must be the same length.")

        for idx, cell_idx in enumerate(varying_cells):
            if cell_idx < 1 or cell_idx > len(cells):
                raise IndexError(f"Invalid cell index {cell_idx} specified.")
            cell = cells[cell_idx - 1]
            cell['temperature'] = varying_temps[idx]
            cell['SOC'] = varying_SOCs[idx]
            cell['SOH'] = varying_SOHs[idx]
            cell['DCIR_AgingFactor'] = varying_DCIRs[idx]

    # _plot_initial_conditions(cells)  # Uncomment to plot
    return cells

def _plot_initial_conditions(cells):
    fig, ax = plt.subplots()
    ax.set_aspect('equal')
    ax.set_xlabel('X Position (m)')
    ax.set_ylabel('Y Position (m)')
    ax.set_title('Cell Initial Conditions Distribution (Projection)')

    for cell in cells:
        x, y, z = cell['position']
        r = cell.get('radius', 0.01)
        circle = plt.Circle((x, y), r, edgecolor='blue', facecolor='none')
        ax.add_patch(circle)

        annotation = (
            f"Cell {cell['number']} ({cell['label']})\n"
            f"T: {cell['temperature']:.1f} K\n"
            f"SOC: {cell['SOC']*100:.1f}%\n"
            f"SOH: {cell['SOH']*100:.1f}%\n"
            f"DCIR: {cell['DCIR_AgingFactor']:.2f}\nZ={z}"
        )
        ax.text(x, y, annotation, ha='center', va='center', fontsize=8, color='black')

    plt.grid(True)
    plt.show()