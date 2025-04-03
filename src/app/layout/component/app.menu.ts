import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { AppMenuitem } from './app.menuitem';

@Component({
    selector: 'app-menu',
    standalone: true,
    imports: [CommonModule, AppMenuitem, RouterModule],
    templateUrl: './app.menu.html',
})
export class AppMenu {
    model: MenuItem[] = [];

    ngOnInit() {
        this.model = [
            {
                label: 'Home',
                items: [{ label: 'Inicio', icon: 'pi pi-fw pi-home', routerLink: ['/principal'] }]
            },
            {
                label: 'Módulos Funcionales',
                items: [
                    { label: 'Exp. Judicial', icon: 'pi pi-fw pi-file', routerLink: ['/expedientes/generar-documento'] },
                    { label: 'Consulta a la IA', icon: 'pi pi-fw pi-microchip-ai', routerLink: ['/consultas/chatgpt'] },

                ]
            },
            {
                label: 'Métricas',
                items: [
                    { label: 'Documentos Generados', icon: 'pi pi-fw pi-chart-bar', routerLink: ['/metricas/documentos-generados'] },
                    { label: 'Consulta a la IA', icon: 'pi pi-fw pi-chart-line', routerLink: ['/metricas/consulta-ia'] },
                    { label: 'Uso de ChatBot', icon: 'pi pi-fw pi-telegram', routerLink: ['/metricas/chatbot'] },

                ]
            },
        ];
    }
}
