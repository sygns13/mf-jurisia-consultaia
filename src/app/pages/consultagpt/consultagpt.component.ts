import { Component, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
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
import { IRequest, GptResponse } from 'src/app/interfaces/consultagpt';
import { marked } from 'marked';

const environment = (window as any).__env as any;

interface ChatMessage {
  content: string;
  isUser: boolean;
};


@Component({
  selector: 'app-consultagpt',
  imports: [CommonModule, InputTextModule, FluidModule, ButtonModule, SelectModule, FormsModule, TextareaModule, MessageModule, ToastModule, PanelMenuModule],
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

  constructor(
    private service: MessageService,
    private consultagptService: ConsultagptService) {

    console.log('Environment from Microfront:');
    console.log(this.env);
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
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
