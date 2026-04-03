import requests

def geocodificar(endereco: str):
    """
    Converte um endereço em coordenadas (latitude, longitude) usando Nominatim (OpenStreetMap).
    """
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": endereco,
            "format": "json",
            "limit": 1
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()  # Raise error for bad status
        data = response.json()

        if not data or len(data) == 0:
            return None

        return float(data[0]["lat"]), float(data[0]["lon"])
    except requests.RequestException as e:
        print(f"Erro na geocodificação: {e}")
        return None
    except (KeyError, ValueError) as e:
        print(f"Erro ao processar resposta da geocodificação: {e}")
        return None