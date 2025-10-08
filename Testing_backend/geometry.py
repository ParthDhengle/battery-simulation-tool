import matplotlib.pyplot as plt

def init_geometry(frontend_cells, layers, form_factor):
    cells = []
    fe_idx = 0
    for layer_idx, layer in enumerate(layers):
        grid_type = layer['grid_type']
        n_rows = layer['n_rows']
        n_cols = layer['n_cols']
        pitch_x = layer['pitch_x']
        pitch_y = layer['pitch_y']
        z_center = layer['z_center']
        
        for r in range(1, n_rows + 1):
            for c in range(1, n_cols + 1):
                x_pos = (c - 1) * pitch_x
                y_pos = (r - 1) * pitch_y
                
                label = f"R{r}C{c}L{layer_idx+1}"
                dims = frontend_cells[fe_idx]['dims']  # Sync from frontend
                cell_data = {
                    'position': [x_pos, y_pos, z_center],
                    'dims': dims,
                    'label': label,
                    'layer_index': layer_idx + 1,
                    'row_index': r,
                    'col_index': c
                }
                cells.append(cell_data)
                fe_idx += 1
    
    # _plot_geometry(cells)
    return cells

def _plot_geometry(cells):
    fig, ax = plt.subplots()
    ax.set_aspect('equal')
    ax.set_xlabel('X Position (m)')
    ax.set_ylabel('Y Position (m)')
    ax.set_title('Module Geometry Visualization (Projection, ignoring Z)')

    for cell in cells:
        x, y, z = cell['position']
        radius = cell['dims'].get('radius', 0.01) if 'radius' in cell['dims'] else 0.01
        label = cell['label']

        circle = plt.Circle((x, y), radius, edgecolor='blue', facecolor='none')
        ax.add_patch(circle)

        annotation_text = f"{label} (Z={z})"
        ax.text(x, y, annotation_text, ha='center', va='center', fontsize=10)

    plt.grid(True)
    plt.show()