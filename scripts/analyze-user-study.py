"""Agrega observaciones anónimas de la evaluación; un CSV vacío no acredita resultados."""

import argparse
import csv
import json
import math
import re
from pathlib import Path
from statistics import mean

COLUMNS = {"participant", "condition", "task", "seconds", "corrections", "success", "utility", "understanding"}


def analyze(path):
    with path.open(encoding="utf-8-sig", newline="") as source:
        reader = csv.DictReader(source)
        if set(reader.fieldnames or []) != COLUMNS:
            raise ValueError("El CSV debe conservar las columnas de la plantilla anónima")
        rows = list(reader)
    observations = []
    seen = set()
    for row in rows:
        participant, condition, task = row["participant"], row["condition"], row["task"]
        if (
            not re.fullmatch(r"P[0-9]{2,3}", participant)
            or condition not in {"baseline", "adaptive"}
            or task not in {"carpinteria", "diseno", "eventos"}
        ):
            raise ValueError("Participante, condición o tarea inválidos; no registrar nombres ni correos")
        key = (participant, condition, task)
        if key in seen:
            raise ValueError("Hay observaciones duplicadas")
        seen.add(key)
        seconds, corrections = float(row["seconds"]), int(row["corrections"])
        success, utility, understanding = int(row["success"]), int(row["utility"]), int(row["understanding"])
        if (
            not math.isfinite(seconds)
            or not 0 < seconds <= 3600
            or not 0 <= corrections <= 100
            or success not in {0, 1}
            or not 1 <= utility <= 5
            or not 1 <= understanding <= 5
        ):
            raise ValueError("Tiempo, correcciones o puntuaciones fuera de rango")
        observations.append(
            {
                **row,
                "seconds": seconds,
                "corrections": corrections,
                "success": success,
                "utility": utility,
                "understanding": understanding,
            }
        )
    groups = {}
    for condition in ("baseline", "adaptive"):
        group = [row for row in observations if row["condition"] == condition]
        groups[condition] = {
            "observations": len(group),
            **{
                name: mean(row[name] for row in group) if group else None
                for name in ("seconds", "corrections", "success", "utility", "understanding")
            },
        }
    paired = 0
    changes = []
    for participant in {row["participant"] for row in observations}:
        own = [row for row in observations if row["participant"] == participant]
        base = [row["seconds"] for row in own if row["condition"] == "baseline"]
        adaptive = [row["seconds"] for row in own if row["condition"] == "adaptive"]
        if base and adaptive:
            paired += 1
            changes.append((mean(base) - mean(adaptive)) / mean(base) * 100)
    return {
        "status": "observations_available" if observations else "pending_real_observations",
        "participants": len({row["participant"] for row in observations}),
        "pairedParticipants": paired,
        "conditions": groups,
        "pairedMeanTimeReductionPercent": mean(changes) if changes else None,
        "limitations": [
            "Evaluación exploratoria; el orden y las tareas pueden introducir sesgos.",
            "No demuestra causalidad ni significación estadística.",
        ],
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("csv", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        result = analyze(args.csv)
    except (ValueError, OSError) as error:
        raise SystemExit(str(error)) from None
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False))
