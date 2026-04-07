const API_BASE = 'https://apolo-api-nd3u.onrender.com';
const CRIMES_ENDPOINT = '/denuncias/tipos-crime';
const DENUNCIAS_ENDPOINT = '/denuncias';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const DEFAULT_CENTER = { lat: -8.057, lng: -34.879 };
const DEFAULT_ZOOM = 13;
const USER_ZOOM = 15;
const AUTOCOMPLETE_MIN_LENGTH = 3;
const REQUEST_TIMEOUT_MS = 15000;
const AREA_CLUSTER_RADIUS_METERS = 350;
const AREA_BASE_RADIUS_METERS = 180;
const AREA_RADIUS_STEP_METERS = 70;

const RISK_LEVEL_STYLES = {
    baixo: {
        key: 'baixo',
        label: 'Baixo',
        color: '#38a169',
        fillColor: '#38a169',
        badgeClass: 'nivel-baixo',
        areaColor: 'rgba(56, 161, 105, 0.28)'
    },
    medio: {
        key: 'medio',
        label: 'Médio',
        color: '#d69e2e',
        fillColor: '#d69e2e',
        badgeClass: 'nivel-medio',
        areaColor: 'rgba(214, 158, 46, 0.24)'
    },
    alto: {
        key: 'alto',
        label: 'Alto',
        color: '#e53e3e',
        fillColor: '#e53e3e',
        badgeClass: 'nivel-alto',
        areaColor: 'rgba(229, 62, 62, 0.22)'
    }
};

let map;
let selectedMarker;
let denuncias = [];
let validCrimes = [];
let selectedLat = null;
let selectedLon = null;
let autocompleteController = null;
let pointLayerGroup;
let areaLayerGroup;

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
const enderecoInput = document.getElementById('endereco');
const sugestoesList = document.getElementById('sugestoes');
const addressLoading = document.getElementById('address-loading');
const getLocationButton = document.getElementById('get-location');
const menuButton = document.getElementById('btn-menu');
const linksDropdown = document.getElementById('links-dropdown');

document.getElementById('list-btn').addEventListener('click', () => showView('list'));
document.getElementById('map-btn').addEventListener('click', () => showView('map'));
document.getElementById('create-btn').addEventListener('click', () => showView('create'));

function showView(view) {
    document.querySelectorAll('nav button').forEach((btn) => btn.classList.remove('active'));
    document.querySelector(`#${view}-btn`).classList.add('active');

    listView.classList.add('hidden');
    mapView.classList.add('hidden');
    createView.classList.add('hidden');

    if (view === 'list') {
        listView.classList.remove('hidden');
        return;
    }

    if (view === 'map') {
        mapView.classList.remove('hidden');
        initMap();
        if (map) {
            setTimeout(() => map.invalidateSize(), 100);
        }
        return;
    }

    createView.classList.remove('hidden');
}

function debounce(callback, delay = 300) {
    let timeoutId;
    return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => callback(...args), delay);
    };
}

function createRequestTimeoutSignal(timeoutMs = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    return {
        signal: controller.signal,
        cleanup: () => clearTimeout(timeoutId)
    };
}

async function fetchJSON(url, options = {}) {
    const { signal: timeoutSignal, cleanup } = createRequestTimeoutSignal(options.timeoutMs);
    const headers = {
        Accept: 'application/json',
        ...options.headers
    };

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            signal: options.signal || timeoutSignal
        });

        const contentType = response.headers.get('content-type') || '';
        const isJSON = contentType.includes('application/json');
        const payload = response.status === 204 || response.status === 205
            ? null
            : isJSON
                ? await response.json().catch(() => null)
                : await response.text();

        if (!response.ok) {
            throw new Error(extractErrorMessage(payload) || `Erro HTTP ${response.status}`);
        }

        if (payload === '' || payload === null || payload === undefined) {
            return null;
        }

        return payload;
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error('A requisição demorou demais para responder.');
        }
        throw error;
    } finally {
        cleanup();
    }
}

function extractErrorMessage(payload) {
    if (!payload) {
        return '';
    }

    if (typeof payload === 'string') {
        return payload.trim();
    }

    if (typeof payload.detail === 'string') {
        return payload.detail.trim();
    }

    if (Array.isArray(payload.detail)) {
        return payload.detail
            .map((item) => item?.msg || JSON.stringify(item))
            .filter(Boolean)
            .join(' | ');
    }

    return '';
}

