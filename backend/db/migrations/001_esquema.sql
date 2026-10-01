-- =============================================================================
-- Billetera de Ahorro — esquema PostgreSQL 15+
-- Escrituras ACID (RNF-02.3), ledger de solo inserción (RNF-03.3) y outbox.
-- =============================================================================

CREATE TABLE IF NOT EXISTS usuarios (
  id               uuid PRIMARY KEY,
  nombre           text        NOT NULL,
  email            text        NOT NULL UNIQUE,
  hash_contrasena  text        NOT NULL,
  roles            text[]      NOT NULL CHECK (roles <@ ARRAY['CLIENTE','OPERADOR','AUDITOR']::text[]),
  core_cliente_id  text,
  creado_en        timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  hash         text PRIMARY KEY,
  usuario_id   uuid        NOT NULL REFERENCES usuarios(id),
  expira_en    timestamptz NOT NULL,
  revocado_en  timestamptz
);

CREATE TABLE IF NOT EXISTS planes (
  id                      uuid PRIMARY KEY,
  cliente_id              uuid        NOT NULL REFERENCES usuarios(id),
  nombre                  text        NOT NULL,
  objetivo                text,
  icono                   text        NOT NULL,
  estado                  text        NOT NULL CHECK (estado IN ('ACTIVO','COMPLETADO','CANCELADO')),
  moneda                  char(3)     NOT NULL DEFAULT 'USD',
  monto_meta_centavos     bigint      NOT NULL CHECK (monto_meta_centavos > 0),
  fecha_objetivo          date        NOT NULL,
  cuota_mensual_centavos  bigint      NOT NULL CHECK (cuota_mensual_centavos > 0),
  plazo_meses             int         NOT NULL CHECK (plazo_meses > 0),
  prorrogas_meses         int         NOT NULL DEFAULT 0,
  dia_debito              smallint    NOT NULL CHECK (dia_debito BETWEEN 1 AND 28),
  cuenta_debito           jsonb       NOT NULL,
  bloqueado               boolean     NOT NULL DEFAULT false,
  bloqueado_desde         timestamptz,
  tasa_base_anual         numeric(5,2) NOT NULL,
  bono_bloqueo_anual      numeric(5,2) NOT NULL DEFAULT 0,
  fecha_inicio            date        NOT NULL,
  fecha_fin_estimada      date        NOT NULL,
  version                 int         NOT NULL DEFAULT 1,
  creado_en               timestamptz NOT NULL,
  actualizado_en          timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_planes_cliente_estado ON planes (cliente_id, estado);

CREATE TABLE IF NOT EXISTS cuotas (
  id                uuid PRIMARY KEY,
  plan_id           uuid        NOT NULL REFERENCES planes(id),
  numero            int         NOT NULL,
  fecha_programada  date        NOT NULL,
  monto_centavos    bigint      NOT NULL CHECK (monto_centavos > 0),
  estado            text        NOT NULL CHECK (estado IN ('PROGRAMADA','PENDIENTE','EJECUTADA','CANCELADA')),
  intentos          smallint    NOT NULL DEFAULT 0 CHECK (intentos BETWEEN 0 AND 5),
  proximo_intento   timestamptz,
  ejecutada_en      timestamptz,
  UNIQUE (plan_id, numero)
);
CREATE INDEX IF NOT EXISTS idx_cuotas_programadas ON cuotas (fecha_programada) WHERE estado = 'PROGRAMADA';
CREATE INDEX IF NOT EXISTS idx_cuotas_reintentos ON cuotas (proximo_intento) WHERE estado = 'PENDIENTE';

CREATE TABLE IF NOT EXISTS corridas_cobro (
  id                uuid PRIMARY KEY,
  fecha_corte       date        NOT NULL,
  estado            text        NOT NULL CHECK (estado IN ('EN_PROCESO','COMPLETADA','FALLIDA')),
  iniciada_en       timestamptz NOT NULL,
  finalizada_en     timestamptz,
  total_cuotas      int NOT NULL DEFAULT 0,
  ejecutadas        int NOT NULL DEFAULT 0,
  rechazadas        int NOT NULL DEFAULT 0,
  reprogramadas     int NOT NULL DEFAULT 0,
  canceladas        int NOT NULL DEFAULT 0,
  errores_tecnicos  int NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_corridas_fecha ON corridas_cobro (fecha_corte DESC);

-- Movimientos de dinero con el Core: aportes, cuotas, retiros y devoluciones.
CREATE TABLE IF NOT EXISTS operaciones_core (
  id              uuid PRIMARY KEY,
  plan_id         uuid        NOT NULL REFERENCES planes(id),
  tipo            text        NOT NULL CHECK (tipo IN ('APORTE','CUOTA','RETIRO','DEVOLUCION')),
  monto_centavos  bigint      NOT NULL CHECK (monto_centavos > 0),
  moneda          char(3)     NOT NULL DEFAULT 'USD',
  cuenta          jsonb       NOT NULL,
  estado          text        NOT NULL CHECK (estado IN ('PENDIENTE','EJECUTADO','FALLIDO')),
  motivo_fallo    text,
  cuota_id        uuid REFERENCES cuotas(id),
  corrida_id      uuid REFERENCES corridas_cobro(id),
  correlation_id  uuid        NOT NULL,
  solicitado_en   timestamptz NOT NULL,
  procesado_en    timestamptz
);
CREATE INDEX IF NOT EXISTS idx_operaciones_plan ON operaciones_core (plan_id, tipo, estado);

-- Ledger de solo inserción: el saldo se obtiene sumando movimientos, nunca se sobrescribe.
CREATE TABLE IF NOT EXISTS movimientos (
  id                         uuid PRIMARY KEY,
  plan_id                    uuid        NOT NULL REFERENCES planes(id),
  tipo                       text        NOT NULL CHECK (tipo IN ('APORTE_AUTOMATICO','APORTE_MANUAL','INTERES','RETIRO','PENALIDAD','DEVOLUCION')),
  monto_centavos             bigint      NOT NULL,
  moneda                     char(3)     NOT NULL DEFAULT 'USD',
  saldo_resultante_centavos  bigint      NOT NULL,
  fecha                      timestamptz NOT NULL,
  descripcion                text        NOT NULL,
  origen                     text        NOT NULL,
  referencia_tipo            text,
  referencia_id              uuid,
  correlation_id             uuid
);
CREATE INDEX IF NOT EXISTS idx_movimientos_plan_fecha ON movimientos (plan_id, fecha DESC, id DESC);

CREATE OR REPLACE FUNCTION fn_ledger_inmutable() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'El ledger es de solo inserción: no se permite %', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ledger_inmutable ON movimientos;
CREATE TRIGGER trg_ledger_inmutable BEFORE UPDATE OR DELETE ON movimientos
  FOR EACH ROW EXECUTE FUNCTION fn_ledger_inmutable();

-- Transactional Outbox: el evento se guarda en la misma transacción que el cambio.
CREATE TABLE IF NOT EXISTS outbox (
  id              uuid PRIMARY KEY,
  tipo            text        NOT NULL,
  correlation_id  uuid        NOT NULL,
  payload         jsonb       NOT NULL,
  creado_en       timestamptz NOT NULL DEFAULT now(),
  publicado_en    timestamptz,
  intentos        int         NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_outbox_pendientes ON outbox (creado_en) WHERE publicado_en IS NULL;

-- Consumidor idempotente: un evento ya procesado por un consumidor se descarta.
CREATE TABLE IF NOT EXISTS eventos_procesados (
  evento_id     uuid        NOT NULL,
  consumidor    text        NOT NULL,
  procesado_en  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (evento_id, consumidor)
);

-- Respuestas guardadas por Idempotency-Key (se conservan 24 h).
CREATE TABLE IF NOT EXISTS idempotencia (
  clave        text        NOT NULL,
  usuario_id   uuid        NOT NULL,
  operacion    text        NOT NULL,
  hash_cuerpo  text        NOT NULL,
  status       int         NOT NULL,
  cuerpo       jsonb,
  headers      jsonb       NOT NULL DEFAULT '{}',
  creado_en    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (clave, usuario_id, operacion)
);

-- Saldos derivados del ledger y de las operaciones pendientes (no se almacenan).
CREATE OR REPLACE VIEW vw_planes AS
SELECT p.*,
       COALESCE(l.saldo, 0)       AS saldo_centavos,
       COALESCE(l.intereses, 0)   AS intereses_devengados_centavos,
       COALESCE(r.reservado, 0)   AS reservado_centavos
FROM planes p
LEFT JOIN LATERAL (
  SELECT SUM(m.monto_centavos) AS saldo,
         SUM(m.monto_centavos) FILTER (WHERE m.tipo IN ('INTERES','PENALIDAD')) AS intereses
  FROM movimientos m WHERE m.plan_id = p.id
) l ON true
LEFT JOIN LATERAL (
  SELECT SUM(o.monto_centavos) AS reservado
  FROM operaciones_core o
  WHERE o.plan_id = p.id AND o.estado = 'PENDIENTE' AND o.tipo IN ('RETIRO','DEVOLUCION')
) r ON true;

-- El procedimiento solo SELECCIONA los débitos del día: cuotas programadas que vencen
-- y reintentos cuya espera de 24 h terminó. Estados, reintentos y cálculos van en el
-- código del Batch (patrones State y Strategy), donde tienen pruebas unitarias.
CREATE OR REPLACE FUNCTION sp_procesar_debitos_ahorro_programado(p_fecha date, p_ahora timestamptz)
RETURNS SETOF cuotas AS $$
  SELECT c.*
  FROM cuotas c
  JOIN planes p ON p.id = c.plan_id AND p.estado = 'ACTIVO'
  WHERE (c.estado = 'PROGRAMADA' AND c.fecha_programada <= p_fecha)
     OR (c.estado = 'PENDIENTE' AND c.proximo_intento IS NOT NULL AND c.proximo_intento <= p_ahora)
  ORDER BY c.fecha_programada, c.numero;
$$ LANGUAGE sql STABLE;
