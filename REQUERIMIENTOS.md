# Requerimientos — Billetera de Ahorro

> Alcance final aprobado por el equipo el 22 sep 2026.
> Relacionados: [`VISION-NEGOCIO.md`](./VISION-NEGOCIO.md) · [`TAREA-FINAL.md`](./TAREA-FINAL.md)

---

## Requerimientos funcionales

| ID | Requerimiento | Nota |
|---|---|---|
| **RF-01.1** | Crear uno o varios planes con nombre, monto objetivo y plazo | Sin monto mínimo ni máximo |
| **RF-01.2** | Modalidad de ahorro: cuota fija mensual | |
| **RF-01.3** | Elegir y modificar la fecha mensual del débito | |
| **RF-01.4** | Consultar y filtrar el historial de planes (activos, completados, cancelados) | Filtros + paginación por offset |
| **RF-01.5** | Consultar los movimientos de un plan | Paginación por cursor |
| **RF-01.6** | Bloquear el plan a plazo para obtener mejor tasa | Un booleano y una tasa; sostiene la monetización |
| **RF-02.1** | Simular el rendimiento proyectado (monto acumulado + intereses) | Público y anónimo |
| **RF-03.1** | Programar y ejecutar el débito automático | Política de 5 intentos a 24 h |
| **RF-04.1** | Cancelar un plan y devolver los fondos a la cuenta principal | |
| **RF-04.2** | Penalidad al cancelar un plan bloqueado: pierde los intereses devengados | Regla única, sin tabla |
| **RF-05.1** | Mostrar el progreso de la meta (barra y porcentaje) | Campo calculado `saldo / montoMeta`, no es un endpoint |
| **RF-05.2** | Notificar débitos ejecutados y eventos del plan | Demuestra EDA |

## Requerimientos no funcionales

| ID | Requerimiento | Nota |
|---|---|---|
| **RNF-01.1** | p95 < 500 ms en endpoints síncronos | Umbral exigido por la rúbrica |
| **RNF-01.2** | Procesamiento batch del corte de débitos | |
| **RNF-01.3** | Escalado horizontal automático | |
| **RNF-02.1** | OAuth 2.0 + JWT de corta duración | Exigido por la rúbrica |
| **RNF-02.2** | TLS 1.3 en tránsito, AES-256 en reposo | |
| **RNF-02.3** | Consistencia ACID en los movimientos de saldo | |
| **RNF-03.1** | Desacoplamiento del core legacy vía EDA | |
| **RNF-03.2** | Disponibilidad 99.9% | Meta de diseño, no resultado medido |
| **RNF-03.3** | Auditoría inmutable por transacción | La provee el ledger |