function normalizeText(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

function getRiskLevelStyle(nivel) {
    const normalizedLevel = normalizeText(nivel);

    if (normalizedLevel === 'baixo') {
        return RISK_LEVEL_STYLES.baixo;
    }

    if (normalizedLevel === 'medio' || normalizedLevel === 'mediana') {
        return RISK_LEVEL_STYLES.medio;
    }

    if (normalizedLevel === 'alto' || normalizedLevel === 'maximo' || normalizedLevel === 'maxima') {
        return RISK_LEVEL_STYLES.alto;
    }

    return RISK_LEVEL_STYLES.medio;
}

function getRiskWeight(nivel) {
    const riskKey = getRiskLevelStyle(nivel).key;

    if (riskKey === 'alto') {
        return 3;
    }

    if (riskKey === 'medio') {
        return 2;
    }

    return 1;
}

function getDenunciaViewModel(denuncia) {
    const risk = getRiskLevelStyle(denuncia.nivel_periculosidade);
    const latitude = Number(denuncia.latitude);
    const longitude = Number(denuncia.longitude);

    return {
        ...denuncia,
        latitude,
        longitude,
        risk,
        formattedDate: formatDate(denuncia.data_hora),
        locationLabel: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
    };
}

function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return 'Data indisponível';
    }

    return date.toLocaleString('pt-BR');
}

function escapeHTML(value) {
    return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}

function buildRiskBadgeHTML(risk) {
    return `<span class="nivel-periculosidade ${risk.badgeClass}">${risk.label}</span>`;
}

function buildDenunciaPopupContent(denuncia) {
    return `
        <div class="map-popup">
            <strong>${escapeHTML(denuncia.tipo)}</strong>
            <p>${escapeHTML(denuncia.descricao)}</p>
            <div class="popup-meta">
                ${buildRiskBadgeHTML(denuncia.risk)}
                <span>${escapeHTML(denuncia.formattedDate)}</span>
            </div>
        </div>
    `;
}

function buildAreaPopupContent(group) {
    const risk = group.risk;
    const crimesPreview = group.denuncias
        .slice(0, 4)
        .map((denuncia) => escapeHTML(denuncia.tipo))
        .join(', ');
    const remainingCount = group.denuncias.length - 4;
    const subtitle = remainingCount > 0
        ? `${crimesPreview} e mais ${remainingCount}`
        : crimesPreview;

    return `
        <div class="map-popup">
            <strong>Zona com maior incidência</strong>
            <p>${escapeHTML(subtitle || 'Múltiplas ocorrências próximas')}</p>
            <div class="popup-meta">
                ${buildRiskBadgeHTML(risk)}
                <span>${group.denuncias.length} denúncia(s) próximas</span>
            </div>
        </div>
    `;
}

