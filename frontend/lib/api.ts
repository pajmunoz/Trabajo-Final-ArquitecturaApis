// Cliente HTTP de la Billetera de Ahorro (contracts/openapi.yaml).
// - Agrega el access token y lo renueva una vez con el refresh token si expiró (401).
// - Traduce los errores application/problem+json a ApiError con el `codigo` del contrato.

// Por defecto, el proxy del propio servidor de Next.js (ver next.config.ts).
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "/api").replace(/\/$/, "");

export interface Problema {
  type?: string;
  title?: string;
  status: number;
  codigo?: string;
  detail?: string;
  errores?: { campo: string; mensaje: string }[];
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    message: string,
    public readonly errores: { campo: string; mensaje: string }[] = []
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface Token {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  refreshToken: string;
  scope: string;
}

/** Lo provee el store de autenticación (evita una dependencia circular). */
export interface SesionApi {
  accessToken: () => string | null;
  renovar: () => Promise<boolean>;
  cerrar: () => void;
}

let sesion: SesionApi | null = null;
export function configurarSesion(s: SesionApi) {
  sesion = s;
}

const MENSAJES: Record<string, string> = {
  CORE_NO_DISPONIBLE: "El banco no respondió a tiempo. Intenta de nuevo en unos segundos.",
  LIMITE_EXCEDIDO: "Demasiadas solicitudes seguidas. Espera un momento e intenta de nuevo.",
  ERROR_INTERNO: "Ocurrió un error inesperado. Intenta de nuevo.",
};

async function aError(respuesta: Response): Promise<ApiError> {
  let p: Problema = { status: respuesta.status };
  try {
    p = (await respuesta.json()) as Problema;
  } catch {
    /* respuesta sin cuerpo JSON (por ejemplo, del Gateway) */
  }
  const codigo = p.codigo ?? (respuesta.status === 429 ? "LIMITE_EXCEDIDO" : `HTTP_${respuesta.status}`);
  const mensaje =
    MENSAJES[codigo] ??
    p.errores?.map((e) => `${e.campo}: ${e.mensaje}`).join(" · ") ??
    p.detail ??
    p.title ??
    `Error ${respuesta.status}`;
  return new ApiError(respuesta.status, codigo, p.errores?.length ? `${p.detail ?? ""} ${mensaje}`.trim() : mensaje, p.errores);
}

export interface Opciones {
  metodo?: "GET" | "POST" | "PATCH";
  cuerpo?: unknown;
  /** Para POST que mueven dinero o crean recursos (Idempotency-Key). */
  idempotente?: boolean;
  tipoContenido?: string;
  autenticado?: boolean;
  headers?: Record<string, string>;
}

export interface RespuestaApi<T> {
  datos: T;
  headers: Headers;
  status: number;
}

export async function solicitud<T>(ruta: string, opciones: Opciones = {}, reintento = true): Promise<RespuestaApi<T>> {
  const { metodo = "GET", cuerpo, idempotente, tipoContenido = "application/json", autenticado = true } = opciones;
  const headers: Record<string, string> = { Accept: "application/json", ...opciones.headers };
  if (cuerpo !== undefined) headers["Content-Type"] = tipoContenido;
  if (idempotente) headers["Idempotency-Key"] = crypto.randomUUID();
  const token = autenticado ? sesion?.accessToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo,
      headers,
      // Saldos y estados cambian por eventos asíncronos: siempre se consulta al servidor.
      cache: "no-store",
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    });
  } catch {
    throw new ApiError(0, "SIN_CONEXION", "No se pudo conectar con el servidor. Revisa tu conexión.");
  }

  // Token expirado: se renueva una vez con el refresh token y se repite la petición
  // (con la misma Idempotency-Key no aplica: se genera una nueva solo si nunca llegó a procesarse).
  if (respuesta.status === 401 && autenticado && reintento && sesion) {
    if (await sesion.renovar()) return solicitud<T>(ruta, opciones, false);
    sesion.cerrar();
  }
  if (!respuesta.ok) throw await aError(respuesta);

  const texto = await respuesta.text();
  return { datos: (texto ? JSON.parse(texto) : undefined) as T, headers: respuesta.headers, status: respuesta.status };
}

export async function api<T>(ruta: string, opciones: Opciones = {}): Promise<T> {
  return (await solicitud<T>(ruta, opciones)).datos;
}

/** POST /v1/auth/token (no usa la sesión). */
export async function pedirToken(cuerpo: Record<string, string>): Promise<Token> {
  return api<Token>("/v1/auth/token", { metodo: "POST", cuerpo, autenticado: false });
}
