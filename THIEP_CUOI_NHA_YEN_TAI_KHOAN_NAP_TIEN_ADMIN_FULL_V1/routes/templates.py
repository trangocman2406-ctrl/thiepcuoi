import calendar
import html
import json
import re
from datetime import datetime

from config import TEMPLATE_CATALOG, TEMPLATE_DIR

MAX_PHOTO_SLOTS = 80
RAW_KEYS = {'messagesHtml', 'calendarDaysHtml', 'mapBtn', 'effectHtml', 'commentsStreamHtml', 'designCss'}
EDITABLE_KEYS = {
    'brideName': ('bride_name', 'Tên cô dâu'),
    'groomName': ('groom_name', 'Tên chú rể'),
    'weddingTime': ('wedding_time', 'Giờ lễ'),
    'partyTime': ('party_time', 'Giờ tiệc'),
    'address': ('address', 'Địa chỉ chung'),
    'ceremonyAddress': ('ceremony_address', 'Địa chỉ lễ'),
    'partyAddress': ('party_address', 'Địa chỉ tiệc'),
    'coverTitle': ('cover_title', 'Tiêu đề bìa'),
    'coverSubtitle': ('cover_subtitle', 'Dòng phụ bìa'),
    'inviteLabel': ('invite_label', 'Dòng kính mời'),
    'invitationTitle': ('invitation_title', 'Tiêu đề lời mời'),
    'quoteText': ('quote_text', 'Câu quote / câu thơ'),
    'familyTitle': ('family_title', 'Tiêu đề gia đình'),
    'eventTitle': ('event_title', 'Tiêu đề buổi lễ'),
    'galleryTitle': ('gallery_title', 'Tiêu đề gallery'),
    'wishesTitle': ('wishes_title', 'Tiêu đề lời chúc'),
    'calendarNote': ('calendar_note', 'Ghi chú lịch'),
    'intro': ('intro', 'Lời giới thiệu'),
    'groomParents': ('groom_parents', 'Nhà trai / phụ huynh chú rể'),
    'brideParents': ('bride_parents', 'Nhà gái / phụ huynh cô dâu'),
    'groomAddress': ('groom_address', 'Địa chỉ nhà trai'),
    'brideAddress': ('bride_address', 'Địa chỉ nhà gái'),
    'groomFamilyAddress': ('groom_address', 'Địa chỉ nhà trai'),
    'brideFamilyAddress': ('bride_address', 'Địa chỉ nhà gái'),
    'ceremonyTitle': ('ceremony_title', 'Tên lễ chính'),
    'partyTitle': ('party_title', 'Tên tiệc'),
    'mapButtonText': ('map_button_text', 'Chữ nút bản đồ'),
    'loveQuoteTitle': ('love_quote_title', 'Tiêu đề mục "I Love You"'),
    'loveQuoteText': ('love_quote_text', 'Câu thơ mục "I Love You"'),
    # Mẫu 01: câu chữ trang trí trước đây viết cứng, không đơn nào chỉnh
    # được (xem models.DESIGN_DEFAULTS để biết giá trị gốc từng câu).
    'tinyNavLeft': ('tiny_nav_left', 'Chữ nhỏ góc trái đầu thiệp'),
    'tinyNavCenter': ('tiny_nav_center', 'Chữ nhỏ giữa đầu thiệp'),
    'tinyNavRight': ('tiny_nav_right', 'Chữ nhỏ góc phải đầu thiệp'),
    'openText': ('open_text', 'Chữ nhắc mở thiệp (dưới phong bì)'),
    'ceremonyLocationLabel': ('ceremony_location_label', 'Nhãn "ĐƯỢC TỔ CHỨC TẠI"'),
    'bottomWord1': ('bottom_word_1', 'Chữ trang trí 1 (Fall in)'),
    'bottomWord2': ('bottom_word_2', 'Chữ trang trí 2 (Love)'),
    'bottomWord3': ('bottom_word_3', 'Chữ trang trí 3 (Wedding)'),
    'cinemaStoryTitle': ('cinema_story_title', 'Tiêu đề mục ảnh phim (YOU ARE MY END...)'),
    'cinemaStoryBottom': ('cinema_story_bottom', 'Chữ cuối mục ảnh phim (LOVE AND FREEDOM...)'),
    'collageVerticalWord': ('collage_vertical_word', 'Chữ dọc cạnh ảnh (My Love Forever)'),
    'borderQuote': ('border_quote', 'Câu thơ trước mục "I Love You"'),
    'filmCaption1': ('film_caption_1', 'Chú thích phim 1'),
    'filmCaption2': ('film_caption_2', 'Chú thích phim 2'),
    'filmCaption3': ('film_caption_3', 'Chú thích phim 3'),
    'filmCaption4': ('film_caption_4', 'Chú thích phim 4'),
    'saveTitle': ('save_title', 'Tiêu đề "Save The Date"'),
    'smallStory': ('small_story', 'Câu thơ nhỏ (Đi một vòng lớn...)'),
    'memoryNote': ('memory_note', 'Chú thích khung ảnh kỷ niệm'),
    'closingNote': ('closing_note', 'Câu chữ trước lịch cưới (Hạnh phúc lớn nhất...)'),
    'marqueeGalleryTitle': ('marquee_gallery_title', 'Tiêu đề chạy chữ album ảnh'),
    'giftIntroText': ('gift_intro_text', 'Câu chữ trước hộp quà'),
    'giftBoxLabel': ('gift_box_label', 'Nhãn "Hộp quà cưới"'),
    'giftBoxHint': ('gift_box_hint', 'Chữ gợi ý bấm hộp quà'),
    'giftOpenTitle': ('gift_open_title', 'Chữ hiện ra khi mở hộp quà'),
    'wishesKicker': ('wishes_kicker', 'Nhãn nhỏ "GỬI LỜI CHÚC"'),
    'thankYouText': ('thank_you_text', 'Chữ "Cảm ơn quý khách"'),
    'thankYouNote': ('thank_you_note', 'Chữ phụ cảm ơn (Thank you for celebrating...)'),
    # Nội dung dùng chung trước đây còn viết cứng trong các file index/intro.
    'letterOpenText': ('letter_open_text', 'Chữ nút mở thư'),
    'calendarTimeLabel': ('calendar_time_label', 'Nhãn giờ lễ trong lịch'),
    'groomSideLabel': ('groom_side_label', 'Nhãn nhà trai'),
    'brideSideLabel': ('bride_side_label', 'Nhãn nhà gái'),
    'groomRoleLabel': ('groom_role_label', 'Nhãn chú rể'),
    'brideRoleLabel': ('bride_role_label', 'Nhãn cô dâu'),
    'eventTimePrefix': ('event_time_prefix', 'Câu dẫn trước giờ tổ chức'),
    'monthLabel': ('month_label', 'Nhãn tháng'),
    'yearLabel': ('year_label', 'Nhãn năm'),
    'countdownDaysLabel': ('countdown_days_label', 'Nhãn đếm ngược ngày'),
    'countdownHoursLabel': ('countdown_hours_label', 'Nhãn đếm ngược giờ'),
    'countdownMinutesLabel': ('countdown_minutes_label', 'Nhãn đếm ngược phút'),
    'countdownSecondsLabel': ('countdown_seconds_label', 'Nhãn đếm ngược giây'),
    'mapSectionTitle': ('map_section_title', 'Tiêu đề khu bản đồ'),
    'mapErrorTitle': ('map_error_title', 'Thông báo lỗi bản đồ'),
    'mapErrorText': ('map_error_text', 'Dòng hướng dẫn khi bản đồ chưa tải'),
    'storyKicker': ('story_kicker', 'Nhãn nhỏ mục chuyện tình'),
    'storyTitle': ('story_title', 'Tiêu đề mục chuyện tình'),
    'story1Date': ('story_1_date', 'Mốc chuyện tình 1'),
    'story1Title': ('story_1_title', 'Tiêu đề chuyện tình 1'),
    'story2Date': ('story_2_date', 'Mốc chuyện tình 2'),
    'story2Title': ('story_2_title', 'Tiêu đề chuyện tình 2'),
    'story3Date': ('story_3_date', 'Mốc chuyện tình 3'),
    'story3Title': ('story_3_title', 'Tiêu đề chuyện tình 3'),
    'story4Date': ('story_4_date', 'Mốc chuyện tình 4'),
    'story4Title': ('story_4_title', 'Tiêu đề chuyện tình 4'),
    'rsvpLeadText': ('rsvp_lead_text', 'Câu dẫn xác nhận tham dự'),
    'rsvpOverline': ('rsvp_overline', 'Dòng nhỏ xác nhận tham dự'),
    'rsvpTitle': ('rsvp_title', 'Tiêu đề xác nhận tham dự'),
    'rsvpNameLabel': ('rsvp_name_label', 'Nhãn họ và tên'),
    'rsvpAttendanceLabel': ('rsvp_attendance_label', 'Câu hỏi tham dự'),
    'rsvpYesText': ('rsvp_yes_text', 'Lựa chọn có tham dự'),
    'rsvpNoText': ('rsvp_no_text', 'Lựa chọn không tham dự'),
    'rsvpCountLabel': ('rsvp_count_label', 'Nhãn số người tham dự'),
    'rsvpMessageLabel': ('rsvp_message_label', 'Nhãn lời nhắn xác nhận'),
    'rsvpSubmitText': ('rsvp_submit_text', 'Chữ nút gửi xác nhận'),
    'wishOverline': ('wish_overline', 'Dòng nhỏ khu lời chúc'),
    'wishDisplayTitle': ('wish_display_title', 'Tiêu đề hiển thị khu lời chúc'),
    'wishNameLabel': ('wish_name_label', 'Nhãn tên người gửi lời chúc'),
    'wishMessageLabel': ('wish_message_label', 'Nhãn nội dung lời chúc'),
    'wishSendText': ('wish_send_text', 'Chữ nút gửi lời chúc'),
    'thankYouTitle': ('thank_you_title', 'Tiêu đề cảm ơn'),
    # Nội dung riêng của mẫu 03: trước đây gắn contenteditable giả nhưng không lưu được.
    'm03CoupleRanks': ('m03_couple_ranks', 'Mẫu 03 - Vai vế cô dâu chú rể'),
    'm03GroomFather': ('m03_groom_father', 'Mẫu 03 - Tên cha chú rể'),
    'm03GroomMother': ('m03_groom_mother', 'Mẫu 03 - Tên mẹ chú rể'),
    'm03BrideFather': ('m03_bride_father', 'Mẫu 03 - Tên cha cô dâu'),
    'm03BrideMother': ('m03_bride_mother', 'Mẫu 03 - Tên mẹ cô dâu'),
    'm03CoupleSectionTitle': ('m03_couple_section_title', 'Mẫu 03 - Tiêu đề khối cô dâu chú rể'),
    'm03CeremonyHostText': ('m03_ceremony_host_text', 'Mẫu 03 - Dòng chủ hôn'),
    'm03CeremonyLunarDate': ('m03_ceremony_lunar_date', 'Mẫu 03 - Ngày âm lễ'),
    'm03PartyLunarDate': ('m03_party_lunar_date', 'Mẫu 03 - Ngày âm tiệc'),
    'm03CalendarOverline': ('m03_calendar_overline', 'Mẫu 03 - Dòng nhỏ lịch cưới'),
    'm03MapNote': ('m03_map_note', 'Mẫu 03 - Câu dưới bản đồ'),
    'm03GalleryOverline': ('m03_gallery_overline', 'Mẫu 03 - Dòng nhỏ album'),
    'm03ThankYouNote': ('m03_thank_you_note', 'Mẫu 03 - Câu cảm ơn cuối thiệp'),
    # Nội dung riêng của mẫu 04.
    'm04BrandSideText': ('m04_brand_side_text', 'Mẫu 04 - Chữ dọc thương hiệu'),
    'm04HeroInviteText': ('m04_hero_invite_text', 'Mẫu 04 - Dòng thư mời đầu thiệp'),
    'm04HeroCeremonyPrefix': ('m04_hero_ceremony_prefix', 'Mẫu 04 - Dòng lễ thành hôn đầu thiệp'),
    'm04MainInviteTitle': ('m04_main_invite_title', 'Mẫu 04 - Tiêu đề thiệp mời'),
}
# Các phần tử trang trí không phải nội dung khách nhập (vd. dấu "&" giữa
# tên cô dâu chú rể) — không đưa vào EDITABLE_KEYS vì không có nội dung để
# thay, nhưng vẫn cho canh lề/nhích/cỡ chữ/font riêng như các ô nội dung.
# intro_groom_name/intro_bride_name: tên cô dâu chú rể hiển thị riêng ở bìa
# thư mời (letter-intro) — chữ vẫn đồng bộ theo groom_name/bride_name (qua
# data-edit-field), chỉ thêm data-pos-key riêng để canh lề/cỡ chữ ở bìa thư
# mời không ảnh hưởng tới các chỗ khác đang hiển thị cùng tên đó.
DECORATIVE_FIELDS = {
    'couple_ampersand': 'Dấu "&" giữa tên cô dâu chú rể',
    'intro_groom_name': 'Vị trí tên chú rể ở bìa thư mời (khung mở thư)',
    'intro_bride_name': 'Vị trí tên cô dâu ở bìa thư mời (khung mở thư)',
    'cover_groom_name': 'Vị trí tên chú rể ở màn bìa chính',
    'cover_bride_name': 'Vị trí tên cô dâu ở màn bìa chính',
    'river_groom_name': 'Vị trí tên chú rể ở khung sông nước (con thuyền)',
    'river_bride_name': 'Vị trí tên cô dâu ở khung sông nước (con thuyền)',
    'family_groom_name': 'Vị trí tên chú rể ở khung ảnh gia đình',
    'family_bride_name': 'Vị trí tên cô dâu ở khung ảnh gia đình',
    # Chữ ngày cưới hiển thị ở nhiều chỗ (dateDay/dateMonth/dateYear/
    # dateDayName/weddingTime) đều tự sinh từ "Ngày cưới / lịch", không phải
    # nội dung gõ tay nên không đưa vào EDITABLE_KEYS — vẫn cần data-pos-key
    # riêng từng chỗ để canh font/cỡ/màu độc lập (trước đây các chữ ngày này
    # không có attribute nào để nhắm tới, không chỉnh được).
    'cover_date_text': 'Vị trí ngày ở màn bìa chính',
    'intro_date_text': 'Vị trí ngày ở bìa thư mời (khung mở thư)',
    'family_date_text': 'Vị trí ngày ở mục lời mời (giờ lễ | thứ | ngày)',
    'calendar_date_text': 'Vị trí ngày ở mục Save The Date',
    'm05_family_groom_name': 'Mẫu 05 - Vị trí tên chú rể trong khối gia đình',
    'm05_family_bride_name': 'Mẫu 05 - Vị trí tên cô dâu trong khối gia đình',
    'm05_thanks_groom_name': 'Mẫu 05 - Vị trí tên chú rể ở phần cảm ơn',
    'm05_thanks_bride_name': 'Mẫu 05 - Vị trí tên cô dâu ở phần cảm ơn',
}
WISH_EMOJIS = ['💖', '🎉', '🥰', '✨', '🌸', '💐', '💕', '🕊️']


