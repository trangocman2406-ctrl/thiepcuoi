import hashlib, hmac, secrets, sqlite3, uuid, re, unicodedata, shutil
from pathlib import Path
from datetime import datetime, timedelta
from config import DATABASE_DIR, DATABASE_PATH, UPLOAD_DIR, QRCODE_DIR


def now():
    return datetime.now().isoformat(timespec='seconds')


def uid():
    return str(uuid.uuid4())


def slugify(text):
    text = (text or '').strip().lower().replace('đ', 'd')
    text = ''.join(char for char in unicodedata.normalize('NFD', text) if unicodedata.category(char) != 'Mn')
    return (re.sub(r'[^a-z0-9]+', '-', text).strip('-')[:70] or 'thiep-cuoi')


def connect():
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA foreign_keys=ON')
    return conn


def one(row):
    return dict(row) if row else None


def many(rows):
    return [dict(r) for r in rows]


def hash_password(password, salt=None):
    salt = salt or secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 120000)
    return salt, digest.hex()


def verify_password(password, salt, expected):
    return hmac.compare_digest(hash_password(password, salt)[1], expected)


SCHEMA = '''
CREATE TABLE IF NOT EXISTS orders (
 id TEXT PRIMARY KEY,
 order_code TEXT UNIQUE NOT NULL,
 zalo TEXT NOT NULL,
 bride_name TEXT NOT NULL,
 groom_name TEXT NOT NULL,
 wedding_date TEXT,
 wedding_time TEXT,
 party_time TEXT,
 address TEXT,
 map_url TEXT,
 template_code TEXT NOT NULL,
 intro TEXT,
 ceremony_title TEXT,
 party_title TEXT,
 groom_parents TEXT,
 bride_parents TEXT,
 groom_address TEXT,
 bride_address TEXT,
 note TEXT,
 status TEXT NOT NULL DEFAULT 'new',
 source TEXT NOT NULL DEFAULT 'designer',
 music_path TEXT,
 created_at TEXT NOT NULL,
 updated_at TEXT,
 template_source_order_id TEXT
);
CREATE TABLE IF NOT EXISTS order_images (
 id TEXT PRIMARY KEY,
 order_id TEXT NOT NULL,
 file_path TEXT NOT NULL,
 sort_order INTEGER NOT NULL DEFAULT 0,
 FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS invitations (
 id TEXT PRIMARY KEY,
 order_id TEXT UNIQUE NOT NULL,
 slug TEXT UNIQUE NOT NULL,
 public_url TEXT,
 qr_path TEXT,
 status TEXT NOT NULL DEFAULT 'draft',
 created_at TEXT NOT NULL,
 FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS messages (
 id TEXT PRIMARY KEY,
 invitation_id TEXT NOT NULL,
 name TEXT,
 message TEXT NOT NULL,
 emoji TEXT,
 created_at TEXT NOT NULL,
 FOREIGN KEY(invitation_id) REFERENCES invitations(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS order_settings (
 order_id TEXT NOT NULL,
 key TEXT NOT NULL,
 value TEXT,
 PRIMARY KEY(order_id, key),
 FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS template_masters (
 template_code TEXT PRIMARY KEY,
 order_id TEXT NOT NULL,
 updated_at TEXT NOT NULL,
 FOREIGN KEY(order_id) REFERENCES orders(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS users (
 id TEXT PRIMARY KEY,
 username TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 salt TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'designer',
 created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS auth_sessions (
 token TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS topup_requests (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 amount INTEGER NOT NULL,
 sender_name TEXT,
 transfer_code TEXT,
 proof_path TEXT,
 note TEXT,
 status TEXT NOT NULL DEFAULT 'pending',
 reviewed_by TEXT,
 admin_note TEXT,
 created_at TEXT NOT NULL,
 reviewed_at TEXT,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
 FOREIGN KEY(reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE IF NOT EXISTS wallet_transactions (
 id TEXT PRIMARY KEY,
 user_id TEXT NOT NULL,
 amount INTEGER NOT NULL,
 transaction_type TEXT NOT NULL,
 reference_id TEXT,
 note TEXT,
 created_at TEXT NOT NULL,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_topup_status ON topup_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_wallet_user ON wallet_transactions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_invitations_slug ON invitations(slug);
'''

# Bổ sung cột còn thiếu khi mở database từ phiên bản cũ.
ORDER_EXTRA_COLUMNS = {
    'wedding_time': 'TEXT',
    'party_time': 'TEXT',
    'intro': 'TEXT',
    'ceremony_title': 'TEXT',
    'party_title': 'TEXT',
    'groom_parents': 'TEXT',
    'bride_parents': 'TEXT',
    'groom_address': 'TEXT',
    'bride_address': 'TEXT',
    'updated_at': 'TEXT',
    'source': "TEXT NOT NULL DEFAULT 'designer'",
    'template_source_order_id': 'TEXT',
    'user_id': 'TEXT',
}



