### Por endpoint

| Endpoint | Peticiones | Promedio (ms) | p90 | p95 | p99 | Error % |
|---|---:|---:|---:|---:|---:|---:|
| `GET /v1/planes-ahorro` | 8373 | 399 | 940 | 1129 | 1614 | 0.00 |
| `GET /v1/planes-ahorro/{id}` | 5513 | 357 | 882 | 1076 | 1547 | 0.04 |
| `GET .../movimientos` | 4990 | 497 | 1537 | 1926 | 2321 | 0.02 |
| `GET .../cuotas` | 3335 | 514 | 1541 | 1954 | 2328 | 0.00 |
| `GET /v1/cuentas-debito` | 3286 | 483 | 1003 | 1205 | 1578 | 0.03 |
| `POST .../aportes` | 2221 | 548 | 1633 | 1960 | 2325 | 0.05 |
| `POST /v1/planes-ahorro` | 10 | 264 | 323 | 323 | 323 | 0.00 |
| `POST /v1/auth/token` | 1 | 195 | 195 | 195 | 195 | 0.00 |

### Recursos del servidor

| Contenedor | CPU promedio % | CPU máx % | Memoria máx (MiB) |
|---|---:|---:|---:|
| postgres | 48.2 | 98.5 | 149 |
| rabbitmq | 9.9 | 64.7 | 182 |
| kong | 20.4 | 43.4 | 330 |
| api | 21.6 | 39.3 | 193 |
| core-simulado | 5.8 | 9.7 | 176 |
| core-adapter | 3.3 | 9.4 | 96 |
| batch | 1.9 | 3.7 | 90 |
| auth | 0.0 | 0.0 | 26 |
