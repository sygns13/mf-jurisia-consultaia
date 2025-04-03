import { Routes } from '@angular/router';
import { ConsultagptComponent } from './consultagpt/consultagpt.component';

export const authRoutes: Routes = [
    {
        path: '', redirectTo: 'chatgpt', pathMatch:'full'
    },
    {
        path: '',
        children: [
            {
                path: 'chatgpt',
                component: ConsultagptComponent,
            },
            {
                path: '**',
                redirectTo: '',
            },
        ],
    }
]

export default authRoutes;