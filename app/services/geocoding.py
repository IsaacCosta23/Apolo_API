import requests

def geocodificar(endereco: str):
    """
    Converte um endereço em coordenadas (latitude, longitude) usando Nominatim (OpenStreetMap).
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": endereco,
        "format": "json",
        "limit": 1
    }

    response = requests.get(url, params=params)
    data = response.json()

    if not data:
        return None

    return float(data[0]["lat"]), float(data[0]["lon"])