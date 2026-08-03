import io, mimetypes, re, uuid
from pathlib import Path
from config import UPLOAD_DIR, IMAGE_EXTENSIONS, AUDIO_EXTENSIONS, MAX_UPLOAD_BYTES

try:
    from PIL import Image
except ImportError:
    Image = None

# Ảnh khách/thiết kế viên tải lên (thường thẳng từ camera điện thoại) có thể
# tới vài chục megapixel, chục MB/file — trang thiệp hiển thị cả chục ảnh
# cùng lúc (gallery, ảnh bìa...), trình duyệt phải giải mã hết TẤT CẢ cùng
# lúc dù khung hiển thị chỉ vài trăm px, tốn tới vài trăm MB RAM và từng làm
# crash cả tab. Resize/nén ngay lúc upload để tránh việc này tận gốc.
MAX_IMAGE_DIMENSION = 1920
RESIZABLE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.webp'}


def _optimize_image(data, ext):
    if Image is None:
        return data
    try:
        img = Image.open(io.BytesIO(data))
        img.load()
        width, height = img.size
        if max(width, height) > MAX_IMAGE_DIMENSION:
            scale = MAX_IMAGE_DIMENSION / max(width, height)
            img = img.resize((round(width * scale), round(height * scale)), Image.LANCZOS)
        buf = io.BytesIO()
        if ext in {'.jpg', '.jpeg'}:
            if img.mode not in ('RGB', 'L'):
                img = img.convert('RGB')
            img.save(buf, format='JPEG', quality=85, optimize=True)
        elif ext == '.png':
            img.save(buf, format='PNG', optimize=True)
        else:
            img.save(buf, format=(img.format or 'WEBP'))
        return buf.getvalue()
    except Exception:
        return data


def safe_name(name):
    return re.sub(r'[^a-zA-Z0-9._-]+','_', name or 'file')[:120]


def read_request_body(handler):
    try:
        length = int(handler.headers.get('Content-Length') or 0)
    except ValueError:
        return None
    if length < 0 or length > MAX_UPLOAD_BYTES:
        return None
    return handler.rfile.read(length)

def parse_multipart(body, content_type):
    m=re.search(r'boundary=(?:"([^"]+)"|([^;]+))', content_type or '')
    if not m: return {}, {}
    boundary=('--'+(m.group(1) or m.group(2))).encode()
    fields={}; files=[]
    for part in body.split(boundary):
        if not part or part in (b'--\r\n', b'--', b'\r\n'): continue
        if part.startswith(b'\r\n'): part=part[2:]
        if part.endswith(b'\r\n'): part=part[:-2]
        if part.endswith(b'--'): part=part[:-2]
        if b'\r\n\r\n' not in part: continue
        raw_headers, data = part.split(b'\r\n\r\n',1)
        head=raw_headers.decode('utf-8','ignore')
        name_m=re.search(r'name="([^"]+)"', head)
        if not name_m: continue
        name=name_m.group(1)
        fn_m=re.search(r'filename="([^"]*)"', head)
        if fn_m and fn_m.group(1):
            files.append({'field':name,'filename':fn_m.group(1),'data':data})
        else:
            fields[name]=data.decode('utf-8','ignore')
    return fields, files

def save_order_files(order_code, files):
    folder=UPLOAD_DIR/safe_name(order_code)
    folder.mkdir(parents=True, exist_ok=True)
    images=[]; music=None
    for f in files:
        original=safe_name(f['filename']); ext=Path(original).suffix.lower()
        if ext not in IMAGE_EXTENSIONS and ext not in AUDIO_EXTENSIONS: continue
        filename=f'{uuid.uuid4().hex}{ext}'; dest=folder/filename
        data = f['data']
        if ext in RESIZABLE_EXTENSIONS:
            data = _optimize_image(data, ext)
        dest.write_bytes(data)
        url=f'/storage/uploads/orders/{folder.name}/{filename}'
        if ext in AUDIO_EXTENSIONS and music is None: music=url
        elif ext in IMAGE_EXTENSIONS: images.append(url)
    return images, music
