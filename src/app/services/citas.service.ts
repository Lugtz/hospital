import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class CitasService {
private URL_API = 'https://bd-qbx0.onrender.com/citas/';

  constructor(private http: HttpClient) { }

  crearCita(cita: any): Observable<any> {
    return this.http.post(this.URL_API, cita);
  }

  getCitas(): Observable<any[]> {
    return this.http.get<any[]>(this.URL_API);
  }
}