async function checkAPIStatus() {
    try {
        await fetchJSON(`${API_BASE}/`, { timeoutMs: 8000 });
        apiStatus.textContent = 'API Online';
        apiStatus.style.color = '#48bb78';
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
            throw new Error('Resposta inválida de tipos de crime.');
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

    crimes.forEach((crime) => {
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
        const data = await fetchJSON(`${API_BASE}${DENUNCIAS_ENDPOINT}`);
        denuncias = Array.isArray(data) ? data.map(getDenunciaViewModel) : [];
        renderList();
        renderMap();
    } catch (error) {
        showError(`Erro ao carregar denúncias: ${error.message}`);
        console.error('Erro loadDenuncias:', error);
    } finally {
        showLoading(false);
    }
}

function renderList() {
    denunciasList.innerHTML = '';

    if (!denuncias.length) {
        const emptyState = document.createElement('li');
        emptyState.className = 'denuncia-item denuncia-item-empty';
        emptyState.innerHTML = '<p>Nenhuma denúncia cadastrada até o momento.</p>';
        denunciasList.appendChild(emptyState);
        return;
    }

    denuncias.forEach((denuncia) => {
        const li = document.createElement('li');
        li.className = `denuncia-item denuncia-item-${denuncia.risk.key}`;
        li.innerHTML = `
            <h3>${escapeHTML(denuncia.tipo)}</h3>
            <p>${escapeHTML(denuncia.descricao)}</p>
            <p>Local: ${escapeHTML(denuncia.locationLabel)}</p>
            <p>Data: ${escapeHTML(denuncia.formattedDate)}</p>
            ${buildRiskBadgeHTML(denuncia.risk)}
            <button class="delete-btn" data-id="${denuncia.id}">Deletar</button>
        `;
        denunciasList.appendChild(li);
    });

    document.querySelectorAll('.delete-btn').forEach((btn) => {
        btn.addEventListener('click', async (event) => {
            await deleteDenuncia(event.target.dataset.id);
        });
    });
}

function ensureMapLayers() {
    if (!map) {
        return;
    }

    if (!areaLayerGroup) {
        areaLayerGroup = L.layerGroup().addTo(map);
    }

    if (!pointLayerGroup) {
        pointLayerGroup = L.layerGroup().addTo(map);
    }
}

function renderMap() {
    if (!map) {
        return;
    }

    ensureMapLayers();
    areaLayerGroup.clearLayers();
    pointLayerGroup.clearLayers();

    renderHeatAreas(denuncias);
    renderDenunciaPoints(denuncias);

    if (selectedMarker) {
        selectedMarker.addTo(map);
    }
}

function renderDenunciaPoints(items) {
    items.forEach((denuncia) => {
        const marker = L.circleMarker([denuncia.latitude, denuncia.longitude], {
            color: denuncia.risk.color,
            fillColor: denuncia.risk.fillColor,
            fillOpacity: 0.88,
            radius: 7,
            weight: 2
        });

        marker.bindPopup(buildDenunciaPopupContent(denuncia));
        pointLayerGroup.addLayer(marker);
    });
}

function renderHeatAreas(items) {
    const groups = buildHeatGroups(items);

    groups.forEach((group) => {
        const radius = AREA_BASE_RADIUS_METERS + ((group.denuncias.length - 1) * AREA_RADIUS_STEP_METERS);
        const circle = L.circle([group.center.lat, group.center.lng], {
            radius,
            color: group.risk.color,
            weight: 1,
            opacity: 0.45,
            fillColor: group.risk.fillColor,
            fillOpacity: Math.min(0.18 + (group.denuncias.length * 0.03), 0.34),
            interactive: true
        });

        circle.bindPopup(buildAreaPopupContent(group));
        areaLayerGroup.addLayer(circle);
    });
}

function buildHeatGroups(items) {
    const groups = [];

    items.forEach((denuncia) => {
        const existingGroup = groups.find((group) => {
            const groupCenter = L.latLng(group.center.lat, group.center.lng);
            const point = L.latLng(denuncia.latitude, denuncia.longitude);
            return groupCenter.distanceTo(point) <= AREA_CLUSTER_RADIUS_METERS;
        });

        if (existingGroup) {
            existingGroup.denuncias.push(denuncia);
            existingGroup.center = calculateGroupCenter(existingGroup.denuncias);
            existingGroup.risk = getGroupRisk(existingGroup.denuncias);
            return;
        }

        groups.push({
            center: { lat: denuncia.latitude, lng: denuncia.longitude },
            denuncias: [denuncia],
            risk: denuncia.risk
        });
    });

    return groups.filter((group) => group.denuncias.length > 1);
}

function calculateGroupCenter(items) {
    const totals = items.reduce((accumulator, denuncia) => {
        accumulator.lat += denuncia.latitude;
        accumulator.lng += denuncia.longitude;
        return accumulator;
    }, { lat: 0, lng: 0 });

    return {
        lat: totals.lat / items.length,
        lng: totals.lng / items.length
    };
}

function getGroupRisk(items) {
    const totalWeight = items.reduce((sum, denuncia) => sum + getRiskWeight(denuncia.risk.key), 0);
    const averageWeight = totalWeight / items.length;

    if (averageWeight >= 2.5) {
        return RISK_LEVEL_STYLES.alto;
    }

    if (averageWeight >= 1.5) {
        return RISK_LEVEL_STYLES.medio;
    }

    return RISK_LEVEL_STYLES.baixo;
}

function initMap() {
    if (map) {
        return;
    }

    map = L.map('map', {
        dragging: true,
        touchZoom: true,
        doubleClickZoom: true,
        scrollWheelZoom: true,
        boxZoom: true,
        keyboard: true,
        zoomControl: true
    }).setView([DEFAULT_CENTER.lat, DEFAULT_CENTER.lng], DEFAULT_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    ensureMapLayers();

    map.on('click', async (event) => {
        const { lat, lng } = event.latlng;
        await selectLocationFromMap(lat, lng);
    });

    renderMap();
}

function setSelectedMarker(lat, lon, message = 'Ponto selecionado para a denúncia') {
    if (!map) {
        return;
    }

    if (selectedMarker) {
        selectedMarker.setLatLng([lat, lon]);
        selectedMarker.setPopupContent(message);
        return;
    }

    selectedMarker = L.marker([lat, lon]).addTo(map).bindPopup(message);
}

function clearSelectedMarker() {
    if (!map || !selectedMarker) {
        return;
    }

    map.removeLayer(selectedMarker);
    selectedMarker = null;
}

function updateSelectedLocation(lat, lon, label, options = {}) {
    const {
        syncMarker = true,
        centerMap = true,
        zoom = USER_ZOOM,
        popupMessage = 'Local selecionado para a denúncia'
    } = options;

    selectedLat = Number(lat);
    selectedLon = Number(lon);
    enderecoInput.value = label || 'Endereço não encontrado';
    clearSuggestions();

    if (syncMarker) {
        setSelectedMarker(selectedLat, selectedLon, popupMessage);
    }

    if (centerMap && map) {
        map.setView([selectedLat, selectedLon], zoom);
    }
}

function resetSelectedLocation() {
    selectedLat = null;
    selectedLon = null;
    clearSelectedMarker();
}

function setAddressLoading(isLoading, message = 'Buscando sugestões...') {
    addressLoading.textContent = message;
    addressLoading.classList.toggle('hidden', !isLoading);
}

function clearSuggestions() {
    sugestoesList.innerHTML = '';
    sugestoesList.classList.add('hidden');
    setAddressLoading(false);
}

function extractSuggestionParts(item) {
    const address = item.address || {};
    const streetName = address.road || address.pedestrian || address.cycleway || address.footway || address.path || item.name || item.display_name.split(',')[0];
    const neighborhood = address.suburb || address.neighbourhood || address.quarter || address.city_district || address.residential || 'Bairro não informado';
    const city = address.city || address.town || address.village || address.municipality || address.state_district || address.state || 'Cidade não informada';

    return { streetName, neighborhood, city };
}

function renderSuggestions(suggestions) {
    sugestoesList.innerHTML = '';

    if (!suggestions.length) {
        const emptyState = document.createElement('li');
        emptyState.className = 'sugestao-item';
        emptyState.innerHTML = `
            <span class="sugestao-principal">Nenhum endereço encontrado</span>
            <span class="sugestao-secundaria">Tente refinar a busca</span>
        `;
        sugestoesList.appendChild(emptyState);
        sugestoesList.classList.remove('hidden');
        return;
    }

    suggestions.forEach((item) => {
        const suggestion = document.createElement('li');
        const { streetName, neighborhood, city } = extractSuggestionParts(item);

        suggestion.className = 'sugestao-item';
        suggestion.innerHTML = `
            <span class="sugestao-principal">${escapeHTML(streetName)}</span>
            <span class="sugestao-secundaria">${escapeHTML(neighborhood)} • ${escapeHTML(city)}</span>
        `;

        suggestion.addEventListener('click', () => {
            updateSelectedLocation(item.lat, item.lon, item.display_name, {
                popupMessage: 'Endereço selecionado via busca'
            });
            showToast('Endereço selecionado com sucesso.');
        });

        sugestoesList.appendChild(suggestion);
    });

    sugestoesList.classList.remove('hidden');
}

async function fetchAddressSuggestions(query) {
    if (autocompleteController) {
        autocompleteController.abort();
    }

    autocompleteController = new AbortController();

    const params = new URLSearchParams({
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '5'
    });

    const response = await fetch(`${NOMINATIM_SEARCH_URL}?${params.toString()}`, {
        headers: {
            Accept: 'application/json'
        },
        signal: autocompleteController.signal
    });

    if (!response.ok) {
        throw new Error('Falha ao buscar endereços.');
    }

    return response.json();
}

const handleAddressInput = debounce(async (event) => {
    const query = event.target.value.trim();
    resetSelectedLocation();

    if (query.length < AUTOCOMPLETE_MIN_LENGTH) {
        clearSuggestions();
        return;
    }

    setAddressLoading(true);

    try {
        const suggestions = await fetchAddressSuggestions(query);
        renderSuggestions(suggestions);
    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }

        clearSuggestions();
        showToast('Não foi possível carregar sugestões de endereço.', true);
        console.error('Erro no autocomplete:', error);
    } finally {
        setAddressLoading(false);
    }
}, 300);

async function reverseGeocode(lat, lon) {
    const params = new URLSearchParams({
        lat: String(lat),
        lon: String(lon),
        format: 'json',
        addressdetails: '1'
    });

    const response = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
        headers: {
            Accept: 'application/json'
        }
    });

    if (!response.ok) {
        throw new Error('Falha ao obter endereço da localização.');
    }

    return response.json();
}

