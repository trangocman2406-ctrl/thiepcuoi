import html
from urllib.parse import quote
import models
from routes import auth


def esc(value):
    return html.escape(str(value or ''), quote=True)


def money(value):
    return f"{int(value or 0):,}".replace(',', '.') + 'đ'


def dashboard(handler, message='', error=''):
    admin = auth.require_role(handler, {'admin'})
    if not admin:
        return
    topups = models.list_topup_requests()
    customers = models.list_customers()
    pending_count = sum(1 for item in topups if item.get('status') == 'pending')
    total_balance = sum(int(user.get('balance') or 0) for user in customers)

    topup_rows = []
    for item in topups:
        proof = f"<a href='{esc(item.get('proof_path'))}' target='_blank'>Mở biên lai</a>" if item.get('proof_path') else 'Không có'
        if item.get('status') == 'pending':
            actions = (
                f"<form class='admin-review-form' method='post' action='/admin/topups/{esc(item['id'])}/review'>"
                "<input name='admin_note' placeholder='Ghi chú duyệt'>"
                "<button class='ny-btn ny-small' name='action' value='approve'>Duyệt & cộng tiền</button>"
                "<button class='ny-btn ny-small ny-danger' name='action' value='reject'>Từ chối</button>"
                "</form>"
            )
        else:
            label = 'Đã duyệt' if item.get('status') == 'approved' else 'Đã từ chối'
            actions = f"<span class='status-badge status-{esc(item.get('status'))}'>{label}</span>"
        topup_rows.append(
            '<tr>'
            f"<td>{esc(item.get('created_at'))}</td>"
            f"<td><b>{esc(item.get('full_name') or item.get('username'))}</b><br><small>{esc(item.get('phone'))}</small></td>"
            f"<td><b>{money(item.get('amount'))}</b></td><td>{esc(item.get('sender_name')) or '—'}</td>"
            f"<td>{esc(item.get('transfer_code')) or '—'}</td><td>{proof}</td><td>{actions}</td>"
            '</tr>'
        )

    customer_rows = []
    for user in customers:
        customer_rows.append(
            '<tr>'
            f"<td><b>{esc(user.get('full_name') or user.get('username'))}</b><br><small>@{esc(user.get('username'))}</small></td>"
            f"<td>{esc(user.get('phone'))}<br><small>{esc(user.get('email'))}</small></td>"
            f"<td class='address-cell'>{esc(user.get('address'))}</td><td><b>{money(user.get('balance'))}</b></td>"
            f"<td>{esc(user.get('order_count'))}</td><td>{esc(user.get('pending_topups'))}</td>"
            f"<td><form class='balance-form' method='post' action='/admin/users/{esc(user['id'])}/balance'>"
            "<input type='number' name='amount' step='1000' placeholder='+ hoặc - số tiền' required>"
            "<input name='note' placeholder='Lý do điều chỉnh'>"
            "<button class='ny-btn ny-small'>Cập nhật</button></form></td>"
            '</tr>'
        )

    return handler.render('admin_dashboard.html', {
        'admin_name': esc(admin.get('full_name') or admin.get('username')),
        'pending_count': str(pending_count),
        'customer_count': str(len(customers)),
        'total_balance': money(total_balance),
        'topup_rows': ''.join(topup_rows) or '<tr><td colspan="7">Chưa có yêu cầu nạp tiền.</td></tr>',
        'customer_rows': ''.join(customer_rows) or '<tr><td colspan="7">Chưa có tài khoản khách.</td></tr>',
        'message': esc(message),
        'error': esc(error),
    })


def review_topup(handler, request_id, data):
    admin = auth.require_role(handler, {'admin'})
    if not admin:
        return
    try:
        models.review_topup(request_id, admin['id'], data.get('action'), data.get('admin_note'))
        message = 'Đã xử lý yêu cầu nạp tiền và cập nhật số dư khách.'
        return handler.redirect('/admin?message=' + quote(message))
    except ValueError as exc:
        return handler.redirect('/admin?error=' + quote(str(exc)))


def adjust_balance(handler, user_id, data):
    admin = auth.require_role(handler, {'admin'})
    if not admin:
        return
    try:
        models.admin_adjust_balance(user_id, data.get('amount'), admin['id'], data.get('note'))
        return handler.redirect('/admin?message=' + quote('Đã cập nhật số dư tài khoản.'))
    except ValueError as exc:
        return handler.redirect('/admin?error=' + quote(str(exc)))
