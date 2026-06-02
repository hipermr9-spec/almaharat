import os
import json
import uuid
from datetime import datetime, timezone
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
from werkzeug.serving import WSGIRequestHandler
import smtplib
import random
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from apscheduler.schedulers.background import BackgroundScheduler
from flask_mail import Mail

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), "static"))

app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'hipermr9@gmail.com'
app.config['MAIL_PASSWORD'] = 'bcij rdvo rpov hsgp'
app.config['MAIL_DEFAULT_SENDER'] = 'hipermr9@gmail.com'

CORS(app)

# =========================
# 📂 Paths
# =========================
BASE_DIR    = os.path.dirname(os.path.abspath(__file__))
DATA_DIR    = os.path.join(BASE_DIR, 'Data')
IMAGES_DIR  = os.path.join(DATA_DIR, 'images')

os.makedirs(DATA_DIR,   exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

DB_PATH               = os.path.join(DATA_DIR, 'Accounts.json')
EMAILS_PATH           = os.path.join(DATA_DIR, 'emails.json')
PASSWORD_RESET_CODES  = os.path.join(DATA_DIR, 'password_reset_codes.json')
PASSWORD_RESET_TOKENS = os.path.join(DATA_DIR, 'password_reset_tokens.json')

SENDER_EMAIL    = "hipermr9@gmail.com"
SENDER_PASSWORD = "fguj cmet zxgq fllm"

MESSAGES = [
    {
        "title": "توجد العاب جميلة موجودة في المهارات العبها الأن!",
        "body":  "تواجد العاب جميلة جدا في موقع المهارات العبها الأن!\nافضل الألعاب عن الرياضيات مثل: هندسة, الخ...\nفا لا تضيع الفرصة العبها الأن!!"
    },
    {
        "title": "تحديث جديد 🔥",
        "body":  "توجد ألعاب جديدة ممتعة تم إضافتها 🎮\nلا تفوت التجربة!"
    }
]

app.config['UPLOAD_FOLDER'] = IMAGES_DIR
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'mp4', 'mp3'}

# =========================
# 🔧 JSON Helpers
# =========================
def read_json(path):
    if not os.path.exists(path):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump([], f)
        return []
    with open(path, 'r', encoding='utf-8') as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []

def write_json(path, data):
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_user(user):
    return {k: v for k, v in user.items() if k != 'password'}

# Initialise files that must always exist
for _p in [PASSWORD_RESET_CODES, PASSWORD_RESET_TOKENS]:
    if not os.path.exists(_p):
        write_json(_p, [])

# =========================
# 🔐 Admin guard
# =========================
def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token       = request.headers.get('X-Admin-Token', '')
        admin_token = os.environ.get('ADMIN_TOKEN', 'changeme')
        if token != admin_token:
            return jsonify({"error": "Unauthorized"}), 403
        return f(*args, **kwargs)
    return decorated

