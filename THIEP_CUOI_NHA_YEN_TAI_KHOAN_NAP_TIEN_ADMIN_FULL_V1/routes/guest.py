from urllib.parse import parse_qs
from config import TEMPLATE_CATALOG
from routes.uploads import parse_multipart, read_request_body, save_order_files
from routes import auth
import models
import html

def html_escape(value):
    return html.escape(str(value or ''), quote=True)


def valid_template_code(code):
    allowed={t['code'] for t in TEMPLATE_CATALOG}
    return code if code in allowed else 'mau01'

def home(handler):
    return handler.render('home.html', {})

def choose_template(handler):
    cards=[]
    for t in TEMPLATE_CATALOG:
        badge='<span class="template-badge">Mẫu nổi bật</span>' if t.get('locked') else ''
        price_html=f"<div class='tpl-price'>{t['price']:,}".replace(',', '.')+"đ</div>" if t.get('price') else ''
        cards.append(
            f"<article class='tpl-card' data-template-card aria-expanded='false'>"
            f"<div class='tpl-preview' tabindex='0'>"
            f"<iframe class='tpl-preview-frame' data-template-frame src='/preview/{t['code']}?embed=1' title='Xem nhanh {t['name']}' tabindex='-1' aria-hidden='true' loading='lazy'></iframe>"
            f"<span class='tpl-preview-hint'>Giữ chuột kéo để xem mẫu</span>"
            f"</div>"
            f"<div class='tpl-card-copy'>{badge}<h3>{t['name']}</h3>{price_html}"
            f"<div class='tpl-actions'><a class='ny-btn ny-ghost' href='/preview/{t['code']}' target='_blank' rel='noopener'>Xem đầy đủ</a>"
            f"<a class='ny-btn' href='/request?template={t['code']}'>Chọn mẫu</a></div></div></article>"
        )
    return handler.render('choose_template.html', {'cards':'\n'.join(cards)})

def request_form(handler, template_code):
    user = auth.current_user(handler)
    is_customer = bool(user and user.get('role') == 'customer')
    return handler.render('request_form.html', {
        'template_code':valid_template_code(template_code or 'mau01'),
        'zalo_value': html_escape(user.get('phone')) if is_customer else '',
        'address_value': html_escape(user.get('address')) if is_customer else '',
        'account_notice': '<div class="account-linked-note">Đơn này sẽ tự liên kết với tài khoản của bạn.</div>' if is_customer else '<div class="account-linked-note">Đăng nhập trước khi gửi để theo dõi đơn trong tài khoản.</div>',
    })
def submit_request(handler):
    body = read_request_body(handler)
    if body is None:
        return handler.send_text('<h1>File quá lớn</h1><p>Tổng dữ liệu tải lên vượt giới hạn cho phép.</p>', status=413)
    content_type=handler.headers.get('Content-Type') or ''
    if 'multipart/form-data' in content_type:
        fields, files=parse_multipart(body, content_type)
    else:
        fields={k:v[0] for k,v in parse_qs(body.decode('utf-8','ignore')).items()}
        files=[]
    required=['order_code','zalo','bride_name','groom_name','template_code']
    if any(not (fields.get(k) or '').strip() for k in required):
        return handler.render('request_form.html', {'template_code':fields.get('template_code','mau01'), 'error':'Thiếu thông tin bắt buộc'})
    fields['template_code']=valid_template_code(fields.get('template_code') or 'mau01')
    if models.order_code_exists(fields['order_code']):
        return handler.render('request_form.html', {'template_code':fields['template_code'], 'error':'Mã đơn hàng này đã tồn tại. Vui lòng kiểm tra lại mã đơn.'})
    images, music=save_order_files(fields['order_code'], files)
    try:
        order_id=models.create_order(fields, images, music, source='guest')
        current = auth.current_user(handler)
        if current and current.get('role') == 'customer':
            models.attach_order_to_user(order_id, current['id'])
    except ValueError as exc:
        return handler.render('request_form.html', {'template_code':fields['template_code'], 'error':str(exc)})
    return handler.render('thanks.html', {'order_id':order_id, 'order_code':fields['order_code']})
