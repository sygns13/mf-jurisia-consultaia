import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
const environment = (window as any).__env as any;;
import { Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { LoginService } from './login.service';
import { UserSession } from '../interfaces/session-id';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private urlLogout: string = `${environment.API_GATEWAY_URL}/${environment.API_PATH_SECURITY}/auth/logout`;
  private urlVerifySession: string = `${environment.API_GATEWAY_URL}/${environment.API_PATH_SECURITY}/auth/verify-session`;

  userSession: UserSession = {} as UserSession;

  constructor(
    private http: HttpClient,
    private router: Router,
    private loginService: LoginService,
  ) { }

  async isLogin(): Promise<boolean | undefined> {

    const token = localStorage.getItem(btoa(environment.AUTH_TOKEN_NAME));
    const username = localStorage.getItem(btoa(environment.AUTH_USERNAME_NAME));
    const sessionId = localStorage.getItem(btoa(environment.AUTH_SESSION_ID_NAME));
    const helper = new JwtHelperService();

    // Si no hay token, username o sessionId, el usuario no está autenticado
    if (!token || !username || !sessionId) {
      this.logOut();
      return false;
    }

    // Verificar si el token ha expirado
    /*
    if (helper.isTokenExpired(token)) {
      this.logOut();
      return false;
    }
    */

    const myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json"); // Cambiamos a JSON

    const jsonBody = {
      userSessionsId: sessionId,
      grant_type: environment.AUTH_GRANT_TYPE,
      client_id: environment.AUTH_CLIENTID,
      username: username,
      client_secret: environment.AUTH_SECRET,
      token: token,
    };

    const requestOptions: RequestInit = {
      method: 'POST',
      headers: myHeaders,
      body: JSON.stringify(jsonBody), // Convertimos el objeto a JSON
      redirect: 'follow'
    };

    try {
      const response = await fetch(this.urlVerifySession, requestOptions);

      // Si la respuesta es exitosa, el usuario está autenticado
      if (response.ok) {
        const data = await response.json();

        if(data.success) {
          return true;
        }
        
      }

      //Seccion Refresh Token
      const res = await this.loginService.refreshToken().toPromise();

      if (res.success) {
        this.userSession = res.user;

        const token = this.userSession.token.access_token;

        localStorage.setItem(
          btoa(environment.AUTH_TOKEN_NAME),
          token
        );
        localStorage.setItem(
          btoa(environment.AUTH_REFRESH_TOKEN),
          this.userSession.token.refresh_token
        );

        localStorage.setItem(
          btoa(environment.AUTH_USERNAME_NAME),
          this.userSession.username
        );

        localStorage.setItem(
          btoa(environment.AUTH_SESSION_ID_NAME),
          this.userSession.userSessionsId
        );

        if (token) {
          return true;
        } else {
          return false;
        }
      }
      
      this.logOut();
      return false;
     
    } catch (error) {
      console.error('Error verificando la sesión:', error);
      this.logOut();
      return false;
    }
  }

  logOut() {
    let tokenAccess = localStorage.getItem(btoa(environment.AUTH_TOKEN_NAME));
    let tokenRefresh = localStorage.getItem(btoa(environment.AUTH_REFRESH_TOKEN));

    if (tokenAccess && tokenRefresh) {
      const myHeaders = new Headers();
      myHeaders.append("Content-Type", "application/json"); // Cambiamos a JSON

      const jsonBody = {
        client_id: environment.AUTH_CLIENTID,
        client_secret: environment.AUTH_SECRET,
        userSessionsId: environment.AUTH_SESSION_ID_NAME,
        access_token: tokenAccess,
        refresh_token: tokenRefresh,
      };

      const roption: RequestInit  = {
        method: 'POST',
        headers: myHeaders,
        body: JSON.stringify(jsonBody), // Convertimos el objeto a JSON
        redirect: 'follow'
      };

      fetch(this.urlLogout, roption)
        .then(response =>{
          localStorage.removeItem(btoa(environment.AUTH_TOKEN_NAME));
          localStorage.removeItem(btoa(environment.AUTH_REFRESH_TOKEN));
          this.router.navigate(['auth/login']);
        })
        .catch(err => {
          localStorage.removeItem(btoa(environment.AUTH_TOKEN_NAME));
          localStorage.removeItem(btoa(environment.AUTH_REFRESH_TOKEN));
          this.router.navigate(['auth/login']);
        });

    } else {
      localStorage.removeItem(btoa(environment.AUTH_TOKEN_NAME));
      localStorage.removeItem(btoa(environment.AUTH_REFRESH_TOKEN));
      this.router.navigate(['auth/login']);
    }
  }

  goToMain() {
    // this.router.navigate(['principal']);
}


}
