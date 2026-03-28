import msgspec


class LoginSchema(msgspec.Struct):
    username: str
    password: str


class UserSchema(msgspec.Struct):
    id: int
    username: str
    email: str
    is_staff: bool
    display_name: str = ""
    date_of_birth: str | None = None
    avatar_url: str = ""
    currency: str = "INR"


class UpdateProfileSchema(msgspec.Struct, omit_defaults=True):
    display_name: str | None = None
    date_of_birth: str | None = None
    currency: str | None = None
