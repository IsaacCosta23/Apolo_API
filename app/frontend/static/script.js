const API_BASE = window.APP_CONFIG?.API_BASE || window.location.origin;
const CRIMES_ENDPOINT = '/denuncias/tipos-crime';
const DENUNCIAS_ENDPOINT = '/denuncias';
const NOMINATIM_SEARCH_URL = 'https://nominatim.openstreetmap.org/search';
const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const DEFAULT_CENTER = { lat: -8.0476, lng: -34.8770 };
const DEFAULT_ZOOM = 13;
const USER_ZOOM = 15;
const AUTOCOMPLETE_MIN_LENGTH = 3;
const REQUEST_TIMEOUT_MS = 15000;
const HEAT_MIN_OPACITY = 1;
const HEAT_INTENSITY = 1.5;
const MAPBOX_STYLE = 'mapbox://styles/mapbox/streets-v12';
const MAPBOX_TOKEN = window.APP_CONFIG?.MAPBOX_TOKEN || 'MAPBOX_TOKEN';
const MAP_SOURCE_ID = 'crimes';
const HEAT_LAYER_ID = 'crimes-heat';
const CIRCLE_LAYER_ID = 'crimes-circle';
const DETAIL_VISIBILITY_ZOOM = 14;

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
let selectedMarker = null;
let userLocationMarker = null;
let denunciaMarkers = [];
let denuncias = [];
let validCrimes = [];
let selectedLat = null;
let selectedLon = null;
let autocompleteController = null;
let mapStyleReady = false;
let currentPopup = null;
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
const locateUserMapButton = document.getElementById('btnLocateUser');
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
            setTimeout(() => map.resize(), 100);
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