DESIGN_DEFAULTS = {
    'cover_title': 'Wedding Invitation',
    'cover_subtitle': 'Trân trọng kính mời',
    'invite_label': 'Trân trọng kính mời',
    'invitation_title': 'Thiệp mời dự lễ cưới',
    'quote_text': 'Mỗi khoảnh khắc yêu thương đều là một kỷ niệm dịu dàng.',
    'family_title': 'Hai bên gia đình',
    'event_title': 'Thông tin buổi lễ',
    'gallery_title': 'Khoảnh khắc yêu thương',
    'wishes_title': 'Lời chúc',
    'map_button_text': 'Xem đường đi',
    'love_quote_title': 'I Love You',
    'love_quote_text': 'Ngọn gió xuân dịu dàng với em hơn,\nxưa tan muộn phiền,\nđể mọi thứ chỉ còn lại dịu dàng.',
    # Mẫu 01: các câu chữ trang trí trước đây viết cứng trong index.html,
    # không đơn nào chỉnh được — nay chuyển hết vào đây để đơn nào cũng có
    # thể tự sửa (mặc định = đúng chữ gốc cũ, không đổi gì nếu chưa ai sửa).
    'tiny_nav_left': 'You are',
    'tiny_nav_center': 'The love of',
    'tiny_nav_right': 'My life',
    'open_text': 'Chạm để mở thiệp',
    'ceremony_location_label': 'ĐƯỢC TỔ CHỨC TẠI :',
    'bottom_word_1': 'Fall in',
    'bottom_word_2': 'Love',
    'bottom_word_3': 'Wedding',
    'cinema_story_title': 'YOU ARE MY END\nAND MY BEGINNING',
    'cinema_story_bottom': 'LOVE AND FREEDOM\nYOU AND GENTLENESS',
    'collage_vertical_word': 'My Love Forever',
    'border_quote': 'Có lẽ thời gian này có vô vàn điều tươi đẹp,\nnhưng trong lòng em, đẹp nhất vẫn chỉ có anh.',
    'film_caption_1': 'I love three things in this world',
    'film_caption_2': 'Sun, moon and you.',
    'film_caption_3': 'You for morning, night, and forever',
    'film_caption_4': 'Love and freedom',
    'save_title': 'Save The Date',
    'small_story': 'Đi một vòng lớn rồi vẫn gặp anh,\ntừ đó, thế gian bỗng hoá dịu dàng.',
    'memory_note': 'Một khoảnh khắc nhỏ, một đời dịu dàng.',
    'closing_note': 'Hạnh phúc lớn nhất chính là được nắm tay anh,\ncùng nhau đi hết cuộc đời lãng mạn này.',
    'marquee_gallery_title': 'SWEET     WEDDING     INVITATION',
    'gift_intro_text': 'Hễ lần này đến lần khác, đem chuyện tình riêng khoe với thế gian.\nChỉ vì mỗi lần nhìn em, anh lại thấy đời là điều đáng yêu hơn hết.',
    'gift_box_label': 'Hộp quà cưới',
    'gift_box_hint': 'Bấm vào hộp quà để mở ảnh',
    'gift_open_title': 'Món quà nhỏ là lời chúc yêu thương gửi đến hai bạn.',
    'wishes_kicker': 'GỬI LỜI CHÚC',
    'thank_you_text': 'Cảm ơn quý khách',
    'thank_you_note': 'Thank you for celebrating with us',
    'letter_open_text': 'Mở thư',
    'calendar_time_label': 'Giờ lễ',
    'groom_side_label': 'Nhà trai',
    'bride_side_label': 'Nhà gái',
    'groom_role_label': 'Chú rể',
    'bride_role_label': 'Cô dâu',
    'event_time_prefix': 'Được tổ chức vào lúc',
    'month_label': 'Tháng',
    'year_label': 'Năm',
    'countdown_days_label': 'Ngày',
    'countdown_hours_label': 'Giờ',
    'countdown_minutes_label': 'Phút',
    'countdown_seconds_label': 'Giây',
    'map_section_title': 'Tổ chức tại',
    'map_error_title': 'Chưa tải được bản đồ',
    'map_error_text': 'Nhấn nút xem đường đi để mở vị trí trên Google Maps.',
    'story_kicker': 'Love Story',
    'story_title': 'Chuyện tình của chúng tôi',
    'story_1_date': 'Ngày đầu gặp gỡ',
    'story_1_title': 'Lần đầu gặp gỡ',
    'story_2_date': 'Kỷ niệm ngọt ngào',
    'story_2_title': 'Những ngày hẹn hò',
    'story_3_date': 'Tình yêu lớn dần',
    'story_3_title': 'Lời cầu hôn',
    'story_4_date': 'Chờ ngày chung đôi',
    'story_4_title': 'Về chung một nhà',
    'rsvp_lead_text': 'Hãy xác nhận sự có mặt của Quý Khách để gia đình chúng tôi chuẩn bị đón tiếp một cách chu đáo nhất. Trân trọng!',
    'rsvp_overline': 'Bạn sẽ đến chung vui chứ?',
    'rsvp_title': 'Xác nhận tham dự',
    'rsvp_name_label': 'Họ và tên',
    'rsvp_attendance_label': 'Bạn sẽ tham dự chứ?',
    'rsvp_yes_text': 'Có, tôi sẽ tham dự',
    'rsvp_no_text': 'Tôi bận, rất tiếc không thể tham dự',
    'rsvp_count_label': 'Số lượng người tham dự',
    'rsvp_message_label': 'Lời nhắn',
    'rsvp_submit_text': 'Gửi xác nhận',
    'wish_overline': 'Gửi đến cô dâu và chú rể',
    'wish_display_title': 'Gửi yêu thương',
    'wish_name_label': 'Tên của bạn',
    'wish_message_label': 'Lời chúc',
    'wish_send_text': 'Gửi lời chúc',
    'thank_you_title': 'Thank You',
    'm03_couple_ranks': 'Trưởng Nam • Út Nữ',
    'm03_groom_father': 'Cha: Nguyễn Trí Trung',
    'm03_groom_mother': 'Mẹ: Võ Thị Xuân Nga',
    'm03_bride_father': 'Cha: Nguyễn Văn Quang',
    'm03_bride_mother': 'Mẹ: Khương Thị Song Miền',
    'm03_couple_section_title': 'Chú rể & Cô dâu',
    'm03_ceremony_host_text': 'Chủ hôn: Có in • Cử hành tại: Tư Gia',
    'm03_ceremony_lunar_date': 'Ngày 10 tháng 08 năm Bính Ngọ',
    'm03_party_lunar_date': 'Ngày 10 tháng 08 năm Bính Ngọ',
    'm03_calendar_overline': 'Save our date',
    'm03_map_note': 'Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi',
    'm03_gallery_overline': 'Những khoảnh khắc của chúng tôi',
    'm03_thank_you_note': 'Cảm ơn quý khách đã dành thời gian xem thiệp và chung vui cùng chúng tôi.',
    'm04_brand_side_text': 'Thiệp cưới Nhà Yến',
    'm04_hero_invite_text': 'Thư mời tiệc cưới',
    'm04_hero_ceremony_prefix': 'Lễ thành hôn',
    'm04_main_invite_title': 'THIỆP MỜI',
    'ceremony_address': '',
    'party_address': '',
    'name_size': '46',
    'heading_size': '34',
    'body_size': '16',
    'name_font': '',
    'heading_font': '',
    'body_font': '',
    'text_color': '#2b211b',
    'accent_color': '#b77916',
    'background_color': '#fffaf5',
    'image_fit': 'contain',
    'calendar_note': '',
}

