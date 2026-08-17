import { Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaginatorModule } from 'primeng/paginator';
import { FluidModule } from 'primeng/fluid';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { PanelMenuModule } from 'primeng/panelmenu';
import { ConsultagptService } from 'src/app/services/consultagpt.service';
import {
  GeminiChatItem,
  GeminiChatFile,
  ResponseGeminiChat,
} from 'src/app/interfaces/consultagpt';
import { marked } from 'marked';
import { Subscription } from 'rxjs';

/** Adjunto tal como se muestra en una burbuja del chat. */
interface ChatAttachment {
  fileName: string;
  mimeType: string;
  sizeBytes?: number;
  gcsUri?: string;
  isImage?: boolean;
  /** URL local (blob) para miniatura; solo disponible en adjuntos del turno actual. */
  previewUrl?: string;
}

/** Archivo seleccionado (pendiente de envío) con su preview para miniatura. */
interface SelectedFile {
  file: File;
  isImage: boolean;
  previewUrl?: string;
}

interface ChatMessage {
  content: string;
  isUser: boolean;
  files?: ChatAttachment[];
  /** La respuesta se cortó porque el usuario pulsó Detener. */
  interrumpido?: boolean;
}

/** Tipos de archivo que el usuario puede adjuntar. */
const ACCEPTED_MIME_PREFIXES = ['image/'];
const ACCEPTED_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'png', 'jpg', 'jpeg', 'gif', 'webp'];
const MAX_FILE_MB = 20;

/** Margen que se da al backend para persistir la conversación tras un corte. */
const REFRESCO_HISTORIAL_MS = 5000;

@Component({
  selector: 'app-consultagpt',
  imports: [CommonModule, InputTextModule, FluidModule, ButtonModule, SelectModule, FormsModule, TextareaModule, MessageModule, ToastModule, TooltipModule, PanelMenuModule, PaginatorModule],
  providers: [MessageService],
  templateUrl: './consultagpt.component.html',
  styleUrl: './consultagpt.component.scss'
})
export class ConsultagptComponent {

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('fileInput') private fileInput!: ElementRef<HTMLInputElement>;

  newMessage: string = '';
  messages: ChatMessage[] = [];
  sessionChatGPT: string = '';
  isTyping: boolean = false;
  loaderMessage: string = '';
  mostrarVistaInicial: boolean = true;
  private typewriterWorker: Worker | null = null;
  private typewriterBlobUrl: string | null = null;
  /** Auto-seguir el texto mientras se redacta; se desactiva si el usuario sube el scroll. */
  private autoFollow: boolean = true;

  /** Petición en vuelo, para poder cancelarla con el botón Detener. */
  private consultaSub: Subscription | null = null;
  /** Burbuja que se está redactando (null si aún esperamos la respuesta del backend). */
  private mensajeEnRedaccion: ChatMessage | null = null;
  /** Bandera que corta el bucle de redacción del fallback (sin Web Worker). */
  private redaccionCancelada: boolean = false;
  /** Segundo refresco diferido del historial tras detener una consulta. */
  private refrescoHistorialTimeout: ReturnType<typeof setTimeout> | null = null;

  /** Archivos seleccionados (aún no enviados) para el próximo turno. */
  selectedFiles: SelectedFile[] = [];
  isDragging: boolean = false;
  readonly acceptAttr = '.pdf,.doc,.docx,.txt,image/*';

  conversationHistory: GeminiChatItem[] = [];
  paginationInfo = {
    currentPage: 0,
    pageSize: 10,
    totalPages: 0,
    totalElements: 0
  };

  constructor(
    private messageService: MessageService,
    private consultagptService: ConsultagptService) {
  }

  ngOnInit() {
    this.loadConversationHistory();
  }

  /* ===================== HISTÓRICO DE CONVERSACIONES ===================== */

  loadConversationHistory(page: number = 0): void {
    this.consultagptService.getConversationHistory(page, this.paginationInfo.pageSize).subscribe({
      next: (response) => {
        const pageData = response.result;
        this.conversationHistory = pageData.content;
        this.paginationInfo.currentPage = pageData.number;
        this.paginationInfo.totalPages = pageData.totalPages;
        this.paginationInfo.totalElements = pageData.totalElements;
      },
      error: (err) => {
        console.error('Error al cargar historial', err);
      }
    });
  }

