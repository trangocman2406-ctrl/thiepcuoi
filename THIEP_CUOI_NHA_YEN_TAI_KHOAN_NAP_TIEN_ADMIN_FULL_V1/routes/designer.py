import html, json, re, shutil
from urllib.parse import parse_qs
import models
from config import TEMPLATE_CATALOG, UPLOAD_DIR
from routes import auth
from routes import templates as tpl
from routes.uploads import parse_multipart, read_request_body, save_order_files, safe_name


STATUS_OPTIONS = [
    ('new', 'Mới'),
    ('editing', 'Đang chỉnh'),
    ('exported', 'Đã xuất link'),
    ('done', 'Đã xong'),
]


def esc(value):
    return html.escape(str(value or ''), quote=True)


def login_page(handler):
    return handler.redirect('/login')


def dashboard(handler):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    orders = models.list_orders()

    # Mẫu chính hiện tại của mỗi mã mẫu — tra 1 lần cho mỗi mã mẫu xuất hiện
    # trong danh sách thay vì tra lại cho từng đơn.
    master_id_by_code = {}
    for code in {o['template_code'] for o in orders}:
        master = models.get_template_master_order(code)
        master_id_by_code[code] = master['id'] if master else None

    pending_requests = [
        o for o in orders
        if (o.get('source') or 'designer') == 'guest' and o.get('status') == 'new'
    ]

    rows = []
    for o in orders:
        is_master = master_id_by_code.get(o['template_code']) == o['id']
        role_badge = (
            "<span class='template-role is-master'>Mẫu chính</span>"
            if is_master else "<span class='template-role is-copy'>Mẫu phụ</span>"
        )
        master_action = (
            "<button type='button' class='template-master-btn is-active' disabled>Đang là mẫu chính</button>"
            if is_master else
            f"<button type='button' class='template-master-btn' "
            f"data-set-master-url='/designer/orders/{esc(o['id'])}/set-as-master' "
            f"title='Dùng thiết kế này làm nguồn để deep clone các đơn {esc(o['template_code'])} mới'>Đặt làm mẫu chính</button>"
        )
        delete_form = (
            f"<form method='post' action='/designer/orders/{esc(o['id'])}/delete' "
            f"onsubmit=\"return confirm('Xoá đơn {esc(o['order_code'])}? Không thể hoàn tác.');\">"
            f"<button type='submit' class='ny-btn ny-small ny-danger'>Xoá</button></form>"
        )
        link = f"<a class='ny-btn ny-small' href='/designer/orders/{esc(o['id'])}'>Mở chi tiết / chỉnh sửa</a>"
        rows.append(
            '<tr>'
            f"<td>{esc(o['order_code'])}</td>"
            f"<td>{esc(o['bride_name'])} & {esc(o['groom_name'])}</td>"
            f"<td>{esc(o['zalo'])}</td>"
            f"<td><div class='template-cell'><b>{esc(o['template_code'])}</b>{role_badge}</div></td>"
            f"<td>{esc(o['status'])}</td>"
            f"<td>{esc(o['image_count'])}</td>"
            f"<td><div class='row-actions'>{link}{master_action}{delete_form}</div></td>"
            '</tr>'
        )

    if pending_requests:
        items = '\n'.join(
            f"<a class='notif-item' href='/designer/orders/{esc(o['id'])}'>"
            f"<b>{esc(o['bride_name'])} & {esc(o['groom_name'])}</b>"
            f"<span>{esc(o['order_code'])} · mẫu {esc(o['template_code'])}</span>"
            f"</a>"
            for o in pending_requests
        )
        badge = f"<span class='notif-badge'>{len(pending_requests)}</span>"
    else:
        items = "<p class='notif-empty'>Chưa có yêu cầu mới từ khách.</p>"
        badge = ''
    bell_html = (
        "<div class='notif-bell-wrap'>"
        f"<button type='button' class='notif-bell' id='notifBellBtn' aria-label='Thông báo yêu cầu mới'>🔔{badge}</button>"
        f"<div class='notif-dropdown' id='notifDropdown' hidden>{items}</div>"
        "</div>"
    )

    return handler.render('designer_dashboard.html', {
        'rows': '\n'.join(rows) or '<tr><td colspan="7"><b>Chưa có đơn.</b> Hãy bấm nút <b>Tạo đơn mới</b> phía trên, tạo xong mới có trang chỉnh sửa.</td></tr>',
        'bellHtml': bell_html,
        'login_name': esc(user.get('full_name') or user.get('username')),
        'admin_link': '<a class="ny-btn ny-ghost" href="/admin">Quản trị</a>' if user.get('role') == 'admin' else '',
    })


