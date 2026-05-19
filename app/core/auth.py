"""
Autenticação e Autorização - Preparação para Supabase Auth.

ESTRUTURA PREPARADA PARA INTEGRAÇÃO FUTURA com Supabase Authentication.

Componentes:
1. JWT Token validation (para Supabase Auth tokens)
2. User context extraction
3. Dependency injection para rotas protegidas
4. Role-based access control (RBAC)

Implementação atual: DESATIVADA (comentada)
- Aplicar quando Supabase Auth estiver configurado
- Adicionar middleware nas rotas que requerem autenticação

Configuração necessária em Supabase:
1. Go to: Authentication > Settings
2. Enable: Email/Password authentication
3. Get JWT secret from: Authentication > Secrets
4. Set config in app/core/config.py (supabase_anon_key, supabase_service_role_key)
"""

import logging
from typing import Optional
from functools import lru_cache

from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
import jwt

logger = logging.getLogger("apolo.auth")


# ============================================================================
# JWT TOKEN VALIDATION (FUTURE: SUPABASE AUTH)
# ============================================================================

def _get_auth_config():
    """
    Obtém configuração de autenticação da aplicação.
    
    FUTURE: Será preenchido quando Supabase Auth estiver ativo.
    """
    from app.core.config import get_settings
    
    settings = get_settings()
    
    # FUTURE: Implementar JWT validation com Supabase Auth
    # return {
    #     "jwt_secret": settings.get("supabase_service_role_key"),
    #     "jwt_algorithm": "HS256",
    #     "supabase_url": settings.get("supabase_url"),
    # }
    
    return None


# ============================================================================
# PLACEHOLDER: MIDDLEWARE DE AUTENTICAÇÃO
# ============================================================================

async def optional_auth(
    credentials: Optional[HTTPAuthCredentials] = Depends(HTTPBearer(auto_error=False))
):
    """
    Validação OPCIONAL de token JWT.
    
    FUTURE: Implementar quando Supabase Auth estiver ativo.
    
    Atualmente: Retorna None (sem autenticação obrigatória)
    
    Uso em rotas:
    ```python
    @router.get("/")
    async def get_route(current_user = Depends(optional_auth)):
        # current_user será None se não autenticado
        # Permitir acesso anônimo, mas com current_user se disponível
    ```
    """
    if not credentials:
        return None
    
    # FUTURE: Implementar validação JWT
    # token = credentials.credentials
    # try:
    #     config = _get_auth_config()
    #     payload = jwt.decode(token, config["jwt_secret"], algorithms=[config["jwt_algorithm"]])
    #     return {"user_id": payload.get("sub"), "email": payload.get("email")}
    # except jwt.InvalidTokenError:
    #     raise HTTPException(
    #         status_code=status.HTTP_401_UNAUTHORIZED,
    #         detail="Invalid authentication token"
    #     )
    
    logger.warning("Auth not implemented yet - all requests allowed")
    return None


async def required_auth(
    credentials: HTTPAuthCredentials = Depends(HTTPBearer())
):
    """
    Validação OBRIGATÓRIA de token JWT.
    
    FUTURE: Implementar quando Supabase Auth estiver ativo.
    
    Atualmente: Lança erro (autenticação obrigatória não implementada)
    
    Uso em rotas protegidas:
    ```python
    @router.post("/denuncias/criar")
    async def criar_denancia_protegida(
        data: DenunciaCreate,
        current_user = Depends(required_auth),
        db = Depends(get_db_session)
    ):
        # Apenas usuários autenticados podem criar denúncias
        return {"user_id": current_user["user_id"], ...}
    ```
    """
    logger.warning("Authentication not yet implemented")
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Authentication system not yet configured"
    )


# ============================================================================
# MODELOS DE USUÁRIO (FUTURE)
# ============================================================================

class User:
    """
    Modelo de usuário autenticado.
    
    FUTURE: Usar quando Supabase Auth estiver implementado.
    """
    
    def __init__(self, user_id: str, email: str, roles: list[str] = None):
        self.user_id = user_id
        self.email = email
        self.roles = roles or []
    
    def has_role(self, role: str) -> bool:
        """Verifica se usuário tem role específica."""
        return role in self.roles


# ============================================================================
# ROLE-BASED ACCESS CONTROL (RBAC) - FUTURE
# ============================================================================

def require_role(*roles: str):
    """
    Dependency para checar role de usuário.
    
    FUTURE: Usar quando RBAC estiver implementado.
    
    Exemplo:
    ```python
    @router.delete("/denuncias/{id}")
    async def delete_denuncia(
        id: int,
        current_user = Depends(require_role("admin", "moderator"))
    ):
        # Apenas admins e moderators podem deletar
    ```
    """
    async def check_role(current_user = Depends(optional_auth)):
        if not current_user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required"
            )
        
        user_roles = current_user.get("roles", [])
        if not any(role in user_roles for role in roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )
        
        return current_user
    
    return check_role


# ============================================================================
# NOTAS DE IMPLEMENTAÇÃO
# ============================================================================

"""
TIMELINE DE IMPLEMENTAÇÃO:

FASE 1 (ATUAL - MVP):
- ✓ Estrutura de auth preparada
- ✓ Config para Supabase keys
- ✓ Placeholders para futura integração
- □ Sem autenticação obrigatória nas rotas

FASE 2 (PRÓXIMO):
- Implementar JWT validation com Supabase
- Adicionar middleware de autenticação
- Criar endpoints de login/logout
- Implementar RBAC simples

FASE 3 (FUTURO):
- Social login (Google, GitHub)
- Rate limiting por usuário
- Audit logging
- 2FA

PASSOS PARA ATIVAR:
1. Configurar Supabase Auth: https://supabase.com/docs/guides/auth
2. Descomentar código de validação JWT
3. Adicionar dependency nas rotas
4. Testar com token real do Supabase
5. Implementar refresh token logic
"""