PHOTO_SETTING_RE = re.compile(r'^(?P<slot>photo(?P<index>\d+)(?:__(?P<occurrence>\d+))?)_(?P<prop>zoom|x|y|fit|unit)$')
TEXT_POS_RE = re.compile(r'^(?P<field>[a-z][a-z0-9_]*)_(?P<prop>align|nudge_x|nudge_y|size|font|color)$')
FONT_FAMILIES = {'Allura', 'Cormorant Garamond', 'Great Vibes', 'Imperial Script', 'Italiana', 'Montserrat', 'Playfair Display', 'Georgia', 'Times New Roman', 'Arial', 'Trebuchet MS', 'Verdana', 'Tahoma'}
def clean_settings(data):
    out = {}
    for key, default in DESIGN_DEFAULTS.items():
        value = (data.get(key) if isinstance(data, dict) else None)
        value = value if value is not None else default
        value = str(value).strip()
        if key in {'name_size', 'heading_size', 'body_size'}:
            try:
                n = int(float(value))
            except ValueError:
                n = int(default)
            limits = {'name_size': (24, 86), 'heading_size': (20, 64), 'body_size': (12, 24)}[key]
            value = str(max(limits[0], min(limits[1], n)))
        if key in {'name_font', 'heading_font', 'body_font'} and value and value not in FONT_FAMILIES:
            value = default
        if key in {'text_color', 'accent_color', 'background_color'}:
            if not re.fullmatch(r'#[0-9a-fA-F]{6}', value):
                value = default
        if key == 'image_fit' and value not in {'cover', 'contain'}:
            value = default
        out[key] = value[:2000]

    if isinstance(data, dict):
        for key, raw in data.items():
            m = PHOTO_SETTING_RE.match(str(key))
            if not m:
                continue
            idx = int(m.group('index'))
            occurrence = int(m.group('occurrence') or 1)
            prop = m.group('prop')
            if idx < 0 or idx > 79 or occurrence < 1 or occurrence > 200:
                continue
            value = str(raw if raw is not None else '').strip()
            if prop == 'zoom':
                try:
                    n = float(value)
                except ValueError:
                    n = 1
                out[key] = str(max(0.35, min(4, round(n, 3))))
            elif prop in {'x', 'y'}:
                try:
                    n = float(value)
                except ValueError:
                    n = 0
                out[key] = str(max(-20000, min(20000, round(n, 2))))
            elif prop == 'fit':
                out[key] = value if value in {'cover', 'contain'} else 'contain'
            elif prop == 'unit':
                out[key] = value if value in {'px', 'pct'} else 'px'

        # Re-clamp every base or repeated crop key after reading its unit.
        prefixes = set()
        for setting_key in out:
            match = PHOTO_SETTING_RE.match(str(setting_key))
            if match:
                prefixes.add(match.group('slot') + '_')
        for prefix in prefixes:
            unit = out.get(prefix + 'unit') or str(data.get(prefix + 'unit') or 'pct').strip()
            limit = 5000 if unit == 'pct' else 20000
            for axis in ('x', 'y'):
                setting_key = prefix + axis
                if setting_key not in out:
                    continue
                try:
                    value = float(out[setting_key])
                except (TypeError, ValueError):
                    value = 0
                out[setting_key] = str(max(-limit, min(limit, round(value, 2))))

        # Canh lề / nhích / cỡ chữ riêng cho từng trường (field) trong
        # EDITABLE_KEYS — vị trí chữ được phép kéo tự do trong canvas;
        # chỉ giữ giới hạn kỹ thuật rất rộng để tránh dữ liệu vô hạn. Cỡ chữ
        # nhóm (name/heading/body) chỉ cho đúng trường đó, để trống ('')
        # nghĩa là "theo mặc định nhóm".
        for key, raw in data.items():
            m = TEXT_POS_RE.match(str(key))
            if not m:
                continue
            prop = m.group('prop')
            value = str(raw if raw is not None else '').strip()
            if prop == 'align':
                out[key] = value if value in {'left', 'center', 'right'} else ''
            elif prop == 'size':
                if not value:
                    out[key] = ''
                else:
                    try:
                        n = round(float(value))
                    except ValueError:
                        out[key] = ''
                        continue
                    out[key] = str(max(10, min(160, n)))
            elif prop == 'font':
                out[key] = value if value in FONT_FAMILIES else ''
            elif prop == 'color':
                out[key] = value if re.fullmatch(r'#[0-9a-fA-F]{6}', value) else ''
            else:
                try:
                    n = float(value)
                except ValueError:
                    n = 0
                out[key] = str(max(-100000, min(100000, round(n))))
    return out


def save_order_settings(conn, order_id, data):
    # Chỉ ghi các field thật sự có trong request. Trước đây clean_settings()
    # luôn trả về toàn bộ DESIGN_DEFAULTS, nên khi form của mẫu hiện tại không
    # chứa field riêng của mẫu khác, mỗi lần autosave lại vô tình ghi đè nội
    # dung đã chỉnh của mẫu kia về mặc định. load_order_settings() đã tự trộn
    # DESIGN_DEFAULTS khi đọc, nên không cần lưu các key vắng mặt.
    raw = data or {}
    present_keys = {str(key) for key in raw} if isinstance(raw, dict) else set()
    settings = {
        key: value for key, value in clean_settings(raw).items()
        if key in present_keys
    }
    for key, value in settings.items():
        conn.execute("""
            INSERT INTO order_settings(order_id, key, value)
            VALUES(?,?,?)
            ON CONFLICT(order_id, key) DO UPDATE SET value=excluded.value
        """, (order_id, key, value))


def load_order_settings(conn, order_id):
    rows = conn.execute('SELECT key, value FROM order_settings WHERE order_id=?', (order_id,)).fetchall()
    settings = dict(DESIGN_DEFAULTS)
    settings.update({r['key']: r['value'] for r in rows})
    return settings

def migrate_orders_table(conn):
    existing = {row['name'] for row in conn.execute('PRAGMA table_info(orders)').fetchall()}
    for col, typ in ORDER_EXTRA_COLUMNS.items():
        if col not in existing:
            conn.execute(f'ALTER TABLE orders ADD COLUMN {col} {typ}')