def get_template(code):
    return next((item for item in TEMPLATE_CATALOG if item['code'] == code), TEMPLATE_CATALOG[0])


def photo_occurrence_keys(code):
    """Return a stable crop key for every image occurrence in a template.

    The same uploaded file may be reused in several places. Each place needs
    its own crop/zoom state, otherwise zooming one frame also changes every
    repeated copy. The first occurrence keeps the legacy key (``photo0``),
    later occurrences use ``photo0__2``, ``photo0__3`` and so on.
    """
    path = TEMPLATE_DIR / get_template(code)['code'] / 'index.html'
    if not path.exists():
        return ['photo0']
    text = path.read_text(encoding='utf-8')
    counts = {}
    keys = []
    for match in re.finditer(r'src=(["\']){{\s*(photo\d+)\s*}}\1', text):
        base = match.group(2)
        counts[base] = counts.get(base, 0) + 1
        keys.append(base if counts[base] == 1 else f'{base}__{counts[base]}')
    return keys or ['photo0']


def photo_slot_count(code):
    """Return the highest uploaded image slot + 1."""
    indexes = []
    for key in photo_occurrence_keys(code):
        match = re.match(r'^photo(\d+)', key)
        if match:
            indexes.append(int(match.group(1)))
    return max(1, min(MAX_PHOTO_SLOTS, (max(indexes) + 1) if indexes else 1))


