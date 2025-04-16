import { Routes } from '@angular/router';
import { ConsultagptComponent } from './consultagpt/consultagpt.component';

export const authRoutes: Routes = [
    {
        path: '', redirectTo: 'apubot', pathMatch:'full'
    },
    {
        path: '',
        children: [
            {
                path: 'apubot',
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
