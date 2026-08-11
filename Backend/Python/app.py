import os
import re
import json
import uuid
from datetime import datetime, timezone
from functools import wraps
from flask import Flask, request, jsonify, send_from_directory, session
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
import requests
from pathlib import Path
import hmac

app = Flask(__name__)   # ← KILLS everything above it

app.secret_key = "gorta-super-secret-key-2026"

# FIX #1 — Session cookie config must live at app-level, not inside a route.
#           Setting these inside login() has no effect on the outgoing response.
app.config["SESSION_COOKIE_NAME"]     = "DONT-SHARE-THAT-COOKIE"
app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "None"
app.config["SESSION_COOKIE_SECURE"]   = True

app.config['MAIL_SERVER']         = 'smtp.gmail.com'
app.config['MAIL_PORT']           = 587
app.config['MAIL_USE_TLS']        = True
app.config['MAIL_USERNAME']       = 'hipermr9@gmail.com'
app.config['MAIL_PASSWORD']       = 'bcij rdvo rpov hsgp'
app.config['MAIL_DEFAULT_SENDER'] = 'hipermr9@gmail.com'

ALLOWED_ORIGINS = [
    "https://www.almaharat2.com",
    "https://almaharat2.com",
    "https://storage.almaharat2.com",
    "http://localhost:3000",
    "http://localhost:5173"
]

CORS(app, resources={
    r"/*": {
        "origins": ALLOWED_ORIGINS,
        "allow_headers": [
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "ngrok-skip-browser-warning",
            "X-Admin-Token",
            "X-Owner-Token"
        ],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    }
}, supports_credentials=True)

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin")
    if origin and origin in ALLOWED_ORIGINS:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Headers"] = ", ".join([
            "Content-Type",
            "Authorization",
            "X-Requested-With",
            "Accept",
            "ngrok-skip-browser-warning",
            "X-Admin-Token",
            "X-Owner-Token"
        ])
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

# Ensure all routes and preflight requests get the CORS headers.

# =========================
# 📂 Paths
# =========================
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
DATA_DIR   = os.path.join(BASE_DIR, 'Data')
IMAGES_DIR = os.path.join(DATA_DIR, 'images')
USERS_ICON_DIR        = os.path.join(DATA_DIR, 'users_icon')

os.makedirs(DATA_DIR,   exist_ok=True)
os.makedirs(IMAGES_DIR, exist_ok=True)
os.makedirs(USERS_ICON_DIR, exist_ok=True)

DB_PATH               = os.path.join(DATA_DIR, 'Accounts.json')
EMAILS_PATH           = os.path.join(DATA_DIR, 'emails.json')
PASSWORD_RESET_CODES  = os.path.join(DATA_DIR, 'password_reset_codes.json')
PASSWORD_RESET_TOKENS = os.path.join(DATA_DIR, 'password_reset_tokens.json')
EMAIL_VERIFICATION_CODES = os.path.join(DATA_DIR, 'email_verification_codes.json')
TWOFA_CODES           = os.path.join(DATA_DIR, 'twofa_codes.json')
IN_WORKING_PAGES_PATH = os.path.join(DATA_DIR, 'In_WorkingPages.json')
BLOCKED_PAGES_PATH    = os.path.join(DATA_DIR, 'BlockedPages.json')
ONLINE_PATH           = os.path.join(DATA_DIR, 'online.json')
LINKONLY_POSTS_PATH   = os.path.join(DATA_DIR, 'linkonlyposts_link.json')

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

ADMIN_SECRET = "changeme"
OWNER_SECRET = "OWNER_TOKEN_2026"

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

def get_user_from_session():
    userid = session.get('userid')
    if not userid:
        return None
    users = read_json(DB_PATH)
    return next((u for u in users if str(u.get('userid')) == str(userid)), None)


def cleanup_expired_codes(path, max_age_seconds=900):
    codes = read_json(path)
    now = datetime.now(timezone.utc)
    valid = []
    for record in codes:
        created = record.get('createdAt')
        try:
            if created and (now - datetime.fromisoformat(created)).total_seconds() <= max_age_seconds:
                valid.append(record)
        except Exception:
            pass
    if len(valid) != len(codes):
        write_json(path, valid)
    return valid

def safe_user(user):
    return {k: v for k, v in user.items() if k != 'password'}

# Initialise files that must always exist
for _p in [PASSWORD_RESET_CODES, PASSWORD_RESET_TOKENS, EMAIL_VERIFICATION_CODES, TWOFA_CODES, IN_WORKING_PAGES_PATH, BLOCKED_PAGES_PATH, ONLINE_PATH, LINKONLY_POSTS_PATH]:
    if not os.path.exists(_p):
        write_json(_p, [])

# =========================
# 🔐 Admin guard
# =========================
def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('X-Admin-Token', '')
        admin_token = os.environ.get('ADMIN_TOKEN')
        if admin_token and hmac.compare_digest(token, admin_token):
            return f(*args, **kwargs)

        user = get_user_from_session()
        if user and user.get('role') in ('admin', 'owner'):
            return f(*args, **kwargs)

        return jsonify({"error": "Unauthorized"}), 403
    return decorated