def date_parts(date_text):
    try:
        dt = datetime.strptime(date_text or '', '%Y-%m-%d')
    except ValueError:
        dt = datetime.now()
    return {
        'dateDay': f'{dt.day:02d}',
        'dateMonth': f'{dt.month:02d}',
        'dateYear': str(dt.year),
        'dateDayName': ['Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy', 'Chủ nhật'][dt.weekday()],
        'weddingDateVi': dt.strftime('%d/%m/%Y'),
        'weddingDate': dt.strftime('%Y-%m-%d'),
    }


def calendar_html(date_text):
    try:
        dt = datetime.strptime(date_text or '', '%Y-%m-%d')
    except ValueError:
        dt = datetime.now()
    first_weekday, days_in_month = calendar.monthrange(dt.year, dt.month)
    blanks = ''.join('<span class="blank"></span>' for _ in range(first_weekday))
    days = ''.join(
        f'<span class="active">{day}</span>' if day == dt.day else f'<span>{day}</span>'
        for day in range(1, days_in_month + 1)
    )
    return blanks + days


def messages_html(messages):
    if not messages:
        return ''
    output = []
    for index, message in enumerate(messages):
        raw_name = (message.get('name') or '').strip()
        name = html.escape(raw_name) if raw_name and raw_name.lower() not in {'khách', 'khach', 'khách mời', 'khach moi'} else ''
        text = html.escape(message.get('message') or '')
        emoji = html.escape(message.get('emoji') or WISH_EMOJIS[index % len(WISH_EMOJIS)])
        name_html = f'<b>{name}</b>' if name else ''
        output.append(
            "<div class='wish wish-pink-bar' style='--wish-delay:%sms'>"
            "<span class='wish-emoji'>%s</span>"
            "<span class='wish-body'>%s<small>%s</small></span>"
            "</div>" % (min(index * 90, 900), emoji, name_html, text)
        )
    return ''.join(output)


def comment_stream_html(messages):
    if not messages:
        return ''
    output = []
    for index, message in enumerate(messages):
        text = (message.get('message') or '').strip()
        if not text:
            continue
        raw_name = (message.get('name') or '').strip()
        name = raw_name if raw_name and raw_name.lower() not in {'khách', 'khach', 'khách mời', 'khach moi'} else 'Khách mời'
        emoji = message.get('emoji') or WISH_EMOJIS[index % len(WISH_EMOJIS)]
        output.append(
            "<div class='comment-card'>"
            "<span class='wish-text'>%s %s</span>"
            "<span class='wish-name'>%s</span>"
            "</div>" % (html.escape(emoji), html.escape(text), html.escape(name))
        )
    return ''.join(output)


def default_photos(images, total):
    fallback = [f'/static/images/photo-wed-{index:02d}.svg' for index in range(1, 13)]
    uploaded_by_slot = {}
    for row in images or []:
        path = row.get('file_path')
        if not path:
            continue
        try:
            index = int(row.get('sort_order') or 0)
        except (TypeError, ValueError):
            index = 0
        if 0 <= index < total:
            uploaded_by_slot[index] = path

    photos = []
    for index in range(total):
        if index in uploaded_by_slot:
            photos.append(uploaded_by_slot[index])
        else:
            # Không lấy ảnh đã tải lên cho khung khác để "lấp tạm" khung này -
            # với nhiều khung ảnh độc lập (mẫu 1 có tới 37 khung), làm vậy sẽ
            # khiến nhiều khung trông như bị đồng bộ chung một ảnh. Khung nào
            # chưa có ảnh riêng thì hiện ảnh minh hoạ mặc định, không mượn ảnh
            # của khung khác.
            photos.append(fallback[index % len(fallback)])
    return photos


def css_escape(value, default=''):
    return str(value or default).replace('<', '').replace('>', '').replace('{', '').replace('}', '').replace(';', '')[:120]


def number(value, default, minimum, maximum):
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def photo_states(order, keys):
    states = {}
    for key in keys:
        fit = order.get(f'{key}_fit') or order.get('image_fit') or 'contain'
        unit = order.get(f'{key}_unit') or 'pct'
        unit = unit if unit in {'px', 'pct'} else 'pct'
        offset_limit = 5000 if unit == 'pct' else 20000
        states[key] = {
            'x': number(order.get(f'{key}_x'), 0, -offset_limit, offset_limit),
            'y': number(order.get(f'{key}_y'), 0, -offset_limit, offset_limit),
            'zoom': number(order.get(f'{key}_zoom'), 1, 0.35, 4),
            'fit': fit if fit in {'cover', 'contain'} else 'contain',
            'unit': unit,
            'active': any(f'{key}_{suffix}' in order for suffix in ('x', 'y', 'zoom', 'fit', 'unit')),
        }
    return states


