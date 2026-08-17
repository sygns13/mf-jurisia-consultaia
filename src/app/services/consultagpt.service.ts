import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import {
  ApiResponse,
  ResponseGeminiChat,
  GeminiChatItem,
  Page,
} from '../interfaces/consultagpt';

const environment = (window as any).__env as any;

const baseUrl = `${environment.API_GATEWAY_URL}/${environment.API_PATH_CONSULTAIA}`;

@Injectable({
  providedIn: 'root',
})
export class ConsultagptService {

  constructor(private http: HttpClient,
              public router: Router
  ) { }

  /**
   * Consulta conversacional a Gemini. Ahora es multipart/form-data:
   * prompt + sessionUID (vacío para iniciar) + archivos adjuntos opcionales
   * (PDF, imágenes, Word, etc.). La respuesta de la IA siempre es texto.
   * No se fija Content-Type a propósito: el navegador añade
   * `multipart/form-data` con el boundary correcto.
   */
  doConsultation(prompt: string, sessionUID: string, files: File[] = []): Observable<ApiResponse<ResponseGeminiChat>> {
    const formData = new FormData();
    formData.append('prompt', prompt);
    if (sessionUID) {
      formData.append('sessionUID', sessionUID);
    }
    for (const file of files) {
      formData.append('files', file, file.name);
    }
    return this.http.post<ApiResponse<ResponseGeminiChat>>(`${baseUrl}/gemini-chat/consulta`, formData);
  }

  /** Listado paginado de conversaciones del usuario. */
  getConversationHistory(page: number = 0, size: number = 10): Observable<ApiResponse<Page<GeminiChatItem>>> {
    return this.http.get<ApiResponse<Page<GeminiChatItem>>>(`${baseUrl}/gemini-chat/list?page=${page}&size=${size}`);
  }

  /** Conversación completa (todos los turnos, en orden cronológico) de una sesión. */
  getMessagesBySession(sessionUID: string): Observable<ApiResponse<ResponseGeminiChat[]>> {
    return this.http.get<ApiResponse<ResponseGeminiChat[]>>(`${baseUrl}/gemini-chat/conversacion?sessionuid=${sessionUID}`);
  }
}
