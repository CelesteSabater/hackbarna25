const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const API_URL = process.env.API_URL || 'http://localhost:8000';

// Middleware
app.use(express.static('public'));
app.use(express.json());
app.use(cors());

// Cliente para la API de Python
const apiClient = axios.create({
    baseURL: API_URL,
    timeout: 10000,
});

// Rutas del frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Proxy para las APIs de Python
app.get('/api/meals/suggestions', async (req, res) => {
    try {
        const response = await apiClient.get('/api/meals/suggestions');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching suggestions:', error.message);
        res.status(500).json({ 
            error: 'Error al obtener sugerencias',
            suggestions: [
                "Pollo a la plancha con verduras",
                "Salmón al horno con espárragos",
                "Ensalada César con pollo"
            ]
        });
    }
});

app.get('/api/plans', async (req, res) => {
    try {
        const response = await apiClient.get('/api/plans');
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching plans:', error.message);
        res.status(500).json({ error: 'Error al obtener planes' });
    }
});

app.post('/api/plans', async (req, res) => {
    try {
        const response = await apiClient.post('/api/plans', req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error creating plan:', error.message);
        if (error.response?.status === 400) {
            res.status(400).json({ error: 'Ya existe un plan para esta semana' });
        } else {
            res.status(500).json({ error: 'Error al crear el plan' });
        }
    }
});

app.put('/api/plans/:week', async (req, res) => {
    try {
        const response = await apiClient.put(`/api/plans/${req.params.week}`, req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Error updating plan:', error.message);
        res.status(500).json({ error: 'Error al actualizar el plan' });
    }
});

app.delete('/api/plans/:week', async (req, res) => {
    try {
        const response = await apiClient.delete(`/api/plans/${req.params.week}`);
        res.json(response.data);
    } catch (error) {
        console.error('Error deleting plan:', error.message);
        res.status(500).json({ error: 'Error al eliminar el plan' });
    }
});

app.listen(PORT, () => {
    console.log(`Frontend corriendo en http://localhost:${PORT}`);
    console.log(`Conectado a API: ${API_URL}`);
});