def text_styles(order):
    """Canh lề + nhích + cỡ chữ + font riêng cho từng trường chữ
    (EDITABLE_KEYS) — chỉ trả về các trường có chỉnh khác mặc định, để
    build_design_css() không phải sinh CSS thừa cho hàng chục trường chưa
    ai đụng tới."""
    fields = sorted({field for field, _ in EDITABLE_KEYS.values()} | set(DECORATIVE_FIELDS))
    styles = {}
    for field in fields:
        align = order.get(f'{field}_align') or ''
        align = align if align in {'left', 'center', 'right'} else ''
        nudge_x = int(number(order.get(f'{field}_nudge_x'), 0, -100000, 100000))
        nudge_y = int(number(order.get(f'{field}_nudge_y'), 0, -100000, 100000))
        size_raw = (order.get(f'{field}_size') or '').strip()
        size = int(number(size_raw, 0, 10, 160)) if size_raw else 0
        font_raw = (order.get(f'{field}_font') or '').strip()
        font = font_raw if font_raw in FONT_FAMILIES else ''
        color_raw = (order.get(f'{field}_color') or '').strip()
        color = color_raw if re.fullmatch(r'#[0-9a-fA-F]{6}', color_raw) else ''
        if align or nudge_x or nudge_y or size or font or color:
            styles[field] = {'align': align, 'nudge_x': nudge_x, 'nudge_y': nudge_y, 'size': size, 'font': font, 'color': color}
    return styles


TEMPLATE_FONT_DEFAULTS = {
    'mau01': {'name': 'Great Vibes', 'heading': 'Playfair Display', 'body': 'Cormorant Garamond'},
    'mau02': {'name': 'Imperial Script', 'heading': 'Playfair Display', 'body': 'Montserrat'},
    'mau03': {'name': 'Allura', 'heading': 'Playfair Display', 'body': 'Cormorant Garamond'},
    'mau04': {'name': 'Allura', 'heading': 'Playfair Display', 'body': 'Cormorant Garamond'},
    'mau05': {'name': 'Playfair Display', 'heading': 'Playfair Display', 'body': 'Montserrat'},
}
FONT_FAMILIES = {'Allura', 'Cormorant Garamond', 'Great Vibes', 'Imperial Script', 'Italiana', 'Montserrat', 'Playfair Display', 'Georgia', 'Times New Roman', 'Arial', 'Trebuchet MS', 'Verdana', 'Tahoma'}


def _resolve_font(value, fallback):
    value = (value or '').strip()
    return value if value in FONT_FAMILIES else fallback


