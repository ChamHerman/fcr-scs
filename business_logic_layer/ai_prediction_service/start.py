"""
Bootstrap launcher for the AI valuation sidecar.

`npm run dev` must never crash just because the system Python lacks flask.
Fast path: system Python already has the requirements -> run app.py directly.
Slow path (first run only): create a local .venv, pip install requirements.txt,
then run app.py with the venv interpreter.
"""

import os
import subprocess
import sys
import venv

BASE = os.path.dirname(os.path.abspath(__file__))
VENV_DIR = os.path.join(BASE, ".venv")
REQUIREMENTS = os.path.join(BASE, "requirements.txt")


def venv_python() -> str:
    if os.name == "nt":
        return os.path.join(VENV_DIR, "Scripts", "python.exe")
    return os.path.join(VENV_DIR, "bin", "python")


def interpreter_has_deps(python: str) -> bool:
    probe = "import flask, joblib, numpy, pandas, sklearn"
    result = subprocess.run([python, "-c", probe], capture_output=True)
    return result.returncode == 0


def ensure_venv() -> str:
    py = venv_python()
    if not os.path.exists(py):
        print("[ai] System Python missing dependencies; creating .venv (one-time setup)...")
        venv.create(VENV_DIR, with_pip=True)
    if not interpreter_has_deps(py):
        print("[ai] Installing AI service dependencies into .venv (one-time setup)...")
        subprocess.run([py, "-m", "pip", "install", "--disable-pip-version-check", "-r", REQUIREMENTS], check=True)
    return py


def main() -> int:
    system_python = sys.executable
    if interpreter_has_deps(system_python):
        return subprocess.call([system_python, os.path.join(BASE, "app.py")])
    try:
        py = ensure_venv()
    except Exception as exc:  # noqa: BLE001 - report and let the rest of dev keep running
        print(f"[ai] Could not prepare the AI service environment: {exc}")
        print("[ai] Start backend/frontend remain available; AI valuation endpoints are offline.")
        return 0
    return subprocess.call([py, os.path.join(BASE, "app.py")])


if __name__ == "__main__":
    sys.exit(main())
