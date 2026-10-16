import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

/**
 * Tema de APUBOT.
 *
 * El preset Aura de PrimeNG trae la paleta `emerald` (verde) como color
 * primario, y de ahí salían los acentos verdes que no corresponden a la
 * identidad del sistema: el día seleccionado del calendario, el foco de los
 * campos, la fila resaltada de las tablas, los checkbox marcados, etc.
 *
 * Aquí se reemplaza esa paleta por la roja institucional, construida alrededor
 * de #b00600 (el mismo rojo del botón principal `.redbutton`), que queda en el
 * tono 500 porque es el que Aura usa como `primary.color` en modo claro. Los
 * tonos 600 y 700 son el hover y el estado activo; el 400 es el que toma el
 * modo oscuro, por eso es más luminoso.
 *
 * Al cambiar el token semántico, todos los componentes se alinean solos y no
 * hace falta sobrescribir el color componente por componente.
 */
export const ApuBotPreset = definePreset(Aura, {
    semantic: {
        primary: {
            50: '#fef1f1',
            100: '#fde3e2',
            200: '#fac4c2',
            300: '#f39491',
            400: '#e4534e',
            500: '#b00600',
            600: '#990500',
            700: '#7f0400',
            800: '#660300',
            900: '#520300',
            950: '#330200',
        },
    },
});

export default ApuBotPreset;
