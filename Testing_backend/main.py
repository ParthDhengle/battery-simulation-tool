import json
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
    history = run_electrical_solver(setup_data)

    # Print summary
    print("\nSimulation Complete! History Structure:")
    for key, val in history.items():
        print(f"- {key}: shape {val.shape}")
        if val.ndim == 2:
            print(f"  Sample (cell 0, first 5 ts): {val[0, :5]}")
        else:
            print(f"  Sample (first 5 ts): {val[:5]}")

    # Save as JSON
    history_json = {k: v.tolist() for k, v in history.items()}
    with open('simulation_results.json', 'w') as f:
        json.dump(history_json, f)
    print("\nFull results saved to simulation_results.json")