def build_design_css(order, designer_mode=False):
    code = get_template(order.get('template_code') or 'mau01')['code']
    font_defaults = TEMPLATE_FONT_DEFAULTS.get(code, TEMPLATE_FONT_DEFAULTS['mau01'])
    name_size = css_escape(order.get('name_size'), '46')
    heading_size = css_escape(order.get('heading_size'), '34')
    body_size = css_escape(order.get('body_size'), '16')
    name_font = _resolve_font(order.get('name_font'), font_defaults['name'])
    heading_font = _resolve_font(order.get('heading_font'), font_defaults['heading'])
    body_font = _resolve_font(order.get('body_font'), font_defaults['body'])
    text_color = css_escape(order.get('text_color'), '#2b211b')
    accent = css_escape(order.get('accent_color'), '#b77916')
    background = css_escape(order.get('background_color'), '#fffaf5')
    image_fit = css_escape(order.get('image_fit'), 'contain')

    pos_rules = []
    for field, style in text_styles(order).items():
        # :is(...) khớp cả [data-edit-field] (trường hợp thường) lẫn
        # [data-pos-key] (trường hợp cần canh lề/cỡ chữ riêng cho MỘT vị trí
        # cụ thể của trường đó, ví dụ tên cô dâu chú rể ở bìa thư mời —
        # không dùng data-edit-field vì sẽ đồng bộ nhầm sang mọi chỗ khác
        # đang hiển thị cùng trường, xem intro_groom_name/intro_bride_name).
        selector = f':is([data-edit-field="{field}"],[data-pos-key="{field}"])'
        if style['align']:
            pos_rules.append(
                f'.invitation :is(h1,h2,h3,h4,p,li,div,b,span,em,strong,small,i,a):has(> {selector})'
                f'{{text-align:{style["align"]}!important;}}'
            )
        if style['nudge_x'] or style['nudge_y']:
            # Dùng thuộc tính `translate` riêng (không phải transform:translate())
            # vì một số vị trí (VD tên ở khung sông nước, tên ở màn bìa) đã tự
            # có sẵn transform riêng (canh giữa theo %, hiệu ứng hiện dần...) —
            # `translate` là thuộc tính CSS độc lập, cộng dồn được với
            # transform có sẵn thay vì ghi đè mất, nên nhích vị trí không phá
            # mất phần canh giữa/hiệu ứng gốc của đúng chỗ đó.
            pos_rules.append(
                f'.invitation {selector}{{translate:{style["nudge_x"]}px {style["nudge_y"]}px!important;}}'
            )
        if style['size']:
            # Lặp lại attribute selector 3 lần để tăng độ ưu tiên CSS
            # (0,4,0) — chắc chắn thắng mọi rule cỡ chữ theo nhóm đã có
            # (cao nhất hiện tại là (0,3,0)), không cần biết trường đó
            # thuộc mẫu nào hay selector gốc cụ thể ra sao.
            pos_rules.append(
                f'.invitation {selector}{selector}{selector}{{font-size:{style["size"]}px!important;}}'
            )
        if style['font']:
            pos_rules.append(
                f'.invitation {selector}{selector}{selector}{{font-family:\'{style["font"]}\'!important;}}'
            )
        if style['color']:
            # Lặp lại 3 lần như size/font — một số chữ (VD tên script màu
            # hồng) đã có sẵn rule color:...!important riêng của mẫu, cần độ
            # ưu tiên cao hơn mới ghi đè được khi admin chọn màu riêng.
            pos_rules.append(
                f'.invitation {selector}{selector}{selector}{{color:{style["color"]}!important;}}'
            )
    pos_css = ''.join(pos_rules)

    editor_css = ''
    if designer_mode:
        editor_css = """
.invitation .ny-editable-text{border-radius:5px;cursor:text;transition:background .15s ease,box-shadow .15s ease;}
.invitation .ny-editable-text:hover,.invitation .ny-editable-text.is-editing{background:rgba(255,235,244,.72);box-shadow:0 0 0 2px rgba(233,80,128,.48);}
.invitation a{pointer-events:none!important;}
.invitation *,.invitation *::before,.invitation *::after{animation:none!important;transition:none!important;will-change:auto!important;}
.invitation img[data-ny-photo]{cursor:grab;pointer-events:auto!important;touch-action:none!important;user-select:none!important;-webkit-user-drag:none!important;}
.invitation [data-ny-photo-frame="1"]{overflow:hidden!important;}
.invitation [data-ny-photo-frame="1"].ny-photo-editing{outline:3px solid rgba(47,128,237,.86)!important;outline-offset:2px!important;box-shadow:0 0 0 7px rgba(47,128,237,.13)!important;}
.invitation img[data-ny-photo].ny-photo-dragging{cursor:grabbing;}
.invitation [data-reveal]{opacity:1!important;transform:none!important;filter:none!important;}
.tpl-mau01 .pink-river-name{pointer-events:auto!important;cursor:text!important;}
.tpl-mau01 [data-rise],
.tpl-mau01 .pink-river-name-groom[data-rise-boat],
.tpl-mau01 .pink-river-name-bride[data-rise-boat],
.tpl-mau01 [data-rise-fam],
.tpl-mau01 [data-cross],
.tpl-mau01 [data-grid-in],
.tpl-mau01 [data-zoom-in],
.tpl-mau01 [data-slide-left],
.tpl-mau01 [data-sparkle],
.tpl-mau01 .cover-title,
.tpl-mau01 .cover-envelope-rise,
.tpl-mau01 .cover-groom,
.tpl-mau01 .cover-bride-group,
.tpl-mau01 .open-text{opacity:1!important;transform:none!important;filter:none!important;}
.tpl-mau01 .envelope-wrap{animation:none!important;}
.tpl-mau01 .gift-photo-pop{display:block!important;}
.tpl-mau01 .envelope-photo-card{opacity:1!important;filter:none!important;z-index:20!important;pointer-events:auto!important;overflow:hidden!important;}
.tpl-mau01 .env-flap,.tpl-mau01 .env-front,.tpl-mau01 .env-back{opacity:.12!important;pointer-events:none!important;}
.tpl-mau01 .seal{display:none!important;}
/* Trong editor, màn intro của cả 5 mẫu trở thành section đầu tiên đúng
   760px như phần index bên dưới. Không còn fixed phủ iframe, không bị thu nhỏ
   khác với tab xem thật và không chặn thao tác cuộn/chỉnh nội dung. */
.tpl-mau01 .mau01-letter-intro,
.tpl-mau02 .mau02-letter-intro,
.tpl-mau03 .mau03-letter-intro,
.tpl-mau04 .mau04-letter-intro,
.tpl-mau05 .m05-letter-intro{
  position:relative!important;inset:auto!important;z-index:2!important;
  display:flex!important;width:100%!important;max-width:none!important;
  min-height:clamp(680px,100vh,980px)!important;height:auto!important;margin:0!important;
  padding:clamp(28px,6vh,64px) clamp(12px,3vw,28px)!important;
  opacity:1!important;visibility:visible!important;pointer-events:auto!important;
  overflow-x:hidden!important;overflow-y:visible!important;transform:none!important;
}
.tpl-mau01 .mau01-letter-card,.tpl-mau02 .mau02-letter-card,.tpl-mau03 .mau03-letter-card,.tpl-mau04 .mau04-letter-card,.tpl-mau05 .m05-letter-card{width:100%!important;max-width:1180px!important;margin:auto!important;}
/* KHÔNG còn đặt max-height/height/overflow ở đây nữa — khối "Chuẩn hoá
   intro cho cả 5 mẫu" phía dưới (ngoài editor_css, áp dụng cả cho khách
   xem lẫn Designer) đã lo đúng phần đó (overflow-x:hidden để cắt phần chữ
   tràn ngang, overflow-y:auto để cuộn dọc khi cần). Trước đây rule này đặt
   overflow:visible!important + max-height:none!important đè mất
   overflow-x:hidden của khối chuẩn hoá (cùng !important, rule này đứng sau
   nên thắng) — tên dài (hoặc chữ thư pháp rộng) tràn hẳn ra ngoài khung
   thư mời trong khung xem "Điện thoại", không có gì cắt/giới hạn lại. */
.tpl-mau01 .mau01-letter-card-inner,.tpl-mau02 .mau02-letter-card-inner,.tpl-mau03 .mau03-letter-card-inner,.tpl-mau04 .mau04-letter-card-inner,.tpl-mau05 .m05-letter-card-inner{width:100%!important;padding:clamp(64px,9vh,110px) clamp(22px,6vw,64px)!important;box-sizing:border-box!important;}
.tpl-mau01 .mau01-letter-body,.tpl-mau02 .mau02-letter-body,.tpl-mau03 .mau03-letter-body,.tpl-mau04 .mau04-letter-body,.tpl-mau05 .m05-letter-body{width:100%!important;max-width:none!important;min-width:0!important;}
.tpl-mau01 .mau01-letter-names,.tpl-mau02 .mau02-letter-names,.tpl-mau03 .mau03-letter-names,.tpl-mau04 .mau04-letter-names,.tpl-mau05 .m05-letter-names{display:block!important;width:100%!important;max-width:none!important;margin-left:auto!important;margin-right:auto!important;overflow:visible!important;}
.tpl-mau01 .mau01-letter-intro .mau01-letter-btn,
.tpl-mau02 .mau02-letter-intro .mau02-letter-btn,
.tpl-mau03 .mau03-letter-intro .mau03-letter-btn,
.tpl-mau04 .mau04-letter-intro .mau04-letter-btn,
.tpl-mau05 .m05-letter-intro .m05-letter-btn{pointer-events:none!important;opacity:.55!important;}
.tpl-mau03 .mau03-body,
.tpl-mau04 .mau04-body,
.tpl-mau05 .m05-page{display:block!important;opacity:1!important;visibility:visible!important;pointer-events:auto!important;transform:none!important;}
.tpl-mau01 .film-auto-frame{height:auto!important;max-height:none!important;overflow:visible!important;}
.tpl-mau01 .gallery-row{display:block!important;overflow:visible!important;white-space:normal!important;margin-bottom:12px!important;}
.tpl-mau01 .gallery-track{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:10px!important;width:100%!important;transform:none!important;}
.tpl-mau01 .gallery-card{width:100%!important;height:auto!important;aspect-ratio:255/185!important;min-width:0!important;}
.tpl-mau01 .gallery-card img{width:100%!important;height:100%!important;object-fit:cover!important;}
.tpl-mau02 .mau02-cal-days span{opacity:1!important;transform:none!important;}
"""

    return f"""
<style data-ny-design="1">
.invitation{{
  --ny-name-size:{name_size}px;
  --ny-heading-size:{heading_size}px;
  --ny-body-size:{body_size}px;
  --ny-name-font:'{name_font}';
  --ny-heading-font:'{heading_font}';
  --ny-body-font:'{body_font}';
  --ny-text:{text_color};
  --ny-accent:{accent};
  --ny-bg:{background};
  --ny-image-fit:{image_fit};
  color:var(--ny-text);
  background:var(--ny-bg);
}}
.invite-shell,.invitation{{width:100%;max-width:none;overflow-x:hidden;box-sizing:border-box;}}
.invitation .signature,.invitation .cover-couple,.invitation .names,.invitation .couple-name{{font-size:clamp(calc(var(--ny-name-size)*.65),calc(var(--ny-name-size)*.65 + 8vw),var(--ny-name-size))!important;font-family:var(--ny-name-font)!important;}}
.invitation h1{{font-size:clamp(calc(var(--ny-name-size)*.65),calc(var(--ny-name-size)*.65 + 8vw),var(--ny-name-size))!important;font-family:var(--ny-name-font)!important;}}
.invitation h2{{font-size:clamp(calc(var(--ny-heading-size)*.65),calc(var(--ny-heading-size)*.65 + 6vw),var(--ny-heading-size))!important;font-family:var(--ny-heading-font)!important;}}
.invitation h3{{font-size:clamp(calc(var(--ny-heading-size)*.53),calc(var(--ny-heading-size)*.53 + 4.5vw),calc(var(--ny-heading-size)*.72))!important;font-family:var(--ny-heading-font)!important;}}
.invitation p,.invitation li{{font-size:var(--ny-body-size)!important;font-family:var(--ny-body-font)!important;}}
.tpl-mau01{{--signature:var(--ny-name-font);}}
.tpl-mau01 .cover-couple.signature,.tpl-mau01 .family-photo-name,.tpl-mau01 .mau01-letter-names{{font-size:clamp(calc(var(--ny-name-size)*.65),calc(var(--ny-name-size)*.65 + 8vw),var(--ny-name-size))!important;line-height:1.04!important;}}
.tpl-mau01 .mau01-wish-title,.tpl-mau01 .mau01-thank-you,.tpl-mau01 .cover-title .script{{font-size:clamp(var(--ny-heading-size),calc(var(--ny-heading-size) + 10vw),calc(var(--ny-heading-size)*1.55))!important;font-family:var(--ny-heading-font)!important;line-height:1.02!important;}}
.tpl-mau01 .info-block .tomato-title,.tpl-mau01 .save-title{{font-size:clamp(calc(var(--ny-heading-size)*.99),calc(var(--ny-heading-size)*.99 + 10vw),calc(var(--ny-heading-size)*1.1))!important;font-family:var(--ny-heading-font)!important;line-height:1.08!important;}}
.tpl-mau01 .invite-line,.tpl-mau01 .love-note,.tpl-mau01 .venue-address,.tpl-mau01 .family-parent,.tpl-mau01 .family-address,.tpl-mau01 .mau01-wish-sub,.tpl-mau01 .family-small-title,.tpl-mau01 .shadow-title{{font-size:var(--ny-body-size)!important;font-family:var(--ny-body-font)!important;line-height:1.62!important;color:var(--ny-text)!important;}}
.tpl-mau01 .tomato-title,.tpl-mau01 .family-small-title,.tpl-mau01 .shadow-title,.tpl-mau01 .save-title{{color:var(--ny-accent)!important;}}
.tpl-mau01 .ny-editable-text{{font-family:inherit!important;font-size:inherit!important;line-height:inherit!important;color:inherit!important;}}
.tpl-mau02 .mau02-name-stack b{{font-size:clamp(calc(var(--ny-name-size)*.9),calc(var(--ny-name-size)*.9 + 12vw),var(--ny-name-size))!important;font-family:var(--ny-name-font)!important;line-height:.82!important;}}
.tpl-mau02 .mau02-groom,.tpl-mau02 .mau02-bride{{font-family:var(--ny-name-font)!important;}}
.tpl-mau02 .mau02-thank p{{font-size:clamp(calc(var(--ny-heading-size)*1.65),calc(var(--ny-heading-size)*1.65 + 12vw),calc(var(--ny-heading-size)*2.8))!important;font-family:var(--ny-heading-font)!important;line-height:.86!important;}}
.tpl-mau02 .mau02-event-row{{font-size:var(--ny-body-size)!important;font-family:var(--ny-body-font)!important;}}
.tpl-mau03 .script{{font-size:clamp(calc(var(--ny-heading-size)*1.18),calc(var(--ny-heading-size)*1.18 + 12vw),calc(var(--ny-heading-size)*2))!important;font-family:var(--ny-heading-font)!important;}}
.tpl-mau03 .info .big{{font-size:clamp(calc(var(--ny-heading-size)*1.24),calc(var(--ny-heading-size)*1.24 + 12vw),calc(var(--ny-heading-size)*2.1))!important;font-family:var(--ny-heading-font)!important;}}
.tpl-mau03 .save .date{{font-size:clamp(calc(var(--ny-heading-size)*.88),calc(var(--ny-heading-size)*.88 + 8vw),calc(var(--ny-heading-size)*1.35))!important;font-family:var(--ny-heading-font)!important;}}
.tpl-mau03 .save .time{{font-size:clamp(calc(var(--ny-heading-size)*.47),calc(var(--ny-heading-size)*.47 + 4vw),calc(var(--ny-heading-size)*.68))!important;font-family:var(--ny-heading-font)!important;}}
.tpl-mau04 .names{{font-size:clamp(calc(var(--ny-name-size)*.61),calc(var(--ny-name-size)*.61 + 8vw),var(--ny-name-size))!important;font-family:var(--ny-name-font)!important;}}
.tpl-mau04 .hero-panel div{{font-size:var(--ny-body-size)!important;font-family:var(--ny-body-font)!important;}}
.tpl-mau05 .calendar-title{{font-size:clamp(calc(var(--ny-heading-size)*.59),calc(var(--ny-heading-size)*.59 + 6vw),calc(var(--ny-heading-size)*.82))!important;font-family:var(--ny-heading-font)!important;}}
.tpl-mau05 .strip-copy{{font-size:var(--ny-body-size)!important;font-family:var(--ny-body-font)!important;}}
.invitation [data-edit-field]{{display:inline-block;width:auto;max-width:100%;font:inherit;color:inherit;white-space:pre-wrap;overflow-wrap:anywhere;word-break:normal;vertical-align:baseline;}}
.invitation :is(span,i,b,strong,em,small)[data-pos-key]{{display:inline-block;white-space:nowrap;}}
{pos_css}
/* Chuẩn hoá intro cho cả 5 mẫu: thẻ thư dùng trọn bề ngang, không cắt chữ
   khi màn hình thấp và giữ cùng một tỷ lệ giữa editor với trang khách xem. */
.tpl-mau01 .mau01-letter-intro,.tpl-mau02 .mau02-letter-intro,.tpl-mau03 .mau03-letter-intro,.tpl-mau04 .mau04-letter-intro,.tpl-mau05 .m05-letter-intro{{box-sizing:border-box;padding:clamp(14px,3vh,30px) clamp(8px,2vw,22px);}}
.tpl-mau01 .mau01-letter-card,.tpl-mau02 .mau02-letter-card,.tpl-mau03 .mau03-letter-card,.tpl-mau04 .mau04-letter-card,.tpl-mau05 .m05-letter-card{{width:min(100%,1180px);max-width:calc(100vw - 16px);margin-inline:auto;}}
.tpl-mau01 .mau01-letter-card-inner,.tpl-mau02 .mau02-letter-card-inner,.tpl-mau03 .mau03-letter-card-inner,.tpl-mau04 .mau04-letter-card-inner,.tpl-mau05 .m05-letter-card-inner{{box-sizing:border-box;width:100%;max-height:calc(100vh - 28px);max-height:calc(100dvh - 28px);overflow-x:hidden;overflow-y:auto;padding-left:clamp(18px,5vw,60px);padding-right:clamp(18px,5vw,60px);scrollbar-width:none;}}
.tpl-mau01 .mau01-letter-card-inner::-webkit-scrollbar,.tpl-mau02 .mau02-letter-card-inner::-webkit-scrollbar,.tpl-mau03 .mau03-letter-card-inner::-webkit-scrollbar,.tpl-mau04 .mau04-letter-card-inner::-webkit-scrollbar,.tpl-mau05 .m05-letter-card-inner::-webkit-scrollbar{{display:none;}}
.tpl-mau01 .mau01-letter-body,.tpl-mau02 .mau02-letter-body,.tpl-mau03 .mau03-letter-body,.tpl-mau04 .mau04-letter-body,.tpl-mau05 .m05-letter-body{{width:100%;max-width:none;min-width:0;}}
.tpl-mau01 .mau01-letter-names,.tpl-mau02 .mau02-letter-names,.tpl-mau03 .mau03-letter-names,.tpl-mau04 .mau04-letter-names,.tpl-mau05 .m05-letter-names{{width:100%;max-width:none;box-sizing:border-box;white-space:nowrap!important;overflow:visible;}}
.tpl-mau01 .mau01-letter-names :is([data-edit-field],[data-pos-key]),.tpl-mau02 .mau02-letter-names :is([data-edit-field],[data-pos-key]),.tpl-mau03 .mau03-letter-names :is([data-edit-field],[data-pos-key]),.tpl-mau04 .mau04-letter-names :is([data-edit-field],[data-pos-key]),.tpl-mau05 .m05-letter-names :is([data-edit-field],[data-pos-key]){{width:auto!important;max-width:none!important;white-space:nowrap!important;overflow-wrap:normal!important;word-break:keep-all!important;}}
.invitation img{{max-width:100%;}}
.invitation :has(> img[data-ny-photo]){{overflow:hidden;}}
.invitation :has(> img[data-ny-photo]) > img[data-ny-photo]{{display:block;max-width:none;transform-origin:center center;}}
.invitation img[data-ny-photo][data-ny-active="1"]{{object-fit:var(--ny-photo-fit,contain)!important;object-position:center center!important;}}
.invitation .ny-photo-frame{{display:block;min-width:0;margin:0;overflow:hidden;}}
.invitation .map-btn,.invitation button,.invitation .btn{{background:var(--ny-accent);border-color:var(--ny-accent);}}
.invitation .wish-pink-bar{{display:flex;align-items:center;gap:10px;margin:10px 0;padding:12px 14px;border-radius:24px;background:linear-gradient(90deg,#ffe0ec,#fff4f8);box-shadow:0 10px 22px rgba(222,80,130,.12);animation:nyWishIn .52s ease both;animation-delay:var(--wish-delay,0ms);}}
.invitation .wish-emoji{{width:34px;height:34px;display:grid;place-items:center;border-radius:50%;background:white;box-shadow:0 4px 12px rgba(222,80,130,.14);font-size:19px;flex:none;}}
.invitation .wish-body{{display:grid;gap:2px;min-width:0;text-align:left;}}
.invitation .wish-body b{{font-size:14px;color:#9a315a;}}
.invitation .wish-body small{{font-size:14px;color:#5d3b48;white-space:normal;word-break:break-word;}}
.invitation .wish-empty{{display:none!important;}}
@keyframes nyWishIn{{from{{opacity:0;transform:translateY(14px) scale(.96)}}to{{opacity:1;transform:translateY(0) scale(1)}}}}
@media(max-width:640px){{.invite-shell{{max-width:100%!important;padding:0!important;}}.invitation{{width:100%!important;overflow-x:hidden!important;}}.invitation section{{max-width:100%!important;}}.invitation .wish-pink-bar{{border-radius:18px;}}}}
{editor_css}
</style>
"""


