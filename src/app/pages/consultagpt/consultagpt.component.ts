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
  mostrarVistaInicial: boolean = true;

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
    this.scrollToBottom();
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
        this.scrollToBottom();
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

      this.irequest = {} as IRequest;
      this.newMessage = '';

      this.isTyping = true; // ⬅️ Activamos el loader desde ya

      if (!this.sessionChatGPT || this.sessionChatGPT !== '') {
        this.irequest.sessionUID = this.sessionChatGPT;
      }
      this.irequest.prompt = this.messages[this.messages.length - 1].content;

      this.consultagptService.doConsultation(this.irequest).subscribe({
        next: (response: GptResponse) => {
          if (response.status == 1) {
            this.sessionChatGPT = response.sessionUID;
            this.typeMessage(response.roleContent); // Redacción progresiva
          } else {
            this.isTyping = false; // por si falla
          }
        },
        error: () => {
          this.isTyping = false; // en caso de error
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

    let rawContent = '';
    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < fullText.length) {
        rawContent += fullText[currentIndex];
        message.content = marked(rawContent); // aplicar markdown
        currentIndex++;
        this.scrollToBottom();
      } else {
        clearInterval(interval);
        this.isTyping = false;
      }
    }, delay);
  }
}
