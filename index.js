const express = require("express");
const mysql = require("mysql");
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Configuración de Express
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));

// Configuración de la base de datos MySQL
const database_config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'phpmyadmin'
}

const database = mysql.createConnection(database_config);

// Conexión a la base de datos MySQL
database.connect((err) => {
    if (err) {
        console.error('Error de conexión a la base de datos:', err);
    } else {
        console.log('Conexión exitosa a la base de datos');
        createPodcastTable(); // Llama a la función para crear la tabla si no existe
    }
});

// Función para crear la tabla de podcast si no existe
function createPodcastTable() {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS podcast  (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(255) NOT NULL,
        tema VARCHAR(255) NOT NULL,
        descripcion VARCHAR(255) NOT NULL,
        pdf VARCHAR(255),
        imagen VARCHAR(255),
        audio VARCHAR(255)
        )
    `;

    database.query(createTableQuery, (err) => {
        if (err) {
            console.error('Error al crear la tabla de podcast:', err);
        } else {
            console.log('Tabla de podcast creada correctamente');
        }
    });
}

// Ruta GET para obtener todos los podcasts
app.get("/", (req, res) => {
    database.query("SELECT * FROM podcast", (err, results) => {
        if (err) {
            console.error('Error al obtener los podcast:', err);
            res.status(500).json({ error: 'Error al obtener los podcast' });
        } else {
            res.render("index", { podcasts: results });
        }
    });
});

// Ruta GET para renderizar la página de inicio de sesión privada
app.get("/private", (req, res) => {
    res.render("private");
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});

const upload = multer({ storage: storage }).fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'imagen', maxCount: 1 },
    { name: 'audio', maxCount: 1 }
]);

// Ruta POST para manejar el inicio de sesión privada y la inserción de podcast
app.post("/private", upload, (req, res) => {
    const { Persona, Contraseña, Nombre, Tema, Descripcion } = req.body;
    const files = req.files;

    if (Persona && Contraseña) {
        // Verifica si se enviaron Persona y Contraseña (autenticación)
        if (Persona === process.env.ADMIN_USER && Contraseña === process.env.ADMIN_PASS) {
            res.render("pagEspecial"); // Autenticación exitosa, renderiza la página especial
        } else {
            res.status(401).send("Contraseña incorrecta"); // Autenticación fallida
        }
    } else if (Nombre && Tema && Descripcion && files.pdf && files.imagen && files.audio) {
        // Verifica si se enviaron Nombre, Tema, Descripcion y todos los archivos
        const pdfPath = `/uploads/${files.pdf[0].filename}`;
        const imagenPath = `/uploads/${files.imagen[0].filename}`;
        const audioPath = `/uploads/${files.audio[0].filename}`;

        const query = 'INSERT INTO podcast (nombre, tema, descripcion, pdf, imagen, audio) VALUES (?, ?, ?, ?, ?, ?)';
        database.query(query, [Nombre, Tema, Descripcion, pdfPath, imagenPath, audioPath], (err, result) => {
            if (err) {
                console.error('Error al insertar nuevo podcast:', err);
                res.status(500).json({ error: 'Error al insertar nuevo podcast' });
            } else {
                console.log('Nuevo podcast insertado correctamente:', result);
                res.redirect('/'); // Redirige a la página principal después de insertar
            }
        });
    } else {
        res.status(400).send("Datos insuficientes"); // Si no se enviaron suficientes datos
    }
});

// Ruta para manejar cualquier otra solicitud no encontrada
app.use((req, res, next) => {
    res.status(404).render("404", { titulo: "Página 404" });
});

// Iniciar el servidor en el puerto especificado
app.listen(port, (err) => {
    if (err) {
        console.error('Error al iniciar el servidor:', err);
        process.exit(1); // Detener el proceso en caso de error
    }
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