def delete(handler, order_id):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    order = models.get_order(order_id)
    if not order:
        return handler.not_found('Không tìm thấy đơn')
    models.delete_order(order_id)
    folder = UPLOAD_DIR / safe_name(order.get('order_code'))
    if folder.exists():
        shutil.rmtree(folder, ignore_errors=True)
    handler.redirect('/designer')


def template_options(selected):
    out = []
    for t in TEMPLATE_CATALOG:
        sel = ' selected' if t['code'] == selected else ''
        out.append(f"<option value='{esc(t['code'])}'{sel}>{esc(t['code'])} - {esc(t['name'])}</option>")
    return ''.join(out)


def status_options(selected):
    out = []
    for value, label in STATUS_OPTIONS:
        sel = ' selected' if value == selected else ''
        out.append(f"<option value='{esc(value)}'{sel}>{esc(label)}</option>")
    return ''.join(out)


def image_html(order):
    images = order.get('images') or []
    if not images:
        return '<p>Chưa có ảnh khách gửi.</p>'
    cards = []
    for i, item in enumerate(images, start=1):
        src = esc(item.get('file_path'))
        try:
            slot = int(item.get('sort_order') or (i - 1))
        except (TypeError, ValueError):
            slot = i - 1
        photo_key = f'photo{slot}'
        cards.append(
            f'<figure class="photo-card" data-select-photo="{photo_key}">'
            f"<img class='thumb' src='{src}' alt='Ảnh {photo_key}'>"
            f"<figcaption><b>{photo_key}</b> · Khung ảnh {slot + 1}<br><code>{src}</code></figcaption>"
            '</figure>'
        )
    return ''.join(cards)


def public_html(order):
    inv = order.get('invitation')
    if not inv:
        return '<p>Chưa xuất link.</p>'

    # Dùng đường dẫn tương đối để link luôn bám đúng domain đang mở, kể cả
    # database từng được tạo ở localhost rồi mới đưa lên Render.
    slug = esc(inv.get('slug'))
    public_url = f'/i/{slug}' if slug else esc(inv.get('public_url'))
    qr_path = f'/qr/{slug}' if slug else esc(inv.get('qr_path'))
    return (
        f"<p><b>Link demo:</b> <a href='{public_url}' target='_blank'>{public_url}</a></p>"
        f"<p><a class='ny-btn ny-ghost' href='{qr_path}' target='_blank'>Mở QR</a> "
        f"<a class='ny-btn ny-ghost' href='{public_url}' target='_blank'>Xem thiệp</a></p>"
    )


def music_html(order):
    music = order.get('music_path') or ''
    if not music:
        return '<p>Chưa có nhạc.</p>'
    src = esc(music)
    return f"<p><a href='{src}' target='_blank'>Mở file nhạc</a></p><audio controls src='{src}'></audio>"


def photo_hidden_inputs(order, keys=None):
    parts = []
    for key in (keys or ['photo0']):
        names = [f'{key}_x', f'{key}_y', f'{key}_zoom', f'{key}_fit', f'{key}_unit']
        active = any(name in order for name in names)
        disabled = '' if active else ' disabled'
        base = key.split('__', 1)[0]
        values = {
            names[0]: order.get(names[0]) or '0',
            names[1]: order.get(names[1]) or '0',
            names[2]: order.get(names[2]) or '1',
            names[3]: order.get(names[3]) or order.get('image_fit') or 'contain',
            names[4]: order.get(names[4]) or 'pct',
        }
        for name in names:
            parts.append(
                f"<input type='hidden' name='{name}' value='{esc(values[name])}' "
                f"data-photo-setting='{name}' data-photo-key='{key}' data-photo-base='{base}'{disabled}>"
            )
    return ''.join(parts)


def pos_field_labels_json():
    """Tên hiển thị (tiếng Việt) cho từng field khi cụm nút dính trên đầu
    chọn qua việc bấm/bôi đen chữ trong khung xem thiệp — không còn liệt kê
    label trong sidebar nữa (quá dài), nên JS cần map field -> tên hiển thị
    riêng để hiện đúng chữ trên cụm nút."""
    labels = {field: label for field, label in tpl.DECORATIVE_FIELDS.items()}
    for field, label in tpl.EDITABLE_KEYS.values():
        labels.setdefault(field, label)
    return json.dumps(labels, ensure_ascii=False)




