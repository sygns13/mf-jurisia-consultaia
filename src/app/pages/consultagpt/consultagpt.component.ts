import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { MessageService, ToastMessageOptions } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { MenuItem } from 'primeng/api';
import { PanelMenuModule } from 'primeng/panelmenu';
import { ConsultagptService } from 'src/app/services/consultagpt.service';
import { IRequest, GptResponse, GptHistoryItem, HistoryResponse } from 'src/app/interfaces/consultagpt';
import { marked } from 'marked';

const environment = (window as any).__env as any;

interface ChatMessage {
  content: string;
  isUser: boolean;
};


@Component({
  selector: 'app-consultagpt',
  imports: [CommonModule, InputTextModule, FluidModule, ButtonModule, SelectModule, FormsModule, TextareaModule, MessageModule, ToastModule, PanelMenuModule, PaginatorModule],
  providers: [MessageService],
  templateUrl: './consultagpt.component.html',
  styleUrl: './consultagpt.component.scss'
})
export class ConsultagptComponent {

  private env = environment;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  irequest: IRequest = {} as IRequest;

  newMessage: string = '';
  messages: ChatMessage[] = [];
  messageCount: number = 0;
  sessionChatGPT: string = '';
  isTyping: boolean = false;
  loaderMessage: string = '';
  mostrarVistaInicial: boolean = true;
  private typewriterWorker: Worker | null = null;


  conversationHistory: GptHistoryItem[] = [];
  paginationInfo = {
    currentPage: 0,
    pageSize: 10,
    totalPages: 0,
    totalElements: 0
  };

  constructor(
    private service: MessageService,
    private consultagptService: ConsultagptService) {

    console.log('Environment from Microfront:');
    console.log(this.env);
  }

  ngOnInit() {
    this.loadConversationHistory();
  }

  ngAfterViewChecked() {
    //this.scrollToBottom();
  }

  /*PARA HISTORICO DE CONVERSACIONES*/
  loadConversationHistory(page: number = 0): void {
  this.consultagptService.getConversationHistory(page, this.paginationInfo.pageSize).subscribe({
      next: (response: HistoryResponse) => {
        this.conversationHistory = response.content;
        this.paginationInfo.currentPage = response.number;
        this.paginationInfo.totalPages = response.totalPages;
        this.paginationInfo.totalElements = response.totalElements;
      },
      error: (err) => {
        console.error('Error al cargar historial', err);
      }
    });
  }
  onPageChange(event: any): void {
    const pageIndex = event.page;
    const pageSize = event.rows;

    this.paginationInfo.pageSize = pageSize;
    this.loadConversationHistory(pageIndex);
  }

  loadSession(sessionUID: string): void {
    this.sessionChatGPT = sessionUID;
    this.messages = [];
    this.mostrarVistaInicial = false;
    // this.isTyping = true;

    this.consultagptService.getMessagesBySession(sessionUID).subscribe({
      next: (conversation) => {
        conversation.forEach(entry => {
          if (entry.roleUser) {
            this.messages.push({
              content: marked(entry.roleUser),
              isUser: true
            });
          }

          if (entry.roleContent) {
            this.messages.push({
              content: marked(entry.roleContent),
              isUser: false
            });
          }
        });
        // this.isTyping = false;
        //this.scrollToBottom();
        setTimeout(() => {
            this.scrollToBottom();
        }, 500);
      },
      error: (err) => {
        // this.isTyping = false;
        console.error('Error al cargar conversación previa', err);
      }
    });
  }


  sendMessage(event?: Event) {
    if (event) event.preventDefault();

    if (this.newMessage.trim()) {
      this.messages.push({
        content: this.newMessage,
        isUser: true
      });
      this.mostrarVistaInicial = false;
      this.irequest = {} as IRequest;
      this.newMessage = '';
      this.isTyping = true;
      this.loaderMessage = 'Trabajando en ello...';

      if (!this.sessionChatGPT || this.sessionChatGPT !== '') {
        this.irequest.sessionUID = this.sessionChatGPT;
      }
      this.irequest.prompt = this.messages[this.messages.length - 1].content;
      setTimeout(() => {
            this.scrollToBottom();
        }, 500);
      this.consultagptService.doConsultation(this.irequest).subscribe({
        next: (response: GptResponse) => {
          if (response.status == 1) {
            this.sessionChatGPT = response.sessionUID;
            this.loaderMessage = 'Aquí tienes el resultado';
            this.typeMessage(response.roleContent);
            this.loadConversationHistory();
          } else {
            this.isTyping = false;
            this.loaderMessage = '';
          }
        },
        error: () => {
          this.isTyping = false;
          this.loaderMessage = '';
        }
      });
    }
  }


  newChat() {
    this.sessionChatGPT = '';
    this.messages = [];
    this.messageCount = 0;
    this.mostrarVistaInicial = true;
  }

  private generateDummyResponse(): string {
    const responses = [
      "Gracias por tu pregunta. Estoy procesando la información...",
      "Interesante consulta. Permíteme analizarlo...",
      "Para responder esto necesito consultar mis bases de datos...",
      "Estoy generando una respuesta precisa para tu solicitud..."
    ];
    return responses[this.messageCount++ % responses.length];
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop =
        this.scrollContainer.nativeElement.scrollHeight;
    } catch(err) { }
  }

  private typeMessage(fullText: string, delay: number = 20): void {
    const message: ChatMessage = { content: '', isUser: false };
    this.messages.push(message);
    this.isTyping = true;
  
    if (typeof Worker !== 'undefined') {
      // Usa el Web Worker
      if (!this.typewriterWorker) {
        this.typewriterWorker = new Worker(new URL('./typewriter.worker.ts', import.meta.url), { type: 'module' });
        
        // this.typewriterWorker = new Worker(new URL('./typewriter.worker', import.meta.url), { type: 'module' });
      }
  
      this.typewriterWorker.onmessage = ({ data }) => {
        if (data === '[END]') {
          this.isTyping = false;
          this.loaderMessage = '';
          return;
        }
  
        message.content = marked(data);
        this.scrollToBottom();
      };
  
      this.typewriterWorker.postMessage({ text: fullText, delay });
    } else {
      // Fallback si el navegador no soporta Workers
      this.fallbackTypeMessage(fullText, delay, message);
    }
  }
  
  
  private async fallbackTypeMessage(fullText: string, delay: number, message: ChatMessage) {
    let rawContent = '';
    for (let i = 0; i < fullText.length; i++) {
      rawContent += fullText[i];
      message.content = marked(rawContent);
      this.scrollToBottom();
      await this.delayText(delay);
    }
    this.isTyping = false;
    this.loaderMessage = '';
  }
  private delayText(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
}
