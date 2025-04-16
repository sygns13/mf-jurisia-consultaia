import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { IRequest, GptResponse,HistoryResponse } from '../interfaces/consultagpt';
import { delay, Observable, of, pipe, tap } from 'rxjs';
const environment = (window as any).__env as any;

const baseUrl = `${environment.API_GATEWAY_URL}/${environment.API_PATH_CONSULTAIA}`;

@Injectable({
  providedIn: 'root'
})
export class ConsultagptService {

  constructor(private http: HttpClient,
              public router: Router
  ) { }

  doConsultation(request: Partial<IRequest>): Observable<GptResponse> {
    return this.http
      .post<GptResponse>(`${baseUrl}/chatgpt/consulta`, request);
  }

  getConversationHistory(page: number = 0, size: number = 10): Observable<HistoryResponse> {
    return this.http.get<HistoryResponse>(`${baseUrl}/chatgpt/list?page=${page}&size=${size}`);
  }

  getMessagesBySession(sessionUID: string): Observable<GptResponse[]> {
    return this.http.get<GptResponse[]>(`${baseUrl}/chatgpt/conversacion?sessionuid=${sessionUID}`);
  }
}
