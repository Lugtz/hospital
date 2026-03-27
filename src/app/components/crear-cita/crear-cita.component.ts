import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IaService } from '../../services/ia.service';
import { MedicosService } from '../../services/medicos.service';
import { CitasService } from '../../services/citas.service';

@Component({
  selector: 'app-crear-cita',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-cita.component.html',
  styleUrls: ['./crear-cita.component.css']
})
export class CrearCitaComponent implements OnInit {
  // Estructura que espera tu Backend en Python (schemas.py)
  cita: any = {
    id_medico: 0,
    id_paciente_firebase: 'user_prueba_123', // ID del paciente logueado
    fecha_hora: '',
    motivo: '',
    diagnostico_ia: '', // Se llenará con la IA antes de guardar
    nivel_urgencia: ''  // Se llenará con la IA antes de guardar
  };

  medicos: any[] = [];
  cargando: boolean = false;

  constructor(
    private iaService: IaService,
    private medicosService: MedicosService,
    private citasService: CitasService
  ) {}

  ngOnInit(): void {
    this.obtenerMedicos();
  }

  obtenerMedicos() {
    this.medicosService.getMedicos().subscribe((data: any) => this.medicos = data);
  }

  // FUNCIÓN MAESTRA: Ejecuta la IA en silencio y guarda en Somee
  agendarCita() {
    if (this.cita.motivo.length < 10 || this.cita.id_medico === 0) {
      alert("Por favor, completa todos los campos.");
      return;
    }

    this.cargando = true;

    // 1. Primero consultamos a la IA en Render
    this.iaService.getPrediccion(this.cita.motivo).subscribe({
      next: (res: any) => {
        // 2. Guardamos la predicción en el objeto (Oculto para el paciente)
        this.cita.diagnostico_ia = res.prediccion.especialidad_sugerida;
        this.cita.nivel_urgencia = res.prediccion.urgencia;

        // 3. Ahora enviamos el objeto COMPLETO a SQL Server (Somee)
        this.citasService.crearCita(this.cita).subscribe({
          next: () => {
            alert("Cita agendada correctamente. El médico revisará su caso.");
            this.cargando = false;
            // Aquí puedes limpiar el formulario o redirigir
          },
          error: (err) => {
            console.error("Error al guardar en Somee:", err);
            this.cargando = false;
          }
        });
      },
      error: (err) => {
        console.error("Error en el Motor de IA:", err);
        this.cargando = false;
      }
    });
  }
}