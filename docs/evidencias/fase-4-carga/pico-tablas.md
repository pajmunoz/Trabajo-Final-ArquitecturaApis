### Por endpoint

| Endpoint | Peticiones | Promedio (ms) | p90 | p95 | p99 | Error % |
|---|---:|---:|---:|---:|---:|---:|
| `GET /v1/simulaciones` | 33421 | 145 | 190 | 216 | 283 | 96.34 |
| `GET /v1/planes-ahorro` | 8869 | 474 | 883 | 981 | 1142 | 0.00 |
| `GET /v1/planes-ahorro/{id}` | 5990 | 409 | 798 | 900 | 1071 | 0.00 |
| `GET .../movimientos` | 5285 | 613 | 1273 | 1431 | 1620 | 0.00 |
| `GET /v1/cuentas-debito` | 3583 | 563 | 949 | 1040 | 1202 | 0.00 |
| `GET .../cuotas` | 3465 | 629 | 1300 | 1437 | 1616 | 0.00 |
| `POST .../aportes` | 2400 | 671 | 1339 | 1473 | 1666 | 0.00 |
| `POST /v1/planes-ahorro` | 10 | 260 | 289 | 289 | 289 | 0.00 |
| `POST /v1/auth/token` | 1 | 203 | 203 | 203 | 203 | 0.00 |

### Recursos del servidor

| Contenedor | CPU promedio % | CPU máx % | Memoria máx (MiB) |
|---|---:|---:|---:|
| postgres | 38.9 | 96.5 | 151 |
| rabbitmq | 18.8 | 74.0 | 182 |
| kong | 18.3 | 48.3 | 324 |
| api | 16.4 | 38.1 | 189 |
| core-simulado | 5.8 | 13.7 | 164 |
| core-adapter | 2.4 | 8.0 | 113 |
| auth | 0.2 | 7.5 | 26 |
| batch | 1.7 | 4.9 | 92 |
