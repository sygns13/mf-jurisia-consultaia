export interface IRequest {
    sessionUID: string;
    prompt: string;
}

// interfaces/gpt-response.interface.ts

export interface GptResponse {
    id: number;
    userId: number;
    model: string;
    roleSystem: string;
    roleUser: string;
    temperature: number;
    fechaSend: string;
    fechaResponse: string;
    idGpt: string;
    object: string;
    created: number;
    modelResponse: string;
    roleResponse: string;
    roleContent: string;
    refusal: string | null;
    logprobs: any | null; // Usar tipo específico si se conoce la estructura
    finishReason: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cachedTokens: number;
    audioTokens: number;
    completionReasoningTokens: number;
    completionAudioTokens: number;
    completionAceptedTokens: number;
    completionRejectedTokens: number;
    serviceTier: string;
    systemFingerprint: string;
    configurations: Configuration;
    sessionUID: string;
    status: number;
  }

  export interface GptHistoryItem {
    id: number;
    sessionUID: string;
    created: number;
    roleUser: string;
    roleContent: string;
    fechaSend: string;
    fechaResponse: string;
    status: number;
  }

  export interface Pageable {
    pageNumber: number;
    pageSize: number;
    offset: number;
    paged: boolean;
    unpaged: boolean;
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
  }

  export interface HistoryResponse {
    content: GptHistoryItem[];
    pageable: Pageable;
    last: boolean;
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
    sort: {
      sorted: boolean;
      unsorted: boolean;
      empty: boolean;
    };
    first: boolean;
    numberOfElements: number;
    empty: boolean;
  }

  export interface Configuration {
    id: number;
    serviceCode: string;
    model: string;
    descripcion: string;
    roleSystem: string;
    promptDefault: string | null;
    maxMessages: number;
    temperature: number;
    activo: number;
    borrado: number;
    regDate: string | null;
    regDatetime: string | null;
    regTimestamp: number | null;
    regUserId: number | null;
    updDate: string | null;
    updDatetime: string | null;
    updTimestamp: number | null;
    updUserId: number | null;
  }

  // Opcional: Interface para el contexto de uso en componentes
  export interface ChatMessage {
    id: number;
    userQuestion: string;
    assistantResponse: string;
    timestamp: string;
    legalReferences: string[];
    status: 'pending' | 'completed' | 'error';
  }
