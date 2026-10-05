from fastapi import HTTPException, status


class EntityNotFoundException(HTTPException):
    def __init__(self, detail: str = "Requested entity not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class AuthenticationException(HTTPException):
    def __init__(self, detail: str = "Could not validate credentials"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


class PermissionDeniedException(HTTPException):
    def __init__(self, detail: str = "Not enough permissions to access this resource"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class ValidationException(HTTPException):
    def __init__(self, detail: str = "Invalid data payload"):
        super().__init__(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=detail)


class DatabaseException(HTTPException):
    def __init__(self, detail: str = "Database operation failed"):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)
