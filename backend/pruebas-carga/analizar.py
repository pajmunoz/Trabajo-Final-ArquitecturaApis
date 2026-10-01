#!/usr/bin/env python3
"""Convierte los resultados de k6 (CSV) y las métricas del servidor en gráficas y tablas.

Uso:  python analizar.py <escenario> [--metricas ../../docs/evidencias/fase-4-carga/metricas-<escenario>.csv]
Lee   docs/evidencias/fase-4-carga/<escenario>.csv  (k6 run --out csv=...)
Deja  ahí mismo graficas/<escenario>-*.png, <escenario>-kpis.json y -tablas.md
Requiere matplotlib.
"""
import argparse
import csv
import json
import os
from collections import Counter, defaultdict

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

VENTANA = 10  # segundos por punto de la serie de tiempo
# Las evidencias viven en docs/evidencias/fase-4-carga (una sola fuente para el informe).
DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "evidencias", "fase-4-carga")
COLORES = {"avg": "#2a6f97", "p90": "#61a5c2", "p95": "#e07a5f", "p99": "#9d0208"}


def percentil(valores, q):
    if not valores:
        return 0.0
    ordenados = sorted(valores)
    return ordenados[min(len(ordenados) - 1, int(q * len(ordenados)))]


def leer_k6(ruta):
    peticiones, vus = [], []
    with open(ruta, newline="") as f:
        for fila in csv.DictReader(f):
            m = fila["metric_name"]
            if m == "http_req_duration":
                peticiones.append(
                    {
                        "t": int(fila["timestamp"]),
                        "ms": float(fila["metric_value"]),
                        "nombre": fila.get("name", ""),
                        "status": fila.get("status", ""),
                        "escenario": fila.get("scenario", ""),
                        "fase": fila.get("extra_tags", ""),
                    }
                )
            elif m == "vus":
                vus.append((int(fila["timestamp"]), float(fila["metric_value"])))
    # Las peticiones de setup() (login y planes de prueba) no son parte de la carga.
    peticiones = [p for p in peticiones if p["escenario"] != "setup"]
    return peticiones, vus


def es_error(p):
    return not p["status"].startswith("2")


