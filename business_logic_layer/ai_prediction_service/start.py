"""
Bootstrap launcher for the AI valuation sidecar.

Always uses the dedicated isolated virtual environment (.venv) to run the AI
valuation sidecar, completely ignoring the user's global/base Python packages
to prevent version conflicts.

Targeted for Windows (.venv/Scripts/python.exe), with fallback for Unix.
"""

import os
import subprocess
import sys
import venv

BASE = os.path.dirname(os.path.abspath(__file__))
VENV_DIR = os.path.join(BASE, ".venv")
REQUIREMENTS = os.path.join(BASE, "requirements.txt")


def venv_python() -> str:
    # Dedicated isolated environment interpreter (Windows priority)
    if os.name == "nt":
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    return os.path.join(VENV_DIR, "bin", "python")


def interpreter_has_deps(python_exe: str) -> bool:
    probe = "import flask, joblib, numpy, pandas, sklearn"
    result = subprocess.run([python_exe, "-c", probe], capture_output=True)
    return result.returncode == 0


def ensure_venv() -> str:
    py = venv_python()
    if not os.path.exists(py):
        print(f"[ai] Dedicated .venv not found. Creating isolated environment at: {VENV_DIR}")
        try:
            venv.create(VENV_DIR, with_pip=True)
        except Exception as exc:
            print(f"[ai] venv.create encountered an error ({exc}); retrying with '{sys.executable} -m venv'...")
            subprocess.run([sys.executable, "-m", "venv", VENV_DIR], check=True)

    if not interpreter_has_deps(py):
        print("[ai] Installing AI service dependencies into .venv from requirements.txt...")
        subprocess.run(
            [py, "-m", "pip", "install", "--disable-pip-version-check", "-r", REQUIREMENTS],
            check=True,
        )
    return py


def main() -> int:
    try:
        py = ensure_venv()
    except Exception as exc:  # noqa: BLE001 - report and let the rest of dev keep running
        print(f"[ai] Could not prepare the AI service .venv environment: {exc}")
        print("[ai] Backend and frontend remain available; AI valuation endpoints are offline.")
        return 0

    # Determine script or command to run (default: app.py)
    if len(sys.argv) > 1 and sys.argv[1].endswith(".py"):
        target_script = sys.argv[1]
        extra_args = sys.argv[2:]
        script_path = os.path.join(BASE, target_script)
        cmd = [py, script_path, *extra_args]
        print(f"[ai] Launching {target_script} using isolated .venv Python: {py}")
    elif len(sys.argv) > 1 and sys.argv[1].startswith("-"):
        cmd = [py, *sys.argv[1:]]
        print(f"[ai] Executing command in isolated .venv Python: {py}")
    else:
        target_script = "app.py"
        extra_args = sys.argv[1:]
        script_path = os.path.join(BASE, target_script)
        cmd = [py, script_path, *extra_args]
        print(f"[ai] Launching {target_script} using isolated .venv Python: {py}")

    return subprocess.call(cmd)


if __name__ == "__main__":
    sys.exit(main())
