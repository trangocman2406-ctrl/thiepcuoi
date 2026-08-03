import secrets
from urllib.parse import quote
import models
from config import SECRET_COOKIE_NAME


def redirect_for_user(user):
    role = (user or {}).get('role')
    if role == 'admin':
        return '/admin'
    if role == 'designer':
        return '/designer'
    return '/account'


def login(handler, data):
    username = (data.get('username') or '').strip().lower()
    password = data.get('password') or ''
    next_url = (data.get('next') or '').strip()
    user = models.get_user_by_username(username)
    if not user or not models.verify_password(password, user['salt'], user['password_hash']):
        return handler.render('login.html', {
            'error': 'Sai tài khoản hoặc mật khẩu.',
            'username': username,
            'next': next_url,
        })
    if (user.get('status') or 'active') != 'active':
        return handler.render('login.html', {
            'error': 'Tài khoản đang bị khóa. Vui lòng liên hệ quản trị viên.',
            'username': username,
            'next': next_url,
        })
    token = models.create_auth_session(user['id'])
    target = next_url if next_url.startswith('/') and not next_url.startswith('//') else redirect_for_user(user)
    handler.send_response(302)
    handler.send_header('Location', target)
    handler.send_header(
        'Set-Cookie',
        f'{SECRET_COOKIE_NAME}={token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax'
    )
    handler.send_header('Content-Length', '0')
    handler.end_headers()


def logout(handler):
    token = handler.cookie_value(SECRET_COOKIE_NAME)
    models.delete_auth_session(token)
    handler.send_response(302)
    handler.send_header('Location', '/login')
    handler.send_header('Set-Cookie', f'{SECRET_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax')
    handler.send_header('Content-Length', '0')
    handler.end_headers()


def current_user(handler):
    return models.get_user_by_session(handler.cookie_value(SECRET_COOKIE_NAME))


def require_login(handler):
    user = current_user(handler)
    if not user:
        handler.redirect('/login?next=' + quote(handler.path, safe='/?:=&'))
        return None
    return user


def require_role(handler, roles):
    user = require_login(handler)
    if not user:
        return None
    allowed = set(roles or [])
    if user.get('role') not in allowed:
        handler.send_text(
            '<section class="wrap narrow"><h1>Không có quyền truy cập</h1>'
            '<p>Tài khoản hiện tại không được phép mở khu vực này.</p>'
            '<p><a class="ny-btn" href="/account">Về tài khoản</a></p></section>',
            status=403
        )
        return None
    return user