COMMON_COPY_FIELDS = [
    ('letter_open_text', 'Chữ nút mở thư'),
    ('groom_side_label', 'Nhãn nhà trai'),
    ('bride_side_label', 'Nhãn nhà gái'),
    ('groom_role_label', 'Nhãn chú rể'),
    ('bride_role_label', 'Nhãn cô dâu'),
    ('event_time_prefix', 'Câu dẫn trước giờ tổ chức'),
    ('month_label', 'Nhãn tháng'),
    ('year_label', 'Nhãn năm'),
    ('calendar_time_label', 'Nhãn giờ lễ trong lịch'),
    ('countdown_days_label', 'Đếm ngược: ngày'),
    ('countdown_hours_label', 'Đếm ngược: giờ'),
    ('countdown_minutes_label', 'Đếm ngược: phút'),
    ('countdown_seconds_label', 'Đếm ngược: giây'),
    ('map_section_title', 'Tiêu đề khu bản đồ'),
    ('map_error_title', 'Dòng lỗi bản đồ'),
    ('map_error_text', 'Dòng hướng dẫn khi bản đồ chưa tải'),
    ('story_kicker', 'Nhãn nhỏ chuyện tình'),
    ('story_title', 'Tiêu đề chuyện tình'),
    ('story_1_date', 'Mốc chuyện tình 1'),
    ('story_1_title', 'Tiêu đề chuyện tình 1'),
    ('story_2_date', 'Mốc chuyện tình 2'),
    ('story_2_title', 'Tiêu đề chuyện tình 2'),
    ('story_3_date', 'Mốc chuyện tình 3'),
    ('story_3_title', 'Tiêu đề chuyện tình 3'),
    ('story_4_date', 'Mốc chuyện tình 4'),
    ('story_4_title', 'Tiêu đề chuyện tình 4'),
    ('rsvp_lead_text', 'Câu dẫn xác nhận tham dự'),
    ('rsvp_overline', 'Dòng nhỏ xác nhận tham dự'),
    ('rsvp_title', 'Tiêu đề xác nhận tham dự'),
    ('rsvp_name_label', 'Nhãn họ và tên'),
    ('rsvp_attendance_label', 'Câu hỏi tham dự'),
    ('rsvp_yes_text', 'Lựa chọn có tham dự'),
    ('rsvp_no_text', 'Lựa chọn không tham dự'),
    ('rsvp_count_label', 'Nhãn số người tham dự'),
    ('rsvp_message_label', 'Nhãn lời nhắn'),
    ('rsvp_submit_text', 'Nút gửi xác nhận'),
    ('wish_overline', 'Dòng nhỏ khu lời chúc'),
    ('wish_display_title', 'Tiêu đề khu lời chúc'),
    ('wish_name_label', 'Nhãn tên người gửi'),
    ('wish_message_label', 'Nhãn nội dung lời chúc'),
    ('wish_send_text', 'Nút gửi lời chúc'),
    ('thank_you_title', 'Tiêu đề cảm ơn'),
]

TEMPLATE_COPY_FIELDS = {
    'mau01': [
        'letter_open_text', 'calendar_time_label', 'rsvp_title', 'rsvp_name_label',
        'rsvp_attendance_label', 'rsvp_yes_text', 'rsvp_no_text', 'rsvp_count_label',
        'rsvp_submit_text', 'wish_name_label', 'wish_send_text',
    ],
    'mau02': [
        'letter_open_text', 'groom_side_label', 'bride_side_label', 'groom_role_label',
        'event_time_prefix', 'month_label', 'year_label', 'rsvp_lead_text',
        'rsvp_title', 'rsvp_name_label', 'rsvp_attendance_label', 'rsvp_yes_text',
        'rsvp_no_text', 'rsvp_count_label', 'rsvp_submit_text', 'wish_name_label',
        'wish_send_text',
    ],
    'mau03': [
        'letter_open_text', 'groom_side_label', 'bride_side_label', 'month_label', 'rsvp_overline',
        'rsvp_title', 'rsvp_name_label', 'rsvp_message_label', 'rsvp_submit_text',
        'wish_overline', 'wish_name_label', 'wish_message_label', 'wish_send_text',
        'map_error_title', 'map_error_text',
        ('m03_couple_ranks', 'Vai vế cô dâu chú rể'),
        ('m03_groom_father', 'Tên cha chú rể'),
        ('m03_groom_mother', 'Tên mẹ chú rể'),
        ('m03_bride_father', 'Tên cha cô dâu'),
        ('m03_bride_mother', 'Tên mẹ cô dâu'),
        ('m03_couple_section_title', 'Tiêu đề khối cô dâu chú rể'),
        ('m03_ceremony_host_text', 'Dòng chủ hôn'),
        ('m03_ceremony_lunar_date', 'Ngày âm lễ'),
        ('m03_party_lunar_date', 'Ngày âm tiệc'),
        ('m03_calendar_overline', 'Dòng nhỏ lịch cưới'),
        ('m03_map_note', 'Câu dưới bản đồ'),
        ('m03_gallery_overline', 'Dòng nhỏ album'),
        ('m03_thank_you_note', 'Câu cảm ơn cuối thiệp'),
    ],
    'mau04': [
        'letter_open_text', 'groom_side_label', 'bride_side_label', 'story_kicker',
        'story_title', 'story_1_date', 'story_1_title', 'story_2_date', 'story_2_title',
        'story_3_date', 'story_3_title', 'story_4_date', 'story_4_title',
        'countdown_days_label', 'countdown_hours_label', 'countdown_minutes_label',
        'countdown_seconds_label', 'map_section_title', 'map_error_title', 'map_error_text',
        'wish_send_text',
        ('m04_brand_side_text', 'Chữ dọc thương hiệu'),
        ('m04_hero_invite_text', 'Dòng thư mời đầu thiệp'),
        ('m04_hero_ceremony_prefix', 'Dòng lễ thành hôn đầu thiệp'),
        ('m04_main_invite_title', 'Tiêu đề thiệp mời'),
    ],
    'mau05': [
        'letter_open_text', 'groom_role_label', 'bride_role_label', 'story_kicker',
        'story_1_date', 'story_1_title', 'story_2_date', 'story_2_title',
        'story_3_date', 'story_3_title', 'story_4_date', 'story_4_title',
        'month_label', 'year_label', 'countdown_days_label', 'countdown_hours_label',
        'countdown_minutes_label', 'countdown_seconds_label', 'wish_overline',
        'wish_display_title', 'wish_send_text', 'map_section_title', 'map_error_title',
        'map_error_text', 'thank_you_title',
    ],
}