def migrate_messages_table(conn):
    existing = {row['name'] for row in conn.execute('PRAGMA table_info(messages)').fetchall()}
    if 'emoji' not in existing:
        conn.execute('ALTER TABLE messages ADD COLUMN emoji TEXT')


def migrate_order_images_table(conn):
    # Keep the newest row if an older database contains duplicate image slots,
    # then enforce one file per logical photo slot.
    conn.execute('''
        DELETE FROM order_images
        WHERE rowid NOT IN (
            SELECT MAX(rowid) FROM order_images GROUP BY order_id, sort_order
        )
    ''')
    conn.execute('CREATE UNIQUE INDEX IF NOT EXISTS idx_order_images_slot ON order_images(order_id, sort_order)')


def migrate_users_table(conn):
    existing = {row['name'] for row in conn.execute('PRAGMA table_info(users)').fetchall()}
    columns = {
        'full_name': "TEXT NOT NULL DEFAULT ''",
        'email': "TEXT NOT NULL DEFAULT ''",
        'phone': "TEXT NOT NULL DEFAULT ''",
        'address': "TEXT NOT NULL DEFAULT ''",
        'balance': 'INTEGER NOT NULL DEFAULT 0',
        'status': "TEXT NOT NULL DEFAULT 'active'",
        'updated_at': 'TEXT',
    }
    for col, typ in columns.items():
        if col not in existing:
            conn.execute(f'ALTER TABLE users ADD COLUMN {col} {typ}')


def ensure_user(username, password, role):
    with connect() as conn:
        if conn.execute('SELECT id FROM users WHERE username=?', (username,)).fetchone():
            return
        salt, pw = hash_password(password)
        conn.execute('INSERT INTO users(id,username,password_hash,salt,role,created_at,updated_at) VALUES(?,?,?,?,?,?,?)', (uid(), username, pw, salt, role, now(), now()))
        conn.commit()


def init_db():
    DATABASE_DIR.mkdir(parents=True, exist_ok=True)
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    QRCODE_DIR.mkdir(parents=True, exist_ok=True)
    with connect() as conn:
        conn.executescript(SCHEMA)
        migrate_orders_table(conn)
        migrate_messages_table(conn)
        migrate_order_images_table(conn)
        migrate_users_table(conn)
        conn.execute('CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id, created_at)')
        conn.commit()
    ensure_user('admin1', '8520963', 'admin')
    ensure_user('admin02', '9638520741', 'admin')
    ensure_user('designer', 'designer123', 'designer')


def get_user_by_username(username):
    with connect() as conn:
        return one(conn.execute('SELECT * FROM users WHERE username=?', (username,)).fetchone())


def get_user_by_id(user_id):
    with connect() as conn:
        return one(conn.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone())


def create_auth_session(user_id, days=30):
    token = secrets.token_urlsafe(40)
    created = datetime.now()
    expires = created + timedelta(days=days)
    with connect() as conn:
        conn.execute('DELETE FROM auth_sessions WHERE expires_at < ?', (created.isoformat(timespec='seconds'),))
        conn.execute('INSERT INTO auth_sessions(token,user_id,created_at,expires_at) VALUES(?,?,?,?)', (
            token, user_id, created.isoformat(timespec='seconds'), expires.isoformat(timespec='seconds')
        ))
        conn.commit()
    return token


def get_user_by_session(token):
    if not token:
        return None
    with connect() as conn:
        return one(conn.execute(
            'SELECT u.* FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires_at>=?',
            (token, now())
        ).fetchone())


def delete_auth_session(token):
    if not token:
        return
    with connect() as conn:
        conn.execute('DELETE FROM auth_sessions WHERE token=?', (token,))
        conn.commit()


def create_customer(data):
    username = (data.get('username') or '').strip().lower()
    password = data.get('password') or ''
    full_name = (data.get('full_name') or '').strip()
    phone = (data.get('phone') or '').strip()
    email = (data.get('email') or '').strip()
    address = (data.get('address') or '').strip()
    if not re.fullmatch(r'[a-zA-Z0-9_.-]{3,40}', username):
        raise ValueError('Tên đăng nhập phải có 3–40 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.')
    if len(password) < 6:
        raise ValueError('Mật khẩu phải có ít nhất 6 ký tự.')
    if not full_name or not phone or not address:
        raise ValueError('Vui lòng nhập họ tên, số điện thoại và địa chỉ đầy đủ.')
    salt, password_hash = hash_password(password)
    user_id = uid()
    try:
        with connect() as conn:
            conn.execute('''
                INSERT INTO users(
                    id,username,password_hash,salt,role,created_at,full_name,email,phone,address,balance,status,updated_at
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)
            ''', (
                user_id, username, password_hash, salt, 'customer', now(), full_name, email, phone,
                address, 0, 'active', now()
            ))
            conn.commit()
    except sqlite3.IntegrityError as exc:
        raise ValueError('Tên đăng nhập đã tồn tại.') from exc
    return user_id


def update_user_profile(user_id, data):
    full_name = (data.get('full_name') or '').strip()
    phone = (data.get('phone') or '').strip()
    email = (data.get('email') or '').strip()
    address = (data.get('address') or '').strip()
    if not full_name or not phone or not address:
        raise ValueError('Họ tên, số điện thoại và địa chỉ đầy đủ không được để trống.')
    with connect() as conn:
        conn.execute(
            'UPDATE users SET full_name=?,phone=?,email=?,address=?,updated_at=? WHERE id=?',
            (full_name, phone, email, address, now(), user_id)
        )
        conn.commit()
    return get_user_by_id(user_id)


def change_password(user_id, old_password, new_password):
    user = get_user_by_id(user_id)
    if not user or not verify_password(old_password or '', user['salt'], user['password_hash']):
        raise ValueError('Mật khẩu hiện tại không đúng.')
    if len(new_password or '') < 6:
        raise ValueError('Mật khẩu mới phải có ít nhất 6 ký tự.')
    salt, password_hash = hash_password(new_password)
    with connect() as conn:
        conn.execute(
            'UPDATE users SET password_hash=?,salt=?,updated_at=? WHERE id=?',
            (password_hash, salt, now(), user_id)
        )
        conn.execute('DELETE FROM auth_sessions WHERE user_id=?', (user_id,))
        conn.commit()


