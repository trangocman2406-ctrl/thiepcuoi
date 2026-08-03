import html
import uuid
from pathlib import Path
from urllib.parse import quote
import models
from config import (
    TOPUP_UPLOAD_DIR, IMAGE_EXTENSIONS, PAYMENT_BANK_NAME, PAYMENT_ACCOUNT_NUMBER,
    PAYMENT_ACCOUNT_HOLDER, PAYMENT_BRANCH, SECRET_COOKIE_NAME
)
from routes import auth
from routes.uploads import read_request_body, parse_multipart, safe_name


def esc(value):
    return html.escape(str(value or ''), quote=True)


def money(value):
    try:
        return f"{int(value or 0):,}".replace(',', '.') + 'đ'
    except (TypeError, ValueError):
        return '0đ'


def status_badge(status):
    labels = {'pending': 'Chờ duyệt', 'approved': 'Đã cộng tiền', 'rejected': 'Từ chối'}
    key = status if status in labels else 'pending'
    return f"<span class='status-badge status-{key}'>{labels[key]}</span>"


def login_page(handler, next_url=''):
    user = auth.current_user(handler)
    if user:
        return handler.redirect(auth.redirect_for_user(user))
    return handler.render('login.html', {'next': esc(next_url or '')})


def register_page(handler):
    if auth.current_user(handler):
        return handler.redirect('/account')
    return handler.render('register.html', {})


def register_submit(handler, data):
    try:
        user_id = models.create_customer(data)
    except ValueError as exc:
        ctx = {k: esc(data.get(k, '')) for k in ('username', 'full_name', 'phone', 'email', 'address')}
        ctx['error'] = esc(exc)
        return handler.render('register.html', ctx)
    token = models.create_auth_session(user_id)
    handler.send_response(302)
    handler.send_header('Location', '/account')
    handler.send_header('Set-Cookie', f'{SECRET_COOKIE_NAME}={token}; Path=/; Max-Age=2592000; HttpOnly; SameSite=Lax')
    handler.send_header('Content-Length', '0')
    handler.end_headers()


def dashboard(handler):
    user = auth.require_login(handler)
    if not user:
        return
    if user.get('role') == 'admin':
        return handler.redirect('/admin')
    if user.get('role') == 'designer':
        return handler.redirect('/designer')
    topups = models.list_topups_for_user(user['id'])
    transactions = models.list_wallet_transactions(user['id'])
    orders = models.list_orders_for_user(user['id'])

    topup_rows = []
    for item in topups:
        proof = f"<a href='{esc(item.get('proof_path'))}' target='_blank'>Xem biên lai</a>" if item.get('proof_path') else '—'
        topup_rows.append(
            '<tr>'
            f"<td>{esc(item.get('created_at'))}</td><td><b>{money(item.get('amount'))}</b></td>"
            f"<td>{esc(item.get('sender_name')) or '—'}</td><td>{esc(item.get('transfer_code')) or '—'}</td>"
            f"<td>{proof}</td><td>{status_badge(item.get('status'))}</td>"
            f"<td>{esc(item.get('admin_note')) or '—'}</td>"
            '</tr>'
        )

    transaction_rows = []
    for item in transactions:
        amount = int(item.get('amount') or 0)
        sign = '+' if amount >= 0 else ''
        transaction_rows.append(
            '<tr>'
            f"<td>{esc(item.get('created_at'))}</td>"
            f"<td class='wallet-amount {'positive' if amount >= 0 else 'negative'}'>{sign}{money(amount)}</td>"
            f"<td>{esc(item.get('transaction_type'))}</td><td>{esc(item.get('note'))}</td>"
            '</tr>'
        )

    order_rows = []
    for item in orders:
        link = f"<a class='ny-btn ny-small ny-ghost' target='_blank' href='/i/{esc(item['slug'])}'>Xem thiệp</a>" if item.get('slug') else '<span class="muted">Chưa xuất link</span>'
        order_rows.append(
            '<tr>'
            f"<td>{esc(item.get('order_code'))}</td><td>{esc(item.get('bride_name'))} &amp; {esc(item.get('groom_name'))}</td>"
            f"<td>{esc(item.get('template_code'))}</td><td>{esc(item.get('status'))}</td><td>{link}</td>"
            '</tr>'
        )

    return handler.render('account_dashboard.html', {
        'full_name': esc(user.get('full_name') or user.get('username')),
        'username': esc(user.get('username')),
        'phone': esc(user.get('phone')),
        'email': esc(user.get('email')) or 'Chưa cập nhật',
        'address': esc(user.get('address')),
        'balance': money(user.get('balance')),
        'topup_rows': ''.join(topup_rows) or '<tr><td colspan="7">Chưa có yêu cầu nạp tiền.</td></tr>',
        'transaction_rows': ''.join(transaction_rows) or '<tr><td colspan="4">Chưa có giao dịch ví.</td></tr>',
        'order_rows': ''.join(order_rows) or '<tr><td colspan="5">Chưa có đơn được liên kết với tài khoản này.</td></tr>',
    })