def template_copy_fields_html(order):
    code = order.get('template_code') or 'mau01'
    label_map = dict(COMMON_COPY_FIELDS)
    fields = TEMPLATE_COPY_FIELDS.get(code, [])
    parts = [
        '<p class="tiny-note muted">Các câu dưới đây từng bị viết cứng trong file mẫu. '
        'Giờ có thể bấm trực tiếp trong khung xem hoặc sửa tại đây và hệ thống sẽ tự lưu.</p>'
    ]
    for item in fields:
        if isinstance(item, tuple):
            key, label = item
        else:
            key, label = item, label_map.get(item, item)
        value = order.get(key)
        if value in [None, '']:
            value = models.DESIGN_DEFAULTS.get(key, '')
        rows = 2 if len(str(value)) > 55 or '\n' in str(value) else 1
        cls = ' class="ny-inline-field"' if rows == 1 else ''
        parts.append(
            f'<label data-field="{esc(key)}">{esc(label)}'
            f'<textarea{cls} rows="{rows}" name="{esc(key)}">{esc(value)}</textarea></label>'
        )
    return ''.join(parts)

def text_pos_hidden_inputs(order):
    fields = sorted({field for field, _ in tpl.EDITABLE_KEYS.values()} | set(tpl.DECORATIVE_FIELDS))
    parts = []
    for field in fields:
        parts.append(
            f"<input type='hidden' name='{field}_align' value='{esc(order.get(f'{field}_align') or '')}' "
            f"data-pos-field='{field}'>"
        )
        parts.append(
            f"<input type='hidden' name='{field}_nudge_x' value='{esc(order.get(f'{field}_nudge_x') or '0')}' "
            f"data-pos-field='{field}'>"
        )
        parts.append(
            f"<input type='hidden' name='{field}_nudge_y' value='{esc(order.get(f'{field}_nudge_y') or '0')}' "
            f"data-pos-field='{field}'>"
        )
        parts.append(
            f"<input type='hidden' name='{field}_size' value='{esc(order.get(f'{field}_size') or '')}' "
            f"data-pos-field='{field}'>"
        )
        parts.append(
            f"<input type='hidden' name='{field}_font' value='{esc(order.get(f'{field}_font') or '')}' "
            f"data-pos-field='{field}'>"
        )
        parts.append(
            f"<input type='hidden' name='{field}_color' value='{esc(order.get(f'{field}_color') or '')}' "
            f"data-pos-field='{field}'>"
        )
    return ''.join(parts)



def val(order, key, default=''):
    return esc(order.get(key) if order.get(key) not in [None, ''] else default)


def option(value, label, selected):
    sel = ' selected' if str(value) == str(selected) else ''
    return f"<option value='{esc(value)}'{sel}>{esc(label)}</option>"


def image_fit_options(selected):
    return ''.join(option(v, label, selected or 'contain') for v, label in [('cover','Cover - lấp đầy khung'),('contain','Contain - không cắt ảnh')])


