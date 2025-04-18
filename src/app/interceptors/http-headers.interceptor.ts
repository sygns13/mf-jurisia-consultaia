/*import { HttpEvent, HttpHandler, HttpInterceptor, HttpInterceptorFn, HttpRequest, HttpErrorResponse, HttpHandlerFn } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError, from } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { LoginService } from './../services/login.service'; // Servicio de autenticación
import { AuthService } from './../services/auth.service'; // Servicio de autenticación
import { inject } from '@angular/core';
import { UserSession } from '../interfaces/session-id';
const environment = (window as any).__env as any;

// Variables para manejar el estado del refresh token (fuera de la función para persistencia)
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

let userSession: UserSession = {} as UserSession;

export const httpHeadersInterceptor: HttpInterceptorFn = (req, next) => {
    // Clona la solicitud y agrega un encabezado personalizado

    // URL base de tu API interna (ajusta según tu entorno)
    const internalApiBase = environment.API_GATEWAY_URL;

     // Verifica si la solicitud es para una API externa
     if (!req.url.startsWith(internalApiBase)) {
      // Si es externa, pasa la solicitud sin modificar
      return next(req);
    } 

    // Define la ruta que quieres bypassear
    const bypassRoutes = [
      `/${environment.API_PATH_SECURITY}/auth/login`, 
      `/${environment.API_PATH_SECURITY}/auth/refresh`,
      `/${environment.API_PATH_SECURITY}/auth/logout`,
      `/${environment.API_PATH_SECURITY}/auth/verify-session`]; // Rutas que no deben modificarse

    // Verifica si la URL de la solicitud coincide con alguna ruta en bypassRoutes
    if (bypassRoutes.some(route => req.url.includes(route))) {
        // Si coincide, pasa la solicitud sin modificar
        return next(req);
      }


    const modifiedReq = addAuthHeader(req); // Añade el token al header
  
    // Pasa la solicitud modificada al siguiente manejador
    //return next(modifiedReq);

    const loginService = inject(LoginService); // Inyecta el servicio
    const authService = inject(AuthService); // Inyecta el servicio

    console.log('pistaA');

    return next(modifiedReq).pipe(
      catchError((error: HttpErrorResponse) => {

        console.log('pistaB');
        console.log(error);
        // Solo manejar errores 401 (excluyendo el endpoint de refresh)
        if (error.status === 401) {
          console.log('pistaC');
          return handle401Error(modifiedReq, next, loginService, authService);
        }

        console.log('pistaD');
        return throwError(() => error);
      })
    );
  };

  // Función para añadir el token al header
  const addAuthHeader = (req: HttpRequest<unknown>): HttpRequest<unknown> => {
    const token = localStorage.getItem(btoa(environment.AUTH_TOKEN_NAME));
    const sessionId = localStorage.getItem(btoa(environment.AUTH_SESSION_ID_NAME));
    const offset = localStorage.getItem("offset");

    return req.clone({
      setHeaders: {
        'Authorization': 'Bearer ' + token || 'none',
        'sessionId': sessionId || 'none',
        'offset': offset || '0',
      }
    });
  };

  // Función para manejar el error 401
  const handle401Error = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn,
    loginService: LoginService,
    authService: AuthService
  ): Observable<HttpEvent<unknown>> => {

    console.log('pista1');
    if (!isRefreshing) {
      console.log('pista2');
      isRefreshing = true;
      refreshTokenSubject.next(null);

      return from(loginService.refreshToken()).pipe(
        switchMap((res: any) => {

          console.log('pista3');
          console.log(res);
          isRefreshing = false;
          
          if (res.success) {
            console.log('pista4');
            userSession = res.user;
    
            const token = userSession.token.access_token;
    
            localStorage.setItem(
              btoa(environment.AUTH_TOKEN_NAME),
              token
            );
            localStorage.setItem(
              btoa(environment.AUTH_REFRESH_TOKEN),
              userSession.token.refresh_token
            );
    
            localStorage.setItem(
              btoa(environment.AUTH_USERNAME_NAME),
              userSession.username
            );
    
            localStorage.setItem(
              btoa(environment.AUTH_SESSION_ID_NAME),
              userSession.userSessionsId
            );
          }

          console.log('pista5');

          return next(addAuthHeader(req)); // Reintenta la petición
        }),
        catchError((err) => {
          console.log('pista6');
          isRefreshing = false;
          authService.logOut(); // Redirige al login si falla
          return throwError(() => err);
        })
      );
    } else {
      console.log('pista7');
      // Espera a que el token se refresque y reintenta
      return refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap(() => next(addAuthHeader(req)))
      );
    }
  };*/