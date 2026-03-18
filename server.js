const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const JWT_SECRET = 'espinillo-secret-2026-xK9mP';
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');

const app = express();
const db = new Database('panel.db');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 🔥 fallback para producción (Render)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── CREAR TABLAS ───
db.exec(`
  CREATE TABLE IF NOT EXISTS usuario (
    id INTEGER PRIMARY KEY,
    nombre TEXT NOT NULL,
    lote TEXT NOT NULL,
    email TEXT NOT NULL,
    telefono TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS reclamos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lote TEXT NOT NULL,
    titulo TEXT NOT NULL,
    detalle TEXT,
    area TEXT,
    urgencia TEXT DEFAULT 'Normal',
    estado TEXT DEFAULT 'En curso',
    fecha TEXT NOT NULL,
    hora TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS visitas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rel TEXT NOT NULL,
    dni TEXT,
    telefono TEXT,
    fecha TEXT,
    hora TEXT,
    tipo TEXT DEFAULT 'Una vez',
    lote TEXT DEFAULT '42',
    estado TEXT DEFAULT 'proximas',
    initials TEXT,
    color TEXT DEFAULT 'olive'
  );

  CREATE TABLE IF NOT EXISTS votaciones (
    id TEXT PRIMARY KEY,
    num TEXT,
    tipo TEXT,
    titulo TEXT,
    desc TEXT,
    abre TEXT,
    cierra TEXT,
    cerro TEXT,
    dias_restantes INTEGER,
    dias_abre INTEGER,
    socios INTEGER DEFAULT 28,
    estado TEXT,
    opciones TEXT,
    candidatos TEXT,
    max_candidatos INTEGER,
    resultados TEXT
  );

  CREATE TABLE IF NOT EXISTS votos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    votacion_id TEXT NOT NULL,
    usuario_id INTEGER DEFAULT 1,
    voto TEXT NOT NULL
  );
`);

// ─── DATOS INICIALES ───
const usuarioExiste = db.prepare('SELECT id FROM usuario WHERE id = 1').get();
if (!usuarioExiste) {
  db.prepare('INSERT INTO usuario (id, nombre, lote, email, telefono) VALUES (1, ?, ?, ?, ?)').run('Martín García', '42', 'martin.garcia@email.com', '+54 11 5555-4242');
}

const reclamosExisten = db.prepare('SELECT id FROM reclamos LIMIT 1').get();
if (!reclamosExisten) {
  const ins = db.prepare('INSERT INTO reclamos (lote, titulo, detalle, area, estado, fecha, hora) VALUES (?, ?, ?, ?, ?, ?, ?)');
  ins.run('42', 'Fuga de agua en calle principal', 'Se observa pérdida de agua en la esquina de calle principal con acceso norte.', 'Infraestructura', 'En curso', '14 mar', '09:15');
  ins.run('87', 'Iluminación deficiente — Sendero Este', 'Tres luminarias consecutivas del sendero este están apagadas desde el martes.', 'Iluminación', 'En curso', '12 mar', '14:30');
  ins.run('31', 'Portón del acceso norte sin funcionar', 'El motor del portón norte presenta fallas intermitentes.', 'Accesos', 'Resuelto', '8 mar', '11:00');
  ins.run('56', 'Poda de árboles en zona común', 'Ramas que obstruyen la visibilidad en la intersección.', 'Espacios comunes', 'Resuelto', '5 mar', '16:45');
}