function getHeatWeight(denuncia) {
    const nivel = normalizeText(denuncia.nivel_periculosidade || denuncia.nivel || '');

    if (nivel === 'baixo') {
        return 0.3;
    }

    if (nivel === 'medio' || nivel === 'mediana') {
        return 0.6;
    }

    if (nivel === 'alto') {
        return 1;
    }

    if (nivel === 'maximo' || nivel === 'maxima') {
        return 1.5;
    }

    return 0.5;
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

function buildHeatGeoJSON(items) {
    const features = items
        .filter((denuncia) => Number.isFinite(denuncia.latitude) && Number.isFinite(denuncia.longitude))
        .map((denuncia) => ({
            type: 'Feature',
            properties: {
                id: denuncia.id,
                peso: getHeatWeight(denuncia),
                nivel: normalizeText(denuncia.nivel_periculosidade || denuncia.nivel || ''),
                tipo: denuncia.tipo || ''
            },
            geometry: {
                type: 'Point',
                coordinates: [denuncia.longitude, denuncia.latitude]
            }
        }));

    return {
        type: 'FeatureCollection',
        features
    };
}

async function checkAPIStatus() {
    try {
        await fetchJSON(`${API_BASE}/api/health`, { timeoutMs: 8000 });
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

function createPopup(htmlContent) {
    return new mapboxgl.Popup({
        offset: 20,
        closeButton: true,
        closeOnClick: false
    }).setHTML(htmlContent);
}

function createMarkerElement(color, className = '') {
    const element = document.createElement('div');
    element.className = `crime-marker ${className}`.trim();
    element.style.backgroundColor = color;
    return element;
}

function closeCurrentPopup() {
    if (!currentPopup) {
        return;
    }

    currentPopup.remove();
    currentPopup = null;
}

function clearDenunciaMarkers() {
    denunciaMarkers.forEach((marker) => marker.remove());
    denunciaMarkers = [];
}

function updateMarkersVisibility() {
    if (!map) {
        return;
    }

    const zoom = map.getZoom();
    const shouldShowMarkers = zoom >= DETAIL_VISIBILITY_ZOOM;

    denunciaMarkers.forEach((marker) => {
        marker.getElement().style.display = shouldShowMarkers ? 'block' : 'none';
    });
}

function isMapOverlayTarget(target) {
    if (!(target instanceof Element)) {
        return false;
    }

    return Boolean(
        target.closest('.crime-marker') ||
        target.closest('.mapboxgl-popup') ||
        target.closest('.mapboxgl-ctrl') ||
        target.closest('.map-locate-button')
    );
}

function renderDenunciaPoints(items) {
    clearDenunciaMarkers();

    items.forEach((denuncia) => {
        const popup = createPopup(buildDenunciaPopupContent(denuncia));
        const marker = new mapboxgl.Marker({
            element: createMarkerElement(denuncia.risk.color),
            anchor: 'center'
        })
            .setLngLat([denuncia.longitude, denuncia.latitude])
            .setPopup(popup)
            .addTo(map);

        marker.getElement().addEventListener('click', (event) => {
            event.stopPropagation();

            if (currentPopup && currentPopup !== popup) {
                closeCurrentPopup();
            }

            if (popup.isOpen()) {
                closeCurrentPopup();
                return;
            }

            popup.addTo(map);
            currentPopup = popup;
        });

        popup.on('close', () => {
            if (currentPopup === popup) {
                currentPopup = null;
            }
        });

        denunciaMarkers.push(marker);
    });

    updateMarkersVisibility();
}

function ensureHeatmapSource() {
    if (!map || !mapStyleReady) {
        return;
    }

    const geojsonData = buildHeatGeoJSON(denuncias);
    const source = map.getSource(MAP_SOURCE_ID);

    if (source) {
        source.setData(geojsonData);
        return;
    }

    map.addSource(MAP_SOURCE_ID, {
        type: 'geojson',
        data: geojsonData
    });
}

function ensureHeatmapLayer() {
    if (!map || !mapStyleReady || map.getLayer(HEAT_LAYER_ID) || !map.getSource(MAP_SOURCE_ID)) {
        return;
    }

    map.addLayer({
        id: HEAT_LAYER_ID,
        type: 'heatmap',
        source: MAP_SOURCE_ID,
        maxzoom: 15,
        paint: {
            'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'peso'], 0],
                0, 0,
                1, 1
            ],
            'heatmap-intensity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 1,
                15, 3
            ],
            'heatmap-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                0, 20,
                15, 50
            ],
            'heatmap-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                13, 1,
                15, 0
            ],
            'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(56, 161, 105, 0)',
                0.15, 'rgba(56, 161, 105, 0.45)',
                0.35, 'rgba(214, 158, 46, 0.6)',
                0.6, 'rgba(245, 197, 24, 0.72)',
                0.8, 'rgba(229, 62, 62, 0.84)',
                1, 'rgba(153, 27, 27, 0.96)'
            ]
        }
    });
}

function ensureRiskCircleLayer() {
    if (!map || !mapStyleReady || map.getLayer(CIRCLE_LAYER_ID) || !map.getSource(MAP_SOURCE_ID)) {
        return;
    }

    map.addLayer({
        id: CIRCLE_LAYER_ID,
        type: 'circle',
        source: MAP_SOURCE_ID,
        minzoom: 14,
        paint: {
            'circle-radius': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14,
                [
                    'match',
                    ['get', 'nivel'],
                    'baixo', 15,
                    'medio', 25,
                    'alto', 35,
                    'maximo', 50,
                    20
                ],
                18,
                [
                    'match',
                    ['get', 'nivel'],
                    'baixo', 30,
                    'medio', 45,
                    'alto', 60,
                    'maximo', 80,
                    40
                ]
            ],
            'circle-color': [
                'match',
                ['get', 'nivel'],
                'baixo', '#00FF00',
                'medio', '#FFFF00',
                'alto', '#FF0000',
                'maximo', '#8B0000',
                '#FF0000'
            ],
            'circle-opacity': [
                'interpolate',
                ['linear'],
                ['zoom'],
                14, 0.2,
                18, 0.4
            ],
            'circle-blur': 0.6
        }
    });
}

function updateHeatmapAppearance() {
    if (!map || !map.getLayer(HEAT_LAYER_ID)) {
        return;
    }

    map.setPaintProperty(HEAT_LAYER_ID, 'heatmap-opacity', [
        'interpolate',
        ['linear'],
        ['zoom'],
        13, HEAT_MIN_OPACITY,
        15, 0
    ]);
    map.setPaintProperty(HEAT_LAYER_ID, 'heatmap-radius', [
        'interpolate',
        ['linear'],
        ['zoom'],
        0, 20,
        15, 50
    ]);
}

