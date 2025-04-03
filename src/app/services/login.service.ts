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

  private url: string = `${environment.API_GATEWAY_URL}/${environment.API_PATH_SECURITY}/auth/login`;

  tokenData: IUserData | null = null;

  constructor(
    private http: HttpClient,
    public router: Router,
  ) { }

  public routerF() {
    this.router.navigate(['/auth/login']);
  }

  login(username: string, password: string) {

    return this.http.post<any>(this.url, {
          grant_type: environment.AUTH_GRANT_TYPE,
          username: username,
          password: password,
          client_id: environment.AUTH_CLIENTID,
          client_secret: environment.AUTH_SECRET,
        }).pipe(
          map(res => res || of([]))
        )
  }
}
