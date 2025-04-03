import { HttpEvent, HttpHandler, HttpInterceptor, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
const environment = (window as any).__env as any;

export const httpHeadersInterceptor: HttpInterceptorFn = (req, next) => {
    // Clona la solicitud y agrega un encabezado personalizado

    // Define la ruta que quieres bypassear
    const bypassRoutes = [`/${environment.API_PATH_SECURITY}/auth/login`]; // Rutas que no deben modificarse

    // Verifica si la URL de la solicitud coincide con alguna ruta en bypassRoutes
    if (bypassRoutes.some(route => req.url.includes(route))) {
        // Si coincide, pasa la solicitud sin modificar
        return next(req);
      }
  

    const token = localStorage.getItem(btoa(environment.AUTH_TOKEN_NAME));
    const sessionId = localStorage.getItem(btoa(environment.AUTH_SESSION_ID_NAME));
    const offset = localStorage.getItem("offset");

    const modifiedReq = req.clone({
      setHeaders: {
        'Authorization': 'Bearer ' + token || 'none',
        'sessionId': sessionId || 'none',
        'offset': offset || '0',
      }
    });
  
    // Pasa la solicitud modificada al siguiente manejador
    return next(modifiedReq);
  };
