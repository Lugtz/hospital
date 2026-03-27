import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MedicosService {
  private URL_API = 'https://bd-qbx0.onrender.com/medicos/';

  constructor(private http: HttpClient) { }

  getMedicos(): Observable<any[]> {
    return this.http.get<any[]>(this.URL_API);
  }
}