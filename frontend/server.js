const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración mejorada de CORS
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Middleware
app.use(express.static('public'));
app.use(express.json());

// Cliente para la API de Python con mejores opciones
const createApiClient = (baseURL) => {
    return axios.create({
        baseURL: baseURL,
        timeout: 10000,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
};

// Intentar diferentes URLs del backend
const backendUrls = [
    'http://localhost:8000',
    'http://127.0.0.1:8000'
];

let apiClient = createApiClient(backendUrls[0]);

// Función para probar conexión con el backend
const testBackendConnection = async () => {
    for (const url of backendUrls) {
        try {
            const client = createApiClient(url);
            const response = await client.get('/api/health');
            console.log(`✅ Backend conectado en: ${url}`);
            apiClient = client;
            return true;
        } catch (error) {
            console.log(`❌ Backend no disponible en: ${url}`);
        }
    }
    return false;
};

// Probar conexión al iniciar
testBackendConnection().then(success => {
    if (success) {
        console.log('✅ Conexión con backend establecida');
    } else {
        console.log('❌ No se pudo conectar con el backend');
    }
});

// Rutas del frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/ai-planner', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ai-planner.html'));
});

// Middleware de proxy mejorado
app.use('/api/*', async (req, res) => {
    const originalUrl = req.originalUrl;
    const apiPath = originalUrl.replace('/api', '/api');
    
    console.log(`Proxy: ${req.method} ${apiPath}`);
    
    try {
        const config = {
            method: req.method,
            url: apiPath,
            data: req.body,
            headers: {
                'Content-Type': 'application/json',
                ...req.headers
            }
        };

        // Eliminar headers que pueden causar problemas
        delete config.headers.host;
        delete config.headers.origin;
        delete config.headers.referer;

        const response = await apiClient.request(config);
        
        res.status(response.status).json(response.data);
    } catch (error) {
        console.error('Error en proxy:', error.message);
        
        if (error.response) {
            // El backend respondió con error
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            // No se pudo conectar al backend
            res.status(503).json({ 
                error: 'Backend no disponible',
                message: 'El servidor Python no está respondiendo',
                details: 'Verifica que python app.py esté ejecutándose en el puerto 8000'
            });
        } else {
            // Error en la configuración
            res.status(500).json({ 
                error: 'Error interno del proxy',
                message: error.message 
            });
        }
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'Meal Planner Frontend',
        timestamp: new Date().toISOString()
    });
});

app.get('/health-tracker', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'health-tracker.html'));
});

app.listen(PORT, () => {
    console.log(`🎯 Frontend corriendo en http://localhost:${PORT}`);
    console.log(`📡 Intentando conectar con backend en: ${backendUrls.join(', ')}`);
});