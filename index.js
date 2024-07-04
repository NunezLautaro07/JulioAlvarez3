const express = require("express");
const mysql = require("mysql");
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();
const upload = multer({ dest: 'public/' });

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
        pdf BLOB
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

// Ruta POST para manejar el inicio de sesión privada y la inserción de podcast
app.post("/private", upload.single('Documento'), (req, res) => {
    const { Persona, Contraseña, Nombre, Tema, Descripcion } = req.body;
    const Documento = req.file;

    if (Persona && Contraseña) {
        // Verifica si se enviaron Persona y Contraseña (autenticación)
        if (Persona === process.env.ADMIN_USER && Contraseña === process.env.ADMIN_PASS) {
            res.render("pagEspecial"); // Autenticación exitosa, renderiza la página especial
        } else {
            res.status(401).send("Contraseña incorrecta"); // Autenticación fallida
        }
    } else if (Nombre && Tema && Descripcion && Documento) {
        // Verifica si se enviaron Nombre, Tema y Descripcion (inserción de podcast)
        const query = 'INSERT INTO podcast (nombre, tema, descripcion, pdf) VALUES (?, ?, ?, ?)';

        // Leer los datos del archivo
        fs.readFile(Documento.path, (err, pdfData) => {
            if (err) {
                console.error('Error al leer el archivo:', err);
                res.status(500).json({ error: 'Error al leer el archivo' });
            } else {
                database.query(query, [Nombre, Tema, Descripcion, pdfData], (err, result) => {
                    if (err) {
                        console.error('Error al insertar nuevo podcast:', err);
                        res.status(500).json({ error: 'Error al insertar nuevo podcast' });
                    } else {
                        console.log('Nuevo podcast insertado correctamente:', result);
                        res.redirect('/'); // Redirige a la página principal después de insertar

                        // Elimina el archivo temporal después de procesarlo
                        fs.unlink(Documento.path, (err) => {
                            if (err) {
                                console.error('Error al eliminar el archivo temporal:', err);
                            }
                        });
                    }
                });
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
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});
