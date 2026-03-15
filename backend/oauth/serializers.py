import msgspec


class AuthUrlResponse(msgspec.Struct):
    url: str
    code_verifier: str


class CallbackRequest(msgspec.Struct):
    code: str
    code_verifier: str


class CallbackResponse(msgspec.Struct):
    email: str
    connected: bool
