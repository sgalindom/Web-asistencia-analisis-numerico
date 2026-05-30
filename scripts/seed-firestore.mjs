// Inyecta un grupo de demostración con 34 estudiantes en Firestore.
// Uso: node scripts/seed-firestore.mjs

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
}));

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const GROUP_NAME = process.env.GROUP_NAME || "Demo — Análisis Numérico (Seed)";

console.log(`Creando grupo: "${GROUP_NAME}" con ${estudiantes.length} estudiantes…`);

const groupRef = await addDoc(collection(db, "groups"), {
  nombreGrupo: GROUP_NAME,
  createdAt: new Date().toISOString(),
});
console.log(`✓ Grupo creado: ${groupRef.id}`);

const batch = writeBatch(db);
estudiantes.forEach((s) => {
  const ref = doc(collection(db, "groups", groupRef.id, "students"));
  batch.set(ref, s);
});
await batch.commit();
console.log(`✓ ${estudiantes.length} estudiantes guardados en /groups/${groupRef.id}/students`);

console.log("\n✅ Listo. Abre el dashboard y selecciona el grupo en el desplegable.");
process.exit(0);
