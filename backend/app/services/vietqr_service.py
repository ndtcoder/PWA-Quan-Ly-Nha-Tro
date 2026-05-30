"""VietQR service for generating QR payment codes following EMVCo standard."""

import base64
import io
from binascii import crc_hqx

import qrcode


def generate_ref_code(contract_id: str, billing_month: str) -> str:
    """Generate a reference code for payment matching.

    Format: NHAT{contract_id[:6].upper()}{YYYYMM}
    """
    contract_short = contract_id[:6].upper().replace("-", "")
    # billing_month expected format: YYYY-MM or YYYYMM
    month_part = billing_month.replace("-", "")
    if len(month_part) > 6:
        month_part = month_part[:6]
    return f"NHAT{contract_short}{month_part}"


def build_vietqr_string(
    bank_bin: str,
    account_number: str,
    amount: int,
    ref_code: str,
    description: str = "",
) -> str:
    """Build EMVCo QR payload string following VietQR standard format.

    The format follows the VietQR/NAPAS EMVCo specification.
    """

    def _tlv(tag: str, value: str) -> str:
        length = f"{len(value):02d}"
        return f"{tag}{length}{value}"

    # Build merchant account info (tag 38 - NAPAS)
    guid = "A000000727"
    merchant_info_content = (
        _tlv("00", guid)
        + _tlv("01", bank_bin)
        + _tlv("02", account_number)
    )
    merchant_info = _tlv("38", merchant_info_content)

    # Build additional data (tag 62)
    additional_content = _tlv("08", ref_code)
    additional_data = _tlv("62", additional_content)

    # Build the full payload (without CRC)
    payload = (
        _tlv("00", "01")           # Payload Format Indicator
        + _tlv("01", "12")         # Point of Initiation (dynamic)
        + merchant_info            # Merchant Account Info
        + _tlv("52", "0000")       # Merchant Category Code
        + _tlv("53", "704")        # Transaction Currency (VND)
        + _tlv("54", str(amount))  # Transaction Amount
        + _tlv("58", "VN")         # Country Code
        + additional_data          # Additional Data
    )

    # Add CRC placeholder and calculate
    payload += "6304"
    crc = crc_hqx(payload.encode("ascii"), 0xFFFF)
    crc_hex = f"{crc:04X}"

    return payload + crc_hex


def generate_qr_image(qr_string: str) -> str:
    """Generate QR code image and return as base64 PNG string."""
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_M,
        box_size=10,
        border=4,
    )
    qr.add_data(qr_string)
    qr.make(fit=True)

    img = qr.make_image(fill_color="black", back_color="white")

    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return base64.b64encode(buffer.getvalue()).decode("utf-8")