# =========================
# 🖼️ Static uploads
# =========================
@app.route('/uploads/<filename>')
def serve_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# =========================
# 🔐 Auth
# =========================
@app.route('/api/register', methods=['POST'])
def register():
    data     = request.json or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    accounts = read_json(DB_PATH)
    if any(acc['username'] == username for acc in accounts):
        return jsonify({"error": "Username already exists"}), 400

    new_user = {
        "userid":    str(uuid.uuid4()),
        "username":  username,
        "password":  generate_password_hash(password),
        "points":    0,
        "role":      "user",
        "verified":  False,
        "is_banned": False,
    }
    accounts.append(new_user)
    write_json(DB_PATH, accounts)
    return jsonify({"message": "Account created"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data     = request.json or {}
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    accounts = read_json(DB_PATH)
    user     = next((acc for acc in accounts if acc['username'] == username), None)

    if user and check_password_hash(user['password'], password):
        return jsonify({"user": safe_user(user)}), 200

    return jsonify({"error": "Invalid username or password"}), 401

@app.route("/api/admin/users", methods=["GET"])
@require_admin
def get_all_users():
    try:
        users = read_json(DB_PATH)
        return jsonify([safe_user(u) for u in users]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/get_points/<string:userid>", methods=["GET"])
@require_admin
def get_points(userid):
    try:
        users = read_json(DB_PATH)
        user  = next((u for u in users if u.get("userid") == userid), None)
        if user is None:
            return jsonify({"error": "المستخدم غير موجود"}), 404
        return jsonify({"points": user.get("points", 0)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/update_points", methods=["POST"])
@require_admin
def update_points():
    try:
        data       = request.get_json()
        userid     = data.get("userid")
        new_points = data.get("points")

        users   = read_json(DB_PATH)
        updated = False
        for user in users:
            if user.get("userid") == userid:
                user["points"] = int(new_points)
                updated = True
                break

        if not updated:
            return jsonify({"error": "المستخدم غير موجود"}), 404

        write_json(DB_PATH, users)
        return jsonify({"message": "تم الحفظ بنجاح"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/save-email', methods=['POST'])
def save_email():
    try:
        data   = request.get_json() or {}
        email  = (data.get("email") or "").strip().lower()
        userid = data.get("userid")

        if not email or "@" not in email:
            return jsonify({"error": "Invalid email"}), 400

        emails = read_json(EMAILS_PATH)
        if any(e.get("email") == email for e in emails):
            return jsonify({"message": "Email already exists"}), 200

        emails.append({
            "id":        str(uuid.uuid4()),
            "userid":    userid,
            "email":     email,
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
        write_json(EMAILS_PATH, emails)
        return jsonify({"message": "Email saved"}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# 📤 Email helper
# =========================
def send_email(to_email, title, body):
    msg = MIMEMultipart()
    msg["From"]    = SENDER_EMAIL
    msg["To"]      = to_email
    msg["Subject"] = title
    msg.attach(MIMEText(body, "plain"))

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(SENDER_EMAIL, SENDER_PASSWORD)
    server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
    server.quit()

def send_to_all_emails():
    emails = read_json(EMAILS_PATH)
    if not emails:
        return
    msg = random.choice(MESSAGES)
    for e in emails:
        email = e.get("email")
        if not email:
            continue
        try:
            send_email(email, msg["title"], msg["body"])
        except Exception as err:
            print("Failed:", email, err)

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(lambda: send_to_all_emails(), 'interval', hours=5)
    scheduler.start()
    try:
        while True:
            threading.Event().wait(60)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()

# =========================
# 📂 Enrichments
# =========================
ENRICHMENTS_PATH  = os.path.join(DATA_DIR, 'enrichments.json')
DOCUMENTS_DIR     = os.path.join(DATA_DIR, 'documents')
VIDEOS_DIR        = os.path.join(DATA_DIR, 'videos')

os.makedirs(DOCUMENTS_DIR, exist_ok=True)
os.makedirs(VIDEOS_DIR,    exist_ok=True)

ALLOWED_ENRICHMENT_EXTENSIONS = {
    'png', 'jpg', 'jpeg', 'gif', 'webp',
    'pdf', 'mp4', 'webm', 'mov', 'mp3',
}

def allowed_enrichment_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_ENRICHMENT_EXTENSIONS

def get_file_type(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in {'png', 'jpg', 'jpeg', 'gif', 'webp'}: return 'image'
    if ext == 'pdf':                                   return 'pdf'
    if ext in {'mp4', 'webm', 'mov'}:                 return 'video'
    if ext == 'mp3':                                   return 'audio'
    return 'file'

def get_upload_dir(file_type):
    return {'image': IMAGES_DIR, 'pdf': DOCUMENTS_DIR,
            'video': VIDEOS_DIR, 'audio': VIDEOS_DIR}.get(file_type, DATA_DIR)

def get_file_url(file_type, filename, base_url):
    return {
        'image': f'{base_url}/uploads/images/{filename}',
        'pdf':   f'{base_url}/uploads/documents/{filename}',
        'video': f'{base_url}/uploads/videos/{filename}',
        'audio': f'{base_url}/uploads/videos/{filename}',
    }.get(file_type, f'{base_url}/uploads/{filename}')

@app.route('/uploads/images/<filename>')
def serve_enrichment_image(filename):
    return send_from_directory(IMAGES_DIR, filename)

@app.route('/uploads/documents/<filename>')
def serve_enrichment_document(filename):
    return send_from_directory(DOCUMENTS_DIR, filename)

@app.route('/uploads/videos/<filename>')
def serve_enrichment_video(filename):
    return send_from_directory(VIDEOS_DIR, filename)

@app.route('/api/admin/enrichments/add', methods=['POST'])
@require_admin
def add_enrichment():
    try:
        title       = (request.form.get('title')       or '').strip()
        description = (request.form.get('description') or '').strip()
        e_type      = (request.form.get('type')        or '').strip()
        link        = (request.form.get('link')        or '').strip()
        file        = request.files.get('file')

        if not title:  return jsonify({"error": "Title is required"}), 400
        if not e_type: return jsonify({"error": "Type is required"}),  400

        content = ''
        if e_type == 'link':
            if not link: return jsonify({"error": "Link required for type 'link'"}), 400
            content = link
        elif file:
            if not allowed_enrichment_file(file.filename):
                return jsonify({"error": "File type not allowed"}), 400
            ft        = get_file_type(file.filename)
            filename  = str(uuid.uuid4()) + '_' + secure_filename(file.filename)
            file.save(os.path.join(get_upload_dir(ft), filename))
            content   = get_file_url(ft, filename, request.host_url.rstrip('/'))
        else:
            return jsonify({"error": "File or link required"}), 400

        enrichments = read_json(ENRICHMENTS_PATH)
        new_id      = max((e.get('id', 0) for e in enrichments), default=0) + 1
        new_e       = {"id": new_id, "title": title, "description": description,
                       "type": e_type, "content": content,
                       "createdAt": datetime.now(timezone.utc).isoformat()}
        enrichments.append(new_e)
        write_json(ENRICHMENTS_PATH, enrichments)
        return jsonify({"message": "Enrichment added", "enrichment": new_e}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/enrichments/edit/<int:enrichment_id>', methods=['PUT'])
@require_admin
def edit_enrichment(enrichment_id):
    try:
        title       = (request.form.get('title')       or '').strip()
        description = (request.form.get('description') or '').strip()
        e_type      = (request.form.get('type')        or '').strip()
        link        = (request.form.get('link')        or '').strip()
        file        = request.files.get('file')

        enrichments = read_json(ENRICHMENTS_PATH)
        enrichment  = next((e for e in enrichments if e.get('id') == enrichment_id), None)
        if enrichment is None:
            return jsonify({"error": "Enrichment not found"}), 404

        if title:       enrichment['title']       = title
        if description: enrichment['description'] = description
        if e_type:      enrichment['type']        = e_type

        if e_type == 'link' and link:
            enrichment['content'] = link
        elif file:
            if not allowed_enrichment_file(file.filename):
                return jsonify({"error": "File type not allowed"}), 400
            ft       = get_file_type(file.filename)
            filename = str(uuid.uuid4()) + '_' + secure_filename(file.filename)
            file.save(os.path.join(get_upload_dir(ft), filename))
            enrichment['content'] = get_file_url(ft, filename, request.host_url.rstrip('/'))

        enrichment['updatedAt'] = datetime.now(timezone.utc).isoformat()
        write_json(ENRICHMENTS_PATH, enrichments)
        return jsonify({"message": "Enrichment updated", "enrichment": enrichment}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/admin/enrichments/delete/<int:enrichment_id>', methods=['DELETE'])
@require_admin
def delete_enrichment(enrichment_id):
    try:
        enrichments = read_json(ENRICHMENTS_PATH)
        new_list    = [e for e in enrichments if e.get('id') != enrichment_id]
        if len(new_list) == len(enrichments):
            return jsonify({"error": "Enrichment not found"}), 404
        write_json(ENRICHMENTS_PATH, new_list)
        return jsonify({"message": "Enrichment deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/enrichments', methods=['GET'])
def get_all_enrichments():
    try:
        return jsonify(read_json(ENRICHMENTS_PATH)), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/enrichments/<int:enrichment_id>', methods=['GET'])
def get_enrichment_by_id(enrichment_id):
    try:
        enrichments = read_json(ENRICHMENTS_PATH)
        enrichment  = next((e for e in enrichments if e.get('id') == enrichment_id), None)
        if enrichment is None:
            return jsonify({"error": "Enrichment not found"}), 404
        return jsonify(enrichment), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok"}), 200

# =========================
# ⚙️ User settings
# =========================
@app.route("/api/get-settings/<string:userid>", methods=["GET"])
def get_settings(userid):
    users = read_json(DB_PATH)
    user  = next((u for u in users if u["userid"] == userid), None)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"mailEnabled": user.get("mailEnabled", False),
                    "twoFA":       user.get("twoFA",       False)})

@app.route("/api/update-setting", methods=["POST"])
def update_setting():
    data   = request.get_json()
    userid = data.get("userid")
    key    = data.get("key")
    value  = data.get("value")

    if key not in ["mailEnabled", "twoFA"]:
        return jsonify({"error": "Invalid setting"}), 400

    users = read_json(DB_PATH)
    for user in users:
        if user["userid"] == userid:
            user[key] = bool(value)
            break
    else:
        return jsonify({"error": "User not found"}), 404

    write_json(DB_PATH, users)
    return jsonify({"success": True})

@app.route("/api/delete-account", methods=["POST"])
def delete_account():
    data      = request.get_json()
    userid    = data.get("userid")
    users     = read_json(DB_PATH)
    new_users = [u for u in users if u["userid"] != userid]
    if len(new_users) == len(users):
        return jsonify({"error": "User not found"}), 404
    write_json(DB_PATH, new_users)
    return jsonify({"success": True})

@app.route("/api/change-password", methods=["POST"])
def change_password():
    data   = request.get_json()
    userid = data.get("userid")
    old    = data.get("oldPassword")
    new    = data.get("newPassword")
    users  = read_json(DB_PATH)
    for user in users:
        if user["userid"] == userid:
            if not check_password_hash(user["password"], old):
                return jsonify({"error": "Wrong password"}), 400
            user["password"] = generate_password_hash(new)
            write_json(DB_PATH, users)
            return jsonify({"success": True})
    return jsonify({"error": "User not found"}), 404

@app.route("/api/change-username", methods=["POST"])
def change_username():
    data        = request.get_json()
    userid      = data.get("userid")
    newUsername = (data.get("newUsername") or "").strip()
    if not newUsername:
        return jsonify({"error": "Empty name"}), 400
    users = read_json(DB_PATH)
    for user in users:
        if user["userid"] == userid:
            user["username"] = newUsername
            write_json(DB_PATH, users)
            return jsonify({"success": True})
    return jsonify({"error": "User not found"}), 404

# =========================
# 📮 Posts
# =========================
POSTS_PATH  = os.path.join(DATA_DIR, 'posts.json')
POSTS_MEDIA = os.path.join(DATA_DIR, 'posts_media')
os.makedirs(POSTS_MEDIA, exist_ok=True)

ALLOWED_POST_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov'}

def allowed_post_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_POST_EXTENSIONS

def get_post_media_type(filename):
    return 'video' if filename.rsplit('.', 1)[1].lower() in {'mp4', 'webm', 'mov'} else 'image'

@app.route('/uploads/posts/<filename>')
def serve_post_media(filename):
    return send_from_directory(POSTS_MEDIA, filename)

@app.route('/api/posts', methods=['GET'])
def get_posts():
    try:
        posts  = read_json(POSTS_PATH)
        public = [p for p in posts if p.get('visibility') == 'public']
        public.sort(key=lambda p: p.get('createdAt', ''), reverse=True)
        return jsonify(public), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/posts/<string:post_id>', methods=['GET'])
def get_post_by_id(post_id):
    try:
        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == post_id), None)
        if post is None:
            return jsonify({"error": "Post not found"}), 404
        return jsonify(post), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/posts/user/<string:userid>', methods=['GET'])
def get_posts_by_user(userid):
    try:
        posts      = read_json(POSTS_PATH)
        user_posts = [p for p in posts if p.get('userid') == userid]
        user_posts.sort(key=lambda p: p.get('createdAt', ''), reverse=True)
        return jsonify(user_posts), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/posts/add', methods=['POST'])
def add_post():
    try:
        userid      = (request.form.get('userid')      or '').strip()
        username    = (request.form.get('username')    or '').strip()
        title       = (request.form.get('title')       or '').strip()
        description = (request.form.get('description') or '').strip()
        raw_tags    = (request.form.get('hashtags')    or '').strip()
        visibility  = (request.form.get('visibility')  or 'public').strip()

        if not userid or not username: return jsonify({"error": "userid and username required"}), 400
        if not title:                  return jsonify({"error": "title required"}), 400
        if visibility not in ('public', 'private', 'link'):
            return jsonify({"error": "Invalid visibility"}), 400

        hashtags = [t.strip() for t in raw_tags.split(',') if t.strip()] if raw_tags else []

        media = []
        for file in request.files.getlist('files[]'):
            if file and file.filename and allowed_post_file(file.filename):
                mt       = get_post_media_type(file.filename)
                filename = str(uuid.uuid4()) + '_' + secure_filename(file.filename)
                file.save(os.path.join(POSTS_MEDIA, filename))
                media.append({"type": mt, "url": f"{request.host_url.rstrip('/')}/uploads/posts/{filename}"})

        new_post = {
            "id": str(uuid.uuid4()), "userid": userid, "username": username,
            "title": title, "description": description, "hashtags": hashtags,
            "visibility": visibility, "media": media,
            "likes": [], "dislikes": [], "comments": [],
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        posts = read_json(POSTS_PATH)
        posts.append(new_post)
        write_json(POSTS_PATH, posts)
        return jsonify({"message": "Post created", "post": new_post}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/posts/<string:post_id>/like', methods=['POST'])
def like_post(post_id):
    try:
        userid = (request.get_json() or {}).get('userid', '').strip()
        if not userid: return jsonify({"error": "userid required"}), 400
        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == post_id), None)
        if not post: return jsonify({"error": "Post not found"}), 404
        if userid in post['likes']:
            post['likes'].remove(userid)
        else:
            post['likes'].append(userid)
            if userid in post['dislikes']:
                post['dislikes'].remove(userid)
        write_json(POSTS_PATH, posts)
        return jsonify({"likes": len(post['likes']), "dislikes": len(post['dislikes'])}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/posts/<string:post_id>/dislike', methods=['POST'])
def dislike_post(post_id):
    try:
        userid = (request.get_json() or {}).get('userid', '').strip()
        if not userid: return jsonify({"error": "userid required"}), 400
        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == post_id), None)
        if not post: return jsonify({"error": "Post not found"}), 404
        if userid in post['dislikes']:
            post['dislikes'].remove(userid)
        else:
            post['dislikes'].append(userid)
            if userid in post['likes']:
                post['likes'].remove(userid)
        write_json(POSTS_PATH, posts)
        return jsonify({"likes": len(post['likes']), "dislikes": len(post['dislikes'])}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/posts/<string:post_id>/comment', methods=['POST'])
def comment_on_post(post_id):
    try:
        data     = request.get_json() or {}
        userid   = (data.get('userid')   or '').strip()
        username = (data.get('username') or '').strip()
        text     = (data.get('text')     or '').strip()
        if not userid or not username: return jsonify({"error": "userid and username required"}), 400
        if not text:                   return jsonify({"error": "comment text required"}), 400
        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == post_id), None)
        if not post: return jsonify({"error": "Post not found"}), 404
        comment = {"id": str(uuid.uuid4()), "userid": userid, "username": username,
                   "text": text, "createdAt": datetime.now(timezone.utc).isoformat()}
        post['comments'].append(comment)
        write_json(POSTS_PATH, posts)
        return jsonify({"message": "Comment added", "comment": comment}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/posts/<string:post_id>/comment/<string:comment_id>', methods=['DELETE'])
def delete_comment(post_id, comment_id):
    try:
        userid = (request.get_json() or {}).get('userid', '').strip()
        posts  = read_json(POSTS_PATH)
        post   = next((p for p in posts if p['id'] == post_id), None)
        if not post: return jsonify({"error": "Post not found"}), 404
        comment = next((c for c in post['comments'] if c['id'] == comment_id), None)
        if not comment: return jsonify({"error": "Comment not found"}), 404
        if comment['userid'] != userid: return jsonify({"error": "Unauthorized"}), 403
        post['comments'] = [c for c in post['comments'] if c['id'] != comment_id]
        write_json(POSTS_PATH, posts)
        return jsonify({"message": "Comment deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/posts/<string:post_id>', methods=['DELETE'])
def delete_post(post_id):
    try:
        userid = (request.get_json() or {}).get('userid', '').strip()
        posts  = read_json(POSTS_PATH)
        post   = next((p for p in posts if p['id'] == post_id), None)
        if not post: return jsonify({"error": "Post not found"}), 404
        if post['userid'] != userid: return jsonify({"error": "Unauthorized"}), 403
        write_json(POSTS_PATH, [p for p in posts if p['id'] != post_id])
        return jsonify({"message": "Post deleted"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# 🔑 Password reset
# =========================
@app.route("/api/checkuserhasemail", methods=["POST"])
def checkuserhasemail():
    data     = request.get_json() or {}
    username = (data.get("username") or "").strip()
    if not username:
        return jsonify({"error": "Username required"}), 400

    users = read_json(DB_PATH)
    user  = next((u for u in users if u["username"] == username), None)
    if not user:
        return jsonify({"error": "User not found"}), 404

    emails       = read_json(EMAILS_PATH)
    email_record = next((e for e in emails if e["userid"] == user["userid"]), None)
    if not email_record:
        return jsonify({"hasEmail": False}), 200

    code  = str(random.randint(111111, 999999))
    codes = [c for c in read_json(PASSWORD_RESET_CODES) if c["username"] != username]
    codes.append({"username": username, "code": code,
                  "createdAt": datetime.now(timezone.utc).isoformat()})
    write_json(PASSWORD_RESET_CODES, codes)
    send_email(email_record["email"], "Password Reset Code",
               f"Your verification code is: {code}")
    return jsonify({"hasEmail": True}), 200

@app.route("/api/sendtogmail", methods=["POST"])
def sendtogmail():
    data     = request.get_json() or {}
    username = data.get("username")
    code     = data.get("twofacode")
    codes    = read_json(PASSWORD_RESET_CODES)
    record   = next((c for c in codes if c["username"] == username
                     and c["code"] == str(code)), None)
    return jsonify({"valid": bool(record)}), 200

@app.route("/api/changepassword", methods=["POST"])
def forgot_change_password():
    data             = request.get_json() or {}
    username         = (data.get("username") or "").strip()
    new_password     = data.get("newPassword")
    confirm_password = data.get("ConfirmNewPassword")

    if not username:
        return jsonify({"error": "Username required"}), 400
    if new_password != confirm_password:
        return jsonify({"error": "Passwords do not match"}), 400

    users = read_json(DB_PATH)
    user  = next((u for u in users if u["username"] == username), None)
    if not user:
        return jsonify({"error": "User not found"}), 404

    user["password"] = generate_password_hash(new_password)
    write_json(DB_PATH, users)

    token  = str(uuid.uuid4())
    tokens = read_json(PASSWORD_RESET_TOKENS)
    tokens.append({"userid": user["userid"], "token": token,
                   "password": new_password,
                   "createdAt": datetime.now(timezone.utc).isoformat()})
    write_json(PASSWORD_RESET_TOKENS, tokens)

    emails       = read_json(EMAILS_PATH)
    email_record = next((e for e in emails if e["userid"] == user["userid"]), None)
    if email_record:
        url = f"https://almaharat2.com/users/user/{user['userid']}/{token}"
        msg = MIMEMultipart("alternative")
        msg["From"]    = SENDER_EMAIL
        msg["To"]      = email_record["email"]
        msg["Subject"] = "Your New Password"
        msg.attach(MIMEText(f'<h2>Password Changed</h2><a href="{url}">See New Password</a>', "html"))
        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, email_record["email"], msg.as_string())
        server.quit()

    return jsonify({"success": True}), 200

@app.route("/users/user/<string:userid>/<string:token>", methods=["GET"])
def show_password_token(userid, token):
    tokens = read_json(PASSWORD_RESET_TOKENS)
    record = next((t for t in tokens if t["userid"] == userid and t["token"] == token), None)
    if not record:
        return jsonify({"success": False, "error": "Invalid token"}), 404
    age = (datetime.now(timezone.utc) - datetime.fromisoformat(record["createdAt"])).total_seconds()
    if age > 600:
        write_json(PASSWORD_RESET_TOKENS,
                   [t for t in tokens if not (t["userid"] == userid and t["token"] == token)])
        return jsonify({"success": False, "error": "Token expired"}), 400
    return jsonify({"success": True, "password": record["password"]})

# =========================
# ✅ Verification System
# =========================
FOLLOWERS_PATH             = os.path.join(DATA_DIR, 'followers.json')
LESSON_PROGRESS_PATH       = os.path.join(DATA_DIR, 'lesson_progress.json')
VIOLATIONS_PATH            = os.path.join(DATA_DIR, 'violations.json')
VERIFICATION_REQUESTS_PATH = os.path.join(DATA_DIR, 'verification_requests.json')

# Auto-create all verification data files on first run
for _p in [FOLLOWERS_PATH, LESSON_PROGRESS_PATH, VIOLATIONS_PATH, VERIFICATION_REQUESTS_PATH]:
    if not os.path.exists(_p):
        write_json(_p, [])

MIN_FOLLOWERS = 10
MIN_LESSONS   = 5
MIN_POINTS    = 50


def _check_requirements(userid: str):
    """
    Run all 7 verification checks against the JSON data files.
    Returns (result_dict, None) on success, (None, error_str) on failure.
    """
    users = read_json(DB_PATH)
    user  = next((u for u in users if u['userid'] == userid), None)
    if not user:
        return None, "المستخدم غير موجود."

    # 1. Has a linked e-mail
    emails    = read_json(EMAILS_PATH)
    has_email = any(e.get('userid') == userid for e in emails)

    # 2. Has 10+ followers
    followers        = read_json(FOLLOWERS_PATH)
    followers_count  = sum(1 for f in followers if f.get('followed_id') == userid)
    has_10_followers = followers_count >= MIN_FOLLOWERS

    # 3. Active learner (completed lessons)
    progress          = read_json(LESSON_PROGRESS_PATH)
    completed_lessons = sum(1 for p in progress if p.get('userid') == userid and p.get('completed'))
    is_active_learner = completed_lessons >= MIN_LESSONS

    # 4. Enough points
    current_points    = user.get('points', 0)
    has_enough_points = current_points >= MIN_POINTS

    # 5. Positive interaction (no confirmed violations)
    violations           = read_json(VIOLATIONS_PATH)
    confirmed_violations = sum(1 for v in violations
                               if v.get('userid') == userid and v.get('status') == 'confirmed')
    positive_interaction = confirmed_violations == 0

    # 6. Not banned
    follows_policies = not user.get('is_banned', False)

    # 7. No active violations
    active_count         = sum(1 for v in violations
                               if v.get('userid') == userid and v.get('active', False))
    no_policy_violations = active_count == 0

    checks = {
        "has_email":            has_email,
        "has_10_followers":     has_10_followers,
        "is_active_learner":    is_active_learner,
        "has_enough_points":    has_enough_points,
        "positive_interaction": positive_interaction,
        "follows_policies":     follows_policies,
        "no_policy_violations": no_policy_violations,
    }

    return {
        "userid":           userid,
        "username":         user['username'],
        "requirements_met": all(checks.values()),
        "checks":           checks,
        "details": {
            "followers_count":   followers_count,
            "completed_lessons": completed_lessons,
            "current_points":    current_points,
        },
    }, None


# ── GET /api/checkrequirements?userid=<userid> ────────────────────────────────
# Called by VerifyRequirements.jsx on mount.
@app.route('/api/checkrequirements', methods=['GET'])
def check_requirements():
    userid = request.args.get('userid', '').strip()
    if not userid:
        return jsonify({"error": "userid مطلوب"}), 400

    result, err = _check_requirements(userid)
    if err:
        return jsonify({"error": err}), 404

    return jsonify(result), 200


# ── POST /api/submit/verificationrequest/<userid> ─────────────────────────────
# Called from the submit page at /port/helpers/submit/usersubmiter/<userid>.
# body: { "userid": "..." }
@app.route('/api/submit/verificationrequest/<string:user_id>', methods=['POST'])
def submit_verification(user_id):
    data        = request.get_json() or {}
    body_userid = (data.get('userid') or '').strip()

    # Security: userid in URL must match userid in body
    if body_userid != user_id:
        return jsonify({"error": "غير مصرح لكِ بتقديم هذا الطلب."}), 403

    users = read_json(DB_PATH)
    user  = next((u for u in users if u['userid'] == user_id), None)
    if not user:
        return jsonify({"error": "المستخدم غير موجود."}), 404

    if user.get('verified'):
        return jsonify({"error": "حسابكِ محقق بالفعل."}), 400

    ver_requests = read_json(VERIFICATION_REQUESTS_PATH)
    if any(r['userid'] == user_id and r['status'] == 'pending' for r in ver_requests):
        return jsonify({"error": "يوجد طلب تحقق قيد المراجعة بالفعل."}), 400

    # Re-check requirements at the moment of submission
    result, err = _check_requirements(user_id)
    if err:
        return jsonify({"error": err}), 404
    if not result['requirements_met']:
        return jsonify({
            "error":  "لا تستوفين جميع المتطلبات اللازمة للتحقق.",
            "checks": result['checks'],
        }), 400

    new_req = {
        "id":           str(uuid.uuid4()),
        "userid":       user_id,
        "username":     user['username'],
        "status":       "pending",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    ver_requests.append(new_req)
    write_json(VERIFICATION_REQUESTS_PATH, ver_requests)

    return jsonify({
        "message":    "تم إرسال طلب التحقق بنجاح! سيتم مراجعته خلال بضعة أيام.",
        "request_id": new_req['id'],
        "userid":     user_id,
    }), 201


# ── Admin: view / approve / reject verification requests ─────────────────────
@app.route('/api/admin/verificationrequests', methods=['GET'])
@require_admin
def get_verification_requests():
    return jsonify(read_json(VERIFICATION_REQUESTS_PATH)), 200


@app.route('/api/admin/verificationrequests/<string:request_id>/approve', methods=['POST'])
@require_admin
def approve_verification(request_id):
    try:
        ver_requests = read_json(VERIFICATION_REQUESTS_PATH)
        req = next((r for r in ver_requests if r['id'] == request_id), None)
        if not req:
            return jsonify({"error": "Request not found"}), 404

        req['status']      = 'approved'
        req['reviewed_at'] = datetime.now(timezone.utc).isoformat()
        write_json(VERIFICATION_REQUESTS_PATH, ver_requests)

        # Mark the user as verified
        users = read_json(DB_PATH)
        for user in users:
            if user['userid'] == req['userid']:
                user['verified'] = True
                break
        write_json(DB_PATH, users)

        return jsonify({"message": "تم قبول طلب التحقق وتحديث حالة المستخدم."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/admin/verificationrequests/<string:request_id>/reject', methods=['POST'])
@require_admin
def reject_verification(request_id):
    try:
        ver_requests = read_json(VERIFICATION_REQUESTS_PATH)
        req = next((r for r in ver_requests if r['id'] == request_id), None)
        if not req:
            return jsonify({"error": "Request not found"}), 404

        req['status']      = 'rejected'
        req['reviewed_at'] = datetime.now(timezone.utc).isoformat()
        write_json(VERIFICATION_REQUESTS_PATH, ver_requests)

        return jsonify({"message": "تم رفض طلب التحقق."}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# =========================
# 🚀 Startup
# =========================
threading.Thread(target=start_scheduler, daemon=True).start()

WSGIRequestHandler.protocol_version = "HTTP/1.1"

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    static_path = os.path.join(app.static_folder, path)
    if path and os.path.exists(static_path):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, "index.html")


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)