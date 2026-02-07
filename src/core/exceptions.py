from fastapi import HTTPException, status


class NotFoundError(HTTPException):
    def __init__(self, detail: str = "Resource not found"):
        super().__init__(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


class ForbiddenError(HTTPException):
    def __init__(self, detail: str = "Forbidden"):
        super().__init__(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


class UnauthorizedError(HTTPException):
    def __init__(self, detail: str = "Invalid or missing authentication"):
        super().__init__(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


class TierRequiredError(HTTPException):
    def __init__(self, required_tier: str):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This feature requires the '{required_tier}' subscription tier.",
        )


class BadRequestError(HTTPException):
    def __init__(self, detail: str = "Bad request"):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)
