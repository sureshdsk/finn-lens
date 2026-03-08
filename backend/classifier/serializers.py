import msgspec


class ClassifyResultSchema(msgspec.Struct):
    classified: int
    total: int
    account_id: int


class OverrideCategorySchema(msgspec.Struct):
    category: str


class CategorySchema(msgspec.Struct):
    slug: str
    label: str