const visitasExisten = db.prepare('SELECT id FROM visitas LIMIT 1').get();
if (!visitasExisten) {
  const ins = db.prepare('INSERT INTO visitas (nombre, rel, dni, fecha, hora, tipo, estado, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  ins.run('Carlos Rodríguez', 'Plomero', '28.341.090', 'Mié 18 mar', '10:00 hs', 'Una vez', 'proximas', 'CR', 'olive');
  ins.run('Ana Pérez', 'Familiar', '31.220.445', 'Sáb 22 mar', 'Todo el día', 'Día completo', 'proximas', 'AP', 'corn');
  ins.run('Juan López', 'Proveedor', '25.100.333', 'Dom 10 mar', '09:00 hs', 'Una vez', 'pasadas', 'JL', 'olive');
}

const votacionesExisten = db.prepare('SELECT id FROM votaciones LIMIT 1').get();
if (!votacionesExisten) {
  const ins = db.prepare('INSERT INTO votaciones (id, num, tipo, titulo, desc, abre, cierra, dias_restantes, socios, estado, opciones, max_candidatos, candidatos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  ins.run('v01','01','Aprobación','Presupuesto anual 2026','Aprobación del presupuesto de gastos e inversiones para el período 2026. Incluye obras de iluminación, poda y refacción del SUM.','1 mar 2026','20 mar 2026',4,28,'activas',JSON.stringify(['Apruebo','Rechazo','Me abstengo']),null,null);
  ins.run('v02','02','Elección','Elección de la nueva Comisión Directiva','Elegí hasta 3 candidatos para integrar la Comisión Directiva del período 2026–2028.','15 feb 2026','7 mar 2026',19,28,'activas',null,3,JSON.stringify([{id:'c1',i:'MA',n:'María',c:'#d4a0a0'},{id:'c2',i:'LA',n:'Laura',c:'#a0b8d4'},{id:'c3',i:'CR',n:'Carolina',c:'#a0c4a8'},{id:'c4',i:'VE',n:'Verónica',c:'#c4a8d4'},{id:'c5',i:'AN',n:'Andrea',c:'#d4c4a0'},{id:'c6',i:'CA',n:'Carlos',c:'#b8d4b0'},{id:'c7',i:'MI',n:'Miguel',c:'#d4b8a0'},{id:'c8',i:'PA',n:'Pablo',c:'#a8c0d8'},{id:'c9',i:'DA',n:'Daniel',c:'#c8b8d8'},{id:'c10',i:'JU',n:'Juan',c:'#c8d4a8'}]));
  db.prepare('INSERT INTO votaciones (id, num, tipo, titulo, desc, abre, cierra, dias_abre, socios, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('v03','03','Infraestructura','Ampliación del estacionamiento sector B','Se votará si ampliar 40 plazas adicionales en el sector B del estacionamiento.','1 abr 2026','15 abr 2026',16,28,'proximas');
  db.prepare('INSERT INTO votaciones (id, num, tipo, titulo, desc, cerro, socios, estado, resultados) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run('v04','04','Servicios','¿Renovamos el servicio de seguridad nocturna?','Votación sobre la continuidad del contrato con la empresa de seguridad nocturna actual.','7 mar 2026',28,'cerradas',JSON.stringify([{l:'Renovar',p:71,f:'rf-olive'},{l:'Nueva empresa',p:21,f:'rf-corn'},{l:'Abstención',p:8,f:'rf-rule'}]));
}

// ─── RUTAS API ───

// Usuario
app.get('/api/usuario', (req, res) => {
  const u = db.prepare('SELECT * FROM usuario WHERE id = 1').get();
  res.json(u);
});

app.put('/api/usuario', (req, res) => {
  const { nombre, lote, email, telefono } = req.body;
  db.prepare('UPDATE usuario SET nombre=?, lote=?, email=?, telefono=? WHERE id=1').run(nombre, lote, email, telefono);
  res.json({ ok: true });
});

// Reclamos
app.get('/api/reclamos', (req, res) => {
  const rows = db.prepare('SELECT * FROM reclamos ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/reclamos', (req, res) => {
  const { lote, titulo, detalle, area, urgencia } = req.body;
  const now = new Date();
  const fecha = `${now.getDate()} mar`;
  const hora = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const info = db.prepare('INSERT INTO reclamos (lote, titulo, detalle, area, urgencia, estado, fecha, hora) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(lote || '42', titulo, detalle || '', area, urgencia || 'Normal', 'En curso', fecha, hora);
  res.json({ id: info.lastInsertRowid, ok: true });
});

app.put('/api/reclamos/:id/estado', (req, res) => {
  const { estado } = req.body;
  db.prepare('UPDATE reclamos SET estado=? WHERE id=?').run(estado, req.params.id);
  res.json({ ok: true });
});

// Visitas
app.get('/api/visitas', (req, res) => {
  const rows = db.prepare('SELECT * FROM visitas ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/visitas', (req, res) => {
  const { nombre, rel, dni, telefono, fecha, hora, tipo, lote } = req.body;
  const initials = nombre.split(' ').slice(0,2).map(n => n[0] || '').join('').toUpperCase();
  const info = db.prepare('INSERT INTO visitas (nombre, rel, dni, telefono, fecha, hora, tipo, lote, estado, initials, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(nombre, rel, dni || '', telefono || '', fecha || 'Sin fecha', hora || '—', tipo || 'Una vez', lote || '42', 'proximas', initials, 'olive');
  res.json({ id: info.lastInsertRowid, ok: true });
});

app.delete('/api/visitas/:id', (req, res) => {
  db.prepare('DELETE FROM visitas WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// Votaciones
app.get('/api/votaciones', (req, res) => {
  const rows = db.prepare('SELECT * FROM votaciones').all();
  const votos = db.prepare('SELECT votacion_id, voto FROM votos WHERE usuario_id = 1').all();
  const votosMap = {};
  votos.forEach(v => votosMap[v.votacion_id] = v.voto);

  const result = rows.map(v => ({
    ...v,
    opciones: v.opciones ? JSON.parse(v.opciones) : null,
    candidatos: v.candidatos ? JSON.parse(v.candidatos) : null,
    resultados: v.resultados ? JSON.parse(v.resultados) : null,
    votos: db.prepare('SELECT COUNT(*) as cnt FROM votos WHERE votacion_id=?').get(v.id).cnt,
    voto: votosMap[v.id] || null,
  }));
  res.json(result);
});

app.post('/api/votaciones/:id/votar', (req, res) => {
  const { voto } = req.body;
  const yaVoto = db.prepare('SELECT id FROM votos WHERE votacion_id=? AND usuario_id=1').get(req.params.id);
  if (yaVoto) return res.status(400).json({ error: 'Ya votaste en esta votación.' });
  db.prepare('INSERT INTO votos (votacion_id, usuario_id, voto) VALUES (?, 1, ?)').run(req.params.id, voto);
  res.json({ ok: true });
});
// ─── RECLAMOS ───
app.get("/api/reclamos", (req, res) => {
  const reclamos = db.prepare("SELECT * FROM reclamos ORDER BY id DESC").all();
  res.json(reclamos);
});
// ─── CREAR RECLAMO ───
app.post("/api/reclamos", (req, res) => {
  const { titulo, descripcion } = req.body;

  if (!titulo || !descripcion) {
    return res.status(400).json({ error: "Faltan datos" });
  }

  const stmt = db.prepare(`
    INSERT INTO reclamos (titulo, descripcion, estado)
    VALUES (?, ?, 'pendiente')
  `);

  const result = stmt.run(titulo, descripcion);

  res.json({
    ok: true,
    id: result.lastInsertRowid
  });
});
// ─── INICIAR SERVIDOR ───
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📁 Base de datos: panel.db`);
  console.log(`🛑 Para detener: Ctrl + C`);
});

// ─── AGENDA ───
db.exec(`
  CREATE TABLE IF NOT EXISTS eventos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT NOT NULL,
    fecha TEXT NOT NULL,
    hora_inicio TEXT,
    hora_fin TEXT,
    lugar TEXT,
    estado TEXT DEFAULT 'activo',
    creado_por TEXT DEFAULT 'administracion',
    aprobado INTEGER DEFAULT 1,
    max_asistentes INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS asistencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_id INTEGER NOT NULL,
    usuario_id INTEGER DEFAULT 1,
    nombre TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE(evento_id, usuario_id)
  );
`);

const eventosExisten = db.prepare('SELECT id FROM eventos LIMIT 1').get();
if (!eventosExisten) {
  const ins = db.prepare('INSERT INTO eventos (titulo, descripcion, categoria, fecha, hora_inicio, hora_fin, lugar, creado_por) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  ins.run('Reunión de consorcio', 'Asamblea ordinaria. Se tratarán temas de convivencia, espacios comunes y presupuesto 2026.', 'reunion', '2026-03-25', '19:00', '21:00', 'SUM — Planta baja', 'administracion');
  ins.run('Torneo de tenis — Dobles', 'Torneo interno de dobles mixtos. Inscripción previa requerida.', 'deportivo', '2026-03-29', '09:00', '18:00', 'Canchas de tenis', 'administracion');
  ins.run('Cena de otoño', 'Cena anual de la comunidad. Menú a confirmar. Lugares limitados.', 'social', '2026-04-05', '21:00', '01:00', 'Quincho principal', 'administracion');
  ins.run('Corte de luz programado', 'Mantenimiento eléctrico en sector B. Sin suministro de 08:00 a 12:00.', 'mantenimiento', '2026-03-20', '08:00', '12:00', 'Sector B', 'administracion');
  ins.run('Clase de yoga — Inicio ciclo otoño', 'Clases los martes y jueves. Nivel principiante e intermedio.', 'actividad', '2026-03-18', '07:30', '08:30', 'Salón multiuso', 'administracion');
  ins.run('Torneo de golf mensual', 'Competencia mensual interna. Categorías A, B y C.', 'deportivo', '2026-04-12', '08:00', '17:00', 'Campo de golf', 'administracion');
}

// GET eventos
app.get('/api/eventos', (req, res) => {
  const rows = db.prepare('SELECT * FROM eventos WHERE aprobado = 1 ORDER BY fecha ASC, hora_inicio ASC').all();
  const result = rows.map(e => ({
    ...e,
    asistentes: db.prepare('SELECT COUNT(*) as cnt FROM asistencias WHERE evento_id = ?').get(e.id).cnt,
    yoAsisto: !!db.prepare('SELECT id FROM asistencias WHERE evento_id = ? AND usuario_id = 1').get(e.id)
  }));
  res.json(result);
});

// POST evento nuevo
app.post('/api/eventos', (req, res) => {
  const { titulo, descripcion, categoria, fecha, hora_inicio, hora_fin, lugar, creado_por, max_asistentes } = req.body;
  const aprobado = creado_por === 'administracion' ? 1 : 0;
  const info = db.prepare('INSERT INTO eventos (titulo, descripcion, categoria, fecha, hora_inicio, hora_fin, lugar, creado_por, aprobado, max_asistentes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(titulo, descripcion || '', categoria, fecha, hora_inicio || '', hora_fin || '', lugar || '', creado_por || 'vecino', aprobado, max_asistentes || null);
  res.json({ id: info.lastInsertRowid, ok: true, aprobado });
});

// POST confirmar asistencia
app.post('/api/eventos/:id/asistir', (req, res) => {
  try {
    db.prepare('INSERT INTO asistencias (evento_id, usuario_id, nombre) VALUES (?, 1, ?)').run(req.params.id, req.body.nombre || 'Martín García');
    res.json({ ok: true, accion: 'confirmado' });
  } catch {
    db.prepare('DELETE FROM asistencias WHERE evento_id = ? AND usuario_id = 1').run(req.params.id);
    res.json({ ok: true, accion: 'cancelado' });
  }
});

// DELETE evento
app.delete('/api/eventos/:id', (req, res) => {
  db.prepare('DELETE FROM eventos WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM asistencias WHERE evento_id = ?').run(req.params.id);
  res.json({ ok: true });
});

// ─── MARKETPLACE ───
db.exec(`
  CREATE TABLE IF NOT EXISTS publicaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    categoria TEXT NOT NULL,
    precio REAL,
    contacto TEXT,
    lote TEXT,
    autor TEXT,
    estado TEXT DEFAULT 'pendiente',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS mensajes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    publicacion_id INTEGER NOT NULL,
    de_lote TEXT NOT NULL,
    de_nombre TEXT NOT NULL,
    mensaje TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const pubExisten = db.prepare('SELECT id FROM publicaciones LIMIT 1').get();
if (!pubExisten) {
  const ins = db.prepare('INSERT INTO publicaciones (titulo, descripcion, categoria, precio, contacto, lote, autor, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  ins.run('Bicicleta de montaña casi nueva', 'Trek Marlin 5, rodado 29, poco uso. Con luces y porta bidón.', 'venta', 45000, '+54 11 4444-1234', '15', 'Jorge Fernández', 'aprobada');
  ins.run('Clases de natación para niños', 'Doy clases particulares en la pileta del club. Niveles inicial e intermedio.', 'servicio', 3500, '+54 11 5555-9876', '23', 'Laura Gómez', 'aprobada');
  ins.run('Donación — ropa de invierno', 'Ropa en buen estado: camperas, pantalones, sweaters. Tallas varias.', 'donacion', null, '+54 11 3333-5678', '8', 'Carlos Méndez', 'aprobada');
  ins.run('Mesa de jardín con 4 sillas', 'Juego de jardín de aluminio. Color blanco. En perfecto estado.', 'venta', 28000, '+54 11 6666-4321', '31', 'María Torres', 'aprobada');
  ins.run('Servicio de jardinería', 'Mantenimiento de jardines, poda y riego. Precios accesibles para vecinos del barrio.', 'servicio', 2800, '+54 11 7777-8765', '44', 'Roberto Silva', 'aprobada');
  ins.run('Donación — juguetes y libros infantiles', 'Juguetes en buen estado y libros para chicos de 3 a 10 años.', 'donacion', null, '+54 11 8888-2345', '19', 'Ana Rodríguez', 'pendiente');
}

app.get('/api/publicaciones', (req, res) => {
  const rows = db.prepare('SELECT * FROM publicaciones ORDER BY id DESC').all();
  res.json(rows);
});

app.post('/api/publicaciones', (req, res) => {
  const { titulo, descripcion, categoria, precio, contacto } = req.body;
  const u = db.prepare('SELECT * FROM usuario WHERE id = 1').get();
  const info = db.prepare('INSERT INTO publicaciones (titulo, descripcion, categoria, precio, contacto, lote, autor, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(titulo, descripcion || '', categoria, precio || null, contacto || u.telefono, u.lote, u.nombre, 'pendiente');
  res.json({ id: info.lastInsertRowid, ok: true });
});

app.put('/api/publicaciones/:id/estado', (req, res) => {
  const { estado } = req.body;
  db.prepare('UPDATE publicaciones SET estado = ? WHERE id = ?').run(estado, req.params.id);
  res.json({ ok: true });
});

app.delete('/api/publicaciones/:id', (req, res) => {
  db.prepare('DELETE FROM publicaciones WHERE id = ?').run(req.params.id);
  db.prepare('DELETE FROM mensajes WHERE publicacion_id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/publicaciones/:id/mensajes', (req, res) => {
  const rows = db.prepare('SELECT * FROM mensajes WHERE publicacion_id = ? ORDER BY created_at ASC').all(req.params.id);
  res.json(rows);
});

app.post('/api/publicaciones/:id/mensajes', (req, res) => {
  const { mensaje } = req.body;
  const u = db.prepare('SELECT * FROM usuario WHERE id = 1').get();
  const info = db.prepare('INSERT INTO mensajes (publicacion_id, de_lote, de_nombre, mensaje) VALUES (?, ?, ?, ?)').run(req.params.id, u.lote, u.nombre, mensaje);
  res.json({ id: info.lastInsertRowid, ok: true });
});

// ─── ADMIN ───
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'espinillo2026';

app.post('/api/admin/login', (req, res) => {
  const { usuario, password } = req.body;
  if (usuario === ADMIN_USER && password === ADMIN_PASS) {
    res.json({ ok: true });
  } else {
    res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  }
});

app.get('/api/admin/pendientes', (req, res) => {
  const pubs = db.prepare("SELECT * FROM publicaciones WHERE estado='pendiente' ORDER BY id DESC").all();
  const eventos = db.prepare("SELECT * FROM eventos WHERE aprobado=0 ORDER BY id DESC").all();
  res.json({ publicaciones: pubs, eventos });
});

app.get('/api/admin/stats', (req, res) => {
  res.json({
    vecinos: 1,
    reclamos: db.prepare('SELECT COUNT(*) as n FROM reclamos').get().n,
    reclamosAbiertos: db.prepare("SELECT COUNT(*) as n FROM reclamos WHERE estado='En curso'").get().n,
    visitas: db.prepare('SELECT COUNT(*) as n FROM visitas').get().n,
    eventos: db.prepare('SELECT COUNT(*) as n FROM eventos WHERE aprobado=1').get().n,
    publicaciones: db.prepare("SELECT COUNT(*) as n FROM publicaciones WHERE estado='aprobada'").get().n,
    pubPendientes: db.prepare("SELECT COUNT(*) as n FROM publicaciones WHERE estado='pendiente'").get().n,
    eventoPendientes: db.prepare('SELECT COUNT(*) as n FROM eventos WHERE aprobado=0').get().n,
  });
});

app.get('/api/admin/reclamos', (req, res) => {
  res.json(db.prepare('SELECT * FROM reclamos ORDER BY id DESC').all());
});

app.get('/api/admin/visitas', (req, res) => {
  res.json(db.prepare('SELECT * FROM visitas ORDER BY id DESC').all());
});

app.get('/api/admin/eventos', (req, res) => {
  const rows = db.prepare('SELECT * FROM eventos ORDER BY fecha ASC').all();
  const result = rows.map(e => ({
    ...e,
    asistentes: db.prepare('SELECT COUNT(*) as cnt FROM asistencias WHERE evento_id=?').get(e.id).cnt
  }));
  res.json(result);
});

app.get('/api/admin/publicaciones', (req, res) => {
  res.json(db.prepare('SELECT * FROM publicaciones ORDER BY id DESC').all());
});

app.put('/api/admin/eventos/:id/aprobar', (req, res) => {
  db.prepare('UPDATE eventos SET aprobado=1 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.delete('/api/admin/eventos/:id', (req, res) => {
  db.prepare('DELETE FROM eventos WHERE id=?').run(req.params.id);
  db.prepare('DELETE FROM asistencias WHERE evento_id=?').run(req.params.id);
  res.json({ ok: true });
});

app.put('/api/admin/reclamos/:id', (req, res) => {
  db.prepare('UPDATE reclamos SET estado=? WHERE id=?').run(req.body.estado, req.params.id);
  res.json({ ok: true });
});

// ─── ADMIN ───

// ─── SERVICIOS ───
db.exec(`
  CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    categoria TEXT NOT NULL,
    descripcion TEXT,
    telefono TEXT,
    email TEXT,
    horario TEXT,
    habilitado INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS instalaciones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    capacidad INTEGER,
    horario TEXT,
    imagen_color TEXT DEFAULT '#5c6b45',
    activa INTEGER DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS reservas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instalacion_id INTEGER NOT NULL,
    usuario_id INTEGER DEFAULT 1,
    nombre_usuario TEXT,
    lote TEXT,
    fecha TEXT NOT NULL,
    hora_inicio TEXT NOT NULL,
    hora_fin TEXT NOT NULL,
    estado TEXT DEFAULT 'confirmada',
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const provExisten = db.prepare('SELECT id FROM proveedores LIMIT 1').get();
if (!provExisten) {
  const ins = db.prepare('INSERT INTO proveedores (nombre, categoria, descripcion, telefono, email, horario) VALUES (?, ?, ?, ?, ?, ?)');
  ins.run('Carlos Rodríguez', 'Plomería', 'Instalaciones, reparaciones y destapaciones. Urgencias 24hs.', '+54 11 4444-1111', 'carlos.plomero@email.com', 'Lun–Sáb 8:00–18:00');
  ins.run('Electricidad Gómez', 'Electricidad', 'Instalaciones eléctricas, tableros, iluminación y urgencias.', '+54 11 4444-2222', 'electricidad.gomez@email.com', 'Lun–Vie 8:00–17:00');
  ins.run('Verde Jardines', 'Jardinería', 'Mantenimiento de jardines, poda, riego automático y paisajismo.', '+54 11 4444-3333', 'verde.jardines@email.com', 'Mar–Sáb 7:00–16:00');
  ins.run('Pinturería López', 'Pintura', 'Pintura interior y exterior, texturas y terminaciones.', '+54 11 4444-4444', 'pintura.lopez@email.com', 'Lun–Vie 8:00–17:00');
  ins.run('Aire & Calor', 'Climatización', 'Instalación y service de aires acondicionados y calderas.', '+54 11 4444-5555', 'aire.calor@email.com', 'Lun–Sáb 9:00–18:00');
  ins.run('Seguridad Total', 'Seguridad', 'Cámaras, alarmas y sistemas de acceso para el hogar.', '+54 11 4444-6666', 'seguridad.total@email.com', 'Lun–Vie 9:00–17:00');
}

const instExisten = db.prepare('SELECT id FROM instalaciones LIMIT 1').get();
if (!instExisten) {
  const ins = db.prepare('INSERT INTO instalaciones (nombre, descripcion, capacidad, horario, imagen_color) VALUES (?, ?, ?, ?, ?)');
  ins.run('SUM Principal', 'Salón de usos múltiples para eventos, reuniones y celebraciones. Equipado con cocina, baños y sistema de audio.', 80, 'Lun–Dom 8:00–23:00', '#5c6b45');
  ins.run('Quincho Norte', 'Quincho con parrilla, mesas y sillas para 30 personas. Vista al lago.', 30, 'Lun–Dom 10:00–22:00', '#a07c28');
  ins.run('Cancha de Tenis 1', 'Cancha de tenis de polvo de ladrillo. Iluminación nocturna disponible.', 4, 'Lun–Dom 7:00–22:00', '#1a6a8a');
  ins.run('Cancha de Tenis 2', 'Cancha de tenis de polvo de ladrillo. Iluminación nocturna disponible.', 4, 'Lun–Dom 7:00–22:00', '#1a6a8a');
  ins.run('Pileta Principal', 'Pileta olímpica con sector para adultos y niños. Vestuarios y duchas disponibles.', 50, 'Nov–Mar 9:00–19:00', '#185FA5');
  ins.run('Campo de Golf', 'Campo de 18 hoyos. Requiere handicap registrado. Caddies disponibles.', 20, 'Lun–Dom 7:00–18:00', '#3B6D11');
  ins.run('Gimnasio', 'Equipamiento completo de musculación y cardio. Clases grupales incluidas.', 25, 'Lun–Sáb 6:00–22:00', '#7a4a8f');
}

app.get('/api/proveedores', (req, res) => {
  res.json(db.prepare('SELECT * FROM proveedores WHERE habilitado=1 ORDER BY categoria, nombre').all());
});

app.get('/api/instalaciones', (req, res) => {
  res.json(db.prepare('SELECT * FROM instalaciones WHERE activa=1').all());
});

app.get('/api/reservas', (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, i.nombre as instalacion_nombre 
    FROM reservas r 
    JOIN instalaciones i ON r.instalacion_id = i.id
    WHERE r.usuario_id = 1
    ORDER BY r.fecha DESC, r.hora_inicio ASC
  `).all();
  res.json(rows);
});

app.get('/api/instalaciones/:id/reservas', (req, res) => {
  const rows = db.prepare(
    "SELECT * FROM reservas WHERE instalacion_id=? AND fecha>=date('now') AND estado='confirmada' ORDER BY fecha, hora_inicio"
  ).all(req.params.id);
  res.json(rows);
});

app.post('/api/reservas', (req, res) => {
  const { instalacion_id, fecha, hora_inicio, hora_fin } = req.body;
  const u = db.prepare('SELECT * FROM usuario WHERE id=1').get();
  const conflicto = db.prepare(
    "SELECT id FROM reservas WHERE instalacion_id=? AND fecha=? AND estado='confirmada' AND ((hora_inicio < ? AND hora_fin > ?) OR (hora_inicio < ? AND hora_fin > ?) OR (hora_inicio >= ? AND hora_fin <= ?))"
  ).get(instalacion_id, fecha, hora_fin, hora_inicio, hora_fin, hora_inicio, hora_inicio, hora_fin);
  if (conflicto) return res.status(409).json({ error: 'Ese horario ya está reservado.' });
  const info = db.prepare(
    'INSERT INTO reservas (instalacion_id, usuario_id, nombre_usuario, lote, fecha, hora_inicio, hora_fin) VALUES (?, 1, ?, ?, ?, ?, ?)'
  ).run(instalacion_id, u.nombre, u.lote, fecha, hora_inicio, hora_fin);
  res.json({ id: info.lastInsertRowid, ok: true });
});

app.delete('/api/reservas/:id', (req, res) => {
  db.prepare('UPDATE reservas SET estado=? WHERE id=? AND usuario_id=1').run('cancelada', req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/proveedores', (req, res) => {
  res.json(db.prepare('SELECT * FROM proveedores ORDER BY categoria, nombre').all());
});

app.post('/api/admin/proveedores', (req, res) => {
  const { nombre, categoria, descripcion, telefono, email, horario } = req.body;
  const info = db.prepare('INSERT INTO proveedores (nombre, categoria, descripcion, telefono, email, horario) VALUES (?, ?, ?, ?, ?, ?)').run(nombre, categoria, descripcion||'', telefono||'', email||'', horario||'');
  res.json({ id: info.lastInsertRowid, ok: true });
});

app.delete('/api/admin/proveedores/:id', (req, res) => {
  db.prepare('UPDATE proveedores SET habilitado=0 WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/admin/reservas', (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, i.nombre as instalacion_nombre
    FROM reservas r
    JOIN instalaciones i ON r.instalacion_id = i.id
    ORDER BY r.fecha DESC
  `).all();
  res.json(rows);
});

// ─── AUTH / VECINOS ───
db.exec(`
  CREATE TABLE IF NOT EXISTS vecinos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    apellido TEXT NOT NULL,
    dni TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    lote TEXT NOT NULL,
    email TEXT,
    telefono TEXT,
    estado TEXT DEFAULT 'activo',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS codigos_lote (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lote TEXT UNIQUE NOT NULL,
    codigo TEXT UNIQUE NOT NULL,
    usado INTEGER DEFAULT 0,
    vecino_id INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

const codigosExisten = db.prepare('SELECT id FROM codigos_lote LIMIT 1').get();
if (!codigosExisten) {
  const ins = db.prepare('INSERT INTO codigos_lote (lote, codigo) VALUES (?, ?)');
  ins.run('42', 'ESP-042-X7K');
  ins.run('43', 'ESP-043-M2P');
  ins.run('44', 'ESP-044-R9L');
  ins.run('45', 'ESP-045-T4W');
  ins.run('87', 'ESP-087-K3J');
  ins.run('31', 'ESP-031-V6H');
  ins.run('56', 'ESP-056-F1D');
}

app.post('/api/auth/registro', (req, res) => {
  const { nombre, apellido, dni, password, codigo_lote, email, telefono } = req.body;
  if (!nombre || !apellido || !dni || !password || !codigo_lote) {
    return res.status(400).json({ error: 'Completá todos los campos obligatorios.' });
  }
  const codigo = db.prepare('SELECT * FROM codigos_lote WHERE codigo=? AND usado=0').get(codigo_lote.toUpperCase());
  if (!codigo) return res.status(400).json({ error: 'Código de lote inválido o ya utilizado.' });
  const existe = db.prepare('SELECT id FROM vecinos WHERE dni=?').get(dni);
  if (existe) return res.status(400).json({ error: 'Ya existe un vecino con ese DNI.' });
  const info = db.prepare('INSERT INTO vecinos (nombre, apellido, dni, password, lote, email, telefono) VALUES (?, ?, ?, ?, ?, ?, ?)').run(nombre, apellido, dni, password, codigo.lote, email||'', telefono||'');
  db.prepare('UPDATE codigos_lote SET usado=1, vecino_id=? WHERE id=?').run(info.lastInsertRowid, codigo.id);
  res.json({ ok: true, vecino_id: info.lastInsertRowid, lote: codigo.lote });
});

app.post('/api/auth/login', (req, res) => {
  const { dni, password } = req.body;
  if (!dni || !password) return res.status(400).json({ error: 'Ingresá DNI y contraseña.' });
  const vecino = db.prepare("SELECT * FROM vecinos WHERE dni=? AND password=? AND estado='activo'").get(dni, password);
  if (!vecino) return res.status(401).json({ error: 'DNI o contraseña incorrectos.' });
  res.json({ ok: true, vecino: { id: vecino.id, nombre: vecino.nombre, apellido: vecino.apellido, dni: vecino.dni, lote: vecino.lote, email: vecino.email, telefono: vecino.telefono } });
});

app.get('/api/admin/vecinos', (req, res) => {
  res.json(db.prepare('SELECT v.*, c.codigo FROM vecinos v LEFT JOIN codigos_lote c ON c.vecino_id=v.id ORDER BY v.lote ASC').all());
});

app.get('/api/admin/codigos', (req, res) => {
  res.json(db.prepare('SELECT * FROM codigos_lote ORDER BY lote ASC').all());
});

app.post('/api/admin/codigos', (req, res) => {
  const { lote } = req.body;
  if (!lote) return res.status(400).json({ error: 'Ingresá el número de lote.' });
  const existe = db.prepare('SELECT id FROM codigos_lote WHERE lote=?').get(lote);
  if (existe) return res.status(400).json({ error: 'Ya existe un código para ese lote.' });
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const rand = Array.from({length:3}, ()=>chars[Math.floor(Math.random()*chars.length)]).join('');
  const codigo = `ESP-${lote.padStart(3,'0')}-${rand}`;
  const info = db.prepare('INSERT INTO codigos_lote (lote, codigo) VALUES (?, ?)').run(lote, codigo);
  res.json({ ok: true, codigo, id: info.lastInsertRowid });
});

app.delete('/api/admin/vecinos/:id', (req, res) => {
  db.prepare("UPDATE vecinos SET estado='inactivo' WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ─── SEGURIDAD ───
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos. Esperá 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

function verificarToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) return res.status(401).json({ error: 'No autorizado.' });
  try {
    const decoded = jwt.verify(auth.split(' ')[1], JWT_SECRET);
    req.vecino = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado.' });
  }
}

app.post('/api/auth/registro-seguro', async (req, res) => {
  const { nombre, apellido, dni, password, codigo_lote, email, telefono } = req.body;
  if (!nombre || !apellido || !dni || !password || !codigo_lote) {
    return res.status(400).json({ error: 'Completá todos los campos obligatorios.' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  const codigo = db.prepare('SELECT * FROM codigos_lote WHERE codigo=? AND usado=0').get(codigo_lote.toUpperCase());
  if (!codigo) return res.status(400).json({ error: 'Código de lote inválido o ya utilizado.' });
  const existe = db.prepare('SELECT id FROM vecinos WHERE dni=?').get(dni);
  if (existe) return res.status(400).json({ error: 'Ya existe un vecino con ese DNI.' });
  const hash = await bcrypt.hash(password, 10);
  const info = db.prepare('INSERT INTO vecinos (nombre, apellido, dni, password, lote, email, telefono) VALUES (?, ?, ?, ?, ?, ?, ?)').run(nombre, apellido, dni, hash, codigo.lote, email||'', telefono||'');
  db.prepare('UPDATE codigos_lote SET usado=1, vecino_id=? WHERE id=?').run(info.lastInsertRowid, codigo.id);
  res.json({ ok: true, lote: codigo.lote });
});

app.post('/api/auth/login-seguro', loginLimiter, async (req, res) => {
  const { dni, password } = req.body;
  if (!dni || !password) return res.status(400).json({ error: 'Ingresá DNI y contraseña.' });
  const vecino = db.prepare("SELECT * FROM vecinos WHERE dni=? AND estado='activo'").get(dni);
  if (!vecino) return res.status(401).json({ error: 'DNI o contraseña incorrectos.' });
  const match = await bcrypt.compare(password, vecino.password);
  if (!match) return res.status(401).json({ error: 'DNI o contraseña incorrectos.' });
  const token = jwt.sign(
    { id: vecino.id, lote: vecino.lote, nombre: vecino.nombre, apellido: vecino.apellido },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
  res.json({ ok: true, token, vecino: { id: vecino.id, nombre: vecino.nombre, apellido: vecino.apellido, dni: vecino.dni, lote: vecino.lote, email: vecino.email, telefono: vecino.telefono } });
});

app.get('/api/auth/perfil', verificarToken, (req, res) => {
  const v = db.prepare('SELECT id,nombre,apellido,dni,lote,email,telefono FROM vecinos WHERE id=?').get(req.vecino.id);
  res.json(v);
});

app.put('/api/auth/perfil', verificarToken, (req, res) => {
  const { nombre, apellido, email, telefono } = req.body;
  db.prepare('UPDATE vecinos SET nombre=?, apellido=?, email=?, telefono=? WHERE id=?').run(nombre, apellido, email, telefono, req.vecino.id);
  res.json({ ok: true });
});