def serie(peticiones, vus):
    inicio = min(p["t"] for p in peticiones)
    cubos = defaultdict(list)
    for p in peticiones:
        cubos[(p["t"] - inicio) // VENTANA].append(p)
    vus_cubo = defaultdict(list)
    for t, v in vus:
        vus_cubo[(t - inicio) // VENTANA].append(v)
    filas = []
    for k in sorted(cubos):
        lat = [p["ms"] for p in cubos[k]]
        filas.append(
            {
                "seg": k * VENTANA,
                "rps": len(lat) / VENTANA,
                "avg": sum(lat) / len(lat),
                "p90": percentil(lat, 0.90),
                "p95": percentil(lat, 0.95),
                "p99": percentil(lat, 0.99),
                "errores": 100 * sum(es_error(p) for p in cubos[k]) / len(lat),
                "e429": sum(p["status"] == "429" for p in cubos[k]),
                "vus": max(vus_cubo.get(k, [0])),
            }
        )
    return filas


def kpis(peticiones, duracion):
    lat = [p["ms"] for p in peticiones]
    codigos = Counter(p["status"] or "sin respuesta" for p in peticiones)
    return {
        "peticiones": len(lat),
        "rps_promedio": round(len(lat) / duracion, 1),
        "promedio_ms": round(sum(lat) / len(lat), 1),
        "mediana_ms": round(percentil(lat, 0.5), 1),
        "p90_ms": round(percentil(lat, 0.90), 1),
        "p95_ms": round(percentil(lat, 0.95), 1),
        "p99_ms": round(percentil(lat, 0.99), 1),
        "max_ms": round(max(lat), 1),
        "tasa_error_pct": round(100 * sum(es_error(p) for p in peticiones) / len(lat), 3),
        "codigos": dict(sorted(codigos.items())),
    }


def tabla_endpoints(peticiones):
    grupos = defaultdict(list)
    for p in peticiones:
        grupos[p["nombre"]].append(p)
    lineas = ["| Endpoint | Peticiones | Promedio (ms) | p90 | p95 | p99 | Error % |", "|---|---:|---:|---:|---:|---:|---:|"]
    for nombre, ps in sorted(grupos.items(), key=lambda x: -len(x[1])):
        lat = [p["ms"] for p in ps]
        err = 100 * sum(es_error(p) for p in ps) / len(ps)
        lineas.append(
            f"| `{nombre}` | {len(ps)} | {sum(lat)/len(lat):.0f} | {percentil(lat,.9):.0f} | {percentil(lat,.95):.0f} | {percentil(lat,.99):.0f} | {err:.2f} |"
        )
    return "\n".join(lineas)


def punto_de_ruptura(filas):
    """Degradación: primer tramo de 2 ventanas seguidas con p95 > 500 ms o errores > 1 %.
    Saturación: ventana con el mayor throughput; después, más carga ya no rinde más RPS."""
    degradacion = None
    for a, b in zip(filas, filas[1:]):
        if all(x["p95"] > 500 or x["errores"] > 1 for x in (a, b)):
            degradacion = {"segundo": a["seg"], "rps": round(a["rps"], 1), "vus": int(a["vus"]), "p95_ms": round(a["p95"]), "errores_pct": round(a["errores"], 2)}
            break
    tope = max(filas, key=lambda f: f["rps"])
    saturacion = {"segundo": tope["seg"], "rps": round(tope["rps"], 1), "vus": int(tope["vus"]), "p95_ms": round(tope["p95"]), "errores_pct": round(tope["errores"], 2)}
    return {"degradacion": degradacion, "saturacion": saturacion}


def graficar(escenario, filas, ruptura=None):
    os.makedirs(os.path.join(DIR, "graficas"), exist_ok=True)
    minutos = [f["seg"] / 60 for f in filas]

    fig, ax = plt.subplots(figsize=(10, 4))
    ax.plot(minutos, [f["rps"] for f in filas], color="#2a6f97", label="Peticiones/s")
    ax.set_xlabel("Minuto")
    ax.set_ylabel("RPS")
    ax2 = ax.twinx()
    ax2.plot(minutos, [f["vus"] for f in filas], color="#adb5bd", linestyle="--", label="Usuarios virtuales")
    ax2.set_ylabel("VUs")
    fig.legend(loc="upper left", bbox_to_anchor=(0.07, 0.95))
    if ruptura:
        for clave, color, texto, alto in (("degradacion", "#e07a5f", "p95 > 500 ms", 0.55), ("saturacion", "#9d0208", "Saturación", 0.9)):
            punto = ruptura.get(clave)
            if punto:
                ax.axvline(punto["segundo"] / 60, color=color, linestyle=":")
                ax.annotate(f"{texto}: {punto['rps']} RPS", (punto["segundo"] / 60 + 0.03, ax.get_ylim()[1] * alto), color=color, fontsize=9)
    ax.set_title(f"{escenario}: throughput y usuarios virtuales")
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(os.path.join(DIR, "graficas", f"{escenario}-throughput.png"), dpi=130)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(10, 4))
    for clave in ("avg", "p90", "p95", "p99"):
        ax.plot(minutos, [f[clave] for f in filas], color=COLORES[clave], label=clave)
    ax.axhline(500, color="#6c757d", linestyle="--", linewidth=1, label="Objetivo p95 < 500 ms")
    ax.set_xlabel("Minuto")
    ax.set_ylabel("ms")
    ax.set_title(f"{escenario}: tiempo de respuesta")
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(os.path.join(DIR, "graficas", f"{escenario}-latencia.png"), dpi=130)
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(10, 3))
    ax.plot(minutos, [f["errores"] for f in filas], color="#9d0208", label="% errores")
    ax.axhline(1, color="#6c757d", linestyle="--", linewidth=1, label="Umbral 1 %")
    ax.set_xlabel("Minuto")
    ax.set_ylabel("% de peticiones")
    ax.set_title(f"{escenario}: tasa de error")
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(os.path.join(DIR, "graficas", f"{escenario}-errores.png"), dpi=130)
    plt.close(fig)


def a_mib(texto):
    valor = texto.strip().split("/")[0].strip()
    for sufijo, factor in (("GiB", 1024), ("MiB", 1), ("KiB", 1 / 1024), ("B", 1 / 1024 / 1024)):
        if valor.endswith(sufijo):
            return float(valor[: -len(sufijo)]) * factor
    return 0.0


