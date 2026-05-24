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
import time
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from apscheduler.schedulers.background import BackgroundScheduler

app = Flask(
    __name__,
    static_folder="static",
    static_url_path=""
)

# =========================
# ✅ CORS — flask-cors
# =========================
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://almaharat.ngrok.app",
    "https://api.almaharat2.com",
]

CORS(
    app,
    origins=ALLOWED_ORIGINS,
    supports_credentials=True,
    allow_headers=["Content-Type", "X-Admin-Token", "ngrok-skip-browser-warning"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    expose_headers=["Content-Type"],
)

# ✅ Needed so flask-cors attaches headers to preflight OPTIONS too
@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return app.make_default_options_response()

# =========================
# 📂 إعداد المسارات الموحدة
# =========================
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(BASE_DIR, 'Data')
IMAGES_DIR = os.path.join(DATA_DIR, 'images')

os.makedirs(DATA_DIR,   exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)

DB_PATH = os.path.join(DATA_DIR, 'Accounts.json')
EMAILS_PATH = os.path.join(DATA_DIR, 'emails.json')

SENDER_EMAIL = "hipermr9@gmail.com"
SENDER_PASSWORD = "fguj cmet zxgq fllm"

MESSAGES = [
    {
        "title": "توجد العاب جميلة موجودة في المهارات العبها الأن!",
        "body": "تواجد العاب جميلة جدا في موقع المهارات العبها الأن!\nافضل الألعاب عن الرياضيات مثل: هندسة, الخ...\nفا لا تضيع الفرصة العبها الأن!!"
    },
    {
        "title": "تحديث جديد 🔥",
        "body": "توجد ألعاب جديدة ممتعة تم إضافتها 🎮\nلا تفوت التجربة!"
    }
]

app.config['UPLOAD_FOLDER'] = IMAGES_DIR
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'pdf', 'mp4', 'mp3'}

# =========================
# 🔧 أدوات التعامل مع الملفات
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
    """Return user dict without the password field."""
    return {k: v for k, v in user.items() if k != 'password'}

