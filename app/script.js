const API_BASE = 'https://apolo-api-nd3u.onrender.com';
const CRIMES_ENDPOINT = '/tipos-crime';
const DENUNCIAS_ENDPOINT = '/denuncias';
const DEFAULT_CENTER = { lat: -8.057, lng: -34.879 }; // Avenida Conde da Boa Vista, Recife
const DEFAULT_ZOOM = 13;
const USER_ZOOM = 15;

let map;
let userMarker;
let denuncias = [];
let validCrimes = [];

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
const tipoSelect = document.getElementById('tipo');
const tipoLoading = document.getElementById('tipo-loading');
const latitudeInput = document.getElementById('latitude');
const longitudeInput = document.getElementById('longitude');
const getLocationBtn = document.getElementById('get-location');

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
        if (map) map.invalidateSize();
    } else if (view === 'create') createView.classList.remove('hidden');
}

async function fetchJSON(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Erro de rede');
    }

    if (response.status === 204 || response.status === 205) {
        return null;
    }

    const text = await response.text();
    if (!text) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch (error) {
        console.warn('fetchJSON: resposta sem JSON válido', error);
        return null;
    }
}

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

async function initCrimeTypes() {
    showLoading(true);
    hideError();
    tipoLoading.classList.remove('hidden');

    try {
        const crimes = await fetchJSON(`${API_BASE}${CRIMES_ENDPOINT}`);
        if (!Array.isArray(crimes) || crimes.length === 0) {
            throw new Error('Resposta inválida de tipos de crime');
        }

        validCrimes = crimes;
        populateCrimeSelect(crimes);
    } catch (error) {
        showError('Não foi possível carregar os tipos de crime. Tente novamente mais tarde.');
        console.error('Erro ao carregar tipos de crime:', error);
    } finally {
        tipoLoading.classList.add('hidden');
        showLoading(false);
    }
}

function populateCrimeSelect(crimes) {
    tipoSelect.innerHTML = '<option value="">Selecione um tipo de crime</option>';

    crimes.forEach(crime => {
        const option = document.createElement('option');
        option.value = crime;
        option.textContent = crime;
        tipoSelect.appendChild(option);
    });
}

async function loadDenuncias() {
    showLoading(true);
    hideError();
    try {
        denuncias = await fetchJSON(`${API_BASE}${DENUNCIAS_ENDPOINT}`);
        renderList();
        renderMap();
    } catch (error) {
        showError('Erro ao carregar denúncias. Confira a conexão ou a API.');
        console.error('Erro loadDenuncias:', error);
    } finally {
        showLoading(false);
    }
}

function renderList() {
    denunciasList.innerHTML = '';
    denuncias.forEach(denuncia => {
        const li = document.createElement('li');
        li.className = 'denuncia-item';
        li.innerHTML = `
            <h3>${denuncia.tipo}</h3>
            <p>${denuncia.descricao}</p>
            <p>Local: ${denuncia.latitude.toFixed(6)}, ${denuncia.longitude.toFixed(6)}</p>
            <p>Data: ${new Date(denuncia.data_hora).toLocaleString()}</p>
            <span class="nivel-periculosidade nivel-${denuncia.nivel_periculosidade.toLowerCase()}">${denuncia.nivel_periculosidade}</span>
            <button class="delete-btn" data-id="${denuncia.id}">Deletar</button>
        `;
        denunciasList.appendChild(li);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async e => {
            const id = e.target.dataset.id;
            await deleteDenuncia(id);
        });
    });
}

