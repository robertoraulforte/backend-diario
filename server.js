const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// Cargar configuración
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Conexión a la base de datos en el disco de Render
const db = new sqlite3.Database('/data/database.db', (err) => {
    if (err) console.error("Error abriendo base de datos:", err);
    else console.log("Base de datos conectada en /data/database.db");
});

// Crear tabla de noticias
db.run(`CREATE TABLE IF NOT EXISTS noticias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT,
    subtitulo TEXT,
    cuerpo TEXT,
    categoria TEXT,
    imagen_url TEXT,
    publicado INTEGER DEFAULT 0,
    fecha DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// --- RUTAS ---

// 1. Obtener configuración (Nombre del diario, colores, etc.)
app.get('/api/config', (req, res) => {
    res.json(config);
});

// 2. Obtener noticias publicadas (Para el lector)
app.get('/api/noticias', (req, res) => {
    db.all("SELECT * FROM noticias WHERE publicado = 1 ORDER BY fecha DESC", [], (err, rows) => {
        res.json(rows);
    });
});

// 3. Obtener TODAS las noticias (Para el Admin)
app.get('/api/admin/noticias', (req, res) => {
    db.all("SELECT * FROM noticias ORDER BY fecha DESC", [], (err, rows) => {
        res.json(rows);
    });
});

// 4. Crear noticia
app.post('/api/admin/noticias', (req, res) => {
    const { titulo, subtitulo, cuerpo, categoria, imagen_url } = req.body;
    const query = `INSERT INTO noticias (titulo, subtitulo, cuerpo, categoria, imagen_url, publicado) VALUES (?, ?, ?, ?, ?, 1)`;
    db.run(query, [titulo, subtitulo, cuerpo, categoria, imagen_url], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, status: "Noticia creada" });
    });
});

// 5. Toggle Publicar/Ocultar
app.patch('/api/admin/noticias/:id/toggle', (req, res) => {
    db.run(`UPDATE noticias SET publicado = 1 - publicado WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: "Estado actualizado" });
    });
});

// 6. Eliminar noticia
app.delete('/api/admin/noticias/:id', (req, res) => {
    db.run(`DELETE FROM noticias WHERE id = ?`, [req.params.id], (err) => {
        res.json({ status: "Noticia eliminada" });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));