def context_from_invitation(inv, designer_mode=False):
    order = inv.get('order') or {}
    code = get_template(order.get('template_code') or 'mau01')['code']
    total = photo_slot_count(code)
    photos = default_photos(inv.get('images') or [], total)
    context = {}
    context.update(date_parts(order.get('wedding_date')))

    wedding_time = order.get('wedding_time') or ''
    party_time = order.get('party_time') or wedding_time
    address = order.get('address') or ''
    ceremony_address = order.get('ceremony_address') or address
    party_address = order.get('party_address') or address
    groom_address = order.get('groom_address') or address
    bride_address = order.get('bride_address') or address

    context.update({
        'templateId': code,
        'templateName': get_template(code)['name'],
        'templateVersion': '20260802-intro-export-mobile-v3',
        'accent': order.get('accent_color') or '#b77916',
        'brideName': order.get('bride_name') or 'Tên cô dâu',
        'groomName': order.get('groom_name') or 'Tên chú rể',
        'weddingTime': wedding_time,
        'partyTime': party_time,
        'address': address,
        'ceremonyAddress': ceremony_address,
        'partyAddress': party_address,
        'mapUrl': order.get('map_url') or '',
        'audioSrc': order.get('music_path') or '',
        'coverTitle': order.get('cover_title') or 'Wedding Invitation',
        'coverSubtitle': order.get('cover_subtitle') or 'Trân trọng kính mời',
        'inviteLabel': order.get('invite_label') or 'Trân trọng kính mời',
        'invitationTitle': order.get('invitation_title') or 'Thiệp mời dự lễ cưới',
        'quoteText': order.get('quote_text') or 'Mỗi khoảnh khắc yêu thương đều là một kỷ niệm dịu dàng.',
        'loveQuoteTitle': order.get('love_quote_title') or 'I Love You',
        'loveQuoteText': order.get('love_quote_text') or 'Ngọn gió xuân dịu dàng với em hơn,\nxưa tan muộn phiền,\nđể mọi thứ chỉ còn lại dịu dàng.',
        'familyTitle': order.get('family_title') or 'Hai bên gia đình',
        'eventTitle': order.get('event_title') or 'Thông tin buổi lễ',
        'galleryTitle': order.get('gallery_title') or 'Khoảnh khắc yêu thương',
        'wishesTitle': order.get('wishes_title') or 'Lời chúc',
        'calendarNote': order.get('calendar_note') or '',
        'intro': order.get('intro') or 'Trân trọng kính mời quý khách đến chung vui cùng gia đình chúng tôi.',
        'groomParents': order.get('groom_parents') or '',
        'brideParents': order.get('bride_parents') or '',
        'groomAddress': groom_address,
        'brideAddress': bride_address,
        'groomFamilyAddress': groom_address,
        'brideFamilyAddress': bride_address,
        'ceremonyTitle': order.get('ceremony_title') or 'Lễ thành hôn',
        'partyTitle': order.get('party_title') or 'Tiệc mừng',
        'mapButtonText': order.get('map_button_text') or 'Xem đường đi',
        'note': order.get('note') or '',
        '_photo_states': photo_states(order, photo_occurrence_keys(code)),
    })

    # Mọi field còn lại trong EDITABLE_KEYS (chưa được set thủ công ở trên,
    # ví dụ các câu chữ trang trí mẫu 01) tự lấy giá trị từ order — order đã
    # có sẵn DESIGN_DEFAULTS merge vào (xem models.get_order), nên không cần
    # viết default riêng ở đây nữa, thêm field mới chỉ cần khai báo ở
    # EDITABLE_KEYS + models.DESIGN_DEFAULTS là tự có trong context.
    for camel_key, (field, _label) in EDITABLE_KEYS.items():
        if camel_key not in context:
            context[camel_key] = order.get(field) or ''

    for index, url in enumerate(photos):
        context[f'photo{index}'] = url

    context['calendarDaysHtml'] = calendar_html(order.get('wedding_date'))
    context['messagesHtml'] = messages_html(inv.get('messages') or [])
    context['commentsStreamHtml'] = comment_stream_html(inv.get('messages') or [])
    context['effectHtml'] = ''
    map_text = html.escape(context['mapButtonText'])
    context['mapBtn'] = (
        f"<a class='map-btn' href='{html.escape(order.get('map_url') or '#')}' target='_blank'>{map_text}</a>"
        if order.get('map_url') else ''
    )
    context['designCss'] = build_design_css(order, designer_mode=designer_mode)
    # ?v=... ép trình duyệt luôn tải đúng bản mới nhất của mau0X.css/js —
    # trước đây 2 file này không có tham số phiên bản, chỉ trông chờ
    # Cache-Control/ETag để trình duyệt tự xin lại bản mới; máy nào/trình
    # duyệt nào không tuân theo đúng cách đó (cache cứng, tiện ích mở rộng,
    # mạng công ty...) vẫn có thể kẹt lại bản CSS/JS cũ sau khi server đã
    # sửa xong, nhìn như lỗi vẫn còn dù code đã đúng.
    context['styleFile'] = f'/templates/{code}/{code}.css?v=20260803-mobile-fit'
    context['effectFile'] = f'/templates/{code}/{code}.js?v=20260803-mobile-fit'

    if designer_mode:
        order_id = html.escape(str(order.get('id') or ''))
        upload_url = f'/designer/orders/{order_id}/auto-upload-photo-slot' if order_id else ''
        context['designerPreviewScript'] = (
            '<script>window.NY_DESIGNER_PREVIEW=1;window.NY_PHOTO_UPLOAD_URL='
            + json.dumps(upload_url)
            + ';</script><script src="/static/js/designer-preview.js?v=15" defer></script>'
        )
    else:
        context['designerPreviewScript'] = ''
    return context