function renderMap() {
    if (!map) return;

    // remove marcadores atuais (exceto tilelayer)
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    // refazer marcador do usuário
    if (userMarker) userMarker.addTo(map);

    denuncias.forEach(denuncia => {
        const color = getColor(denuncia.nivel_periculosidade);
        const marker = L.circleMarker([denuncia.latitude, denuncia.longitude], {
            color,
            fillColor: color,
            fillOpacity: 0.7,
            radius: 7
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

function initMap() {
    if (map) return;

    map = L.map('map').setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    map.on('click', (e) => {
        latitudeInput.value = e.latlng.lat.toFixed(6);
        longitudeInput.value = e.latlng.lng.toFixed(6);
        setUserMarker(e.latlng.lat, e.latlng.lng, 'Local selecionado');
    });

    renderMap();
}

function setUserMarker(lat, lng, message = 'Você está aqui') {
    if (!map) return;
    if (userMarker) map.removeLayer(userMarker);

    userMarker = L.marker([lat, lng]).addTo(map).bindPopup(message).openPopup();
}

function upgradeLocationInputs(lat, lng) {
    latitudeInput.value = lat.toFixed(6);
    longitudeInput.value = lng.toFixed(6);
}

function requestGeolocation() {
    if (!navigator.geolocation) {
        showToast('Geolocalização não suportada pelo navegador.', true);
        return;
    }

    navigator.geolocation.getCurrentPosition(position => {
        const { latitude, longitude } = position.coords;
        if (map) {
            map.setView([latitude, longitude], USER_ZOOM);
            setUserMarker(latitude, longitude);
        }
        upgradeLocationInputs(latitude, longitude);
        showToast('Posição atualizada: você está no mapa.', false);
    }, error => {
        if (error.code === error.PERMISSION_DENIED) {
            showToast('Permissão de localização negada. Usando ponto padrão.', true);
        } else {
            showToast('Não foi possível obter localização. Usando ponto padrão.', true);
        }

        if (map) {
            map.setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM);
        }
    }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
}

createForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const tipo = tipoSelect.value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const latitude = Number(latitudeInput.value);
    const longitude = Number(longitudeInput.value);
    const anonimo = document.getElementById('anonimo').checked;

    if (!tipo) return showError('Escolha um tipo de crime válido.');
    if (!validCrimes.includes(tipo)) return showError('Tipo de crime inválido. Atualize a página e tente novamente.');
    if (!descricao) return showError('Descrição é obrigatória.');
    if (!isFinite(latitude) || !isFinite(longitude)) return showError('Latitude e longitude válidas são obrigatórias.');

    const payload = { tipo, descricao, latitude, longitude, anonimo };

    showLoading(true);
    hideError();

    try {
        await fetchJSON(`${API_BASE}${DENUNCIAS_ENDPOINT}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        showToast('Denúncia criada com sucesso!');
        createForm.reset();
        await loadDenuncias();
        showView('list');
    } catch (error) {
        showError('Erro ao criar denúncia: ' + error.message);
        console.error('Erro ao enviar denúncia:', error);
    } finally {
        showLoading(false);
    }
});

async function deleteDenuncia(id) {
    if (!confirm('Tem certeza que deseja deletar esta denúncia?')) return;

    showLoading(true);
    hideError();

    try {
        await fetchJSON(`${API_BASE}${DENUNCIAS_ENDPOINT}/${id}`, { method: 'DELETE' });
        showToast('Denúncia deletada com sucesso!');
        await loadDenuncias();
    } catch (error) {
        showError('Erro ao deletar denúncia: ' + error.message);
        console.error('Erro deleteDenuncia:', error);
    } finally {
        showLoading(false);
    }
}

getLocationBtn.addEventListener('click', (e) => {
    e.preventDefault();
    requestGeolocation();
});

function showLoading(show) {
    loading.classList.toggle('hidden', !show);
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.textContent = '';
    errorMessage.classList.add('hidden');
}

function showToast(message, isError = false) {
    const toast = document.createElement('div');
    toast.className = `toast ${isError ? 'error' : 'success'}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// Inicialização
document.addEventListener('DOMContentLoaded', async () => {
    checkAPIStatus();
    initMap();
    await initCrimeTypes();
    await loadDenuncias();
    requestGeolocation();
    setInterval(checkAPIStatus, 30000);
});