FONT_CHOICES = [
    ('', 'Theo font mặc định của mẫu'),
    ('Allura', 'Allura'),
    ('Cormorant Garamond', 'Cormorant Garamond'),
    ('Great Vibes', 'Great Vibes'),
    ('Imperial Script', 'Imperial Script'),
    ('Italiana', 'Italiana'),
    ('Montserrat', 'Montserrat'),
    ('Playfair Display', 'Playfair Display'),
    ('Georgia', 'Georgia'),
    ('Times New Roman', 'Times New Roman'),
    ('Arial', 'Arial'),
    ('Trebuchet MS', 'Trebuchet MS'),
    ('Verdana', 'Verdana'),
    ('Tahoma', 'Tahoma'),
]
def font_options(selected):
    return ''.join(option(v, label, selected or '') for v, label in FONT_CHOICES)




def new_order_page(handler):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    return handler.render('designer_new.html', {
        'template_options': template_options('mau01'),
        'error': ''
    })


def create_order_from_designer(handler):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    body = read_request_body(handler)
    if body is None:
        return handler.send_text('<h1>File quá lớn</h1><p>Tổng dữ liệu tải lên vượt giới hạn cho phép.</p>', status=413)
    content_type = handler.headers.get('Content-Type') or ''
    if 'multipart/form-data' in content_type:
        fields, files = parse_multipart(body, content_type)
    else:
        fields = {k: v[0] for k, v in parse_qs(body.decode('utf-8', 'ignore')).items()}
        files = []
    required = ['order_code', 'zalo', 'bride_name', 'groom_name', 'template_code']
    if any(not (fields.get(k) or '').strip() for k in required):
        return handler.render('designer_new.html', {
            'template_options': template_options(fields.get('template_code') or 'mau01'),
            'error': '<p class="error">Thiếu thông tin bắt buộc.</p>'
        })
    allowed = {t['code'] for t in TEMPLATE_CATALOG}
    if fields.get('template_code') not in allowed:
        fields['template_code'] = 'mau01'
    if models.order_code_exists(fields.get('order_code')):
        return handler.render('designer_new.html', {
            'template_options': template_options(fields.get('template_code') or 'mau01'),
            'error': '<p class="error">Mã đơn này đã tồn tại. Đổi mã khác rồi tạo lại.</p>'
        })
    images, music = save_order_files(fields.get('order_code'), files)
    try:
        order_id = models.create_order(fields, images, music)
    except ValueError as exc:
        return handler.render('designer_new.html', {
            'template_options': template_options(fields.get('template_code') or 'mau01'),
            'error': f'<p class="error">{esc(exc)}</p>'
        })
    handler.redirect(f'/designer/orders/{order_id}')


