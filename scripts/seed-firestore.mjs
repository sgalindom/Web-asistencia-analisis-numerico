// Inyecta un grupo demo COMPLETO en Firestore:
//   - 34 estudiantes
//   - 6 clases (últimos días)
//   - Asistencia simulada con un factor de diligencia por estudiante
//
// Uso:  node scripts/seed-firestore.mjs

import { initializeApp } from "firebase/app";
import {
  getFirestore, collection, addDoc, doc, writeBatch,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBodlDhq39az1rPLNdTwdQmlEMqs4dd7v0",
  authDomain: "studio-2541071716-1dd28.firebaseapp.com",
  projectId: "studio-2541071716-1dd28",
  storageBucket: "studio-2541071716-1dd28.firebasestorage.app",
  messagingSenderId: "485342175627",
  appId: "1:485342175627:web:6337cee02e4f7bb4b7cf8e",
};

const nombres = [
  "Santiago Galindo","Mariana Rojas","Juan Pablo Vargas","Camila Hernández",
  "Andrés Felipe Ruiz","Valentina Castro","Sebastián Moreno","Laura Sofía Pérez",
  "David Alejandro Gómez","Isabela Quintero","Daniel Esteban Sánchez","Mariana Ortiz",
  "Tomás Acevedo","Sara Camila Niño","Juan David Patiño","Luciana Restrepo",
  "Mateo Cardona","Antonia Mejía","Felipe Andrés Suárez","Natalia Villamizar",
  "Jerónimo Bautista","Mariana Salazar","Cristian Camilo Pinilla","Manuela Aguilar",
  "Nicolás Lozano","Valeria Ospina","Emilio Cárdenas","Gabriela Reyes",
  "Samuel Beltrán","Maria José Rincón","Joaquín Ramírez","Sofía Alejandra Torres",
  "Diego Alejandro Páez","Renata Velandia",
];
const carreras = [
  "Ingeniería de Sistemas","Ingeniería Industrial","Ingeniería Civil",
  "Ingeniería Electrónica","Administración de Empresas","Contaduría Pública",
  "Psicología","Medicina","Derecho","Arquitectura","Diseño Gráfico",
  "Comunicación Social","Economía","Mercadeo",
];

const estudiantes = nombres.map((nombre, i) => ({
  id: String(2026001 + i),
  nombre,
  carrera: carreras[i % carreras.length],
  edad: 17 + ((i * 3 + 1) % 12),
  // diligencia: probabilidad de asistencia (deterministic, mezcla buenos/regulares/críticos)
  _diligencia: 0.55 + ((i * 37) % 100) / 100 * 0.42, // entre 0.55 y 0.97
}));

// PRNG deterministic para reproducibilidad
let seed = 42;
const rand = () => {
  seed = (seed * 9301 + 49297) % 233280;
  return seed / 233280;
};

const NUM_CLASES = 6;
const hoy = new Date("2026-05-30");
const fechas = Array.from({ length: NUM_CLASES }, (_, i) => {
  const d = new Date(hoy);
  d.setDate(d.getDate() - (NUM_CLASES - 1 - i) * 3); // cada 3 días
  return d.toISOString().split("T")[0];
});

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const GROUP_NAME = process.env.GROUP_NAME || "Demo Completa — Análisis Numérico";
console.log(`Creando grupo: "${GROUP_NAME}" con ${estudiantes.length} estudiantes y ${NUM_CLASES} clases…`);

// 1) Grupo
const groupRef = await addDoc(collection(db, "groups"), {
  nombreGrupo: GROUP_NAME,
  createdAt: new Date().toISOString(),
});
console.log(`  ✓ Grupo: ${groupRef.id}`);

// 2) Estudiantes
const studentRefs = [];
const batch1 = writeBatch(db);
estudiantes.forEach((s) => {
  const ref = doc(collection(db, "groups", groupRef.id, "students"));
  const { _diligencia, ...persist } = s;
  batch1.set(ref, persist);
  studentRefs.push({ id: ref.id, diligencia: _diligencia });
});
await batch1.commit();
console.log(`  ✓ ${estudiantes.length} estudiantes guardados`);

// 3) Clases + asistencia
let totalPresent = 0, totalRecords = 0;
for (let c = 0; c < NUM_CLASES; c++) {
  const fecha = fechas[c];
  const classRef = await addDoc(collection(db, "groups", groupRef.id, "classes"), { fecha });

  const batch2 = writeBatch(db);
  // factor temporal: las primeras clases tienen mejor asistencia; baja en intermedias; sube al final
  const trend = 1 - 0.15 * Math.sin((c / (NUM_CLASES - 1)) * Math.PI);
  studentRefs.forEach((s) => {
    const prob = s.diligencia * trend;
    const valor = rand() < prob ? 1 : 0;
    totalPresent += valor;
    totalRecords++;
    const ref = doc(collection(db, "groups", groupRef.id, "attendance"));
    batch2.set(ref, {
      classId: classRef.id,
      studentId: s.id,
      fecha,
      valor,
      estado: valor === 1 ? "Presente" : "Ausente",
    });
  });
  await batch2.commit();
  console.log(`  ✓ Clase ${c + 1} (${fecha}) — ${estudiantes.length} marcas guardadas`);
}

const promedio = (totalPresent / totalRecords) * 100;
console.log(`\n✅ Listo: grupo "${GROUP_NAME}" creado en /groups/${groupRef.id}`);
console.log(`   ${estudiantes.length} estudiantes · ${NUM_CLASES} clases · ${totalRecords} marcas`);
console.log(`   Asistencia general simulada: ${promedio.toFixed(2)}%`);
process.exit(0);
