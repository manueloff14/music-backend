// Cargar variables de entorno desde el archivo .env
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const admin = require('firebase-admin');

// Inicializar Firebase Admin usando la variable de entorno
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_JSON);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://prueba-93dad-default-rtdb.firebaseio.com/', // URL de Realtime Database
});

// Instancias de Firebase Admin
const auth = admin.auth();
const db = admin.database();

// Configurar servidor
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ type: 'application/json', limit: '10mb', strict: true }));
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta para registrar un usuario
app.post('/register', async (req, res) => {
    const { email, password, name, surname, username, age } = req.body;

    // Validar datos de entrada
    if (!email || !password || !name || !surname || !username || !age) {
        return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }

    try {
        // Verificar si el username ya está en uso
        const userSnapshot = await db.ref(`users/${username}`).once('value');
        if (userSnapshot.exists()) {
            return res.status(400).json({ error: 'El nombre de usuario ya está en uso.' });
        }

        // Normalizar todos los strings para evitar problemas de codificación
        const normalizeString = (str) => str.normalize('NFC');

        // Crear usuario en Firebase Authentication
        const userRecord = await auth.createUser({
            email: normalizeString(email),
            password: password, // No es necesario normalizar la contraseña
            displayName: normalizeString(`${name} ${surname}`),
        });

        // Guardar datos adicionales en Firebase Realtime Database con username como clave
        const userData = {
            name: normalizeString(name),
            surname: normalizeString(surname),
            email: normalizeString(email),
            username: normalizeString(username),
            age: normalizeString(age.toString()),
            plan: 'free', // Tipo de plan inicial
            uid: userRecord.uid, // Referencia cruzada
            createdAt: new Date().toISOString(),
        };

        await db.ref(`users/${username}`).set(userData);

        return res.status(201).json({
            message: 'Usuario registrado exitosamente',
            userData,
        });
    } catch (error) {
        console.error('Error al registrar el usuario:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Levantar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