def detail(handler, order_id):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    order = models.get_order(order_id)
    if not order:
        return handler.not_found('Không tìm thấy đơn')

    master = models.get_template_master_order(order.get('template_code') or 'mau01')
    is_master = bool(master and master.get('id') == order_id)
    source_master = models.get_order(order.get('template_source_order_id')) if order.get('template_source_order_id') else None
    role_text = 'Mẫu chính' if is_master else 'Mẫu phụ độc lập'
    source_text = source_master.get('order_code') if source_master else ('Đã tạo độc lập' if not order.get('template_source_order_id') else 'Mẫu chính nguồn đã bị xóa')

    summary = (
        f"<p><b>Mã đơn:</b> {esc(order.get('order_code'))}</p>"
        f"<p><b>Zalo:</b> {esc(order.get('zalo'))}</p>"
        f"<p><b>Cặp đôi:</b> {esc(order.get('groom_name'))} & {esc(order.get('bride_name'))}</p>"
        f"<p><b>Ngày cưới:</b> {esc(order.get('wedding_date'))}</p>"
        f"<p><b>Giờ lễ:</b> {esc(order.get('wedding_time'))}</p>"
        f"<p><b>Giờ tiệc:</b> {esc(order.get('party_time'))}</p>"
        f"<p><b>Mẫu:</b> {esc(order.get('template_code'))}</p>"
        f"<p><b>Vai trò:</b> {esc(role_text)}</p>"
        f"<p><b>Nguồn clone:</b> {esc(source_text)}</p>"
        f"<p><b>Trạng thái:</b> {esc(order.get('status'))}</p>"
        f"<p><b>Địa chỉ:</b> {esc(order.get('address'))}</p>"
        f"<p><b>Map:</b> <a href='{esc(order.get('map_url'))}' target='_blank'>{esc(order.get('map_url'))}</a></p>"
        f"<p><b>Ghi chú:</b> {esc(order.get('note'))}</p>"
    )

    ctx = {
        'id': esc(order_id),
        'template_code': esc(order.get('template_code') or 'mau01'),
        'template_role': esc(role_text),
        'template_role_class': 'is-master' if is_master else 'is-copy',
        'master_button_text': 'Đang là mẫu chính' if is_master else 'Đặt làm mẫu chính',
        'master_button_disabled': ' disabled' if is_master else '',
        'export_button_text': 'Tạo mẫu phụ + Xuất link + QR' if is_master else 'Xuất link + QR',
        'order_code': esc(order.get('order_code')),
        'zalo': esc(order.get('zalo')),
        'bride_name': esc(order.get('bride_name')),
        'groom_name': esc(order.get('groom_name')),
        'wedding_date': esc(order.get('wedding_date')),
        'wedding_time': esc(order.get('wedding_time')),
        'party_time': esc(order.get('party_time')),
        'address': esc(order.get('address')),
        'map_url': esc(order.get('map_url')),
        'intro': esc(order.get('intro')),
        'ceremony_title': esc(order.get('ceremony_title') or 'Lễ thành hôn'),
        'party_title': esc(order.get('party_title') or 'Tiệc mừng'),
        'groom_parents': esc(order.get('groom_parents')),
        'bride_parents': esc(order.get('bride_parents')),
        'groom_address': esc(order.get('groom_address')),
        'bride_address': esc(order.get('bride_address')),
        'note': esc(order.get('note')),
        'cover_title': val(order, 'cover_title', 'Wedding Invitation'),
        'cover_subtitle': val(order, 'cover_subtitle', 'Trân trọng kính mời'),
        'invite_label': val(order, 'invite_label', 'Trân trọng kính mời'),
        'invitation_title': val(order, 'invitation_title', 'Thiệp mời dự lễ cưới'),
        'quote_text': val(order, 'quote_text', 'Mỗi khoảnh khắc yêu thương đều là một kỷ niệm dịu dàng.'),
        'love_quote_title': val(order, 'love_quote_title', 'I Love You'),
        'love_quote_text': val(order, 'love_quote_text', 'Ngọn gió xuân dịu dàng với em hơn,\nxưa tan muộn phiền,\nđể mọi thứ chỉ còn lại dịu dàng.'),
        'family_title': val(order, 'family_title', 'Hai bên gia đình'),
        'event_title': val(order, 'event_title', 'Thông tin buổi lễ'),
        'gallery_title': val(order, 'gallery_title', 'Khoảnh khắc yêu thương'),
        'wishes_title': val(order, 'wishes_title', 'Lời chúc'),
        'map_button_text': val(order, 'map_button_text', 'Xem đường đi'),
        'ceremony_address': val(order, 'ceremony_address', order.get('address') or ''),
        'party_address': val(order, 'party_address', order.get('address') or ''),
        'name_size': val(order, 'name_size', '46'),
        'heading_size': val(order, 'heading_size', '34'),
        'body_size': val(order, 'body_size', '16'),
        'name_font_options': font_options(order.get('name_font') or ''),
        'heading_font_options': font_options(order.get('heading_font') or ''),
        'body_font_options': font_options(order.get('body_font') or ''),
        'text_color': val(order, 'text_color', '#2b211b'),
        'accent_color': val(order, 'accent_color', '#b77916'),
        'background_color': val(order, 'background_color', '#fffaf5'),
        'calendar_note': val(order, 'calendar_note', ''),
        'image_fit_options': image_fit_options(order.get('image_fit') or 'contain'),
        'private_preview_url': f'/designer/orders/{esc(order_id)}/preview',
        'template_options': template_options(order.get('template_code') or 'mau01'),
        'status_options': status_options(order.get('status') or 'new'),
        'summary': summary,
        'images': image_html(order),
        'music': music_html(order),
        'photo_hidden_inputs': photo_hidden_inputs(order, tpl.photo_occurrence_keys(order.get('template_code') or 'mau01')),
        'text_pos_hidden_inputs': text_pos_hidden_inputs(order),
        'field_labels_json': pos_field_labels_json(),
        'template_copy_fields': template_copy_fields_html(order),
        'public': (
            '<p><b>Đây là Mẫu chính.</b> Link cũ của mẫu chính không được dùng để giao khách. '
            'Bấm <b>Tạo mẫu phụ + Xuất link + QR</b>; hệ thống sẽ mở đúng bản Mẫu phụ mới.</p>'
            if is_master else public_html(order)
        ),
        'saved_msg': (
            '<p class="success">Đã tạo Mẫu phụ độc lập từ Mẫu chính và xuất link + QR. Mẫu chính không bị thay đổi.</p>'
            if 'exported_copy=1' in handler.path else
            '<p class="success">Đã lưu chỉnh sửa.</p>' if 'saved=1' in handler.path else ''
        ),
    }
    # Field nào trong EDITABLE_KEYS chưa được set thủ công ở trên (VD các câu
    # chữ trang trí mẫu 01) tự lấy giá trị từ order/DESIGN_DEFAULTS — thêm
    # field mới chỉ cần khai báo ở tpl.EDITABLE_KEYS + models.DESIGN_DEFAULTS,
    # không cần sửa danh sách này nữa.
    for _camel_key, (field, _label) in tpl.EDITABLE_KEYS.items():
        if field not in ctx:
            ctx[field] = val(order, field, models.DESIGN_DEFAULTS.get(field, ''))
    return handler.render('designer_detail.html', ctx)