def metricas_servidor(escenario, ruta):
    datos = defaultdict(list)
    with open(ruta) as f:
        for linea in f:
            partes = linea.strip().split(",")
            if len(partes) < 4:
                continue
            t, nombre, cpu, mem = partes[0], partes[1].replace("billetera-", "").replace("-1", ""), partes[2], partes[3]
            datos[nombre].append((int(t), float(cpu.rstrip("%") or 0), a_mib(mem)))
    inicio = min(x[0] for v in datos.values() for x in v)
    fig, (a1, a2) = plt.subplots(2, 1, figsize=(10, 6), sharex=True)
    resumen = ["| Contenedor | CPU promedio % | CPU máx % | Memoria máx (MiB) |", "|---|---:|---:|---:|"]
    for nombre, v in sorted(datos.items(), key=lambda x: -max(c for _, c, _ in x[1])):
        m = [(t - inicio) / 60 for t, _, _ in v]
        a1.plot(m, [c for _, c, _ in v], label=nombre)
        a2.plot(m, [mm for _, _, mm in v], label=nombre)
        cpus = [c for _, c, _ in v]
        resumen.append(f"| {nombre} | {sum(cpus)/len(cpus):.1f} | {max(cpus):.1f} | {max(mm for _, _, mm in v):.0f} |")
    a1.set_ylabel("CPU % (100 = 1 vCPU)")
    a2.set_ylabel("Memoria MiB")
    a2.set_xlabel("Minuto")
    a1.set_title(f"{escenario}: recursos del servidor (EC2 m7i-flex.large, 2 vCPU / 8 GB)")
    a1.legend(fontsize=7, ncol=4)
    a1.grid(alpha=0.3)
    a2.grid(alpha=0.3)
    fig.tight_layout()
    fig.savefig(os.path.join(DIR, "graficas", f"{escenario}-servidor.png"), dpi=130)
    plt.close(fig)
    return "\n".join(resumen)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("escenario")
    parser.add_argument("--metricas")
    parser.add_argument("--ruptura", action="store_true")
    args = parser.parse_args()

    peticiones, vus = leer_k6(os.path.join(DIR, f"{args.escenario}.csv"))
    filas = serie(peticiones, vus)
    duracion = (max(p["t"] for p in peticiones) - min(p["t"] for p in peticiones)) or 1
    resultado = {"escenario": args.escenario, "duracion_s": duracion, "total": kpis(peticiones, duracion)}

    fases = Counter(p["fase"] for p in peticiones if p["fase"])
    if fases:
        for fase in fases:
            del_fase = [p for p in peticiones if p["fase"] == fase]
            d = (max(p["t"] for p in del_fase) - min(p["t"] for p in del_fase)) or 1
            resultado[fase.replace("fase=", "")] = kpis(del_fase, d)
    meseta = [f for f in filas if f["vus"] >= 0.95 * max(x["vus"] for x in filas)]
    resultado["rps_maximo_ventana"] = round(max(f["rps"] for f in filas), 1)
    resultado["rps_meseta"] = round(sum(f["rps"] for f in meseta) / len(meseta), 1) if meseta else None

    ruptura = punto_de_ruptura(filas) if args.ruptura else None
    if args.ruptura:
        resultado["punto_de_ruptura"] = ruptura
    graficar(args.escenario, filas, ruptura)

    tablas = "### Por endpoint\n\n" + tabla_endpoints(peticiones)
    if args.metricas:
        tablas += "\n\n### Recursos del servidor\n\n" + metricas_servidor(args.escenario, args.metricas)
    with open(os.path.join(DIR, f"{args.escenario}-kpis.json"), "w") as f:
        json.dump(resultado, f, indent=2, ensure_ascii=False)
    with open(os.path.join(DIR, f"{args.escenario}-tablas.md"), "w") as f:
        f.write(tablas + "\n")
    with open(os.path.join(DIR, f"{args.escenario}-serie.csv"), "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0].keys()))
        w.writeheader()
        w.writerows(filas)
    print(json.dumps(resultado, indent=2, ensure_ascii=False))
    print(tablas)


if __name__ == "__main__":
    main()