def attach_order_to_user(order_id, user_id):
    if not order_id or not user_id:
        return
    with connect() as conn:
        conn.execute('UPDATE orders SET user_id=?,updated_at=? WHERE id=?', (user_id, now(), order_id))
        conn.commit()


def list_orders_for_user(user_id):
    with connect() as conn:
        return many(conn.execute('''
            SELECT o.*, (SELECT slug FROM invitations i WHERE i.order_id=o.id) slug
            FROM orders o WHERE o.user_id=? ORDER BY o.created_at DESC
        ''', (user_id,)).fetchall())


def create_topup_request(user_id, amount, sender_name='', transfer_code='', note='', proof_path=''):
    try:
        amount = int(amount)
    except (TypeError, ValueError):
        raise ValueError('Số tiền nạp không hợp lệ.')
    if amount < 10000:
        raise ValueError('Số tiền nạp tối thiểu là 10.000đ.')
    request_id = uid()
    with connect() as conn:
        conn.execute('''
            INSERT INTO topup_requests(
                id,user_id,amount,sender_name,transfer_code,proof_path,note,status,created_at
            ) VALUES(?,?,?,?,?,?,?,?,?)
        ''', (
            request_id, user_id, amount, (sender_name or '').strip(), (transfer_code or '').strip(),
            (proof_path or '').strip(), (note or '').strip(), 'pending', now()
        ))
        conn.commit()
    return request_id


def list_topups_for_user(user_id):
    with connect() as conn:
        return many(conn.execute(
            'SELECT * FROM topup_requests WHERE user_id=? ORDER BY created_at DESC',
            (user_id,)
        ).fetchall())


def list_wallet_transactions(user_id):
    with connect() as conn:
        return many(conn.execute(
            'SELECT * FROM wallet_transactions WHERE user_id=? ORDER BY created_at DESC',
            (user_id,)
        ).fetchall())


def list_topup_requests(status=''):
    with connect() as conn:
        if status:
            rows = conn.execute('''
                SELECT t.*,u.username,u.full_name,u.phone,u.balance
                FROM topup_requests t JOIN users u ON u.id=t.user_id
                WHERE t.status=? ORDER BY t.created_at DESC
            ''', (status,)).fetchall()
        else:
            rows = conn.execute('''
                SELECT t.*,u.username,u.full_name,u.phone,u.balance
                FROM topup_requests t JOIN users u ON u.id=t.user_id
                ORDER BY CASE t.status WHEN 'pending' THEN 0 ELSE 1 END,t.created_at DESC
            ''').fetchall()
        return many(rows)


def review_topup(request_id, admin_id, action, admin_note=''):
    if action not in {'approve', 'reject'}:
        raise ValueError('Thao tác duyệt không hợp lệ.')
    with connect() as conn:
        conn.execute('BEGIN IMMEDIATE')
        req = one(conn.execute('SELECT * FROM topup_requests WHERE id=?', (request_id,)).fetchone())
        if not req:
            conn.rollback()
            raise ValueError('Không tìm thấy yêu cầu nạp tiền.')
        if req['status'] != 'pending':
            conn.rollback()
            raise ValueError('Yêu cầu này đã được xử lý trước đó.')
        new_status = 'approved' if action == 'approve' else 'rejected'
        conn.execute(
            'UPDATE topup_requests SET status=?,reviewed_by=?,admin_note=?,reviewed_at=? WHERE id=?',
            (new_status, admin_id, (admin_note or '').strip(), now(), request_id)
        )
        if action == 'approve':
            conn.execute(
                'UPDATE users SET balance=balance+?,updated_at=? WHERE id=?',
                (req['amount'], now(), req['user_id'])
            )
            conn.execute('''
                INSERT INTO wallet_transactions(
                    id,user_id,amount,transaction_type,reference_id,note,created_at
                ) VALUES(?,?,?,?,?,?,?)
            ''', (
                uid(), req['user_id'], req['amount'], 'topup', request_id,
                'Admin đã duyệt yêu cầu nạp tiền', now()
            ))
        conn.commit()


def list_customers():
    with connect() as conn:
        return many(conn.execute('''
            SELECT u.*,
              (SELECT COUNT(*) FROM topup_requests t WHERE t.user_id=u.id AND t.status='pending') pending_topups,
              (SELECT COUNT(*) FROM orders o WHERE o.user_id=u.id) order_count
            FROM users u WHERE u.role='customer' ORDER BY u.created_at DESC
        ''').fetchall())


def admin_adjust_balance(user_id, amount, admin_id, note=''):
    try:
        amount = int(amount)
    except (TypeError, ValueError):
        raise ValueError('Số tiền điều chỉnh không hợp lệ.')
    if amount == 0:
        raise ValueError('Số tiền điều chỉnh phải khác 0.')
    with connect() as conn:
        conn.execute('BEGIN IMMEDIATE')
        user = one(conn.execute('SELECT balance FROM users WHERE id=?', (user_id,)).fetchone())
        if not user:
            conn.rollback()
            raise ValueError('Không tìm thấy tài khoản.')
        if int(user.get('balance') or 0) + amount < 0:
            conn.rollback()
            raise ValueError('Số dư sau điều chỉnh không thể âm.')
        conn.execute('UPDATE users SET balance=balance+?,updated_at=? WHERE id=?', (amount, now(), user_id))
        conn.execute('''
            INSERT INTO wallet_transactions(
                id,user_id,amount,transaction_type,reference_id,note,created_at
            ) VALUES(?,?,?,?,?,?,?)
        ''', (
            uid(), user_id, amount, 'admin_adjust', admin_id,
            (note or '').strip() or 'Admin điều chỉnh số dư', now()
        ))
        conn.commit()


def order_code_exists(order_code, exclude_order_id=None):
    with connect() as conn:
        if exclude_order_id:
            row = conn.execute('SELECT 1 FROM orders WHERE order_code=? AND id<>?', (order_code, exclude_order_id)).fetchone()
        else:
            row = conn.execute('SELECT 1 FROM orders WHERE order_code=?', (order_code,)).fetchone()
        return row is not None


