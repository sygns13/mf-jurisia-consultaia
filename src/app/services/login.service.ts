import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
const environment = (window as any).__env as any;
import { Router } from '@angular/router';
import { IUserData } from '../layout/interfaces/user-data';
import { JwtHelperService } from '@auth0/angular-jwt';
import { map } from 'rxjs/operators';
import { of } from 'rxjs';



@Injectable({
  providedIn: 'root'
})
export class LoginService {

  private loginUrl: string = `${environment.API_GATEWAY_URL}/${environment.API_PATH_SECURITY}/auth/login`;
  private refreshUrl: string = `${environment.API_GATEWAY_URL}/${environment.API_PATH_SECURITY}/auth/refresh`;

  tokenData: IUserData | null = null;

  constructor(
    private http: HttpClient,
    public router: Router,
  ) { }

  public routerF() {
    this.router.navigate(['/auth/login']);
  }

  login(username: string, password: string) {

    return this.http.post<any>(this.loginUrl, {
          grant_type: environment.AUTH_GRANT_TYPE,
          username: username,
          password: password,
          client_id: environment.AUTH_CLIENTID,
          client_secret: environment.AUTH_SECRET,
        }).pipe(
          map(res => res || of([]))
        )
  }

  refreshToken() {

    const refreshtoken = localStorage.getItem(btoa(environment.AUTH_REFRESH_TOKEN));
    const username = localStorage.getItem(btoa(environment.AUTH_USERNAME_NAME));

    return this.http.post<any>(this.refreshUrl, {
          grant_type: environment.REFRESH_GRANT_TYPE,
          username: username,
          client_id: environment.AUTH_CLIENTID,
          client_secret: environment.AUTH_SECRET,
          refresh_token: refreshtoken,
        }).pipe(
          map(res => res || of([]))
        )
  }
}