  onPageChange(event: any): void {
    this.paginationInfo.pageSize = event.rows;
    this.loadConversationHistory(event.page);
  }

  loadSession(sessionUID: string): void {
    this.cancelarGeneracion();
    this.sessionChatGPT = sessionUID;
    this.messages = [];
    this.revokeSelected();
    this.mostrarVistaInicial = false;

    this.consultagptService.getMessagesBySession(sessionUID).subscribe({
      next: (response) => {
        const conversation = response.result || [];
        conversation.forEach((entry: ResponseGeminiChat) => {
          if (entry.prompt) {
            this.messages.push({
              content: marked(entry.prompt) as string,
              isUser: true,
              files: this.mapFiles(entry.files)
            });
          }
          if (entry.response) {
            this.messages.push({
              content: marked(entry.response) as string,
              isUser: false
            });
          }
        });
        this.autoFollow = true;
        setTimeout(() => this.scrollToBottom(), 300);
      },
      error: (err) => {
        console.error('Error al cargar conversación previa', err);
      }
    });
  }

  /* ============================ ADJUNTOS ============================ */

  triggerFileInput(): void {
    this.fileInput?.nativeElement.click();
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      this.addFiles(Array.from(input.files));
    }
    input.value = ''; // permite volver a elegir el mismo archivo
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    if (event.dataTransfer?.files) {
      this.addFiles(Array.from(event.dataTransfer.files));
    }
  }

  private addFiles(files: File[]): void {
    for (const file of files) {
      if (!this.isAccepted(file)) {
        this.messageService.add({ severity: 'warn', summary: 'Archivo no permitido', detail: `${file.name}: formato no soportado.` });
        continue;
      }
      if (file.size > MAX_FILE_MB * 1024 * 1024) {
        this.messageService.add({ severity: 'warn', summary: 'Archivo muy grande', detail: `${file.name} supera los ${MAX_FILE_MB} MB.` });
        continue;
      }
      const dup = this.selectedFiles.some(s => s.file.name === file.name && s.file.size === file.size);
      if (!dup) {
        const isImage = this.isImageType(file.type, file.name);
        this.selectedFiles.push({
          file,
          isImage,
          previewUrl: isImage ? URL.createObjectURL(file) : undefined
        });
      }
    }
  }

  removeSelectedFile(index: number): void {
    const removed = this.selectedFiles.splice(index, 1)[0];
    if (removed?.previewUrl) {
      URL.revokeObjectURL(removed.previewUrl);
    }
  }

  /** Revoca los previews pendientes (al iniciar/cambiar de conversación). */
  private revokeSelected(): void {
    for (const s of this.selectedFiles) {
      if (s.previewUrl) URL.revokeObjectURL(s.previewUrl);
    }
    this.selectedFiles = [];
  }

  private isImageType(mimeType: string = '', fileName: string = ''): boolean {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    return mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  }

  private isAccepted(file: File): boolean {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (ACCEPTED_MIME_PREFIXES.some(p => file.type.startsWith(p))) return true;
    return ACCEPTED_EXTENSIONS.includes(ext);
  }

  private mapFiles(files: GeminiChatFile[] | undefined): ChatAttachment[] | undefined {
    if (!files || !files.length) return undefined;
    return files.map(f => ({
      fileName: f.fileName,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      gcsUri: f.gcsUri,
      isImage: this.isImageType(f.mimeType, f.fileName)
      // Sin previewUrl: los adjuntos del historial solo tienen URI gs:// (no accesible
      // desde el navegador), por lo que se muestran como tarjeta, no como miniatura.
    }));
  }

  /** Icono PrimeIcons según el tipo de archivo. */
  fileIcon(mimeType: string = '', fileName: string = ''): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (mimeType.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) return 'pi pi-image';
    if (mimeType === 'application/pdf' || ext === 'pdf') return 'pi pi-file-pdf';
    if (ext === 'doc' || ext === 'docx' || mimeType.includes('word')) return 'pi pi-file-word';
    return 'pi pi-file';
  }

  formatFileSize(bytes: number = 0): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  /* ============================ ENVÍO ============================ */

  sendMessage(event?: Event) {
    if (event) event.preventDefault();

    const prompt = this.newMessage.trim();
    if ((!prompt && this.selectedFiles.length === 0) || this.isTyping) {
      return;
    }

    // Burbuja del usuario con su texto y los adjuntos que se están enviando.
    // La miniatura (previewUrl) pasa a ser propiedad de la burbuja: no se revoca.
    const outgoingFiles: ChatAttachment[] | undefined = this.selectedFiles.length
      ? this.selectedFiles.map(s => ({
          fileName: s.file.name,
          mimeType: s.file.type,
          sizeBytes: s.file.size,
          isImage: s.isImage,
          previewUrl: s.previewUrl
        }))
      : undefined;

    this.messages.push({
      content: prompt ? (marked(prompt) as string) : '',
      isUser: true,
      files: outgoingFiles
    });

    const filesToSend = this.selectedFiles.map(s => s.file);
    this.mostrarVistaInicial = false;
    this.newMessage = '';
    this.selectedFiles = [];
    this.isTyping = true;
    this.loaderMessage = 'Trabajando en ello...';
    this.autoFollow = true;

    setTimeout(() => this.scrollToBottom(), 200);

    this.redaccionCancelada = false;
    this.mensajeEnRedaccion = null;

    this.consultaSub = this.consultagptService.doConsultation(prompt, this.sessionChatGPT, filesToSend).subscribe({
      next: (response) => {
        this.consultaSub = null;
        const result = response.result;
        if (response.success && result && result.status === 1) {
          this.sessionChatGPT = result.sessionUID;
          this.loaderMessage = 'Aquí tienes el resultado';
          this.typeMessage(result.response);
          this.loadConversationHistory(this.paginationInfo.currentPage);
        } else {
          this.isTyping = false;
          this.loaderMessage = '';
          this.messageService.add({ severity: 'error', summary: 'Error', detail: response.message || 'No se pudo procesar la consulta.' });
        }
      },
      error: (err) => {
        this.consultaSub = null;
        this.isTyping = false;
        this.loaderMessage = '';
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Ocurrió un error al enviar la consulta.' });
        console.error('Error en doConsultation', err);
      }
    });
  }

  /**
   * Botón Detener. Interrumpe el turno en curso en cualquiera de sus dos fases:
   *  - Si la respuesta del backend aún no llegó, cancela la petición HTTP.
   *  - Si ya se está redactando, corta el typewriter y conserva el texto escrito
   *    hasta ese momento (igual que Gemini).
   * En ambos casos el composer queda libre para una nueva consulta.
   */
  detenerRespuesta(): void {
    if (!this.isTyping) {
      return;
    }

    const enRedaccion = this.mensajeEnRedaccion;
    this.cancelarGeneracion();

    if (enRedaccion) {
      enRedaccion.interrumpido = true;
    } else {
      // Se cortó antes de recibir la respuesta: burbuja solo con el aviso.
      this.messages.push({ content: '', isUser: false, interrumpido: true });
      this.refrescarHistorialTrasCorte();
    }
  }

  /**
   * Al cortar antes de recibir la respuesta no pasamos por el `next` que refresca el
   * historial, pero el backend sigue generando y guardará la conversación igual.
   * Se refresca al momento y otra vez unos segundos después, cuando ya debería estar
   * persistida (el primer intento suele llegar demasiado pronto).
   */
  private refrescarHistorialTrasCorte(): void {
    this.loadConversationHistory(this.paginationInfo.currentPage);

    if (this.refrescoHistorialTimeout) {
      clearTimeout(this.refrescoHistorialTimeout);
    }
    this.refrescoHistorialTimeout = setTimeout(() => {
      this.refrescoHistorialTimeout = null;
      this.loadConversationHistory(this.paginationInfo.currentPage);
    }, REFRESCO_HISTORIAL_MS);
  }

  /** Corta petición y redacción, y devuelve el chat al estado inactivo. */
  private cancelarGeneracion(): void {
    this.consultaSub?.unsubscribe();
    this.consultaSub = null;
    this.redaccionCancelada = true;
    // El worker escribe en un bucle propio: la única forma de frenarlo es terminarlo.
    // Se vuelve a crear en el siguiente turno.
    this.disposeTypewriterWorker();
    this.mensajeEnRedaccion = null;
    this.isTyping = false;
    this.loaderMessage = '';
  }

  newChat() {
    this.cancelarGeneracion();
    this.sessionChatGPT = '';
    this.messages = [];
    this.revokeSelected();
    this.mostrarVistaInicial = true;
  }

  /* ============================ UI HELPERS ============================ */

  /** El usuario movió el scroll: seguimos el texto solo si está cerca del fondo. */
  onMessagesScroll(): void {
    this.autoFollow = this.isNearBottom();
  }

  private isNearBottom(): boolean {
    try {
      const el = this.scrollContainer.nativeElement;
      return el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    } catch {
      return true;
    }
  }

  /** Baja al fondo solo si el usuario no subió a leer algo más arriba. */
  private maybeScroll(): void {
    if (this.autoFollow) this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop =
        this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  /**
   * Crea (una sola vez) un Web Worker embebido como blob same-origin. Ventajas:
   *  - Evita el bloqueo cross-origin de Module Federation (el shell corre en otro
   *    origen que el remoto), que impedía usar el worker por archivo.
   *  - Al ejecutarse en su propio hilo, su setTimeout NO sufre el "throttling" que
   *    el navegador aplica al hilo principal en pestañas en segundo plano, por lo
   *    que la redacción continúa aunque cambies de pestaña o ventana.
   */
  private ensureTypewriterWorker(): Worker | null {
    if (this.typewriterWorker) return this.typewriterWorker;
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined') return null;

    try {
      const workerCode =
        "self.onmessage=function(e){var text=e.data.text,delay=e.data.delay,i=0;" +
        "(function next(){if(i<text.length){self.postMessage(text.slice(0,i+1));i++;setTimeout(next,delay);}" +
        "else{self.postMessage('[END]');}})();};";
      this.typewriterBlobUrl = URL.createObjectURL(new Blob([workerCode], { type: 'application/javascript' }));
      this.typewriterWorker = new Worker(this.typewriterBlobUrl);
      return this.typewriterWorker;
    } catch {
      return null;
    }
  }

  private typeMessage(fullText: string, delay: number = 20): void {
    const message: ChatMessage = { content: '', isUser: false };
    this.messages.push(message);
    this.isTyping = true;
    this.autoFollow = true; // al empezar una respuesta seguimos el texto
    this.redaccionCancelada = false;
    this.mensajeEnRedaccion = message;

    const worker = this.ensureTypewriterWorker();
    if (worker) {
      worker.onmessage = ({ data }) => {
        if (this.redaccionCancelada) {
          return;
        }
        if (data === '[END]') {
          this.mensajeEnRedaccion = null;
          this.isTyping = false;
          this.loaderMessage = '';
          return;
        }
        message.content = marked(data) as string;
        this.maybeScroll();
      };

      worker.onerror = () => {
        this.disposeTypewriterWorker();
        this.fallbackTypeMessage(fullText, delay, message);
      };

      worker.postMessage({ text: fullText, delay });
    } else {
      this.fallbackTypeMessage(fullText, delay, message);
    }
  }

  private async fallbackTypeMessage(fullText: string, delay: number, message: ChatMessage) {
    let rawContent = '';
    for (let i = 0; i < fullText.length; i++) {
      if (this.redaccionCancelada) {
        return; // el estado ya lo dejó listo cancelarGeneracion()
      }
      rawContent += fullText[i];
      message.content = marked(rawContent) as string;
      this.maybeScroll();
      await this.delayText(delay);
    }
    this.mensajeEnRedaccion = null;
    this.isTyping = false;
    this.loaderMessage = '';
  }

  private delayText(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private disposeTypewriterWorker(): void {
    if (this.typewriterWorker) {
      this.typewriterWorker.terminate();
      this.typewriterWorker = null;
    }
    if (this.typewriterBlobUrl) {
      URL.revokeObjectURL(this.typewriterBlobUrl);
      this.typewriterBlobUrl = null;
    }
  }

  ngOnDestroy(): void {
    this.consultaSub?.unsubscribe();
    this.redaccionCancelada = true;
    if (this.refrescoHistorialTimeout) {
      clearTimeout(this.refrescoHistorialTimeout);
      this.refrescoHistorialTimeout = null;
    }
    this.disposeTypewriterWorker();
    this.revokeSelected();
  }
}