def clean_order_data(data):
    def s(key, default=''):
        return (data.get(key) or default or '').strip()

    return {
        'order_code': s('order_code'),
        'zalo': s('zalo'),
        'bride_name': s('bride_name'),
        'groom_name': s('groom_name'),
        'wedding_date': s('wedding_date'),
        'wedding_time': s('wedding_time'),
        'party_time': s('party_time'),
        'address': s('address'),
        'map_url': s('map_url'),
        'template_code': s('template_code', 'mau01'),
        'intro': s('intro'),
        'ceremony_title': s('ceremony_title'),
        'party_title': s('party_title'),
        'groom_parents': s('groom_parents'),
        'bride_parents': s('bride_parents'),
        'groom_address': s('groom_address'),
        'bride_address': s('bride_address'),
        'note': s('note'),
        'status': s('status', 'new'),
    }


def _safe_order_folder(name):
    """Khớp quy tắc routes.uploads.safe_name nhưng đặt ở models để tránh import vòng."""
    return re.sub(r'[^a-zA-Z0-9._-]+', '_', name or 'file')[:120]


def _storage_url_to_path(url):
    value = str(url or '').strip()
    if not value:
        return None
    prefix = '/storage/uploads/orders/'
    if value.startswith(prefix):
        relative = value[len(prefix):]
        return UPLOAD_DIR / relative
    candidate = Path(value)
    return candidate if candidate.is_absolute() else None


def _copy_master_file(source_url, order_code):
    source = _storage_url_to_path(source_url)
    if not source or not source.is_file():
        return None
    folder = UPLOAD_DIR / _safe_order_folder(order_code)
    folder.mkdir(parents=True, exist_ok=True)
    suffix = source.suffix.lower()[:12]
    destination = folder / f'{uuid.uuid4().hex}{suffix}'
    shutil.copy2(source, destination)
    return f'/storage/uploads/orders/{folder.name}/{destination.name}'


def _raw_order_settings(conn, order_id):
    return {row['key']: row['value'] for row in conn.execute(
        'SELECT key, value FROM order_settings WHERE order_id=?', (order_id,)
    ).fetchall()}


def _master_clone_seed(template_code, order_code):
    """Tạo dữ liệu clone vật lý trước khi ghi DB; không chia sẻ file với mẫu chính."""
    master = get_template_master_order(template_code)
    if not master:
        return None, {}, [], None, []

    copied_paths = []
    copied_images = []
    for item in master.get('images') or []:
        copied = _copy_master_file(item.get('file_path'), order_code)
        if copied:
            copied_paths.append(copied)
            copied_images.append((int(item.get('sort_order') or 0), copied))

    copied_music = _copy_master_file(master.get('music_path'), order_code)
    if copied_music:
        copied_paths.append(copied_music)

    with connect() as conn:
        master_settings = _raw_order_settings(conn, master['id'])
    return master, master_settings, copied_images, copied_music, copied_paths


def _remove_copied_files(paths):
    for value in paths or []:
        path = _storage_url_to_path(value)
        try:
            if path and path.is_file():
                path.unlink()
        except OSError:
            pass


def create_order(data, image_paths, music_path, source='designer'):
    order_id = uid()
    raw_data = dict(data or {})
    data = clean_order_data(raw_data)

    # Mẫu chính chỉ là nguồn. Mỗi lần tạo đơn, settings + media được deep clone
    # sang file/dòng DB mới; chỉnh hoặc xóa bản phụ không thể tác động mẫu chính.
    master, master_settings, cloned_images, cloned_music, copied_paths = _master_clone_seed(
        data['template_code'], data['order_code']
    )
    source_master_id = master.get('id') if master else None

    # Chỉ kế thừa các câu chữ mang tính bố cục chung. Tuyệt đối không chép tên,
    # ngày cưới, địa chỉ, phụ huynh hoặc ghi chú của khách cũ sang đơn mới.
    if master:
        for key in ('intro', 'ceremony_title', 'party_title'):
            if not data.get(key) and master.get(key):
                data[key] = str(master.get(key) or '').strip()

    incoming_images = list(image_paths or [])
    image_by_slot = {slot: path for slot, path in cloned_images}
    # Ảnh mới của khách ghi đè đúng các slot đầu; file clone bị thay thế được
    # xóa ngay để không tạo file rác trong thư mục đơn mới.
    overridden_clones = []
    for slot, path in enumerate(incoming_images):
        old_path = image_by_slot.get(slot)
        if old_path:
            overridden_clones.append(old_path)
        image_by_slot[slot] = path
    _remove_copied_files(overridden_clones)
    copied_paths = [path for path in copied_paths if path not in overridden_clones]

    if music_path and cloned_music:
        _remove_copied_files([cloned_music])
        copied_paths = [path for path in copied_paths if path != cloned_music]
    final_music = music_path or cloned_music

    try:
        with connect() as conn:
            try:
                conn.execute('''
                    INSERT INTO orders(
                        id, order_code, zalo, bride_name, groom_name,
                        wedding_date, wedding_time, party_time,
                        address, map_url, template_code,
                        intro, ceremony_title, party_title,
                        groom_parents, bride_parents, groom_address, bride_address,
                        note, status, source, music_path, created_at, updated_at,
                        template_source_order_id
                    ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
                ''', (
                    order_id, data['order_code'], data['zalo'], data['bride_name'], data['groom_name'],
                    data['wedding_date'], data['wedding_time'], data['party_time'],
                    data['address'], data['map_url'], data['template_code'],
                    data['intro'], data['ceremony_title'], data['party_title'],
                    data['groom_parents'], data['bride_parents'], data['groom_address'], data['bride_address'],
                    data['note'], data['status'] or 'new', source or 'designer', final_music, now(), now(),
                    source_master_id
                ))
            except sqlite3.IntegrityError as exc:
                if 'orders.order_code' in str(exc) or 'UNIQUE' in str(exc):
                    raise ValueError('Mã đơn hàng này đã tồn tại. Vui lòng kiểm tra lại mã đơn.') from exc
                raise

            for slot, path in sorted(image_by_slot.items()):
                conn.execute('INSERT INTO order_images VALUES(?,?,?,?)', (uid(), order_id, path, slot))

            if master_settings:
                save_order_settings(conn, order_id, master_settings)
            # Dữ liệu được gửi trong lần tạo luôn có quyền ghi đè seed từ mẫu chính.
            save_order_settings(conn, order_id, raw_data)
            conn.commit()
    except Exception:
        _remove_copied_files(copied_paths)
        raise
    return order_id


