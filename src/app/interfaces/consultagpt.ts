// ============================================================================
//  Contratos del microservicio ms-jurisia-consultaia  (módulo Gemini Chat)
//  Endpoints: /gemini-chat/consulta (multipart), /gemini-chat/list,
//             /gemini-chat/conversacion
//  Todas las respuestas viajan envueltas en ApiResponse<T>.
// ============================================================================

/** Envoltura estándar de todas las respuestas del microservicio. */
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  result: T;
  time: number;
}

/**
 * Adjunto de un turno: archivo subido por el usuario y almacenado en GCS.
 * (La respuesta de la IA siempre es texto; estos archivos son solo del usuario.)
 */
export interface GeminiChatFile {
  id: number;
  geminiChatId: number;
  sessionUID: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  gcsUri: string;
  fechaReg: string;
  status: number;
}

/** Turno de conversación con Gemini. Respuesta de /consulta y de /conversacion. */
export interface ResponseGeminiChat {
  id: number;
  userId: number;
  model: string;
  roleSystem: string;
  /** Mensaje escrito por el usuario. */
  prompt: string;
  temperature: number;
  fechaSend: string;
  fechaResponse: string;
  /** Respuesta de la IA (texto / markdown). */
  response: string;
  timeSeconds: number;
  sessionUID: string;
  status: number;
  /** 1 = el turno incluyó adjuntos. */
  hasFiles: number;
  configurationsId: number;
  /** Adjuntos del turno (nombre, mime, tamaño y URI gs://). */
  files: GeminiChatFile[];
  sedes?: any[];
}

/**
 * Item del listado de conversaciones (entidad GeminiChats: primer turno de
 * cada sessionUID). El `prompt` se usa como título de la conversación.
 */
export interface GeminiChatItem {
  id: number;
  userId: number;
  model: string;
  prompt: string;
  response: string;
  fechaSend: string;
  fechaResponse: string;
  sessionUID: string;
  status: number;
  hasFiles: number;
}

export interface Pageable {
  pageNumber: number;
  pageSize: number;
  offset: number;
  paged: boolean;
  unpaged: boolean;
  sort: { sorted: boolean; unsorted: boolean; empty: boolean };
}

/** Página genérica de Spring Data. */
export interface Page<T> {
  content: T[];
  pageable: Pageable;
  last: boolean;
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  first: boolean;
  numberOfElements: number;
  empty: boolean;
}
