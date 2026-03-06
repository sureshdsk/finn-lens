import msgspec


class LoginSchema(msgspec.Struct):
    username: str
    password: str


class UserSchema(msgspec.Struct):
    id: int
    username: str
    email: str
    is_staff: bool