def list_orders():
    with connect() as conn:
        sql = '''
            SELECT o.*,
                   (SELECT COUNT(*) FROM order_images im WHERE im.order_id=o.id) image_count,
                   (SELECT slug FROM invitations inv WHERE inv.order_id=o.id) slug
            FROM orders o
            ORDER BY o.created_at DESC
        '''
        return many(conn.execute(sql).fetchall())


def get_order(order_id):
    with connect() as conn:
        order = one(conn.execute('SELECT * FROM orders WHERE id=?', (order_id,)).fetchone())
        if not order:
            return None
        order['images'] = many(conn.execute('SELECT * FROM order_images WHERE order_id=? ORDER BY sort_order', (order_id,)).fetchall())
        order['invitation'] = one(conn.execute('SELECT * FROM invitations WHERE order_id=?', (order_id,)).fetchone())
        settings = load_order_settings(conn, order_id)
        order['settings'] = settings
        order.update(settings)
        return order


def update_order(order_id, data, new_image_paths=None, new_music_path=None):
    current = get_order(order_id)
    if not current:
        return None
    raw_data = dict(data or {})
    data = clean_order_data(raw_data)
    template_changed = data['template_code'] != (current.get('template_code') or 'mau01')
    if template_changed:
        raw_data = {key: value for key, value in raw_data.items() if not PHOTO_SETTING_RE.match(str(key))}
    if order_code_exists(data['order_code'], exclude_order_id=order_id):
        raise ValueError('Mã đơn hàng này đã tồn tại ở đơn khác. Vui lòng đổi mã hoặc kiểm tra lại.')

    music_path = new_music_path if new_music_path else current.get('music_path')
    with connect() as conn:
        conn.execute('''
            UPDATE orders SET
                order_code=?, zalo=?, bride_name=?, groom_name=?,
                wedding_date=?, wedding_time=?, party_time=?,
                address=?, map_url=?, template_code=?,
                intro=?, ceremony_title=?, party_title=?,
                groom_parents=?, bride_parents=?, groom_address=?, bride_address=?,
                note=?, status=?, music_path=?, updated_at=?
            WHERE id=?
        ''', (
            data['order_code'], data['zalo'], data['bride_name'], data['groom_name'],
            data['wedding_date'], data['wedding_time'], data['party_time'],
            data['address'], data['map_url'], data['template_code'],
            data['intro'], data['ceremony_title'], data['party_title'],
            data['groom_parents'], data['bride_parents'], data['groom_address'], data['bride_address'],
            data['note'], data['status'] or current.get('status') or 'new', music_path, now(), order_id
        ))
        next_sort = conn.execute('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM order_images WHERE order_id=?', (order_id,)).fetchone()[0]
        for offset, path in enumerate(new_image_paths or []):
            conn.execute('INSERT INTO order_images VALUES(?,?,?,?)', (uid(), order_id, path, next_sort + offset))
        if template_changed:
            conn.execute("DELETE FROM order_settings WHERE order_id=? AND key LIKE 'photo%'", (order_id,))
        save_order_settings(conn, order_id, raw_data)
        conn.commit()
    return get_order(order_id)


def append_order_files(order_id, image_paths=None, music_path=None):
    current = get_order(order_id)
    if not current:
        return None
    with connect() as conn:
        next_sort = conn.execute('SELECT COALESCE(MAX(sort_order), -1) + 1 FROM order_images WHERE order_id=?', (order_id,)).fetchone()[0]
        for offset, path in enumerate(image_paths or []):
            conn.execute('INSERT INTO order_images VALUES(?,?,?,?)', (uid(), order_id, path, next_sort + offset))
        if music_path:
            conn.execute('UPDATE orders SET music_path=?, updated_at=? WHERE id=?', (music_path, now(), order_id))
        else:
            conn.execute('UPDATE orders SET updated_at=? WHERE id=?', (now(), order_id))
        conn.commit()
    return get_order(order_id)



def replace_order_image_slot(order_id, slot_index, file_path):
    current = get_order(order_id)
    if not current:
        return None
    try:
        slot_index = int(slot_index)
    except (TypeError, ValueError):
        slot_index = 0
    slot_index = max(0, min(79, slot_index))
    with connect() as conn:
        conn.execute('''
            INSERT INTO order_images(id, order_id, file_path, sort_order)
            VALUES(?,?,?,?)
            ON CONFLICT(order_id, sort_order) DO UPDATE SET file_path=excluded.file_path
        ''', (uid(), order_id, file_path, slot_index))
        base_key = f'photo{slot_index}'
        conn.execute(
            "DELETE FROM order_settings WHERE order_id=? AND key GLOB ?",
            (order_id, base_key + '_*')
        )
        reset_settings = {
            f'{base_key}_x': '0',
            f'{base_key}_y': '0',
            f'{base_key}_zoom': '1',
            f'{base_key}_fit': 'contain',
            f'{base_key}_unit': 'pct',
        }
        for key, value in reset_settings.items():
            conn.execute("""
                INSERT INTO order_settings(order_id, key, value)
                VALUES(?,?,?)
                ON CONFLICT(order_id, key) DO UPDATE SET value=excluded.value
            """, (order_id, key, value))
        conn.execute('UPDATE orders SET updated_at=? WHERE id=?', (now(), order_id))
        conn.commit()
    return get_order(order_id)

def delete_order_image(image_id, order_id):
    with connect() as conn:
        conn.execute('DELETE FROM order_images WHERE id=? AND order_id=?', (image_id, order_id))
        conn.commit()


def delete_order(order_id):
    # order_images/invitations/order_settings/template_masters đều có
    # ON DELETE CASCADE trên order_id nên chỉ cần xoá đúng 1 dòng orders là
    # dọn sạch hết dữ liệu liên quan trong DB; file ảnh/nhạc đã upload trên
    # đĩa do route gọi hàm này tự dọn riêng (models không biết đường dẫn thư mục upload).
    with connect() as conn:
        conn.execute('DELETE FROM orders WHERE id=?', (order_id,))
        conn.commit()



def _next_copy_order_code(conn, source_code):
    """Sinh mã Mẫu phụ mới, không đụng mã của Mẫu chính."""
    base = str(source_code or 'MAU').strip()[:90] or 'MAU'
    number = 1
    while True:
        candidate = f'{base}-COPY-{number:02d}'
        if not conn.execute('SELECT 1 FROM orders WHERE order_code=?', (candidate,)).fetchone():
            return candidate
        number += 1