def render_fragment(code, context, designer_mode=False):
    safe_code = get_template(code)['code']
    path = TEMPLATE_DIR / safe_code / 'index.html'
    text = path.read_text(encoding='utf-8')

    # Server đánh dấu trực tiếp khung đang chỉnh, không phụ thuộc :has() hay
    # JS tự đoán iframe. Nhờ đó mẫu 03 luôn mở intro/body và nhận click ổn định.
    if designer_mode:
        text = re.sub(
            r'<article\s+class=(["\'])([^"\']*\binvitation\b[^"\']*)\1',
            lambda m: '<article class=' + m.group(1) + m.group(2)
                      + ' is-editor-preview is-content-visible' + m.group(1)
                      + ' data-editor="true"',
            text,
            count=1,
        )

    if '{{letterIntroHtml}}' in text:
        partial_path = TEMPLATE_DIR / safe_code / 'letter-intro.html'
        partial = partial_path.read_text(encoding='utf-8') if partial_path.exists() else ''
        if partial and not designer_mode:
            # Gắn sẵn class ngay khi render ở server (không đợi JS chạy xong
            # mới classList.add) để invitation-responsive.css tính đúng tỷ lệ
            # thu nhỏ NGAY TỪ KHUNG HÌNH ĐẦU TIÊN. Trước đây phải đợi
            # invitation-responsive.js tải + chạy xong rồi mới gắn class này,
            # nên có một khoảng (dài hay ngắn tuỳ tốc độ mạng) thẻ thư hiện ở
            # layout khác rồi mới "nhảy" sang đúng layout cuối — nhìn giật/đơ
            # đúng lúc hiệu ứng rơi xuống đang chạy. Không áp dụng trong
            # designer_mode vì màn Designer cố tình dùng layout thường, không
            # phải canvas cố định thu nhỏ.
            partial = re.sub(
                r'(<div\s+class=(["\'])[^"\']*\bletter-intro\b[^"\']*)\2',
                lambda m: m.group(1) + ' ny-intro-responsive' + m.group(2),
                partial,
                count=1,
            )
        text = text.replace('{{letterIntroHtml}}', partial)

    states = context.get('_photo_states') or {}
    occurrence = {'index': 0, 'counts': {}}

    def photo_src_repl(match):
        quote = match.group(1)
        key = match.group(2)
        occurrence['counts'][key] = occurrence['counts'].get(key, 0) + 1
        count = occurrence['counts'][key]
        slot = key if count == 1 else f'{key}__{count}'
        state = states.get(slot) or {'x': 0, 'y': 0, 'zoom': 1, 'fit': 'contain', 'unit': 'pct'}
        loading = 'fetchpriority="high"' if occurrence['index'] == 0 else 'loading="lazy"'
        occurrence['index'] += 1
        return (
            f'src={quote}{{{{{key}}}}}{quote} data-ny-photo="{key}" data-ny-slot="{slot}" '
            f'data-ny-x="{state["x"]}" data-ny-y="{state["y"]}" '
            f'data-ny-zoom="{state["zoom"]}" data-ny-fit="{state["fit"]}" '
            f'data-ny-unit="{state.get("unit", "pct")}" '
            f'data-ny-active="{1 if state.get("active") else 0}" '
            f'decoding="async" {loading}'
        )

    text = re.sub(r'src=(["\']){{\s*(photo\d+)\s*}}\1', photo_src_repl, text)

    def replace_placeholder(match):
        key = match.group(1).strip()
        value = str(context.get(key, ''))
        if key in RAW_KEYS:
            return value
        safe_value = html.escape(value, quote=True)
        last_open = text.rfind('<', 0, match.start())
        last_close = text.rfind('>', 0, match.start())
        inside_tag = last_open > last_close
        if not inside_tag and key in EDITABLE_KEYS:
            field, label = EDITABLE_KEYS[key]
            # data-edit-field luôn được gắn (kể cả trang thiệp thật khách xem,
            # không chỉ trong Designer) vì CSS canh lề/nhích text cần attribute
            # này để nhắm đúng phần tử — nếu chỉ gắn lúc designer_mode thì canh
            # lề/nhích chỉ có tác dụng trong khung xem trước, không áp dụng
            # được cho thiệp thật. contenteditable/class chỉnh-tại-chỗ vẫn chỉ
            # bật khi designer_mode để khách xem không gõ được vào thiệp.
            enclosing_tag = text[last_open:last_close + 1] if last_open != -1 else ''
            already_editable = 'contenteditable' in enclosing_tag
            if designer_mode:
                # Mẫu 03 tự đặt contenteditable="true" thẳng trên thẻ bao
                # ngoài rồi — bọc thêm 1 lớp contenteditable nữa bên trong sẽ
                # tạo ra contenteditable LỒNG NHAU, khiến trình duyệt định vị
                # con trỏ sai khi gõ (đã kiểm chứng: chữ gõ bị đảo lộn, Enter
                # không ăn). Trường hợp này chỉ cần data-edit-field để CSS
                # canh lề/cỡ chữ riêng vẫn nhắm đúng ô, không cần
                # contenteditable/spellcheck vì thẻ ngoài đã lo phần đó rồi.
                if already_editable:
                    return (
                        f"<span data-edit-field='{html.escape(field)}' "
                        f"data-edit-key='{html.escape(key)}'>{safe_value}</span>"
                    )
                return (
                    f"<span class='ny-editable-text' contenteditable='true' spellcheck='false' "
                    f"data-edit-field='{html.escape(field)}' data-edit-key='{html.escape(key)}' "
                    f"title='Bấm để chỉnh: {html.escape(label)}'>{safe_value}</span>"
                )
            return f"<span data-edit-field='{html.escape(field)}'>{safe_value}</span>"
        return safe_value

    body = re.sub(r'{{\s*([a-zA-Z0-9_]+)\s*}}', replace_placeholder, text)
    return body + str(context.get('designCss', '')) + str(context.get('designerPreviewScript', ''))