async function buscarEndereco(lat, lon) {
    try {
        const data = await reverseGeocode(lat, lon);
        const endereco = data?.display_name || 'Endereço não encontrado';

        updateSelectedLocation(lat, lon, endereco, {
            popupMessage: data?.display_name
                ? 'Ponto selecionado no mapa'
                : 'Ponto selecionado no mapa sem endereço associado'
        });

        return data;
    } catch (error) {
        console.error('Erro ao buscar endereço:', error);

        updateSelectedLocation(lat, lon, 'Endereço não encontrado', {
            popupMessage: 'Ponto selecionado no mapa sem endereço associado'
        });

        return null;
    }
}

async function selectLocationFromMap(lat, lon) {
    setAddressLoading(true, 'Buscando endereço do ponto...');
    hideError();

    try {
        await buscarEndereco(lat, lon);
        showToast('Local selecionado no mapa.');
    } finally {
        setAddressLoading(false);
    }
}

async function useCurrentLocation() {
    if (!navigator.geolocation) {
        showToast('Geolocalização não suportada pelo navegador.', true);
        return;
    }

    hideError();
    setAddressLoading(true, 'Localizando você...');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const data = await reverseGeocode(lat, lon);
                updateSelectedLocation(lat, lon, data.display_name || 'Endereço não encontrado', {
                    popupMessage: 'Localização atual'
                });
                showToast('Localização preenchida com sucesso.');
            } catch (error) {
                updateSelectedLocation(lat, lon, 'Endereço não encontrado', {
                    popupMessage: 'Localização atual sem endereço associado'
                });
                showToast('Localização obtida, mas não foi possível converter em endereço.', true);
                console.error('Erro reverse geocoding:', error);
            } finally {
                setAddressLoading(false);
            }
        },
        (error) => {
            setAddressLoading(false);
            console.error('Erro de geolocalização:', error);

            if (error.code === error.PERMISSION_DENIED) {
                showToast('Permissão de localização negada.', true);
                return;
            }

            showToast('Erro ao obter localização atual.', true);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
        }
    );
}

createForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const tipo = tipoSelect.value.trim();
    const descricao = document.getElementById('descricao').value.trim();
    const anonimo = document.getElementById('anonimo').checked;

    if (!tipo) {
        return showError('Escolha um tipo de crime válido.');
    }

    if (!validCrimes.includes(tipo)) {
        return showError('Tipo de crime inválido. Atualize a página e tente novamente.');
    }

    if (!descricao) {
        return showError('Descrição é obrigatória.');
    }

    if (selectedLat === null || selectedLon === null || Number.isNaN(selectedLat) || Number.isNaN(selectedLon)) {
        return showError('Selecione um ponto no mapa, use sua localização ou escolha uma sugestão de endereço.');
    }

    const payload = {
        tipo,
        descricao,
        latitude: selectedLat,
        longitude: selectedLon,
        anonimo
    };

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
        resetSelectedLocation();
        clearSuggestions();
        await loadDenuncias();
        showView('list');
    } catch (error) {
        showError(`Erro ao criar denúncia: ${error.message}`);
        console.error('Erro ao enviar denúncia:', error);
    } finally {
        showLoading(false);
    }
});

async function deleteDenuncia(id) {
    if (!confirm('Tem certeza que deseja deletar esta denúncia?')) {
        return;
    }

    showLoading(true);
    hideError();

    try {
        await fetchJSON(`${API_BASE}${DENUNCIAS_ENDPOINT}/${id}`, { method: 'DELETE' });
        showToast('Denúncia deletada com sucesso!');
        await loadDenuncias();
    } catch (error) {
        showError(`Erro ao deletar denúncia: ${error.message}`);
        console.error('Erro deleteDenuncia:', error);
    } finally {
        showLoading(false);
    }
}

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

function setLinksMenuOpen(isOpen) {
    linksDropdown.classList.toggle('hidden', !isOpen);
    linksDropdown.setAttribute('aria-hidden', String(!isOpen));
    menuButton.setAttribute('aria-expanded', String(isOpen));
}

function setupFloatingMenu() {
    menuButton.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = linksDropdown.classList.contains('hidden');
        setLinksMenuOpen(isOpen);
    });

    linksDropdown.addEventListener('click', (event) => {
        event.stopPropagation();
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#menu-links')) {
            setLinksMenuOpen(false);
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            setLinksMenuOpen(false);
        }
    });
}

function setupAddressAutocomplete() {
    enderecoInput.addEventListener('input', handleAddressInput);

    enderecoInput.addEventListener('focus', () => {
        if (sugestoesList.children.length > 0) {
            sugestoesList.classList.remove('hidden');
        }
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.address-field')) {
            sugestoesList.classList.add('hidden');
        }
    });

    getLocationButton.addEventListener('click', useCurrentLocation);
}

document.addEventListener('DOMContentLoaded', async () => {
    setupFloatingMenu();
    setupAddressAutocomplete();
    checkAPIStatus();
    await initCrimeTypes();
    await loadDenuncias();
    setInterval(checkAPIStatus, 30000);
});
