const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const fs = require('fs');
const app = express();

app.use(cors());
app.use(express.json());

// 1. Cargar configuración con manejo de error para evitar que el server "explote"
let config;
try {
    const configData = fs.readFileSync('./config.json', 'utf8');
    config = JSON.parse(configData);
    console.log("✅ Configuración de '" + config.nombre_sitio + "' cargada correctamente.");
} catch (err) {
    console.error("❌ ERROR CRÍTICO: No se pudo leer config.json. Asegúrate de que el archivo existe en GitHub.");
    // Usamos una configuración por defecto para que el server no se caiga
    config = { nombre_sitio: "Diario Local", categorias: ["General"], color_primario: "#000000" };
}

// 2. Conexión a la base de datos (Versión PLAN GRATUITO)
// Guardamos en la raíz del proyecto para no requerir Discos pagos
const db = new sqlite3.Database('./database.db', (err) => {
    if (err) console.error("Error abriendo base de datos:", err);
    else console.log("💾 Base de datos conectada localmente (Modo Efímero).");
});

// 3. Crear tabla de noticias si no existe
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

// --- RUTAS DE LA API ---

// Obtener configuración (Para Lovable)
app.get('/api/config', (req, res) => {
    res.json(config);
});

// Obtener noticias publicadas (Para los lectores)
app.get('/api/noticias', (req, res) => {
    db.all("SELECT * FROM noticias WHERE publicado = 1 ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Obtener TODAS las noticias (Para el Admin)
app.get('/api/admin/noticias', (req, res) => {
    db.all("SELECT * FROM noticias ORDER BY fecha DESC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Crear una nueva noticia
app.post('/api/admin/noticias', (req, res) => {
    const { titulo, subtitulo, cuerpo, categoria, imagen_url } = req.body;
    const query = `INSERT INTO noticias (titulo, subtitulo, cuerpo, categoria, imagen_url, publicado) VALUES (?, ?, ?, ?, ?, 1)`;
    db.run(query, [titulo, subtitulo, cuerpo, categoria, imagen_url], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ id: this.lastID, status: "Noticia creada con éxito" });
    });
});

// Cambiar estado Publicado/Oculto
app.patch('/api/admin/noticias/:id/toggle', (req, res) => {
    db.run(`UPDATE noticias SET publicado = 1 - publicado WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: "Estado actualizado" });
    });
});

// Eliminar noticia
app.delete('/api/admin/noticias/:id', (req, res) => {
    db.run(`DELETE FROM noticias WHERE id = ?`, [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ status: "Noticia eliminada" });
    });
});

// 4. Iniciar Servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor listo en el puerto ${PORT}`);
});