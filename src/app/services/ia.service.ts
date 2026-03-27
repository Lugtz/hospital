import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IaService {
  // URL de tu API en Render (con slash al final para evitar errores de CORS)
  private URL_API = 'https://bd-qbx0.onrender.com/ia/analizar-sintomas/';

  constructor(private http: HttpClient) { }

  // Recibe el texto del síntoma y devuelve la predicción
  getPrediccion(motivo: string): Observable<any> {
    const params = new HttpParams().set('motivo', motivo);
    return this.http.get<any>(this.URL_API, { params });
  }
}