# =========================
# 🔐 Owner guard
# =========================
def require_owner(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # First allow an explicit owner token (useful for scripts)
        token = request.headers.get('X-Owner-Token', '')
        owner_token = os.environ.get('OWNER_TOKEN')

        print("!!! THIS FUNCTION IS RUNNING !!!")
        print(f"DEBUG received: [{token}]")
        print(f"DEBUG expected: [{owner_token}]")
        print(f"DEBUG match: {token == owner_token}")

        if owner_token and token and hmac.compare_digest(token, owner_token):
            return f(*args, **kwargs)

        # Otherwise allow an admin token too
        admin_token = os.environ.get('ADMIN_TOKEN')
        admin_header = request.headers.get('X-Admin-Token', '')
        if admin_token and admin_header and hmac.compare_digest(admin_header, admin_token):
            return f(*args, **kwargs)

        # Otherwise require a logged-in account with role == 'owner'
        userid = session.get('userid')
        if userid:
            users = read_json(DB_PATH)
            user = next((u for u in users if u.get('userid') == userid), None)
            if user and user.get('role') == 'owner':
                return f(*args, **kwargs)
                
        return jsonify({"error": "Unauthorized"}), 403
    return decorated

def require_admin_or_owner(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        admin_header = request.headers.get("X-Admin-Token")
        owner_header = request.headers.get("X-Owner-Token")

        admin_secret = os.environ.get("ADMIN_TOKEN")
        owner_secret = os.environ.get("OWNER_TOKEN")

        print("Admin Header :", admin_header)
        print("Admin Secret :", admin_secret)
        print("Owner Header :", owner_header)
        print("Owner Secret :", owner_secret)

        if admin_secret and hmac.compare_digest(admin_header or "", admin_secret):
            return f(*args, **kwargs)

        if owner_secret and hmac.compare_digest(owner_header or "", owner_secret):
            return f(*args, **kwargs)

        user = get_user_from_session()
        if user and user.get('role') in ('admin', 'owner'):
            return f(*args, **kwargs)

        return jsonify({"error": "Forbidden"}), 403

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
    data         = request.json or {}
    raw_username = (data.get('username') or '').strip()
    password     = data.get('password') or ''

    if not raw_username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
    if raw_username != raw_username.lower():
        return jsonify({"error": "Username must be lowercase only"}), 400
    if not re.match(r'^[a-z0-9_]+$', raw_username):
        return jsonify({"error": "Username may only contain lowercase letters, numbers, and underscores"}), 400

    username = raw_username
    accounts = read_json(DB_PATH)
    if any(acc['username'] == username for acc in accounts):
        return jsonify({"error": "Username already exists"}), 400

    new_user = {
        "userid":         str(uuid.uuid4()),
        "username":       username,
        "password":       generate_password_hash(password),
        "points":         0,
        "role":           "user",
        "verified":       False,
        "is_banned":      False,
        "chats":          {},
        "followers":      {},
        "lesson_progress": 0,
        "following":      {},
        "Friends":        [],
        "notification":   [],
        "profile_picture": "",
        "mailEnabled":    False,
        "twoFA":          False
    }
    accounts.append(new_user)
    write_json(DB_PATH, accounts)
    return jsonify({"message": "Account created"}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data     = request.json or {}
    username = (data.get('username') or '').strip().lower()
    password = data.get('password') or ''

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400

    accounts = read_json(DB_PATH)
    user     = next((acc for acc in accounts if acc['username'] == username), None)

    if not user:
        return jsonify({"error": "Invalid username or password"}), 401

    if user.get("is_banned"):
        return jsonify({"error": "This account is banned"}), 402

    if not check_password_hash(user['password'], password):
        return jsonify({"error": "Invalid username or password"}), 401

    if user.get("role") == "owner":
        session["OWNER_TOKEN"] = "OWNER_TOKEN_2026"

    if user.get("twoFA"):
        email_record = next((e for e in read_json(EMAILS_PATH)
                             if str(e.get('userid')) == str(user['userid'])), None)
        if not email_record or not email_record.get('verified', False):
            return jsonify({"error": "التحقق الثنائي مفعل ولا يوجد بريد إلكتروني موثق. رجاءً تحقق من بريدك أولاً."}), 400

        code = str(random.randint(100000, 999999))
        codes = [c for c in read_json(TWOFA_CODES) if str(c.get('userid')) != str(user['userid'])]
        codes.append({
            "userid": user['userid'],
            "code": code,
            "createdAt": datetime.now(timezone.utc).isoformat()
        })
        write_json(TWOFA_CODES, codes)
        send_email(email_record['email'], "كود الدخول إلى منصة المهارات", f"رمز التحقق الخاص بك هو: {code}")
        return jsonify({"twoFA_required": True, "userid": user["userid"]}), 200

    session["userid"] = user["userid"]
    session["DONT-SHARE-THAT-COOKIE"] = user
    try:
        update_online(user["userid"], user.get("username", ""))
    except Exception:
        pass
    return jsonify({"user": safe_user(user)}), 200

@app.route('/api/login-2fa', methods=['POST'])
def login_2fa():
    data   = request.json or {}
    userid = str(data.get('userid') or '').strip()
    code   = str(data.get('code') or '').strip()

    if not userid or not code:
        return jsonify({"error": "userid and code are required"}), 400

    codes = cleanup_expired_codes(TWOFA_CODES)
    record = next((c for c in codes if str(c.get('userid')) == userid and c.get('code') == code), None)
    if not record:
        return jsonify({"error": "Invalid or expired verification code"}), 400

    users = read_json(DB_PATH)
    user  = next((acc for acc in users if str(acc.get('userid')) == userid), None)
    if not user:
        return jsonify({"error": "User not found"}), 404

    email_record = next((e for e in read_json(EMAILS_PATH) if str(e.get('userid')) == userid), None)
    if not email_record or not email_record.get('verified', False):
        return jsonify({"error": "Email must be verified before logging in with 2FA"}), 400

    session["userid"] = user["userid"]
    session["DONT-SHARE-THAT-COOKIE"] = user
    try:
        update_online(user["userid"], user.get("username", ""))
    except Exception:
        pass

    remaining = [c for c in codes if not (str(c.get('userid')) == userid and c.get('code') == code)]
    write_json(TWOFA_CODES, remaining)
    return jsonify({"user": safe_user(user)}), 200

@app.route('/api/verify-email', methods=['POST'])
def verify_email():
    data   = request.json or {}
    userid = str(data.get('userid') or '').strip()
    code   = str(data.get('code') or '').strip()

    if not userid or not code:
        return jsonify({"error": "userid and code are required"}), 400

    records = read_json(EMAIL_VERIFICATION_CODES)
    record  = next((r for r in records if str(r.get('userid')) == userid and r.get('code') == code), None)
    if not record:
        return jsonify({"error": "Invalid or expired verification code"}), 400

    emails = read_json(EMAILS_PATH)
    email_record = next((e for e in emails if str(e.get('userid')) == userid), None)
    if not email_record:
        return jsonify({"error": "Email record not found"}), 404

    email_record['verified'] = True
    write_json(EMAILS_PATH, emails)
    write_json(EMAIL_VERIFICATION_CODES, [r for r in records if not (str(r.get('userid')) == userid and r.get('code') == code)])
    return jsonify({"success": True, "email": email_record.get('email')}), 200

@app.route('/api/upload-profile-picture', methods=['POST'])
def upload_profile_picture():
    if 'file' not in request.files:
        return jsonify({"error": "File required"}), 400

    file   = request.files['file']
    userid = str(request.form.get('userid') or '').strip()

    if not userid:
        return jsonify({"error": "userid is required"}), 400
    if file.filename == '':
        return jsonify({"error": "File name required"}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "File type not allowed"}), 400

    users = read_json(DB_PATH)
    user  = next((u for u in users if str(u.get('userid')) == userid), None)
    if not user:
        return jsonify({"error": "User not found"}), 404

    username = user.get('username') or str(userid)
    user_dir = os.path.join(USERS_ICON_DIR, username)
    os.makedirs(user_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}_{secure_filename(file.filename)}"
    save_path = os.path.join(user_dir, filename)
    file.save(save_path)

    pic_url = f"{request.host_url.rstrip('/')}/uploads/users_icon/{username}/{filename}"
    user['profile_picture'] = pic_url
    write_json(DB_PATH, users)
    return jsonify({"success": True, "profile_picture": pic_url}), 200

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
        data       = request.get_json() or {}
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

@app.route('/uploads/users_icon/<username>/<filename>')
def serve_user_icon(username, filename):
    return send_from_directory(os.path.join(USERS_ICON_DIR, username), filename)


@app.route('/api/save-email', methods=['POST'])
def save_email():
    try:
        data   = request.get_json() or {}
        email  = (data.get("email") or "").strip().lower()
        userid = str(data.get("userid") or "").strip()

        if not userid:
            return jsonify({"error": "Missing userid"}), 400
        if not email or "@" not in email:
            return jsonify({"error": "Invalid email"}), 400

        users = read_json(DB_PATH)
        user = next((u for u in users if str(u.get("userid")) == userid), None)
        if user is None:
            return jsonify({"error": "User not found"}), 404

        emails = read_json(EMAILS_PATH)
        existing_by_user = next((e for e in emails if str(e.get("userid")) == userid), None)
        duplicate_email = next((e for e in emails if e.get("email") == email and str(e.get("userid")) != userid), None)

        if duplicate_email:
            return jsonify({"error": "Email already in use by another account"}), 400

        now = datetime.now(timezone.utc).isoformat()
        verification_code = str(random.randint(100000, 999999))
        verification_records = [r for r in read_json(EMAIL_VERIFICATION_CODES) if str(r.get("userid")) != userid]
        verification_records.append({
            "userid": userid,
            "email": email,
            "code": verification_code,
            "createdAt": now
        })
        write_json(EMAIL_VERIFICATION_CODES, verification_records)

        if existing_by_user:
            existing_by_user["email"] = email
            existing_by_user["verified"] = False
            existing_by_user["createdAt"] = now
            message = "Email updated and verification code sent"
        else:
            emails.append({
                "id":        str(uuid.uuid4()),
                "userid":    userid,
                "email":     email,
                "verified":  False,
                "createdAt": now
            })
            message = "Email saved and verification code sent"

        user["mailEnabled"] = True
        write_json(DB_PATH, users)
        write_json(EMAILS_PATH, emails)

        send_email(email, "رمز التحقق لبريد منصة المهارات", f"رمز التحقق الخاص بك هو: {verification_code}")
        return jsonify({"message": message, "email": email}), 200
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

# FIX #4 — Removed the `while True` blocking loop inside the daemon thread.
#           BackgroundScheduler already runs jobs in its own internal thread;
#           the infinite loop was pointless overhead that blocked the daemon thread.
def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(send_to_all_emails, 'interval', hours=5)
    scheduler.start()

# =========================
# 📂 Enrichments
# =========================
ENRICHMENTS_PATH = os.path.join(DATA_DIR, 'enrichments.json')
DOCUMENTS_DIR    = os.path.join(DATA_DIR, 'documents')
VIDEOS_DIR       = os.path.join(DATA_DIR, 'videos')

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
            ft       = get_file_type(file.filename)
            filename = str(uuid.uuid4()) + '_' + secure_filename(file.filename)
            file.save(os.path.join(get_upload_dir(ft), filename))
            content  = get_file_url(ft, filename, request.host_url.rstrip('/'))
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

@app.route('/api/health', methods=['GET', 'OPTIONS'])
def health():
    if request.method == "OPTIONS":
        return "", 204

    return jsonify({"status": "healthy"}), 200

# =========================
# ⚙️ User settings
# =========================
@app.route("/api/get-settings/<string:userid>", methods=["GET"])
def get_settings(userid):
    users = read_json(DB_PATH)
    user  = next((u for u in users if u["userid"] == userid), None)
    if not user:
        return jsonify({"error": "User not found"}), 404

    email_record = next((e for e in read_json(EMAILS_PATH) if str(e.get('userid')) == str(userid)), None)

    return jsonify({
        "mailEnabled": user.get("mailEnabled", False),
        "twoFA":       user.get("twoFA",       False),
        "email":       email_record.get("email") if email_record else "",
        "emailVerified": bool(email_record and email_record.get("verified", False)),
        "profile_picture": user.get("profile_picture", "")
    })

@app.route("/api/update-setting", methods=["POST"])
def update_setting():
    data   = request.get_json() or {}
    userid = data.get("userid")
    key    = data.get("key")
    value  = data.get("value")

    if key not in ["mailEnabled", "twoFA"]:
        return jsonify({"error": "Invalid setting"}), 400

    users = read_json(DB_PATH)
    email_record = next((e for e in read_json(EMAILS_PATH) if str(e.get('userid')) == str(userid)), None)
    for user in users:
        if user["userid"] == userid:
            if key == "twoFA":
                if value and not (email_record and email_record.get("verified", False)):
                    return jsonify({"error": "A verified email is required before enabling 2FA"}), 400
                user["twoFA"] = bool(value)
            else:
                user[key] = bool(value)
            break
    else:
        return jsonify({"error": "User not found"}), 404

    write_json(DB_PATH, users)
    return jsonify({"success": True})

@app.route("/api/delete-account", methods=["POST"])
def delete_account():
    # FIX #5 — added `or {}`
    data      = request.get_json() or {}
    userid    = data.get("userid")
    users     = read_json(DB_PATH)
    new_users = [u for u in users if u["userid"] != userid]
    if len(new_users) == len(users):
        return jsonify({"error": "User not found"}), 404
    write_json(DB_PATH, new_users)
    return jsonify({"success": True})

@app.route("/api/change-password", methods=["POST"])
def change_password():
    # FIX #5 — added `or {}`
    data   = request.get_json() or {}
    userid = data.get("userid")
    old    = data.get("oldPassword") or ""
    new    = data.get("newPassword") or ""

    # FIX #6 — validate minimum length before hashing
    if len(new) < 6:
        return jsonify({"error": "New password must be at least 6 characters"}), 400

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
    data        = request.get_json() or {}
    userid      = data.get("userid")
    newUsername = (data.get("newUsername") or "").strip()
    if not newUsername:
        return jsonify({"error": "Empty name"}), 400
    if newUsername != newUsername.lower():
        return jsonify({"error": "Username must be lowercase only"}), 400
    if not re.match(r'^[a-z0-9_]+$', newUsername):
        return jsonify({"error": "Username may only contain lowercase letters, numbers, and underscores"}), 400

    users = read_json(DB_PATH)
    if any(u["username"] == newUsername for u in users):
        return jsonify({"error": "Username already taken"}), 400
    for user in users:
        if user["userid"] == userid:
            user["username"] = newUsername
            write_json(DB_PATH, users)
            return jsonify({"success": True})
    return jsonify({"error": "User not found"}), 404

# =========================
# 📮 Posts
# =========================
POSTS_PATH               = os.path.join(DATA_DIR, 'posts.json')
POSTS_MEDIA              = os.path.join(DATA_DIR, 'posts_media')
LINKONLY_POSTS_PATH      = os.path.join(DATA_DIR, 'linkonlyposts_link.json')
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

@app.route('/api/posts/link/<string:token>', methods=['GET'])
def get_post_by_link_token(token):
    try:
        link_map = read_json(LINKONLY_POSTS_PATH)
        mapping  = next((item for item in link_map if item.get('token') == token), None)
        if not mapping:
            return jsonify({"error": "Link not found"}), 404
        posts = read_json(POSTS_PATH)
        post  = next((p for p in posts if p['id'] == mapping.get('post_id')), None)
        if not post or post.get('visibility') != 'link':
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

        if visibility == 'link':
            link_token = uuid.uuid4().hex[:16]
            link_map = read_json(LINKONLY_POSTS_PATH)
            while any(item.get('token') == link_token for item in link_map):
                link_token = uuid.uuid4().hex[:16]
            new_post['linkToken'] = link_token
            link_map.append({
                'token': link_token,
                'post_id': new_post['id'],
                'createdAt': datetime.now(timezone.utc).isoformat()
            })
            write_json(LINKONLY_POSTS_PATH, link_map)

        posts = read_json(POSTS_PATH)
        posts.append(new_post)
        write_json(POSTS_PATH, posts)

        return jsonify({"message": "Post created", "post": new_post}), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def send_notification(userid, title, message):
    users = read_json(DB_PATH)

    for user in users:
        if str(user.get("userid")) == str(userid):
            if "notifications" not in user:
                user["notifications"] = []

            user["notifications"].append({
                "id": str(uuid.uuid4()),
                "type": "post",
                "title": title,
                "message": message,
                "read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })

            break

    write_json(DB_PATH, users)

@app.route('/api/posts/<string:post_id>/like', methods=['POST'])
def like_post(post_id):
    try:
        userid = (request.get_json() or {}).get('userid', '').strip()

        if not userid:
            return jsonify({"error": "userid required"}), 400

        posts = read_json(POSTS_PATH)
        post = next((p for p in posts if p['id'] == post_id), None)

        if not post:
            return jsonify({"error": "Post not found"}), 404

        if userid in post['likes']:
            post['likes'].remove(userid)

        else:
            post['likes'].append(userid)

            if userid in post['dislikes']:
                post['dislikes'].remove(userid)

            # إرسال إشعار لصاحب البوست
            if str(userid) != str(post['userid']):
                users = read_json(DB_PATH)

                for user in users:
                    if str(user.get('userid')) == str(post['userid']):

                        if 'notifications' not in user:
                            user['notifications'] = []

                        user['notifications'].append({
                            "id": str(uuid.uuid4()),
                            "type": "like",
                            "title": "إعجاب جديد",
                            "message": "قام شخص بالإعجاب بمنشورك.",
                            "post_id": post_id,
                            "read": False,
                            "created_at": datetime.now(timezone.utc).isoformat()
                        })

                        break

                write_json(DB_PATH, users)

        write_json(POSTS_PATH, posts)

        return jsonify({
            "likes": len(post['likes']),
            "dislikes": len(post['dislikes'])
        }), 200

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
        data = request.get_json() or {}

        userid = (data.get('userid') or '').strip()
        username = (data.get('username') or '').strip()
        text = (data.get('text') or '').strip()

        if not userid or not username:
            return jsonify({"error": "userid and username required"}), 400

        if not text:
            return jsonify({"error": "comment text required"}), 400

        posts = read_json(POSTS_PATH)
        post = next((p for p in posts if p['id'] == post_id), None)

        if not post:
            return jsonify({"error": "Post not found"}), 404

        comment = {
            "id": str(uuid.uuid4()),
            "userid": userid,
            "username": username,
            "text": text,
            "createdAt": datetime.now(timezone.utc).isoformat()
        }

        post['comments'].append(comment)

        # إرسال إشعار لصاحب البوست
        if str(userid) != str(post['userid']):

            users = read_json(DB_PATH)

            for user in users:
                if str(user.get('userid')) == str(post['userid']):

                    if 'notifications' not in user:
                        user['notifications'] = []

                    user['notifications'].append({
                        "id": str(uuid.uuid4()),
                        "type": "comment",
                        "title": "تعليق جديد",
                        "message": f"{username} علق على منشورك: {text}",
                        "post_id": post_id,
                        "read": False,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    })

                    break

            write_json(DB_PATH, users)

        write_json(POSTS_PATH, posts)

        return jsonify({
            "message": "Comment added",
            "comment": comment
        }), 201

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
# 📄 Page logging (In-Working / Blocked) and online tracking
# =========================
def update_online(userid, username=''):
    try:
        entries = read_json(ONLINE_PATH)
        now = datetime.now(timezone.utc).isoformat()
        for e in entries:
            if e.get('userid') == userid:
                e['lastSeen'] = now
                e['username'] = username
                break
        else:
            entries.append({'userid': userid, 'username': username, 'lastSeen': now})
        write_json(ONLINE_PATH, entries)
    except Exception as e:
        print("update_online error:", e)


@app.route('/api/pages/check', methods=['GET'])
def api_check_page():
    path = (request.args.get('path') or '').strip()
    if not path:
        return jsonify({"error": "path required"}), 400
    in_working = read_json(IN_WORKING_PAGES_PATH)
    for e in in_working:
        p = e.get('path', '')
        if p == path or p in path or path in p:
            return jsonify({"type": "in_working", "entry": e}), 426
    blocked = read_json(BLOCKED_PAGES_PATH)
    for e in blocked:
        p = e.get('path', '')
        if p == path or p in path or path in p:
            return jsonify({"type": "blocked", "entry": e}), 426
    return jsonify({"type": "ok"}), 200


@app.route('/api/owner/pages/list', methods=['GET'])
@require_owner
def api_list_pages():
    t = (request.args.get('type') or 'all').strip()
    if t == 'in_working':
        return jsonify(read_json(IN_WORKING_PAGES_PATH)), 200
    if t == 'blocked':
        return jsonify(read_json(BLOCKED_PAGES_PATH)), 200
    return jsonify({
        "in_working": read_json(IN_WORKING_PAGES_PATH),
        "blocked": read_json(BLOCKED_PAGES_PATH)
    }), 200


@app.route('/api/owner/pages/add', methods=['POST'])
@require_owner
def api_add_page():
    data = request.get_json() or {}
    ppath = (data.get('path') or '').strip()
    ptype = (data.get('type') or 'in_working').strip()
    title = (data.get('title') or '').strip()
    if not ppath:
        return jsonify({"error": "path required"}), 400
    if ptype not in ('in_working', 'blocked'):
        return jsonify({"error": "invalid type"}), 400
    entry = {"id": str(uuid.uuid4()), "path": ppath, "title": title, "createdAt": datetime.now(timezone.utc).isoformat()}
    arr_path = IN_WORKING_PAGES_PATH if ptype == 'in_working' else BLOCKED_PAGES_PATH
    arr = read_json(arr_path)
    arr.append(entry)
    write_json(arr_path, arr)
    return jsonify({"message": "added", "entry": entry}), 201


@app.route('/api/owner/pages/delete/<string:ptype>/<string:entry_id>', methods=['DELETE'])
@require_owner
def api_delete_page(ptype, entry_id):
    if ptype not in ('in_working', 'blocked'):
        return jsonify({"error": "invalid type"}), 400
    arr_path = IN_WORKING_PAGES_PATH if ptype == 'in_working' else BLOCKED_PAGES_PATH
    arr = read_json(arr_path)
    new_arr = [e for e in arr if e.get('id') != entry_id]
    if len(new_arr) == len(arr):
        return jsonify({"error": "not found"}), 404
    write_json(arr_path, new_arr)
    return jsonify({"message": "deleted"}), 200


@app.route('/api/online_count', methods=['GET'])
def api_online_count():
    entries = read_json(ONLINE_PATH)
    now = datetime.now(timezone.utc)
    valid = []
    for e in entries:
        try:
            last = datetime.fromisoformat(e.get('lastSeen'))
            if (now - last).total_seconds() <= 10 * 60:
                valid.append(e)
        except Exception:
            pass
    # optionally cleanup stale entries
    write_json(ONLINE_PATH, valid)
    return jsonify({"count": len(valid)}), 200


@app.route('/api/online/ping', methods=['POST'])
def api_online_ping():
    data = request.get_json() or {}
    userid = data.get('userid')
    username = data.get('username', '')
    if not userid:
        return jsonify({"error": "userid required"}), 400
    update_online(userid, username)
    return jsonify({"success": True}), 200

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
    user_id_str  = str(user["userid"])
    email_record = next((e for e in emails if str(e.get("userid")) == user_id_str), None)
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
    new_password     = data.get("newPassword") or ""
    confirm_password = data.get("ConfirmNewPassword") or ""

    if not username:
        return jsonify({"error": "Username required"}), 400
    # FIX #6 — validate new password before touching the database
    if len(new_password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400
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
    user_id_str  = str(user["userid"])
    email_record = next((e for e in emails if str(e.get("userid")) == user_id_str), None)
    if email_record:
        url = f"https://almaharat2.com/users/user/{user['userid']}/{token}"
        msg = MIMEMultipart("alternative")
        msg["From"]    = SENDER_EMAIL
        msg["To"]      = email_record["email"]
        msg["Subject"] = "Your New Password"
        msg.attach(MIMEText(
            f'<h2>Password Changed</h2><a href="{url}">See New Password</a>',
            "html", "utf-8"
        ))
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
FOLLOWERS_PATH             = os.path.join(DATA_DIR, 'Accounts.json')
LESSON_PROGRESS_PATH       = os.path.join(DATA_DIR, 'Accounts.json')
VIOLATIONS_PATH            = os.path.join(DATA_DIR, 'violations.json')
VERIFICATION_REQUESTS_PATH = os.path.join(DATA_DIR, 'verification_requests.json')

for _p in [FOLLOWERS_PATH, LESSON_PROGRESS_PATH, VIOLATIONS_PATH, VERIFICATION_REQUESTS_PATH]:
    if not os.path.exists(_p):
        write_json(_p, [])

MIN_FOLLOWERS = 10
MIN_LESSONS   = 5
MIN_POINTS    = 50


def _check_requirements(userid: str):
    users = read_json(DB_PATH)
    user  = next((u for u in users if str(u.get('userid')) == str(userid)), None)
    if not user:
        return None, "المستخدم غير موجود."

    # 1. Has a linked e-mail
    emails    = read_json(EMAILS_PATH)
    has_email = any(str(e.get('userid')) == str(userid) for e in emails)

    # 2. Enough followers — followers is stored as a dict {follower_id: timestamp}
    followers_raw     = user.get('followers', {})
    followers_count   = len(followers_raw) if isinstance(followers_raw, dict) else (followers_raw or 0)
    has_10_followers  = followers_count >= MIN_FOLLOWERS

    # 3. Active learner (completed lessons)
    # 3. Active learner (completed lessons)
    progress = user.get("lesson_progress", [])

    if isinstance(progress, int):
        completed_lessons = progress
    else:
        completed_lessons = sum(
            1 for p in progress
            if p.get("completed")
        )

    is_active_learner = completed_lessons >= MIN_LESSONS

    # 4. Enough points
    current_points    = user.get('points', 0)
    has_enough_points = current_points >= MIN_POINTS

    # 5. Positive interaction (no confirmed violations)
    violations           = read_json(VIOLATIONS_PATH)
    confirmed_violations = sum(1 for v in violations
                               if str(v.get('userid')) == str(userid) and v.get('status') == 'confirmed')
    positive_interaction = confirmed_violations == 0

    # 6. Not banned
    follows_policies = not user.get('is_banned', False)

    # 7. No active violations
    active_count         = sum(1 for v in violations
                               if str(v.get('userid')) == str(userid) and v.get('active', False))
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


@app.route('/api/checkrequirements', methods=['GET'])
def check_requirements():
    userid = request.args.get('userid', '').strip()

    if not userid:
        return jsonify({"error": "userid مطلوب"}), 400

    users = read_json(DB_PATH)
    user  = next((u for u in users if str(u.get('userid')) == str(userid)), None)

    if not user:
        return jsonify({"error": "المستخدم غير موجود"}), 404

    if user.get("verified", False):
        return jsonify({
            "already_verified": True,
            "message": "انت لديك تحقق من قبل! ✅"
        }), 200

    result, err = _check_requirements(userid)

    if err:
        return jsonify({"error": err}), 404

    return jsonify(result), 200

@app.route('/api/submit/verificationrequest/<string:user_id>', methods=['POST'])
def submit_verification(user_id):
    data        = request.get_json() or {}
    body_userid = str(data.get('userid') or '').strip()

    if body_userid != str(user_id):
        return jsonify({"error": "غير مصرح لكِ بتقديم هذا الطلب."}), 403

    users = read_json(DB_PATH)
    user  = next((u for u in users if str(u.get('userid')) == str(user_id)), None)
    if not user:
        return jsonify({"error": "المستخدم غير موجود."}), 404

    if user.get('verified'):
        return jsonify({"error": "حسابكِ محقق بالفعل."}), 400

    ver_requests = read_json(VERIFICATION_REQUESTS_PATH)
    if any(str(r.get('userid')) == str(user_id) and r.get('status') == 'pending' for r in ver_requests):
        return jsonify({"error": "يوجد طلب تحقق قيد المراجعة بالفعل."}), 400

    result, err = _check_requirements(user_id)
    if err:
        return jsonify({"error": err}), 404
    if not result['requirements_met']:
        return jsonify({
            "error":  "لا تستوفين جميع المتطلبات اللازمة للتحقق.",
            "checks": result['checks'],
        }), 400

    emails = read_json(EMAILS_PATH)
    email_record = next(
        (e for e in emails if str(e.get('userid')) == str(user_id)),
        None
    )
    user_email = email_record.get('email', '') if email_record else ''

    new_req = {
        "id":           str(uuid.uuid4()),
        "userid":       str(user_id),
        "username":     user['username'],
        "email":        user_email,
        "status":       "pending",
        "submitted_at": datetime.now(timezone.utc).isoformat(),
    }
    ver_requests.append(new_req)
    write_json(VERIFICATION_REQUESTS_PATH, ver_requests)

    return jsonify({
        "message":    "تم إرسال طلب التحقق بنجاح! سيتم مراجعته خلال بضعة أيام.",
        "request_id": new_req['id'],
        "userid":     str(user_id),
    }), 201


@app.route('/api/admin/verificationrequests', methods=['GET'])
@require_admin_or_owner
def get_verification_requests():
    data = read_json(VERIFICATION_REQUESTS_PATH)

    pending = [r for r in data if r.get('status') == 'pending']

    emails = read_json(EMAILS_PATH)

    for r in pending:
        email_record = next(
            (e for e in emails if str(e.get('userid')) == str(r.get('userid'))),
            None
        )

        r['email'] = email_record.get('email', '') if email_record else ''

    return jsonify(pending), 200


@app.route('/api/admin/verificationrequests/<string:request_id>/approve', methods=['POST'])
@require_admin
def approve_verification(request_id):
    try:
        ver_requests = read_json(VERIFICATION_REQUESTS_PATH)
        req = next((r for r in ver_requests if r['id'] == request_id), None)

        if not req:
            return jsonify({"error": "Request not found"}), 404

        if req.get('status') != 'pending':
            return jsonify({"error": "تمت مراجعة هذا الطلب بالفعل."}), 400

        req['status'] = 'approved'
        req['reviewed_at'] = datetime.now(timezone.utc).isoformat()
        write_json(VERIFICATION_REQUESTS_PATH, ver_requests)

        users = read_json(DB_PATH)

        for user in users:
            if str(user['userid']) == str(req['userid']):
                user['verified'] = True

                if 'notifications' not in user:
                    user['notifications'] = []

                user['notifications'].append({
                    "id": str(uuid.uuid4()),
                    "type": "verification",
                    "title": "تم قبول طلب التحقق",
                    "message": "تهانينا! تم قبول طلب التحقق الخاص بك.",
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })

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

        if req.get('status') != 'pending':
            return jsonify({"error": "تمت مراجعة هذا الطلب بالفعل."}), 400

        req['status'] = 'rejected'
        req['reviewed_at'] = datetime.now(timezone.utc).isoformat()
        write_json(VERIFICATION_REQUESTS_PATH, ver_requests)

        users = read_json(DB_PATH)

        for user in users:
            if str(user['userid']) == str(req['userid']):

                if 'notifications' not in user:
                    user['notifications'] = []

                user['notifications'].append({
                    "id": str(uuid.uuid4()),
                    "type": "verification",
                    "title": "تم رفض طلب التحقق",
                    "message": "للأسف تم رفض طلب التحقق الخاص بك.",
                    "read": False,
                    "created_at": datetime.now(timezone.utc).isoformat()
                })

                break

        write_json(DB_PATH, users)

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

@app.route("/api/sendemail", methods=["POST"])
def sendemail():
    try:
        data = request.get_json() or {}

        title     = (data.get("title")        or "").strip()
        content   = (data.get("content")      or "").strip()
        html      = (data.get("styleandhtml") or "").strip()
        useremail = (data.get("useremail")     or "").strip()

        if not useremail or "@" not in useremail:
            return jsonify({"error": "Invalid useremail"}), 400

        # FIX #8 — original code called msg.set_payload(final_body) AFTER attaching
        #           MIME parts. set_payload() on a MIMEMultipart replaces the entire
        #           payload list, silently discarding every attach() call above it.
        #           Now the sender info is folded into the plain-text part up front.
        plain_body = (
            f"From user email: {useremail}\n\n"
            f"Message:\n{content or 'No content provided'}"
        )

        msg = MIMEMultipart("alternative")
        msg["From"]    = SENDER_EMAIL
        msg["To"]      = "hipermr9@gmail.com"
        msg["Subject"] = title or "New Verification Request"

        msg.attach(MIMEText(plain_body, "plain", "utf-8"))

        if html:
            html_body = html + f"<p><small>Sent by: {useremail}</small></p>"
            msg.attach(MIMEText(html_body, "html", "utf-8"))

        server = smtplib.SMTP("smtp.gmail.com", 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, "hipermr9@gmail.com", msg.as_string())
        server.quit()

        return jsonify({"success": True, "message": "Email sent"}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
import base64
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))


# Compatible chat models only — embedding / image-gen / video-gen models
# don't support generate_content() and will always raise an error here.
from google.api_core.exceptions import ResourceExhausted

CHAT_COMPATIBLE_MODELS = {
    "gemini-3.5-flash", "gemini-3-flash", "gemini-3.1-pro", "gemini-3.1-flash-lite",
    "gemini-2.5-pro", "gemini-2.5-flash", "gemini-2.5-flash-lite",
}

def get_model(name):
    if name not in CHAT_COMPATIBLE_MODELS:
        name = "gemini-2.5-flash"
    try:
        return genai.GenerativeModel(name)
    except Exception:
        return genai.GenerativeModel("gemini-2.5-flash")


@app.route("/api/chat", methods=["POST"])
def chat():

    model_name = request.form.get("model", "gemini-2.5-flash")
    username = request.form.get("username")
    chat_id = request.form.get("chat_id")

    try:

        prompt = (request.form.get("prompt") or "").strip()

        if not prompt:
            return jsonify({
                "error": "الرسالة فارغة",
                "limited": False
            }), 400

        model = get_model(model_name)

        accounts = load_accounts()

        chat_record = None
        if (
            username in accounts and
            "chats" in accounts[username] and
            chat_id in accounts[username]["chats"]
        ):
            chat_record = accounts[username]["chats"][chat_id]

        # ==========================
        # بناء سجل المحادثة السابق وتمريره للنموذج كسياق
        # ==========================
        history = []
        if chat_record:
            for msg in chat_record["messages"]:
                role = "model" if msg["role"] == "assistant" else "user"
                history.append({"role": role, "parts": [msg["content"]]})

        chat_session = model.start_chat(history=history)

        image_file = request.files.get("image")

        if not image_file:
            response = chat_session.send_message(prompt)
        else:
            image_bytes = image_file.read()
            image_part = {
                "mime_type": image_file.content_type,
                "data": base64.b64encode(image_bytes).decode("utf-8"),
            }
            response = chat_session.send_message([prompt, image_part])

        try:
            text = response.text
        except Exception:
            text = "⚠️ لم يتمكن النموذج من إنشاء رد لهذه الرسالة."

        # ==========================
        # حفظ الرسائل داخل الشات
        # ==========================
        try:
            if chat_record is not None:

                chat_record["messages"].append({"role": "user", "content": prompt})
                chat_record["messages"].append({"role": "assistant", "content": text})

                if not chat_record.get("title"):
                    try:
                        title_response = model.generate_content(
                            f"""
                            أنشئ عنواناً قصيراً جداً
                            من 2 إلى 5 كلمات فقط.

                            الرسالة:

                            {prompt}

                            أرجع العنوان فقط.
                            """
                        )
                        title = title_response.text.strip()
                        if len(title) > 50:
                            title = title[:50]
                        chat_record["title"] = title
                    except Exception:
                        chat_record["title"] = prompt[:30]

                save_accounts(accounts)

        except Exception as save_error:
            print("CHAT SAVE ERROR:", save_error)

        return jsonify({
            "response": text,
            "chat_id": chat_id,
            "limited": False
        }), 200

    except ResourceExhausted:
        return jsonify({
            "error": f"تم الوصول للحد الأقصى المسموح لموديل {model_name}",
            "limited": True,
            "chat_id": chat_id
        }), 429

    except Exception as e:
        msg = str(e)
        is_quota_error = any(
            k in msg.lower()
            for k in ["quota", "rate limit", "429", "resource_exhausted"]
        )
        print("ERROR:", msg)
        return jsonify({
            "error": f"تم الوصول للحد الأقصى المسموح لموديل {model_name}" if is_quota_error else "حدث خطأ في الخادم، حاول مرة أخرى.",
            "limited": True if is_quota_error else None,
            "chat_id": chat_id
        }), 429 if is_quota_error else 500
    
ACCOUNTS_FILE = Path(DB_PATH)

def load_accounts():
    """
    Load accounts from the JSON file (which is stored as a list of user objects)
    and return a dict keyed by username for easy lookup/updates by other
    endpoints that expect a mapping.
    """
    users = read_json(DB_PATH)
    accounts = {}
    for u in users:
        uname = u.get("username")
        if uname:
            accounts[uname] = u
    return accounts

def save_accounts(accounts):
    """
    Accept a dict keyed by username and write it back to the JSON file as a
    list (preserving the original on-disk format used elsewhere in the app).
    """
    users_list = list(accounts.values())
    write_json(DB_PATH, users_list)

@app.route("/api/chats/create", methods=["POST"])
def create_chat():
    try:
        username = request.form.get("username")
        accounts = load_accounts()

        if username not in accounts:
            return jsonify({"error": "account not found"}), 404

        chat_id = str(uuid.uuid4())

        if "chats" not in accounts[username]:
            accounts[username]["chats"] = {}

        accounts[username]["chats"][chat_id] = {
            "title": None,
            "messages": []
        }

        save_accounts(accounts)
        return jsonify({"success": True, "chat_id": chat_id})

    except Exception as e:
        # 🔥 هذا السطر سيطبع لك الخطأ الحقيقي والسطر المسبب له في كونسول البايثون
        print("CRITICAL BACKEND ERROR IN CREATE_CHAT:", str(e))
        return jsonify({"error": str(e)}), 500

@app.route("/api/chats", methods=["POST"])
def get_chats():

    username = request.form.get("username")

    accounts = load_accounts()

    if username not in accounts:
        return jsonify({"error": "account not found"}), 404

    chats = []

    for chat_id, chat in accounts[username]["chats"].items():
        chats.append({
            "id": chat_id,
            "title": chat.get("title") or "شات جديد"
        })

    return jsonify(chats)

@app.route("/api/chats/<chat_id>", methods=["GET"])
def get_chat(chat_id):

    username = request.args.get("username")

    accounts = load_accounts()

    if username not in accounts:
        return jsonify({"error": "account not found"}), 404

    chat = accounts[username]["chats"].get(chat_id)

    if not chat:
        return jsonify({"error": "chat not found"}), 404

    return jsonify(chat)

@app.route("/api/chats/<chat_id>/delete", methods=["POST"])
def delete_chat(chat_id):

    username = request.form.get("username")

    accounts = load_accounts()

    if username not in accounts:
        return jsonify({"error": "account not found"}), 404

    if chat_id in accounts[username]["chats"]:
        del accounts[username]["chats"][chat_id]

    save_accounts(accounts)

    return jsonify({"success": True})

@app.route("/api/chats/<chat_id>/rename", methods=["POST"])
def rename_chat(chat_id):

    username = request.form.get("username")
    title = request.form.get("title", "").strip()

    accounts = load_accounts()

    if username not in accounts:
        return jsonify({"error": "account not found"}), 404

    chat = accounts[username]["chats"].get(chat_id)

    if not chat:
        return jsonify({"error": "chat not found"}), 404

    chat["title"] = title

    save_accounts(accounts)

    return jsonify({"success": True})

def normalize_id_list(values):
    if isinstance(values, list):
        normalized = []
        for item in values:
            item_id = str(item).strip()
            if item_id:
                normalized.append(item_id)
        return normalized
    return []


def ensure_id_in_list(values, item_id):
    item_id = str(item_id).strip()
    if not item_id:
        return normalize_id_list(values)
    values = normalize_id_list(values)
    if item_id not in values:
        values.append(item_id)
    return values


def remove_id_from_list(values, item_id):
    item_id = str(item_id).strip()
    if not item_id:
        return normalize_id_list(values)
    values = normalize_id_list(values)
    return [value for value in values if value != item_id]


def safe_user(user):
    u = {k: v for k, v in user.items() if k not in {'password', 'private_chats'}}

    followers = u.get('followers')
    if isinstance(followers, dict):
        u['followers'] = len(followers)
    elif not isinstance(followers, int):
        u['followers'] = 0

    following = u.get('following')
    if isinstance(following, dict):
        u['following'] = len(following)
    elif not isinstance(following, int):
        u['following'] = 0

    friends = u.get('Friends')
    if isinstance(friends, list):
        u['friends_count'] = len(normalize_id_list(friends))
    else:
        u['friends_count'] = 0

    return u

@app.route("/api/friends/<string:userid>", methods=["GET"])
def get_friends(userid):
    try:
        users = read_json(DB_PATH)
        current_user = next((u for u in users if str(u.get("userid")) == str(userid)), None)
        if not current_user:
            return jsonify({"error": "المستخدم غير موجود"}), 404

        friend_ids = normalize_id_list(current_user.get("Friends"))
        friends = []
        for friend_id in friend_ids:
            friend_user = next((u for u in users if str(u.get("userid")) == str(friend_id)), None)
            if friend_user:
                friend_data = safe_user(friend_user)
                friend_data["is_friend"] = True
                friends.append(friend_data)

        return jsonify(friends), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/friends/messages", methods=["GET"])
def get_friend_messages():
    try:
        userid = str(request.args.get("userid") or "").strip()
        friend_id = str(request.args.get("friend_id") or "").strip()
        if not userid or not friend_id:
            return jsonify({"error": "userid and friend_id are required"}), 400

        users = read_json(DB_PATH)
        current_user = next((u for u in users if str(u.get("userid")) == userid), None)
        if not current_user:
            return jsonify({"error": "المستخدم غير موجود"}), 404

        chats = current_user.get("private_chats") or {}
        return jsonify({"messages": chats.get(friend_id, [])}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/friends/messages", methods=["POST"])
def send_friend_message():
    try:
        data = request.get_json() or {}
        userid = str(data.get("userid") or "").strip()
        friend_id = str(data.get("friend_id") or "").strip()
        message = (data.get("message") or "").strip()

        if not userid or not friend_id or not message:
            return jsonify({"error": "userid, friend_id and message are required"}), 400

        users = read_json(DB_PATH)
        current_user = next((u for u in users if str(u.get("userid")) == userid), None)
        friend_user = next((u for u in users if str(u.get("userid")) == friend_id), None)

        if not current_user or not friend_user:
            return jsonify({"error": "المستخدم أو الصديق غير موجود"}), 404

        current_friends = normalize_id_list(current_user.get("Friends"))
        friend_friends = normalize_id_list(friend_user.get("Friends"))
        if friend_id not in current_friends or userid not in friend_friends:
            return jsonify({"error": "يجب أن تكونا متابعين لبعضكما لتتمكن من الدردشة"}), 403

        private_chats = current_user.setdefault("private_chats", {})
        friend_private_chats = friend_user.setdefault("private_chats", {})

        conversation = private_chats.setdefault(friend_id, [])
        friend_conversation = friend_private_chats.setdefault(userid, [])

        entry = {
            "id": str(uuid.uuid4()),
            "from": userid,
            "text": message,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        conversation.append(entry)
        friend_conversation.append({
            "id": entry["id"],
            "from": userid,
            "text": message,
            "created_at": entry["created_at"],
        })

        if "notifications" not in friend_user:
            friend_user["notifications"] = []
        friend_user["notifications"].append({
            "id": str(uuid.uuid4()),
            "type": "message",
            "title": "رسالة جديدة من صديق",
            "message": f"لديك رسالة جديدة من {current_user.get('username', '')}.",
            "from_user": userid,
            "read": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

        write_json(DB_PATH, users)
        return jsonify(entry), 201
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/users/public/<string:userid>", methods=["GET"])
def get_public_user(userid):
    users = read_json(DB_PATH)
    user = next((u for u in users if str(u.get("userid")) == str(userid)), None)
    if not user:
        return jsonify({"error": "المستخدم غير موجود"}), 404

    result = safe_user(user)

    viewer_id = str(request.args.get("viewer_id") or "").strip()
    if viewer_id:
        followers = user.get("followers")
        result["is_following"] = isinstance(followers, dict) and viewer_id in followers

    return jsonify(result), 200

@app.route("/api/users/follow/<string:userid>", methods=["POST"])
def toggle_follow_user(userid):
    try:
        data = request.get_json() or {}

        follower_id = str(data.get("follower_id") or session.get("userid") or "").strip()
        target_id = str(userid)

        if not follower_id:
            return jsonify({"error": "follower_id مطلوب"}), 400

        if follower_id == target_id:
            return jsonify({"error": "لا يمكنك متابعة نفسك"}), 400

        users = read_json(DB_PATH)

        target_user = next((u for u in users if str(u.get("userid")) == target_id), None)
        follower_user = next((u for u in users if str(u.get("userid")) == follower_id), None)

        if not target_user:
            return jsonify({"error": "المستخدم غير موجود"}), 404

        if not follower_user:
            return jsonify({"error": "حساب المتابع غير موجود"}), 404


        if not isinstance(target_user.get("followers"), dict):
            target_user["followers"] = {}

        if not isinstance(follower_user.get("following"), dict):
            follower_user["following"] = {}


        now = datetime.now(timezone.utc).isoformat()

        already_following = follower_id in target_user["followers"]

        if already_following:
            target_user["followers"].pop(follower_id, None)
            follower_user["following"].pop(target_id, None)
            now_following = False
        else:
            target_user["followers"][follower_id] = now
            follower_user["following"][target_id] = now
            now_following = True

            if "notifications" not in target_user:
                target_user["notifications"] = []

            target_user["notifications"].append({
                "id": str(uuid.uuid4()),
                "type": "follow",
                "title": "متابع جديد",
                "message": f"{follower_user['username']} بدأ بمتابعتك.",
                "read": False,
                "created_at": now
            })

        mutual_follow = (follower_id in target_user.get("followers", {})) and (target_id in follower_user.get("following", {}))
        if mutual_follow:
            target_user["Friends"] = ensure_id_in_list(target_user.get("Friends"), follower_id)
            follower_user["Friends"] = ensure_id_in_list(follower_user.get("Friends"), target_id)
        else:
            target_user["Friends"] = remove_id_from_list(target_user.get("Friends"), follower_id)
            follower_user["Friends"] = remove_id_from_list(follower_user.get("Friends"), target_id)

        write_json(DB_PATH, users)

        return jsonify({
            "following": now_following,
            "followers_count": len(target_user["followers"]),
            "is_friend": mutual_follow,
            "friends_count": len(normalize_id_list(target_user.get("Friends")))
        }), 200


    except Exception as e:
        print("FOLLOW TOGGLE ERROR:", e)
        return jsonify({"error": str(e)}), 500

@app.route("/api/users/isdeveloper", methods=["GET"])
def is_developer():
    userid = str(request.args.get("userid") or "").strip()
    if not userid:
        return jsonify({"error": "userid مطلوب"}), 400

    users = read_json(DB_PATH)
    user  = next((u for u in users if str(u.get("userid")) == userid), None)
    if not user:
        return jsonify({"error": "المستخدم غير موجود"}), 404

    is_dev = user.get("is_developer", False)
    return jsonify({"is_developer": is_dev}), 200

@app.route('/api/owner/posts/<string:post_id>/block', methods=['POST'])
@require_owner
def api_owner_block_post(post_id):
    try:
        posts = read_json(POSTS_PATH)
        post = next((p for p in posts if p['id'] == post_id), None)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        post['blocked'] = True
        write_json(POSTS_PATH, posts)
        return jsonify({"message": "blocked", "post": post}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/owner/posts/<string:post_id>/unblock', methods=['POST'])
@require_owner
def api_owner_unblock_post(post_id):
    try:
        posts = read_json(POSTS_PATH)
        post = next((p for p in posts if p['id'] == post_id), None)
        if not post:
            return jsonify({"error": "Post not found"}), 404
        post['blocked'] = False
        write_json(POSTS_PATH, posts)
        return jsonify({"message": "unblocked", "post": post}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/notifications/get/<string:userid>', methods=['GET'])
def get_notifications(userid):
    try:
        users = read_json(DB_PATH)

        user = next(
            (u for u in users if str(u.get("userid")) == str(userid)),
            None
        )

        if not user:
            return jsonify({"error": "المستخدم غير موجود"}), 404

        return jsonify(user.get("notifications", [])), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/notifications/unread_count", methods=["GET"])
def unread_notifications_count():
    userid = session.get("userid")

    users = read_json(DB_PATH)
    user = next((u for u in users if str(u.get("userid")) == str(userid)), None)

    if not user:
        return jsonify({"count": 0}), 200

    notifications = user.get("notifications", [])

    count = sum(1 for n in notifications if not n.get("read", False))

    return jsonify({"count": count}), 200

# =========================
# Read All Notifications
# =========================
@app.route("/api/notifications/read_all", methods=["POST"])
def read_all_notifications():
    userid = request.cookies.get("userid")

    users = read_json(DB_PATH)

    for user in users:
        if str(user.get("userid")) == str(userid):
            for notification in user.get("notifications", []):
                notification["read"] = True
            write_json(DB_PATH, users)
            return jsonify({"success": True}), 200

    return jsonify({"error": "User not found"}), 404


# =========================
# Delete Notification
# =========================
@app.route("/api/notifications/delete/<notification_id>", methods=["DELETE"])
def delete_notification(notification_id):
    userid = request.cookies.get("userid")

    users = read_json(DB_PATH)

    for user in users:
        if str(user.get("userid")) == str(userid):
            notifications = user.get("notifications", [])

            new_notifications = [
                n for n in notifications
                if str(n.get("id")) != str(notification_id)
            ]

            if len(new_notifications) == len(notifications):
                return jsonify({"error": "Notification not found"}), 404

            user["notifications"] = new_notifications
            write_json(DB_PATH, users)
            return jsonify({"success": True}), 200

    return jsonify({"error": "User not found"}), 404


# =========================
# Read Notification
# =========================
@app.route("/api/notifications/read/<notification_id>", methods=["POST"])
def read_notification(notification_id):
    userid = request.cookies.get("userid")

    users = read_json(DB_PATH)

    for user in users:
        if str(user.get("userid")) == str(userid):
            for notification in user.get("notifications", []):
                if str(notification.get("id")) == str(notification_id):
                    notification["read"] = True
                    write_json(DB_PATH, users)
                    return jsonify({"success": True}), 200

            return jsonify({"error": "Notification not found"}), 404

    return jsonify({"error": "User not found"}), 404


# =========================
# Delete All Notifications
# =========================
@app.route("/api/notifications/delete_all", methods=["DELETE"])
def delete_all_notifications():
    userid = request.cookies.get("userid")

    users = read_json(DB_PATH)

    for user in users:
        if str(user.get("userid")) == str(userid):
            user["notifications"] = []
            write_json(DB_PATH, users)
            return jsonify({"success": True}), 200

    return jsonify({"error": "User not found"}), 404

# ── Entry point ───────────────────────────────────────────────────────────
if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000)