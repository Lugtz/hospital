import { Injectable } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Paciente } from '../models/paciente.model';

@Injectable({
  providedIn: 'root'
})
export class PacientesService {

  constructor(private firestore: Firestore) {}

  // 🔥 SOLUCIÓN: Usamos onSnapshot nativo de Firebase para ignorar el bug de AngularFire
  getPacientes(): Observable<Paciente[]> {
    return new Observable<Paciente[]>(observer => {
      const pacientesRef = collection(this.firestore, 'pacientes');
      
      const unsubscribe = onSnapshot(pacientesRef, 
        (snapshot) => {
          const pacientes: Paciente[] = [];
          snapshot.forEach((docSnapshot) => {
            pacientes.push({ id: docSnapshot.id, ...docSnapshot.data() } as Paciente);
          });
          // Le mandamos los pacientes frescos al componente
          observer.next(pacientes);
        },
        (error) => {
          console.error("Error al leer Firebase:", error);
          observer.error(error);
        }
      );

      // Limpia la conexión cuando cerramos la pantalla
      return () => unsubscribe();
    });
  }

  addPaciente(paciente: Paciente): Promise<any> {
    const pacientesRef = collection(this.firestore, 'pacientes');
    return addDoc(pacientesRef, paciente);
  }

  updatePaciente(id: string, paciente: Partial<Paciente>): Promise<void> {
    const pacienteDoc = doc(this.firestore, `pacientes/${id}`);
    return updateDoc(pacienteDoc, paciente);
  }

  deletePaciente(id: string): Promise<void> {
    const pacienteDoc = doc(this.firestore, `pacientes/${id}`);
    return deleteDoc(pacienteDoc);
  }
}