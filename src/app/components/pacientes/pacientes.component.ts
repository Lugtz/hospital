import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PacientesService } from '../../services/pacientes.service';
import { MedicosService } from '../../services/medicos.service';
import { CitasService } from '../../services/citas.service'; // Conexión a Citas (SQL)
import { IaService } from '../../services/ia.service';       // Conexión a IA (Python)
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { Paciente } from '../../models/paciente.model';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-pacientes',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    DatePipe// <--- ESTO ES LO QUE TE FALTA PARA QUE EL HTML LO RECONOZCA
  ],
  templateUrl: './pacientes.component.html',
  styleUrls: ['./pacientes.component.css']
})
export class PacientesComponent implements OnInit {
  // === VARIABLES DEL FORMULARIO Y FIREBASE ===
  pacienteForm: FormGroup;
  pacientes: Paciente[] = [];
  editingId: string | null = null;
  user$: Observable<any>;
  mostrarLista: boolean = false; 
  readonly soloLetrasRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  
  // === VARIABLES NUEVAS PARA SQL SERVER E IA ===
  medicosDB: any[] = [];      // Aquí guardo los médicos que traigo de Somee
  historialCitas: any[] = []; // Aquí guardo todas las citas para dibujarlas en la tabla HTML
  resultadoIA: any = null;    // Si esta variable tiene datos, el HTML dibuja la tarjeta bonita de IA. Si es null, la esconde.