# =========================
# 🔐 Auth Middleware
# =========================
def require_admin(f):
    """
    Simple token-based admin guard.
    Pass  X-Admin-Token: <admin_password>  header, or set
    ADMIN_TOKEN env var (defaults to 'changeme' for dev).
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token       = request.headers.get('X-Admin-Token', '')
        admin_token = os.environ.get('ADMIN_TOKEN', 'changeme')
        if token != admin_token:
            return jsonify({"error": "Unauthorized"}), 403
        return f(*args, **kwargs)
    return decorated

# =========================
# 🖼️ عرض الصور
# =========================
@app.route('/uploads/<filename>')
def serve_image(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

# =========================
# 🔐 نظام الحسابات (Auth)
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
        "userid":   str(uuid.uuid4()),
        "username": username,
        "password": generate_password_hash(password),
        "points":   0,
        "role":     "user"
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
        users      = read_json(DB_PATH)
        safe_users = [safe_user(u) for u in users]
        return jsonify(safe_users), 200
    except Exception as e:
        print("❌ ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

# ✅ userid is a UUID string — removed int() cast
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
        print("❌ ERROR:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/admin/update_points", methods=["POST"])
@require_admin
def update_points():
    try:
        data      = request.get_json()
        userid    = data.get("userid")
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
        print("❌ ERROR:", str(e))
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/save-email', methods=['POST'])
def save_email():
    try:
        data = request.get_json() or {}
        email = (data.get("email") or "").strip().lower()
        userid = data.get("userid")

        if not email or "@" not in email:
            return jsonify({"error": "Invalid email"}), 400

        emails = read_json(EMAILS_PATH)

        # منع التكرار
        if any(e.get("email") == email for e in emails):
            return jsonify({"message": "Email already exists"}), 200

        new_email = {
            "id": str(uuid.uuid4()),
            "userid": userid,
            "email": email,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }

        emails.append(new_email)
        write_json(EMAILS_PATH, emails)

        return jsonify({"message": "Email saved"}), 201

    except Exception as e:
        print("❌ ERROR:", str(e))
        return jsonify({"error": str(e)}), 500
    
# =========================
# 📤 Send Email
# =========================
def send_email(to_email, title, body):
    msg = MIMEMultipart()
    msg["From"] = SENDER_EMAIL
    msg["To"] = to_email
    msg["Subject"] = title

    msg.attach(MIMEText(body, "plain"))

    server = smtplib.SMTP("smtp.gmail.com", 587)
    server.starttls()
    server.login(SENDER_EMAIL, SENDER_PASSWORD)
    server.sendmail(SENDER_EMAIL, to_email, msg.as_string())
    server.quit()

# =========================
# 📬 Send to all emails
# =========================
def send_to_all_emails():
    emails = read_json(EMAILS_PATH)

    if not emails:
        print("No emails found")
        return

    msg = random.choice(MESSAGES)

    for e in emails:
        email = e.get("email")
        if not email:
            continue

        try:
            send_email(email, msg["title"], msg["body"])
            print("Sent:", email)
        except Exception as err:
            print("Failed:", email, err)

def start_scheduler():
    scheduler = BackgroundScheduler()

    def job():
        print("📨 Sending scheduled emails...")
        send_to_all_emails()

    scheduler.add_job(job, 'interval', hours=5)
    scheduler.start()
    print("✅ Scheduler started: sending emails every 5 hours.")

    # Keep the scheduler alive
    try:
        # Run forever; main thread stays alive to support background scheduler
        while True:
            threading.Event().wait(60)  # Sleep for 60 seconds
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown()
        print("🛑 Scheduler shut down.")


# =========================
# 📂 Enrichments Setup
# =========================
ENRICHMENTS_PATH   = os.path.join(DATA_DIR, 'enrichments.json')
DOCUMENTS_DIR      = os.path.join(DATA_DIR, 'documents')
VIDEOS_DIR         = os.path.join(DATA_DIR, 'videos')
 
os.makedirs(DOCUMENTS_DIR, exist_ok=True)
os.makedirs(VIDEOS_DIR,    exist_ok=True)
 
ALLOWED_ENRICHMENT_EXTENSIONS = {
    'png', 'jpg', 'jpeg', 'gif', 'webp',   # images
    'pdf',                                   # documents
    'mp4', 'webm', 'mov',                    # videos
    'mp3',                                   # audio
}
 
def allowed_enrichment_file(filename):
    return (
        '.' in filename
        and filename.rsplit('.', 1)[1].lower() in ALLOWED_ENRICHMENT_EXTENSIONS
    )
 
def get_file_type(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    if ext in {'png', 'jpg', 'jpeg', 'gif', 'webp'}:
        return 'image'
    if ext == 'pdf':
        return 'pdf'
    if ext in {'mp4', 'webm', 'mov'}:
        return 'video'
    if ext == 'mp3':
        return 'audio'
    return 'file'
 
def get_upload_dir(file_type):
    dirs = {
        'image': IMAGES_DIR,
        'pdf':   DOCUMENTS_DIR,
        'video': VIDEOS_DIR,
        'audio': VIDEOS_DIR,
        'file':  DATA_DIR,
    }
    return dirs.get(file_type, DATA_DIR)
 
def get_file_url(file_type, filename, base_url):
    paths = {
        'image': f'{base_url}/uploads/images/{filename}',
        'pdf':   f'{base_url}/uploads/documents/{filename}',
        'video': f'{base_url}/uploads/videos/{filename}',
        'audio': f'{base_url}/uploads/videos/{filename}',
        'file':  f'{base_url}/uploads/{filename}',
    }
    return paths.get(file_type, f'{base_url}/uploads/{filename}')
 
 
# =========================
# 📂 Static File Routes
# =========================
@app.route('/uploads/images/<filename>')
def serve_enrichment_image(filename):
    return send_from_directory(IMAGES_DIR, filename)
 
@app.route('/uploads/documents/<filename>')
def serve_enrichment_document(filename):
    return send_from_directory(DOCUMENTS_DIR, filename)
 
@app.route('/uploads/videos/<filename>')
def serve_enrichment_video(filename):
    return send_from_directory(VIDEOS_DIR, filename)
 
 
# =========================
# ➕ Add Enrichment
# =========================
@app.route('/api/admin/enrichments/add', methods=['POST'])
@require_admin
def add_enrichment():
    try:
        title       = (request.form.get('title') or '').strip()
        description = (request.form.get('description') or '').strip()
        e_type      = (request.form.get('type') or '').strip()   # video | pdf | image | link | audio
        link        = (request.form.get('link') or '').strip()   # used when type == 'link'
        file        = request.files.get('file')                   # used for upload types
 
        if not title:
            return jsonify({"error": "Title is required"}), 400
        if not e_type:
            return jsonify({"error": "Type is required"}), 400
 
        content = ''
 
        if e_type == 'link':
            if not link:
                return jsonify({"error": "Link is required for type 'link'"}), 400
            content = link
 
        elif file:
            if not allowed_enrichment_file(file.filename):
                return jsonify({"error": "File type not allowed"}), 400
 
            file_type  = get_file_type(file.filename)
            upload_dir = get_upload_dir(file_type)
            filename   = str(uuid.uuid4()) + '_' + secure_filename(file.filename)
            file.save(os.path.join(upload_dir, filename))
 
            base_url = request.host_url.rstrip('/')
            content  = get_file_url(file_type, filename, base_url)
 
        else:
            return jsonify({"error": "Either a file or a link is required"}), 400
 
        enrichments = read_json(ENRICHMENTS_PATH)
 
        new_id = max((e.get('id', 0) for e in enrichments), default=0) + 1
 
        new_enrichment = {
            "id":          new_id,
            "title":       title,
            "description": description,
            "type":        e_type,
            "content":     content,
            "createdAt":   datetime.now(timezone.utc).isoformat()
        }
 
        enrichments.append(new_enrichment)
        write_json(ENRICHMENTS_PATH, enrichments)
 
        return jsonify({"message": "Enrichment added", "enrichment": new_enrichment}), 201
 
    except Exception as e:
        print("❌ ERROR add_enrichment:", e)
        return jsonify({"error": str(e)}), 500
 
 
# =========================
# ✏️ Edit Enrichment
# =========================
@app.route('/api/admin/enrichments/edit/<int:enrichment_id>', methods=['PUT'])
@require_admin
def edit_enrichment(enrichment_id):
    try:
        title       = (request.form.get('title') or '').strip()
        description = (request.form.get('description') or '').strip()
        e_type      = (request.form.get('type') or '').strip()
        link        = (request.form.get('link') or '').strip()
        file        = request.files.get('file')
 
        enrichments = read_json(ENRICHMENTS_PATH)
        enrichment  = next((e for e in enrichments if e.get('id') == enrichment_id), None)
 
        if enrichment is None:
            return jsonify({"error": "Enrichment not found"}), 404
 
        if title:
            enrichment['title'] = title
        if description:
            enrichment['description'] = description
        if e_type:
            enrichment['type'] = e_type
 
        if e_type == 'link' and link:
            enrichment['content'] = link
 
        elif file:
            if not allowed_enrichment_file(file.filename):
                return jsonify({"error": "File type not allowed"}), 400
 
            file_type  = get_file_type(file.filename)
            upload_dir = get_upload_dir(file_type)
            filename   = str(uuid.uuid4()) + '_' + secure_filename(file.filename)
            file.save(os.path.join(upload_dir, filename))
 
            base_url            = request.host_url.rstrip('/')
            enrichment['content'] = get_file_url(file_type, filename, base_url)
 
        enrichment['updatedAt'] = datetime.now(timezone.utc).isoformat()
 
        write_json(ENRICHMENTS_PATH, enrichments)
        return jsonify({"message": "Enrichment updated", "enrichment": enrichment}), 200
 
    except Exception as e:
        print("❌ ERROR edit_enrichment:", e)
        return jsonify({"error": str(e)}), 500
 
 
# =========================
# 🗑️ Delete Enrichment
# =========================
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
        print("❌ ERROR delete_enrichment:", e)
        return jsonify({"error": str(e)}), 500
 
 
# =========================
# 📋 Get All Enrichments
# =========================
@app.route('/api/enrichments', methods=['GET'])
def get_all_enrichments():
    try:
        enrichments = read_json(ENRICHMENTS_PATH)
        return jsonify(enrichments), 200
    except Exception as e:
        print("❌ ERROR get_all_enrichments:", e)
        return jsonify({"error": str(e)}), 500
 
 
# =========================
# 🔍 Get Enrichment By ID
# =========================
@app.route('/api/enrichments/<int:enrichment_id>', methods=['GET'])
def get_enrichment_by_id(enrichment_id):
    try:
        enrichments = read_json(ENRICHMENTS_PATH)
        enrichment  = next((e for e in enrichments if e.get('id') == enrichment_id), None)
 
        if enrichment is None:
            return jsonify({"error": "Enrichment not found"}), 404
 
        return jsonify(enrichment), 200
 
    except Exception as e:
        print("❌ ERROR get_enrichment_by_id:", e)
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/health')
def health():
    return {"status": "ok"}, 200

@app.route("/api/get-settings/<string:userid>", methods=["GET"])
def get_settings(userid):
    users = read_json(DB_PATH)

    user = next((u for u in users if u["userid"] == userid), None)

    if not user:
        return jsonify({"error": "User not found"}), 404

    return jsonify({
        "mailEnabled": user.get("mailEnabled", False),
        "twoFA": user.get("twoFA", False)
    })

@app.route("/api/update-setting", methods=["POST"])
def update_setting():
    data = request.get_json()

    userid = data.get("userid")
    key = data.get("key")
    value = data.get("value")

    allowed = ["mailEnabled", "twoFA"]

    if key not in allowed:
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
    data = request.get_json()
    userid = data.get("userid")

    users = read_json(DB_PATH)
    new_users = [u for u in users if u["userid"] != userid]

    if len(new_users) == len(users):
        return jsonify({"error": "User not found"}), 404

    write_json(DB_PATH, new_users)

    return jsonify({"success": True})

@app.route("/api/change-password", methods=["POST"])
def change_password():
    data = request.get_json()

    userid = data.get("userid")
    old = data.get("oldPassword")
    new = data.get("newPassword")

    users = read_json(DB_PATH)

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
    data = request.get_json()

    userid = data.get("userid")
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

# All APIs For Posts.
# =========================
# 📮 Posts System
# =========================
POSTS_PATH  = os.path.join(DATA_DIR, 'posts.json')
POSTS_MEDIA = os.path.join(DATA_DIR, 'posts_media')

os.makedirs(POSTS_MEDIA, exist_ok=True)

ALLOWED_POST_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'mp4', 'webm', 'mov'}

def allowed_post_file(filename):
    return (
        '.' in filename
        and filename.rsplit('.', 1)[1].lower() in ALLOWED_POST_EXTENSIONS
    )

def get_post_media_type(filename):
    ext = filename.rsplit('.', 1)[1].lower()
    return 'video' if ext in {'mp4', 'webm', 'mov'} else 'image'


# ─── Serve post media ────────────────────────────────────────────────────────
@app.route('/uploads/posts/<filename>')
def serve_post_media(filename):
    return send_from_directory(POSTS_MEDIA, filename)


# ─── GET /api/posts  (public posts only) ─────────────────────────────────────
@app.route('/api/posts', methods=['GET'])
def get_posts():
    try:
        posts = read_json(POSTS_PATH)
        public = [p for p in posts if p.get('visibility') == 'public']
        # newest first
        public.sort(key=lambda p: p.get('createdAt', ''), reverse=True)
        return jsonify(public), 200
    except Exception as e:
        print("❌ ERROR get_posts:", e)
        return jsonify({"error": str(e)}), 500


# ─── GET /api/posts/<post_id> ─────────────────────────────────────────────────
@app.route('/api/posts/<string:post_id>', methods=['GET'])
def get_post_by_id(post_id):
    try:
        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == post_id), None)
        if post is None:
            return jsonify({"error": "Post not found"}), 404
        return jsonify(post), 200
    except Exception as e:
        print("❌ ERROR get_post_by_id:", e)
        return jsonify({"error": str(e)}), 500


# ─── GET /api/posts/user/<userid> ────────────────────────────────────────────
@app.route('/api/posts/user/<string:userid>', methods=['GET'])
def get_posts_by_user(userid):
    try:
        posts      = read_json(POSTS_PATH)
        user_posts = [p for p in posts if p.get('userid') == userid]
        user_posts.sort(key=lambda p: p.get('createdAt', ''), reverse=True)
        return jsonify(user_posts), 200
    except Exception as e:
        print("❌ ERROR get_posts_by_user:", e)
        return jsonify({"error": str(e)}), 500


# ─── POST /api/posts/add ─────────────────────────────────────────────────────
#   multipart/form-data fields:
#     userid      (required)
#     username    (required)
#     title       (required)
#     description
#     hashtags    – comma-separated string  e.g. "رياضيات,علوم"
#     visibility  – "public" | "private" | "link"   (default: public)
#     files[]     – one or more media files (optional)
@app.route('/api/posts/add', methods=['POST'])
def add_post():
    try:
        userid     = (request.form.get('userid')     or '').strip()
        username   = (request.form.get('username')   or '').strip()
        title      = (request.form.get('title')      or '').strip()
        description= (request.form.get('description')or '').strip()
        raw_tags   = (request.form.get('hashtags')   or '').strip()
        visibility = (request.form.get('visibility') or 'public').strip()

        if not userid or not username:
            return jsonify({"error": "userid and username are required"}), 400
        if not title:
            return jsonify({"error": "title is required"}), 400
        if visibility not in ('public', 'private', 'link'):
            return jsonify({"error": "Invalid visibility value"}), 400

        hashtags = [t.strip() for t in raw_tags.split(',') if t.strip()] if raw_tags else []

        # Handle uploaded media files
        media = []
        uploaded_files = request.files.getlist('files[]')
        for file in uploaded_files:
            if file and file.filename and allowed_post_file(file.filename):
                media_type = get_post_media_type(file.filename)
                filename   = str(uuid.uuid4()) + '_' + secure_filename(file.filename)
                file.save(os.path.join(POSTS_MEDIA, filename))
                base_url   = request.host_url.rstrip('/')
                media.append({
                    "type": media_type,
                    "url":  f"{base_url}/uploads/posts/{filename}"
                })

        post_id = str(uuid.uuid4())
        new_post = {
            "id":          post_id,
            "userid":      userid,
            "username":    username,
            "title":       title,
            "description": description,
            "hashtags":    hashtags,
            "visibility":  visibility,
            "media":       media,
            "likes":       [],       # list of userids
            "dislikes":    [],       # list of userids
            "comments":    [],
            "createdAt":   datetime.now(timezone.utc).isoformat()
        }

        posts = read_json(POSTS_PATH)
        posts.append(new_post)
        write_json(POSTS_PATH, posts)

        return jsonify({"message": "Post created", "post": new_post}), 201

    except Exception as e:
        print("❌ ERROR add_post:", e)
        return jsonify({"error": str(e)}), 500


# ─── POST /api/posts/<post_id>/like ──────────────────────────────────────────
#   body: { "userid": "..." }
@app.route('/api/posts/<string:post_id>/like', methods=['POST'])
def like_post(post_id):
    try:
        data   = request.get_json() or {}
        userid = (data.get('userid') or '').strip()
        if not userid:
            return jsonify({"error": "userid required"}), 400

        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == post_id), None)
        if post is None:
            return jsonify({"error": "Post not found"}), 404

        # Toggle like; remove dislike if present
        if userid in post['likes']:
            post['likes'].remove(userid)
        else:
            post['likes'].append(userid)
            if userid in post['dislikes']:
                post['dislikes'].remove(userid)

        write_json(POSTS_PATH, posts)
        return jsonify({"likes": len(post['likes']), "dislikes": len(post['dislikes'])}), 200

    except Exception as e:
        print("❌ ERROR like_post:", e)
        return jsonify({"error": str(e)}), 500


# ─── POST /api/posts/<post_id>/dislike ───────────────────────────────────────
#   body: { "userid": "..." }
@app.route('/api/posts/<string:post_id>/dislike', methods=['POST'])
def dislike_post(post_id):
    try:
        data   = request.get_json() or {}
        userid = (data.get('userid') or '').strip()
        if not userid:
            return jsonify({"error": "userid required"}), 400

        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == post_id), None)
        if post is None:
            return jsonify({"error": "Post not found"}), 404

        # Toggle dislike; remove like if present
        if userid in post['dislikes']:
            post['dislikes'].remove(userid)
        else:
            post['dislikes'].append(userid)
            if userid in post['likes']:
                post['likes'].remove(userid)

        write_json(POSTS_PATH, posts)
        return jsonify({"likes": len(post['likes']), "dislikes": len(post['dislikes'])}), 200

    except Exception as e:
        print("❌ ERROR dislike_post:", e)
        return jsonify({"error": str(e)}), 500


# ─── POST /api/posts/<post_id>/comment ───────────────────────────────────────
#   body: { "userid": "...", "username": "...", "text": "..." }
@app.route('/api/posts/<string:post_id>/comment', methods=['POST'])
def comment_on_post(post_id):
    try:
        data     = request.get_json() or {}
        userid   = (data.get('userid')   or '').strip()
        username = (data.get('username') or '').strip()
        text     = (data.get('text')     or '').strip()

        if not userid or not username:
            return jsonify({"error": "userid and username required"}), 400
        if not text:
            return jsonify({"error": "comment text is required"}), 400

        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == post_id), None)
        if post is None:
            return jsonify({"error": "Post not found"}), 404

        comment = {
            "id":        str(uuid.uuid4()),
            "userid":    userid,
            "username":  username,
            "text":      text,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }
        post['comments'].append(comment)
        write_json(POSTS_PATH, posts)

        return jsonify({"message": "Comment added", "comment": comment}), 201

    except Exception as e:
        print("❌ ERROR comment_on_post:", e)
        return jsonify({"error": str(e)}), 500


# ─── DELETE /api/posts/<post_id>/comment/<comment_id> ────────────────────────
#   body: { "userid": "..." }   owner of comment can delete
@app.route('/api/posts/<string:post_id>/comment/<string:comment_id>', methods=['DELETE'])
def delete_comment(post_id, comment_id):
    try:
        data   = request.get_json() or {}
        userid = (data.get('userid') or '').strip()

        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == post_id), None)
        if post is None:
            return jsonify({"error": "Post not found"}), 404

        comment = next((c for c in post['comments'] if c['id'] == comment_id), None)
        if comment is None:
            return jsonify({"error": "Comment not found"}), 404

        if comment['userid'] != userid:
            return jsonify({"error": "Unauthorized"}), 403

        post['comments'] = [c for c in post['comments'] if c['id'] != comment_id]
        write_json(POSTS_PATH, posts)

        return jsonify({"message": "Comment deleted"}), 200

    except Exception as e:
        print("❌ ERROR delete_comment:", e)
        return jsonify({"error": str(e)}), 500


# ─── DELETE /api/posts/<post_id> ─────────────────────────────────────────────
#   body: { "userid": "..." }   post owner can delete
@app.route('/api/posts/<string:post_id>', methods=['DELETE'])
def delete_post(post_id):
    try:
        data   = request.get_json() or {}
        userid = (data.get('userid') or '').strip()

        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == post_id), None)
        if post is None:
            return jsonify({"error": "Post not found"}), 404

        if post['userid'] != userid:
            return jsonify({"error": "Unauthorized"}), 403

        new_posts = [p for p in posts if p['id'] != post_id]
        write_json(POSTS_PATH, new_posts)

        return jsonify({"message": "Post deleted"}), 200

    except Exception as e:
        print("❌ ERROR delete_post:", e)
        return jsonify({"error": str(e)}), 500

# Run scheduler in a background thread
threading.Thread(target=start_scheduler, daemon=True).start()

WSGIRequestHandler.protocol_version = "HTTP/1.1"

STATIC_FOLDER = os.path.join(os.path.dirname(__file__), "static")

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_frontend(path):
    static_path = os.path.join(app.static_folder, path)

    if path and os.path.exists(static_path):
        return send_from_directory(app.static_folder, path)

    return send_from_directory(app.static_folder, "index.html")

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)