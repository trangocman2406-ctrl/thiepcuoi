from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent
DATABASE_DIR = BASE_DIR / 'database'
DATABASE_PATH = DATABASE_DIR / 'database.sqlite'
STORAGE_DIR = BASE_DIR / 'storage'
UPLOAD_DIR = STORAGE_DIR / 'uploads' / 'orders'
QRCODE_DIR = STORAGE_DIR / 'qrcodes'
TOPUP_UPLOAD_DIR = STORAGE_DIR / 'uploads' / 'topups'
STATIC_DIR = BASE_DIR / 'static'
TEMPLATE_DIR = BASE_DIR / 'templates'

PORT = int(os.environ.get('PORT', '8000'))
SECRET_COOKIE_NAME = 'NY_SESSION'
MAX_UPLOAD_BYTES = 35 * 1024 * 1024
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp', '.gif'}
AUDIO_EXTENSIONS = {'.mp3', '.m4a', '.wav', '.ogg'}

TEMPLATE_CATALOG = [
    {'code': 'mau01', 'name': 'Mẫu 01 - Bao Thư Tình Yêu', 'locked': True, 'price': 399000},
    {'code': 'mau02', 'name': 'Mẫu 02 - Lịch Cưới Hỷ Sắc', 'locked': False, 'price': 285000},
    {'code': 'mau03', 'name': 'Mẫu 03 - Thiệp Thư Thanh Lịch', 'locked': False, 'price': 298000},
    {'code': 'mau04', 'name': 'Mẫu 04 - Đỏ Rượu Chuyện Tình', 'locked': False, 'price': 263000},
    {'code': 'mau05', 'name': 'Mẫu 05 - Sage Hồng Hai Nhà', 'locked': False, 'price': 377000},
]


# Thông tin nhận chuyển khoản. Có thể đổi bằng biến môi trường khi đưa web lên máy chủ.
PAYMENT_BANK_NAME = os.environ.get('PAYMENT_BANK_NAME', 'MB BANK')
PAYMENT_ACCOUNT_NUMBER = os.environ.get('PAYMENT_ACCOUNT_NUMBER', '0123456789')
PAYMENT_ACCOUNT_HOLDER = os.environ.get('PAYMENT_ACCOUNT_HOLDER', 'THIEP CUOI NHA YEN')
PAYMENT_BRANCH = os.environ.get('PAYMENT_BRANCH', 'Chi nhánh Phan Thiết')
