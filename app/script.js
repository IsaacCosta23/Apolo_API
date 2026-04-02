const API_BASE = 'https://apolo-api-nd3u.onrender.com';

let map;
let denuncias = [];

// Elementos DOM
const apiStatus = document.getElementById('api-status');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('error-message');
const listView = document.getElementById('list-view');
const mapView = document.getElementById('map-view');
const createView = document.getElementById('create-view');
const denunciasList = document.getElementById('denuncias-list');
const createForm = document.getElementById('create-form');
const toastContainer = document.getElementById('toast-container');

// Navegação
document.getElementById('list-btn').addEventListener('click', () => showView('list'));
document.getElementById('map-btn').addEventListener('click', () => showView('map'));
document.getElementById('create-btn').addEventListener('click', () => showView('create'));

function showView(view) {
    document.querySelectorAll('nav button').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`#${view}-btn`).classList.add('active');

    listView.classList.add('hidden');
    mapView.classList.add('hidden');
    createView.classList.add('hidden');

    if (view === 'list') listView.classList.remove('hidden');
    else if (view === 'map') {
        mapView.classList.remove('hidden');
        initMap();
    } else if (view === 'create') createView.classList.remove('hidden');
}

// Verificar status da API
async function checkAPIStatus() {
    try {
        const response = await fetch(`${API_BASE}/`);
        if (response.ok) {
            apiStatus.textContent = 'API Online';
            apiStatus.style.color = '#48bb78';
        } else {
            throw new Error('API Indisponível');
        }
    } catch (error) {
        apiStatus.textContent = 'API Offline';
        apiStatus.style.color = '#e53e3e';
    }
}

// Carregar denúncias
async function loadDenuncias() {
    showLoading(true);
    hideError();
    try {
        const response = await fetch(`${API_BASE}/denuncias`);
        if (!response.ok) throw new Error('Erro ao carregar denúncias');
        denuncias = await response.json();
        renderList();
        renderMap();
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Renderizar lista
function renderList() {
    denunciasList.innerHTML = '';
    denuncias.forEach(denuncia => {
        const li = document.createElement('li');
        li.className = 'denuncia-item';
        li.innerHTML = `
            <h3>${denuncia.tipo}</h3>
            <p>${denuncia.descricao}</p>
            <p>Local: ${denuncia.latitude}, ${denuncia.longitude}</p>
            <p>Data: ${new Date(denuncia.data_hora).toLocaleString()}</p>
            <span class="nivel-periculosidade nivel-${denuncia.nivel_periculosidade.toLowerCase()}">${denuncia.nivel_periculosidade}</span>
            <button class="delete-btn" data-id="${denuncia.id}">Deletar</button>
        `;
        denunciasList.appendChild(li);
    });

    // Eventos de deletar
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            await deleteDenuncia(id);
        });
    });
}

// Renderizar mapa
function renderMap() {
    if (!map) return;
    map.eachLayer(layer => {
        if (layer instanceof L.Marker) map.removeLayer(layer);
    });

    denuncias.forEach(denuncia => {
        const color = getColor(denuncia.nivel_periculosidade);
        const marker = L.circleMarker([denuncia.latitude, denuncia.longitude], {
            color: color,
            fillColor: color,
            fillOpacity: 0.8,
            radius: 8
        }).addTo(map);

        marker.bindPopup(`
            <strong>${denuncia.tipo}</strong><br>
            ${denuncia.descricao}<br>
            Periculosidade: ${denuncia.nivel_periculosidade}
        `);
    });
}

function getColor(nivel) {
    switch (nivel.toLowerCase()) {
        case 'baixo': return '#48bb78';
        case 'medio': return '#ed8936';
        case 'alto': return '#e53e3e';
        default: return '#667eea';
    }
}

// Inicializar mapa
function initMap() {
    if (map) return;
    map = L.map('map').setView([-23.5505, -46.6333], 10); // São Paulo como centro padrão
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    renderMap();
}

// Criar denúncia
createForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        tipo: document.getElementById('tipo').value,
        descricao: document.getElementById('descricao').value,
        latitude: parseFloat(document.getElementById('latitude').value),
        longitude: parseFloat(document.getElementById('longitude').value),
        anonimo: document.getElementById('anonimo').checked
    };

    showLoading(true);
    hideError();
    try {
        const response = await fetch(`${API_BASE}/denuncias`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Erro ao criar denúncia');
        showToast('Denúncia criada com sucesso!');
        createForm.reset();
        await loadDenuncias();
        showView('list');
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
});

// Deletar denúncia
async function deleteDenuncia(id) {
    if (!confirm('Tem certeza que deseja deletar esta denúncia?')) return;
    showLoading(true);
    hideError();
    try {
        const response = await fetch(`${API_BASE}/denuncias/${id}`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Erro ao deletar denúncia');
        showToast('Denúncia deletada com sucesso!');
        await loadDenuncias();
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

// Geolocation
document.getElementById('get-location').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            document.getElementById('latitude').value = position.coords.latitude;
            document.getElementById('longitude').value = position.coords.longitude;
        }, () => {
            showToast('Erro ao obter localização', true);
        });
    } else {
        showToast('Geolocalização não suportada', true);
    }
});

// Utilitários
function showLoading(show) {
    loading.classList.toggle('hidden', !show);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : ''}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    checkAPIStatus();
    loadDenuncias();
    setInterval(checkAPIStatus, 30000); // Verificar status a cada 30s
});