def clone_order_as_independent_copy(source_order_id, source='designer'):
    """Deep clone đúng một đơn thành Mẫu phụ độc lập.

    Không tra mẫu chính hiện tại và không gọi create_order(), tránh clone
    chồng. Settings, ảnh và nhạc đều tạo dòng/file riêng; link và lời chúc
    không được sao chép.
    """
    source_order = get_order(source_order_id)
    if not source_order:
        return None

    copied_paths = []
    with connect() as conn:
        new_order_code = _next_copy_order_code(conn, source_order.get('order_code'))

    copied_images = []
    for item in source_order.get('images') or []:
        copied = _copy_master_file(item.get('file_path'), new_order_code)
        if copied:
            copied_paths.append(copied)
            copied_images.append((int(item.get('sort_order') or 0), copied))

    copied_music = _copy_master_file(source_order.get('music_path'), new_order_code)
    if copied_music:
        copied_paths.append(copied_music)

    new_order_id = uid()
    try:
        with connect() as conn:
            conn.execute('''
                INSERT INTO orders(
                    id, order_code, zalo, bride_name, groom_name,
                    wedding_date, wedding_time, party_time,
                    address, map_url, template_code,
                    intro, ceremony_title, party_title,
                    groom_parents, bride_parents, groom_address, bride_address,
                    note, status, source, music_path, created_at, updated_at,
                    template_source_order_id
                ) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
            ''', (
                new_order_id, new_order_code,
                source_order.get('zalo') or '', source_order.get('bride_name') or '',
                source_order.get('groom_name') or '', source_order.get('wedding_date') or '',
                source_order.get('wedding_time') or '', source_order.get('party_time') or '',
                source_order.get('address') or '', source_order.get('map_url') or '',
                source_order.get('template_code') or 'mau01', source_order.get('intro') or '',
                source_order.get('ceremony_title') or '', source_order.get('party_title') or '',
                source_order.get('groom_parents') or '', source_order.get('bride_parents') or '',
                source_order.get('groom_address') or '', source_order.get('bride_address') or '',
                source_order.get('note') or '', 'new', source or 'designer', copied_music,
                now(), now(), source_order_id
            ))
            for slot, path in copied_images:
                conn.execute('INSERT INTO order_images VALUES(?,?,?,?)', (uid(), new_order_id, path, slot))
            settings = _raw_order_settings(conn, source_order_id)
            if settings:
                save_order_settings(conn, new_order_id, settings)
            conn.commit()
    except Exception:
        _remove_copied_files(copied_paths)
        raise
    return new_order_id

def export_invitation(order_id, base_url):
    order = get_order(order_id)
    if not order:
        return None
    base = slugify(f"{order['order_code']}-{order['bride_name']}-{order['groom_name']}")
    with connect() as conn:
        old = one(conn.execute('SELECT * FROM invitations WHERE order_id=?', (order_id,)).fetchone())
        slug = old['slug'] if old else base
        if not old:
            test = slug
            n = 2
            while conn.execute('SELECT id FROM invitations WHERE slug=?', (test,)).fetchone():
                test = f'{base}-{n}'
                n += 1
            slug = test
        public_url = f"{base_url.rstrip('/')}/i/{slug}"
        qr_path = f'/qr/{slug}'
        if old:
            inv_id = old['id']
            conn.execute('UPDATE invitations SET public_url=?, qr_path=?, status=? WHERE id=?', (public_url, qr_path, 'published', inv_id))
        else:
            inv_id = uid()
            conn.execute('INSERT INTO invitations VALUES(?,?,?,?,?,?,?)', (inv_id, order_id, slug, public_url, qr_path, 'published', now()))
        conn.execute("UPDATE orders SET status='exported', updated_at=? WHERE id=?", (now(), order_id))
        conn.commit()
        return one(conn.execute('SELECT * FROM invitations WHERE id=?', (inv_id,)).fetchone())


def get_invitation_by_slug(slug):
    with connect() as conn:
        inv = one(conn.execute('SELECT * FROM invitations WHERE slug=?', (slug,)).fetchone())
        if not inv:
            return None
        order = one(conn.execute('SELECT * FROM orders WHERE id=?', (inv['order_id'],)).fetchone())
        imgs = many(conn.execute('SELECT * FROM order_images WHERE order_id=? ORDER BY sort_order', (inv['order_id'],)).fetchall())
        msgs = many(conn.execute('SELECT * FROM messages WHERE invitation_id=? ORDER BY created_at DESC LIMIT 50', (inv['id'],)).fetchall())
        if order:
            settings = load_order_settings(conn, order['id'])
            order['settings'] = settings
            order.update(settings)
        inv['order'] = order
        inv['images'] = imgs
        inv['messages'] = msgs
        return inv


def set_template_master(template_code, order_id):
    with connect() as conn:
        conn.execute('''
            INSERT INTO template_masters(template_code, order_id, updated_at)
            VALUES(?,?,?)
            ON CONFLICT(template_code) DO UPDATE SET order_id=excluded.order_id, updated_at=excluded.updated_at
        ''', (template_code, order_id, now()))
        conn.commit()


def get_template_master_order(template_code):
    with connect() as conn:
        row = one(conn.execute('SELECT order_id FROM template_masters WHERE template_code=?', (template_code,)).fetchone())
        if not row:
            return None
        order = one(conn.execute('SELECT * FROM orders WHERE id=?', (row['order_id'],)).fetchone())
        if not order:
            conn.execute('DELETE FROM template_masters WHERE template_code=?', (template_code,))
            conn.commit()
            return None
        order['images'] = many(conn.execute('SELECT * FROM order_images WHERE order_id=? ORDER BY sort_order', (order['id'],)).fetchall())
        settings = load_order_settings(conn, order['id'])
        order['settings'] = settings
        order.update(settings)
        return order


def add_message(invitation_id, name, message, emoji='💖'):
    emoji = (emoji or '💖').strip()[:8]
    with connect() as conn:
        conn.execute('INSERT INTO messages(id, invitation_id, name, message, emoji, created_at) VALUES(?,?,?,?,?,?)', (uid(), invitation_id, name, message, emoji, now()))
        conn.commit()
