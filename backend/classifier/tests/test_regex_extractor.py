from classifier.extractors.regex_extractor import extract_regex


def test_upi_channel():
    r = extract_regex("UPI/409880816679/UPIIntent/zomatofd.payu@h/HDFC BANK LTD")
    assert r.payment_channel == "UPI"


def test_neft_channel():
    r = extract_regex("NEFT/N123456/SOME REF/JOHN DOE")
    assert r.payment_channel == "NEFT"


def test_imps_channel():
    r = extract_regex("IMPS/123456/FROM/ACC")
    assert r.payment_channel == "IMPS"


def test_no_channel():
    r = extract_regex("POS 123456 AMAZON")
    assert r.payment_channel == ""


def test_upi_handle_extraction():
    r = extract_regex("UPI/409880816679/UPIIntent/zomatofd.payu@hdfcbank/HDFC BANK LTD")
    assert r.upi_handle == "zomatofd.payu@hdfcbank"


def test_no_upi_handle():
    r = extract_regex("NEFT/N123456/SOME REF")
    assert r.upi_handle == ""