function renderHeatMap() {
    if (!map || !mapStyleReady) {
        return;
    }

    ensureHeatmapSource();
    ensureHeatmapLayer();
    ensureRiskCircleLayer();
    updateHeatmapAppearance();
}

function renderMap() {
    if (!map || !mapStyleReady) {
        return;
    }

    renderHeatMap();
    renderDenunciaPoints(denuncias);
    updateMarkersVisibility();

    if (selectedMarker) {
        selectedMarker.addTo(map);
    }

    if (userLocationMarker) {
        userLocationMarker.addTo(map);
    }
}

function validateMapboxToken() {
    if (!MAPBOX_TOKEN || MAPBOX_TOKEN === 'MAPBOX_TOKEN') {
        showError('Configure a variável de ambiente MAPBOX_TOKEN para carregar o mapa Mapbox.');
        return false;
    }

    return true;
}

function initMap() {
    if (map) {
        return;
    }

    if (!validateMapboxToken()) {
        return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map = new mapboxgl.Map({
        container: 'map',
        style: MAPBOX_STYLE,
        center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
        zoom: DEFAULT_ZOOM
    });

    map.addControl(new mapboxgl.NavigationControl(), 'top-right');

    map.on('load', () => {
        mapStyleReady = true;
        renderMap();
        updateMarkersVisibility();
    });

    map.on('style.load', () => {
        mapStyleReady = true;
        renderMap();
        updateMarkersVisibility();
    });

    map.on('click', async (event) => {
        closeCurrentPopup();

        if (isMapOverlayTarget(event.originalEvent?.target)) {
            return;
        }

        const { lng, lat } = event.lngLat;
        console.log('Clique:', lat, lng);
        await selectLocationFromMap(lat, lng);
    });

    map.on('zoomend', () => {
        updateHeatmapAppearance();
        updateMarkersVisibility();
    });

    map.on('zoom', () => {
        updateMarkersVisibility();
    });
}

function setSelectedMarker(lat, lon, message = 'Ponto selecionado para a denúncia') {
    if (!map) {
        return;
    }

    if (!selectedMarker) {
        selectedMarker = new mapboxgl.Marker({
            element: createMarkerElement('#f5c518', 'selected-marker'),
            anchor: 'center'
        });
    }

    selectedMarker
        .setLngLat([lon, lat])
        .setPopup(createPopup(`<div class="map-popup"><strong>${escapeHTML(message)}</strong></div>`));

    if (mapStyleReady) {
        selectedMarker.addTo(map);
    }
}

function clearSelectedMarker() {
    if (!selectedMarker) {
        return;
    }

    selectedMarker.remove();
}

function setUserLocationMarker(lat, lon) {
    if (!map) {
        return;
    }

    if (!userLocationMarker) {
        userLocationMarker = new mapboxgl.Marker({
            color: '#3182ce'
        });
    }

    userLocationMarker
        .setLngLat([lon, lat])
        .setPopup(new mapboxgl.Popup().setText('Você está aqui'));

    if (mapStyleReady) {
        userLocationMarker.addTo(map);
    }
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
        map.flyTo({
            center: [selectedLon, selectedLat],
            zoom
        });
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
                setUserLocationMarker(lat, lon);
                if (map) {
                    map.flyTo({
                        center: [lon, lat],
                        zoom: USER_ZOOM
                    });
                }
                showToast('Localização preenchida com sucesso.');
            } catch (error) {
                updateSelectedLocation(lat, lon, 'Endereço não encontrado', {
                    popupMessage: 'Localização atual sem endereço associado'
                });
                setUserLocationMarker(lat, lon);
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
    locateUserMapButton.addEventListener('click', useCurrentLocation);
}

document.addEventListener('DOMContentLoaded', async () => {
    setupFloatingMenu();
    setupAddressAutocomplete();
    checkAPIStatus();
    await initCrimeTypes();
    await loadDenuncias();
    setInterval(checkAPIStatus, 30000);
});
