import html, json, re
import models
from config import TEMPLATE_CATALOG
from routes import templates as tpl

def public_view(handler, slug):
    inv=models.get_invitation_by_slug(slug)
    if not inv: return handler.not_found('Không tìm thấy thiệp')
    code=inv['order'].get('template_code') or 'mau01'
    ctx=tpl.context_from_invitation(inv)
    body=tpl.render_fragment(code, ctx)
    return handler.render('invitation_view.html', {'title':'Thiệp cưới','body':body,'slug':slug,'messages':ctx['messagesHtml'], 'wishes_title': ctx.get('wishesTitle','Gửi lời chúc'), 'advisorCss':'', 'advisorScript':''})

def add_message(handler, slug, data):
    inv=models.get_invitation_by_slug(slug)
    if not inv: return handler.not_found('Không tìm thấy thiệp')
    name=(data.get('name') or '').strip()[:80]
    message=(data.get('message') or '').strip()[:800]
    emoji=(data.get('emoji') or '💖').strip()[:8]
    if message: models.add_message(inv['id'], name, message, emoji)
    handler.redirect(f'/i/{slug}#loi-chuc')

def add_message_api(handler, slug, data):
    inv=models.get_invitation_by_slug(slug)
    if not inv:
        return handler.send_json({'ok':False,'error':'Không tìm thấy thiệp'}, status=404)
    name=(data.get('guest_name') or data.get('name') or '').strip()[:80]
    message=(data.get('message') or '').strip()[:800]
    emoji=(data.get('emoji') or '💖').strip()[:8]
    if not message:
        return handler.send_json({'ok':False,'error':'Bạn chưa nhập lời chúc'}, status=400)
    models.add_message(inv['id'], name, message, emoji)
    return handler.send_json({'ok':True,'name':name,'message':message,'emoji':emoji})

def qr_view(handler, slug):
    inv=models.get_invitation_by_slug(slug)
    if not inv: return handler.not_found('Không tìm thấy QR')

    # Luôn tạo URL từ host hiện tại. Không dùng public_url cũ trong SQLite vì
    # dữ liệu có thể đã được xuất lúc chạy localhost rồi mới deploy lên Render.
    proto=(handler.headers.get('X-Forwarded-Proto') or 'http').split(',')[0].strip().lower()
    proto = proto if proto in {'http', 'https'} else 'https'
    host=(handler.headers.get('X-Forwarded-Host') or handler.headers.get('Host') or '127.0.0.1:8000').split(',')[0].strip()
    host = re.sub(r'[^A-Za-z0-9.\-:\[\]]', '', host) or '127.0.0.1:8000'
    url=f'{proto}://{host}/i/{slug}'
    return handler.render('qr.html', {'slug':slug, 'url':html.escape(url), 'url_json':json.dumps(url, ensure_ascii=False)})

def preview(handler, code):
    if code not in {item['code'] for item in TEMPLATE_CATALOG}:
        return handler.not_found('Mẫu này không còn trong hệ thống')
    master_order = models.get_template_master_order(code)
    if master_order:
        inv = {'order': master_order, 'images': master_order.get('images') or [], 'messages': []}
    else:
        # Đơn giả cho mẫu chưa ai đặt làm "master" — phải cộng thêm
        # DESIGN_DEFAULTS như models.get_order() vẫn làm cho đơn thật, nếu
        # không các câu chữ trang trí (lời cảm ơn, tiêu đề mục...) sẽ trống
        # trơn, để lại khoảng trống vô lý ở cuối thiệp xem thử.
        stub_order = dict(models.DESIGN_DEFAULTS)
        stub_order.update({
            'template_code': code,
            'bride_name': 'Tên cô dâu',
            'groom_name': 'Tên chú rể',
            'wedding_date': '2026-12-12',
            'address': 'Địa chỉ tiệc cưới',
            'map_url': '#',
            'music_path': '',
        })
        inv = {'order': stub_order, 'images': [], 'messages': []}
    ctx=tpl.context_from_invitation(inv)
    body=tpl.render_fragment(code, ctx)
    return handler.render('invitation_view.html', {'title':'Xem thử mẫu','body':body,'slug':'preview','messages':'', 'wishes_title': ctx.get('wishesTitle','Gửi lời chúc'), 'advisorCss':'<link rel="stylesheet" href="/static/css/wedding-advisor.css?v=6">', 'advisorScript':'<script src="/static/js/wedding-advisor.js?v=6" defer></script>'})
