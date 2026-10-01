### Por endpoint

| Endpoint | Peticiones | Promedio (ms) | p90 | p95 | p99 | Error % |
|---|---:|---:|---:|---:|---:|---:|
| `GET /v1/planes-ahorro` | 27258 | 178 | 272 | 306 | 399 | 0.00 |
| `GET /v1/planes-ahorro/{id}` | 18172 | 163 | 250 | 278 | 338 | 0.00 |
| `GET .../movimientos` | 16391 | 172 | 263 | 295 | 389 | 0.00 |
| `GET .../cuotas` | 11118 | 171 | 264 | 300 | 396 | 0.00 |
| `GET /v1/cuentas-debito` | 10757 | 298 | 394 | 431 | 480 | 0.00 |
| `POST .../aportes` | 7108 | 184 | 289 | 333 | 462 | 0.01 |
| `POST /v1/planes-ahorro` | 10 | 253 | 304 | 304 | 304 | 0.00 |
| `POST /v1/auth/token` | 1 | 193 | 193 | 193 | 193 | 0.00 |

### Recursos del servidor

| Contenedor | CPU promedio % | CPU máx % | Memoria máx (MiB) |
|---|---:|---:|---:|
| rabbitmq | 13.3 | 75.7 | 183 |
| postgres | 34.3 | 57.8 | 138 |
| kong | 17.8 | 38.8 | 318 |
| api | 19.0 | 29.0 | 204 |
| core-simulado | 4.7 | 9.7 | 188 |
| core-adapter | 2.0 | 7.4 | 154 |
| batch | 1.8 | 6.8 | 90 |
| auth | 0.0 | 0.0 | 37 |