  constructor(
    private fb: FormBuilder,
    private pacientesService: PacientesService,
    private medicosService: MedicosService,
    private citasService: CitasService, 
    private iaService: IaService,       
    private authService: AuthService,
    private router: Router
  ) {
    this.user$ = this.authService.user$; 

    // Configuración de validaciones del formulario
    this.pacienteForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80), Validators.pattern(this.soloLetrasRegex)]],
      apellidos: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(200), Validators.pattern(this.soloLetrasRegex)]],
      fechaNacimiento: ['', Validators.required],
      domicilio: ['', Validators.required],
      correoElectronico: ['', [Validators.required, Validators.email]]
    });
  }

  // Se ejecuta automáticamente en cuanto la pantalla carga
  ngOnInit() {
    this.loadPacientes(); // Trae datos de Firebase
    this.loadMedicos();   // Trae catálogo de médicos de SQL Server
    this.loadCitas();     // Trae el historial de citas de SQL Server para llenar la tabla inferior
    
    this.user$.subscribe(user => {
      if (user && user.email) {
        this.pacienteForm.patchValue({
          correoElectronico: user.email
        });
      }
    });
  }

  // ==========================================
  // METODOS GET (Lectura de Bases de Datos)
  // ==========================================
  loadMedicos() {
    this.medicosService.getMedicos().subscribe({
      next: (data) => {
        this.medicosDB = data;
        console.log('✅ Médicos de SQL Server cargados');
      },
      error: (error) => console.error('❌ Error al cargar médicos:', error)
    });
  }

  // NUEVO: Función para consultar a Python y llenar la tabla de historial
  loadCitas() {
    this.citasService.getCitas().subscribe({
      next: (data) => {
        this.historialCitas = data;
        console.log('✅ Historial de Citas cargado desde SQL Server');
      },
      error: (error) => console.error('❌ Error al cargar citas:', error)
    });
  }

  loadPacientes() {
    this.pacientesService.getPacientes().subscribe({
      next: (data) => { this.pacientes = data; },
      error: (error) => console.error('❌ Error al cargar pacientes:', error)
    });
  }

  // ==========================================
  // METODOS DE FIREBASE (CRUD ORIGINAL)
  // ==========================================
  onSubmit() {
    if (this.pacienteForm.valid) {
      this.user$.pipe(take(1)).subscribe(user => {
        if (user) {
          const formValues = this.pacienteForm.getRawValue();
          const paciente: any = {
            ...formValues,
            fechaNacimiento: new Date(formValues.fechaNacimiento),
            ownerId: user.uid 
          };

          if (this.editingId) {
            this.updatePaciente(paciente);
          } else {
            this.addPaciente(paciente);
          }
        } else {
          alert('Debes estar autenticado para guardar datos.');
        }
      });
    } else {
      this.markFormGroupTouched(this.pacienteForm);
      alert('⚠️ El formulario tiene errores.');
    }
  }

  addPaciente(paciente: Paciente) {
    this.pacientesService.addPaciente(paciente)
      .then(() => {
        alert('✅ Paciente agregado exitosamente en Firebase');
        this.resetForm();
      })
      .catch(error => console.error('Error:', error));
  }

  updatePaciente(paciente: Paciente) {
    if (this.editingId) {
      this.pacientesService.updatePaciente(this.editingId, paciente)
        .then(() => {
          alert('✅ Paciente actualizado');
          this.resetForm();
        });
    }
  }

  editPaciente(paciente: Paciente) {
    this.editingId = paciente.id || null;
    const fechaFormateada = this.formatDateForInput(paciente.fechaNacimiento);
    this.pacienteForm.patchValue({
      nombre: paciente.nombre,
      apellidos: paciente.apellidos,
      fechaNacimiento: fechaFormateada,
      domicilio: paciente.domicilio,
      correoElectronico: paciente.correoElectronico
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  deletePaciente(id: string | undefined) {
    if (!id) return;
    if (confirm('¿Estás seguro de eliminar este paciente?')) {
      this.pacientesService.deletePaciente(id).then(() => alert('✅ Paciente eliminado'));
    }
  }

  resetForm() {
    this.pacienteForm.reset();
    this.editingId = null;
    this.user$.pipe(take(1)).subscribe(user => {
      if (user && user.email) {
        this.pacienteForm.patchValue({ correoElectronico: user.email });
      }
    });
  }

  formatDateForInput(date: any): string {
    if (date instanceof Date) return date.toISOString().split('T')[0];
    if (date?.toDate) return date.toDate().toISOString().split('T')[0];
    return '';
  }

  markFormGroupTouched(formGroup: FormGroup) {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  logout() {
    this.authService.logout().then(() => this.router.navigate(['/login']));
  }

  toggleVisibilidad() {
    if (this.mostrarLista) {
      this.mostrarLista = false; 
    } else {
      const password = prompt('Introduce la contraseña:');
      if (password && password.trim().toLowerCase() === 'pacientes') {
        this.mostrarLista = true; 
      }
    }
  }

  // ==================================================
  // 🔥 MÓDULO DE INTELIGENCIA ARTIFICIAL Y SQL SERVER
  // ==================================================
  guardarCitaConIA(diagnostico: string) {
    // 1. Validamos que el paciente sí haya escrito síntomas
    if (!diagnostico || diagnostico.trim().length < 5) {
      alert("⚠️ Por favor describe tus síntomas a detalle para que la IA pueda evaluarlos.");
      return;
    }

    // Limpiamos la vista si había algo antes
    this.resultadoIA = null; 

    // 2. Mandamos los síntomas a la API de Python (Render)
    this.iaService.getPrediccion(diagnostico).subscribe({
      next: (res: any) => {
        console.log("✅ Diagnóstico de la IA:", res);
        
        const especialidadIA = res.prediccion.especialidad_sugerida;
        const urgenciaIA = res.prediccion.urgencia;

        // 3. EL CEREBRO DE LA OPERACIÓN: Buscar al médico adecuado
        // Buscamos en la lista de médicos (que ya trajiste de Somee) el que tenga esa especialidad
        const medicoAsignado = this.medicosDB.find(m => m.especialidad === especialidadIA);
        let idMedicoFinal = 0;
        let nombreMedico = '';

        // --- SOLUCIÓN DE BLOQUEO: ASIGNACIÓN FORZADA ---
        if (!medicoAsignado) {
          console.warn(`⚠️ La IA sugiere ${especialidadIA}, pero no hay especialista. Asignando médico general (ID: 1).`);
          idMedicoFinal = 1; // Asignamos el ID 1 por defecto (asegúrate de que exista en Somee)
          nombreMedico = "Médico de Guardia";
        } else {
          idMedicoFinal = medicoAsignado.id_medico;
          nombreMedico = medicoAsignado.apellidos;
        }

        // 4. Armamos la cita usando los nombres correctos para Somee
        // 4. Armamos la cita respetando las reglas estrictas de SQL Server
        const nuevaCita = {
          id_medico: idMedicoFinal,
          id_paciente_firebase: "ID_PACIENTE_PRUEBA",
          
          // Formateamos la fecha limpia
          fecha_hora: new Date().toISOString().slice(0, 19).replace('T', ' '), 
          
          motivo: diagnostico,
          
          // Metemos el análisis de la IA en la columna que acepta texto libre
          diagnostico: `Especialidad: ${especialidadIA} | Urgencia: ${urgenciaIA}`, 
          
          // EL TRUCO MAGISTRAL: La contraseña que exige SQL Server
          estado: 'Pendiente' 
        };

        console.log("Objeto a guardar:", nuevaCita);

        // 5. Guardamos la cita completa en SQL Server
        this.citasService.crearCita(nuevaCita).subscribe({
          next: () => {
            // Notificamos al usuario con qué médico se le agendó (Especialista o Guardia)
            alert(`✅ Cita agendada exitosamente con el Dr./Dra. ${nombreMedico} (${especialidadIA}).`);
            this.loadCitas(); // Refrescamos la tabla visual
          },
          error: (err) => {
            console.error("❌ Error al guardar en SQL Server:", err);
            alert("Error de red: No se pudo conectar con Somee. Revisa la consola (F12).");
          }
        });
      },
      error: (err: any) => {
        console.error("❌ Error en la IA:", err);
        alert("El motor de IA está calculando, intenta de nuevo en unos segundos.");
      }
    });
  }
}