def profile_page(handler, message='', error=''):
    user = auth.require_role(handler, {'customer'})
    if not user:
        return
    return handler.render('account_profile.html', {
        'full_name': esc(user.get('full_name')),
        'phone': esc(user.get('phone')),
        'email': esc(user.get('email')),
        'address': esc(user.get('address')),
        'message': esc(message),
        'error': esc(error),
    })


def profile_update(handler, data):
    user = auth.require_role(handler, {'customer'})
    if not user:
        return
    try:
        models.update_user_profile(user['id'], data)
    except ValueError as exc:
        return profile_page(handler, error=str(exc))
    return profile_page(handler, message='Đã cập nhật thông tin tài khoản.')


def password_update(handler, data):
    user = auth.require_role(handler, {'customer'})
    if not user:
        return
    if (data.get('new_password') or '') != (data.get('confirm_password') or ''):
        return profile_page(handler, error='Mật khẩu xác nhận không khớp.')
    try:
        models.change_password(user['id'], data.get('old_password'), data.get('new_password'))
    except ValueError as exc:
        return profile_page(handler, error=str(exc))
    return auth.logout(handler)


def topup_page(handler, message='', error=''):
    user = auth.require_role(handler, {'customer'})
    if not user:
        return
    transfer_content = f"NAP {user.get('username')}"
    return handler.render('account_topup.html', {
        'balance': money(user.get('balance')),
        'bank_name': esc(PAYMENT_BANK_NAME),
        'account_number': esc(PAYMENT_ACCOUNT_NUMBER),
        'account_holder': esc(PAYMENT_ACCOUNT_HOLDER),
        'branch': esc(PAYMENT_BRANCH),
        'transfer_content': esc(transfer_content),
        'message': esc(message),
        'error': esc(error),
    })


def _save_proof(files, user_id):
    TOPUP_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    for item in files:
        if item.get('field') != 'proof' or not item.get('filename'):
            continue
        ext = Path(safe_name(item['filename'])).suffix.lower()
        if ext not in IMAGE_EXTENSIONS:
            continue
        folder = TOPUP_UPLOAD_DIR / safe_name(user_id)
        folder.mkdir(parents=True, exist_ok=True)
        filename = f'{uuid.uuid4().hex}{ext}'
        (folder / filename).write_bytes(item.get('data') or b'')
        return f'/storage/uploads/topups/{folder.name}/{filename}'
    return ''


def topup_submit(handler):
    user = auth.require_role(handler, {'customer'})
    if not user:
        return
    body = read_request_body(handler)
    if body is None:
        return topup_page(handler, error='Dữ liệu tải lên quá lớn.')
    fields, files = parse_multipart(body, handler.headers.get('Content-Type') or '')
    proof_path = _save_proof(files, user['id'])
    try:
        models.create_topup_request(
            user['id'], fields.get('amount'), fields.get('sender_name'), fields.get('transfer_code'),
            fields.get('note'), proof_path
        )
    except ValueError as exc:
        return topup_page(handler, error=str(exc))
    return topup_page(handler, message='Đã gửi yêu cầu nạp tiền. Admin sẽ kiểm tra và cộng số dư sau khi duyệt.')