def update(handler, order_id):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    order = models.get_order(order_id)
    if not order:
        return handler.not_found('Không tìm thấy đơn')

    body = read_request_body(handler)
    if body is None:
        return handler.send_json({'ok': False, 'error': 'File tải lên vượt giới hạn cho phép'}, status=413)
    content_type = handler.headers.get('Content-Type') or ''
    if 'multipart/form-data' in content_type:
        fields, files = parse_multipart(body, content_type)
    else:
        fields = {k: v[0] for k, v in parse_qs(body.decode('utf-8', 'ignore')).items()}
        files = []

    required = ['order_code', 'zalo', 'bride_name', 'groom_name', 'template_code']
    if any(not (fields.get(k) or '').strip() for k in required):
        return handler.send_text('<h1>Lỗi</h1><p>Thiếu thông tin bắt buộc. Bấm Back để kiểm tra lại.</p>', status=400)

    allowed = {t['code'] for t in TEMPLATE_CATALOG}
    if fields.get('template_code') not in allowed:
        fields['template_code'] = order.get('template_code') or 'mau01'
    images, music = save_order_files(fields.get('order_code') or order.get('order_code'), files)
    try:
        models.update_order(order_id, fields, images, music)
    except ValueError as exc:
        return handler.send_text(f'<h1>Lỗi</h1><p>{esc(exc)}</p><p><a href="/designer/orders/{esc(order_id)}">Quay lại</a></p>', status=400)
    handler.redirect(f'/designer/orders/{order_id}?saved=1')



def autosave(handler, order_id):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    order = models.get_order(order_id)
    if not order:
        return handler.send_json({'ok': False, 'error': 'Không tìm thấy đơn'}, status=404)
    raw = read_request_body(handler)
    if raw is None:
        return handler.send_json({'ok': False, 'error': 'Dữ liệu vượt giới hạn cho phép'}, status=413)
    content_type = handler.headers.get('Content-Type') or ''
    if 'application/json' in content_type:
        try:
            fields = json.loads(raw.decode('utf-8', 'ignore') or '{}')
        except json.JSONDecodeError:
            fields = {}
    else:
        fields = {k: v[0] for k, v in parse_qs(raw.decode('utf-8', 'ignore')).items()}
    for key in ['order_code', 'zalo', 'bride_name', 'groom_name', 'template_code']:
        if not (fields.get(key) or '').strip():
            fields[key] = order.get(key) or ('mau01' if key == 'template_code' else '')
    allowed = {t['code'] for t in TEMPLATE_CATALOG}
    if fields.get('template_code') not in allowed:
        fields['template_code'] = order.get('template_code') or 'mau01'
    try:
        models.update_order(order_id, fields, [], None)
    except ValueError as exc:
        return handler.send_json({'ok': False, 'error': str(exc)}, status=400)
    return handler.send_json({'ok': True, 'message': 'Đã tự lưu'})


def auto_upload_files(handler, order_id):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    order = models.get_order(order_id)
    if not order:
        return handler.send_json({'ok': False, 'error': 'Không tìm thấy đơn'}, status=404)
    body = read_request_body(handler)
    if body is None:
        return handler.send_json({'ok': False, 'error': 'File tải lên vượt giới hạn cho phép'}, status=413)
    content_type = handler.headers.get('Content-Type') or ''
    if 'multipart/form-data' not in content_type:
        return handler.send_json({'ok': False, 'error': 'Không có file upload'}, status=400)
    fields, files = parse_multipart(body, content_type)
    images, music = save_order_files(order.get('order_code'), files)
    if not images and not music:
        return handler.send_json({'ok': False, 'error': 'File không hợp lệ hoặc chưa chọn file'}, status=400)
    updated = models.append_order_files(order_id, images, music)
    return handler.send_json({
        'ok': True,
        'images_added': len(images),
        'music_added': bool(music),
        'image_count': len(updated.get('images') or []) if updated else 0,
        'message': 'Đã tải ảnh/nhạc và cập nhật preview'
    })



