from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path
import mimetypes, html, re, json, sys, os, threading, time
import models
from config import PORT, BASE_DIR, STATIC_DIR, STORAGE_DIR, TEMPLATE_DIR, MAX_UPLOAD_BYTES
from routes import guest, designer, auth, invitations, accounts, admin

# Console Windows mặc định dùng codepage cũ (cp1252/850...) không gõ được
# tiếng Việt có dấu — chữ "Mở web"/log request in ra sẽ làm cả server crash
# ngay lúc khởi động (UnicodeEncodeError) trước khi kịp mở cổng lắng nghe.
# Ép stdout/stderr sang UTF-8 để không bao giờ crash vì lý do này nữa.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, 'reconfigure'):
        _stream.reconfigure(encoding='utf-8', errors='replace')

class Handler(BaseHTTPRequestHandler):
    # Mặc định BaseHTTPRequestHandler dùng HTTP/1.0: mỗi request (mỗi file
    # CSS/JS/font/ảnh...) phải mở một kết nối TCP MỚI rồi đóng ngay sau khi
    # xong, thay vì dùng lại một kết nối cho nhiều request liên tiếp. Trên
    # Windows, phần mềm diệt virus/tường lửa hay soi từng kết nối TCP mới mở
    # nên việc mở hàng chục kết nối liên tục (một trang thiệp có cả chục file
    # ảnh/font/CSS/JS) có thể cộng dồn thành cả giây trễ — đúng kiểu "font
    # hiện sai rồi mới đổi đúng sau ~1 giây" dù server tự nó phản hồi trong
    # vài mili-giây. Bật HTTP/1.1 để trình duyệt dùng lại một kết nối cho cả
    # loạt request, giảm hẳn số lần phải mở kết nối mới.
    protocol_version = 'HTTP/1.1'
    def log_message(self, fmt, *args): print('[NHA-YEN]', fmt % args)
    def cookie_value(self, name):
        raw=self.headers.get('Cookie') or ''
        for part in raw.split(';'):
            if '=' in part:
                k,v=part.strip().split('=',1)
                if k==name: return v
        return None
    def redirect(self, url):
        self.send_response(302); self.send_header('Location',url); self.send_header('Content-Length','0'); self.end_headers()
    def send_text(self, text, mime='text/html; charset=utf-8', status=200):
        body=text.encode('utf-8')
        self.send_response(status); self.send_header('Content-Type',mime); self.send_header('Content-Length',str(len(body)))
        self.send_header('Cache-Control','no-cache, max-age=0, must-revalidate')
        self.end_headers(); self.wfile.write(body)
    def render(self, name, ctx):
        path=BASE_DIR/'templates'/name
        text=path.read_text(encoding='utf-8')
        base=BASE_DIR/'templates'/'base.html'
        page=text
        for k,v in (ctx or {}).items(): page=page.replace('{{'+k+'}}', str(v))
        page=re.sub(r'{{[a-zA-Z0-9_]+}}','',page)
        if name!='base.html' and base.exists():
            user = auth.current_user(self)
            if user:
                display_name = html.escape(str(user.get('full_name') or user.get('username') or 'Tài khoản'))
                role = user.get('role') or 'customer'
                if role == 'admin':
                    primary_url, primary_label = '/admin', 'Quản trị'
                    extra_link = '<a href="/designer">Thiết kế</a>'
                elif role == 'designer':
                    primary_url, primary_label = '/designer', 'Khu thiết kế'
                    extra_link = ''
                else:
                    primary_url, primary_label = '/account', 'Tài khoản'
                    extra_link = ''
                balance = ''
                if role == 'customer':
                    balance = f"<strong>{int(user.get('balance') or 0):,}đ</strong>".replace(',', '.')
                account_dock = (
                    '<details class="account-dock"><summary aria-label="Mở tài khoản">👤</summary>'
                    '<div class="account-dock-panel">'
                    f'<b>{display_name}</b><span class="dock-role">{html.escape(role)}</span>{balance}'
                    f'<a href="{primary_url}">{primary_label}</a>{extra_link}'
                    '<form method="post" action="/logout"><button>Đăng xuất</button></form>'
                    '</div></details>'
                )
                nav_links = f'<a href="/choose-template">Chọn mẫu</a><a href="{primary_url}">{primary_label}</a>'
            else:
                account_dock = (
                    '<details class="account-dock"><summary aria-label="Đăng nhập tài khoản">👤</summary>'
                    '<div class="account-dock-panel"><b>Tài khoản</b>'
                    '<a href="/login">Đăng nhập</a><a href="/register">Đăng ký khách hàng</a></div></details>'
                )
                nav_links = '<a href="/choose-template">Chọn mẫu</a><a href="/login">Đăng nhập</a>'
            shell=base.read_text(encoding='utf-8').replace('{{content}}', page)
            shell=shell.replace('{{title}}', str(ctx.get('title','Thiệp cưới Nhà Yến')) if ctx else 'Thiệp cưới Nhà Yến')
            shell=shell.replace('{{accountDock}}', account_dock).replace('{{navLinks}}', nav_links)
            return self.send_text(shell)
        return self.send_text(page)

    def send_json(self, data, status=200):
        body=json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(body)))
        self.end_headers()
        self.wfile.write(body)
    def json_data(self):
        ln=int(self.headers.get('Content-Length') or 0)
        if ln > MAX_UPLOAD_BYTES: return {}
        raw=self.rfile.read(ln).decode('utf-8','ignore')
        try:
            data=json.loads(raw or '{}')
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}
    def not_found(self, msg='Không tìm thấy'):
        return self.send_text(f'<h1>404</h1><p>{html.escape(msg)}</p>', status=404)
    def serve_file(self, path, allowed_root):
        path = Path(path).resolve()
        root = Path(allowed_root).resolve()
        try:
            path.relative_to(root)
        except ValueError:
            return self.not_found()
        if not path.exists() or not path.is_file(): return self.not_found()
        stat = path.stat()
        # ETag theo giờ sửa + kích thước file: cho phép trình duyệt (và các tab
        # khác cùng mở) chỉ hỏi lại "còn mới không" (304, gần như không tốn
        # gì) thay vì phải tải lại nguyên file mỗi lần — quan trọng với các
        # file font vì nhiều tab cùng mở sẽ cùng xin các file này liên tục.
        etag = f'"{int(stat.st_mtime)}-{stat.st_size}"'
        cache_control = 'no-cache, max-age=0, must-revalidate' if path.suffix.lower() in {'.css', '.js', '.html'} else 'public, max-age=3600'
        if self.headers.get('If-None-Match') == etag:
            self.send_response(304)
            self.send_header('ETag', etag)
            self.send_header('Cache-Control', cache_control)
            self.end_headers()
            return
        mime=mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
        data=path.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(data)))
        self.send_header('ETag', etag)
        self.send_header('Cache-Control', cache_control)
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.end_headers()
        self.wfile.write(data)
    def post_data(self):
        ln=int(self.headers.get('Content-Length') or 0)
        if ln > MAX_UPLOAD_BYTES: return {}
        raw=self.rfile.read(ln).decode('utf-8','ignore')
        return {k:v[0] for k,v in parse_qs(raw).items()}
    def do_GET(self):
        p=urlparse(self.path); path=p.path; qs=parse_qs(p.query)
        if path in ['/', '/home']: return guest.home(self)
        if path == '/choose-template': return guest.choose_template(self)
        if path == '/request': return guest.request_form(self, (qs.get('template') or ['mau01'])[0])
        if path == '/login': return accounts.login_page(self, (qs.get('next') or [''])[0])
        if path == '/register': return accounts.register_page(self)
        if path == '/account': return accounts.dashboard(self)
        if path == '/account/profile': return accounts.profile_page(self)
        if path == '/account/topup': return accounts.topup_page(self)
        if path == '/admin': return admin.dashboard(self, (qs.get('message') or [''])[0], (qs.get('error') or [''])[0])
        if path == '/designer/login': return designer.login_page(self)
        if path == '/designer': return designer.dashboard(self)
        if path == '/designer/new': return designer.new_order_page(self)
        m=re.match(r'^/designer/orders/([^/]+)/preview$', path)
        if m: return designer.order_preview(self, m.group(1))
        m=re.match(r'^/designer/orders/([^/]+)$', path)
        if m: return designer.detail(self, m.group(1))
        m=re.match(r'^/i/([^/]+)$', path)
        if m: return invitations.public_view(self, m.group(1))
        m=re.match(r'^/qr/([^/]+)$', path)
        if m: return invitations.qr_view(self, m.group(1))
        m=re.match(r'^/preview/(mau\d+)$', path)
        if m: return invitations.preview(self, m.group(1))
        if path.startswith('/static/'): return self.serve_file(STATIC_DIR/path[len('/static/'):], STATIC_DIR)
        if path.startswith('/storage/'): return self.serve_file(STORAGE_DIR/path[len('/storage/'):], STORAGE_DIR)
        if path.startswith('/templates/'): return self.serve_file(TEMPLATE_DIR/path[len('/templates/'):], TEMPLATE_DIR)
        return self.not_found()
    def do_POST(self):
        path=urlparse(self.path).path
        if path == '/request': return guest.submit_request(self)
        if path == '/login': return auth.login(self, self.post_data())
        if path == '/register': return accounts.register_submit(self, self.post_data())
        if path == '/logout': return auth.logout(self)
        if path == '/account/profile': return accounts.profile_update(self, self.post_data())
        if path == '/account/password': return accounts.password_update(self, self.post_data())
        if path == '/account/topup': return accounts.topup_submit(self)
        if path == '/designer/login': return auth.login(self, self.post_data())
        m=re.match(r'^/admin/topups/([^/]+)/review$', path)
        if m: return admin.review_topup(self, m.group(1), self.post_data())
        m=re.match(r'^/admin/users/([^/]+)/balance$', path)
        if m: return admin.adjust_balance(self, m.group(1), self.post_data())
        if path == '/designer/logout': return auth.logout(self)
        if path == '/designer/new': return designer.create_order_from_designer(self)
        m=re.match(r'^/designer/orders/([^/]+)/update$', path)
        if m: return designer.update(self, m.group(1))
        m=re.match(r'^/designer/orders/([^/]+)/autosave$', path)
        if m: return designer.autosave(self, m.group(1))
        m=re.match(r'^/designer/orders/([^/]+)/auto-upload-files$', path)
        if m: return designer.auto_upload_files(self, m.group(1))
        m=re.match(r'^/designer/orders/([^/]+)/auto-upload-photo-slot$', path)
        if m: return designer.auto_upload_photo_slot(self, m.group(1))
        m=re.match(r'^/designer/orders/([^/]+)/export$', path)
        if m: return designer.export(self, m.group(1))
        m=re.match(r'^/designer/orders/([^/]+)/set-as-master$', path)
        if m: return designer.set_master_template(self, m.group(1))
        m=re.match(r'^/designer/orders/([^/]+)/delete$', path)
        if m: return designer.delete(self, m.group(1))
        m=re.match(r'^/api/public/([^/]+)/messages$', path)
        if m: return invitations.add_message_api(self, m.group(1), self.json_data())
        m=re.match(r'^/i/([^/]+)/messages$', path)
        if m: return invitations.add_message(self, m.group(1), self.post_data())
        return self.not_found()

