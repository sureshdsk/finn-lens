from classifier.merchants.indian_merchants import lookup_merchant
from classifier.extractors.regex_extractor import extract_regex


def test_known_merchant_zomato():
    result = lookup_merchant("UPI/409880816679/UPIIntent/zomatofd.payu@h/HDFC BANK LTD")
    assert result is not None
    category, name, confidence = result
    assert category == "food"
    assert name == "Zomato"
    assert confidence == 0.99


def test_known_merchant_amazon():
    result = lookup_merchant("NEFT/N123/Amazon Pay/AMZ123")
    assert result is not None
    assert result[0] == "ecommerce"
    assert result[1] == "Amazon"


def test_unknown_merchant():
    result = lookup_merchant("POS 123456 LOCAL SHOP BANGALORE")
    assert result is None


def test_regex_plus_merchant_pipeline():
    desc = "UPI/409880816679/UPIIntent/swiggy@axl/AXIS BANK"
    regex = extract_regex(desc)
    assert regex.payment_channel == "UPI"
    assert regex.upi_handle == "swiggy@axl"
    merchant = lookup_merchant(desc)
    assert merchant is not None
    assert merchant[0] == "food"