def auto_upload_photo_slot(handler, order_id):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    order = models.get_order(order_id)
    if not order:
        return handler.send_json({'ok': False, 'error': 'Không tìm thấy đơn'}, status=404)
    body = read_request_body(handler)
    if body is None:
        return handler.send_json({'ok': False, 'error': 'File tải lên vượt giới hạn cho phép'}, status=413)
    content_type = handler.headers.get('Content-Type') or ''
    if 'multipart/form-data' not in content_type:
        return handler.send_json({'ok': False, 'error': 'Không có file upload'}, status=400)
    fields, files = parse_multipart(body, content_type)
    photo_key = (fields.get('photo') or fields.get('slot') or 'photo0').strip()
    m = re.match(r'^photo(\d+)$', photo_key)
    if not m:
        return handler.send_json({'ok': False, 'error': 'Khung ảnh không hợp lệ'}, status=400)
    slot_index = int(m.group(1))
    template_code = order.get('template_code') or 'mau01'
    if slot_index >= tpl.photo_slot_count(template_code):
        return handler.send_json({'ok': False, 'error': 'Khung ảnh không tồn tại trong mẫu hiện tại'}, status=400)
    image_files = []
    for f in files:
        name = (f.get('filename') or '').lower()
        if name.endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
            image_files.append(f)
            break
    if not image_files:
        return handler.send_json({'ok': False, 'error': 'Vui lòng chọn một file ảnh'}, status=400)
    images, _music = save_order_files(order.get('order_code'), image_files)
    if not images:
        return handler.send_json({'ok': False, 'error': 'File ảnh không hợp lệ'}, status=400)
    updated = models.replace_order_image_slot(order_id, slot_index, images[0])
    return handler.send_json({
        'ok': True,
        'photo': f'photo{slot_index}',
        'file_path': images[0],
        'image_count': len(updated.get('images') or []) if updated else 0,
        'message': 'Đã thay ảnh đúng khung'
    })

def order_preview(handler, order_id):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    order = models.get_order(order_id)
    if not order:
        return handler.not_found('Không tìm thấy đơn')
    inv = {'order': order, 'images': order.get('images') or [], 'messages': []}
    # Link này được dùng ở 2 chỗ khác nhau: (1) nhúng làm khung xem trực tiếp
    # lúc đang CHỈNH SỬA (iframe #designerLivePreview, cần designer_mode=True
    # để bật kéo-thả ảnh + gõ chữ tại chỗ), và (2) nút "Mở tab"/"Mở preview
    # riêng" chỉ để XEM THỬ y hệt khách thật sẽ thấy. Nếu dùng designer_mode=
    # True cho cả 2, hiệu ứng cuộn/mở thư sẽ bị tắt hết ở TAB XEM THỬ (quy
    # tắc animation:none chỉ dành cho khung đang chỉnh sửa) — nên chỉ khung
    # nhúng (có ?embed=1 trong URL) mới bật designer_mode, còn tab xem thử mở
    # riêng thì không.
    is_embedded_editor = 'embed=1' in handler.path
    ctx = tpl.context_from_invitation(inv, designer_mode=is_embedded_editor)
    body = tpl.render_fragment(order.get('template_code') or 'mau01', ctx, designer_mode=is_embedded_editor)
    return handler.render('invitation_view.html', {'title': 'Preview đơn', 'body': body, 'slug': 'preview', 'messages': '', 'wishes_title': ctx.get('wishesTitle','Gửi lời chúc'), 'advisorCss':'', 'advisorScript':''})

def set_master_template(handler, order_id):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    order = models.get_order(order_id)
    if not order:
        return handler.send_json({'ok': False, 'error': 'Không tìm thấy đơn'}, status=404)
    code = order.get('template_code') or 'mau01'
    models.set_template_master(code, order_id)
    return handler.send_json({'ok': True, 'message': f'Đã đặt đơn này làm mẫu chính cho {code}. Các đơn mới sẽ được deep clone độc lập.'})


def export(handler, order_id):
    user = auth.require_role(handler, {'designer','admin'})
    if not user:
        return
    order = models.get_order(order_id)
    if not order:
        return handler.not_found('Không tìm thấy đơn')

    # Mẫu chính chỉ làm nguồn. Bấm Xuất sẽ tạo một Mẫu phụ độc lập rồi
    # xuất link/QR cho Mẫu phụ; mẫu chính không có dữ liệu nào bị ghi đè.
    master = models.get_template_master_order(order.get('template_code') or 'mau01')
    export_order_id = order_id
    created_copy = False
    if master and master.get('id') == order_id:
        export_order_id = models.clone_order_as_independent_copy(order_id)
        if not export_order_id:
            return handler.not_found('Không tạo được mẫu phụ từ mẫu chính')
        created_copy = True

    host = (handler.headers.get('X-Forwarded-Host') or handler.headers.get('Host') or '127.0.0.1:8000').split(',')[0].strip()
    proto = (handler.headers.get('X-Forwarded-Proto') or 'http').split(',')[0].strip()
    inv = models.export_invitation(export_order_id, f'{proto}://{host}')
    if not inv:
        return handler.not_found('Không tìm thấy đơn')
    suffix = '?exported_copy=1' if created_copy else ''
    handler.redirect(f'/designer/orders/{export_order_id}{suffix}')