# Server này không có sẵn cơ chế auto-reload như Flask debug mode — sửa xong
# 1 file .py (routes/*.py, models.py, config.py, app.py) mà không có vòng
# theo dõi này thì phải tự tắt/mở lại `python app.py` mới thấy code mới, vì
# Python chỉ import module 1 lần lúc tiến trình khởi động. Chạy 1 thread nền
# dò giờ-sửa-đổi (mtime) của mọi file .py trong dự án mỗi giây; phát hiện file
# nào mới hơn lúc khởi động thì tự os.execv nạp lại toàn bộ tiến trình (giữ
# nguyên PID, đọc lại code mới) — không cần người dùng chạy lại lệnh nữa.
#
# Gốc rễ của lần "phải chạy lại từ đầu": bản trước tạo ThreadingHTTPServer
# ngay trong .serve_forever() (không giữ biến), nên thread dò file không có
# cách nào đóng cổng 8000 lại trước khi os.execv nạp code mới — tiến trình
# mới mở lên tranh giành đúng cổng cũ (chưa kịp giải phóng), bị Windows chặn
# "port đang bận" (WinError 10048) và tự thoát ngay, ngỡ như "auto-reload làm
# sập cả server", phải tự bật `python app.py` lại từ đầu. Sửa bằng cách: (1)
# giữ lại đối tượng server để thread dò file tự đóng socket đó trước khi exec,
# (2) thử mở lại cổng vài lần (có nghỉ ngắn) ở tiến trình mới phòng khi
# Windows chưa giải phóng cổng kịp ngay tức thì.
def _watch_and_reload(httpd, interval=1.0):
    watch_dirs = [BASE_DIR, BASE_DIR / 'routes']

    def snapshot():
        mtimes = {}
        for folder in watch_dirs:
            for path in folder.glob('*.py'):
                try:
                    mtimes[str(path)] = path.stat().st_mtime
                except OSError:
                    pass
        return mtimes

    baseline = snapshot()
    while True:
        time.sleep(interval)
        current = snapshot()
        if current != baseline:
            print('[NHA-YEN] Phát hiện code vừa đổi, tự nạp lại server...')
            try:
                httpd.socket.close()
            except OSError:
                pass
            os.execv(sys.executable, [sys.executable] + sys.argv)

def _bind_server(retries=10, delay=0.5):
    for attempt in range(retries):
        try:
            return ThreadingHTTPServer(('0.0.0.0', PORT), Handler)
        except OSError:
            if attempt == retries - 1:
                raise
            time.sleep(delay)

if __name__ == '__main__':
    models.init_db()
    httpd = _bind_server()
    threading.Thread(target=_watch_and_reload, args=(httpd,), daemon=True).start()
    print(f'Mở web: http://127.0.0.1:{PORT}')
    print('Designer: http://127.0.0.1:%s/designer  | user designer / designer123' % PORT)
    print('Tự nạp lại code khi có file .py thay đổi — không cần chạy lại lệnh.')
    httpd.serve_forever()
