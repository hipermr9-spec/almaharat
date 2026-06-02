import sys
import os
import json
import hashlib
import getpass
from pathlib import Path

# --- 1. Configuration & Paths ---
# Get the directory where this script lives (Backend/Commands)
current_dir = Path(__file__).parent

# Path to the secure password file in the SAME folder
PASSWORD_FILE = current_dir / "password.json"

# Path to the user database (Adjust if your Data folder is elsewhere)
# Currently points to: alm2/Backend/Python/Data/Accounts.json
DB_PATH = current_dir.parent / "Python" / "Data" / "Accounts.json"

# --- 2. Helper Functions ---
def load_secure_hash():
    """Loads the admin hash from password.json"""
    if not PASSWORD_FILE.exists():
        print(f"❌ CRITICAL: Security file not found at {PASSWORD_FILE}")
        print("   Run the setup script to generate password.json first.")
        sys.exit(1)
    
    try:
        with open(PASSWORD_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("admin_hash")
    except Exception as e:
        print(f"❌ Error reading password file: {e}")
        sys.exit(1)

def read_json(path):
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError:
        print(f"❌ Invalid JSON in {path}")
        return []

def write_json(data, path):
    try:
        os.makedirs(path.parent, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"❌ Error saving: {e}")
        return False

def hash_password(password: str) -> str:
    # Must match the salt used in temp_setup.py
    salt = "static_salt_for_demo_only" 
    return hashlib.sha256((password + salt).encode()).hexdigest()

# --- 3. Main Logic ---
def set_verified():
    print("--- Admin Verification Tool ---")
    
    # Load the secure hash from the local file
    STORED_ADMIN_HASH = load_secure_hash()
    
    # Debug: Show DB path
    print(f"📂 Database Path: {DB_PATH.absolute()}")
    
    users = read_json(DB_PATH)
    
    if not users:
        print("⚠️ No users found in database.")
        if DB_PATH.exists():
            print(f"👀 File exists but might be empty or invalid.")
        return

    print(f"✅ Found {len(users)} users.")

    # 1. Ask for username
    username_input = input("\nEnter username to verify: ").strip()
    
    # 2. Find user (Case-insensitive)
    user = next((u for u in users if u.get("username", "").lower() == username_input.lower()), None)
    
    if not user:
        print(f"❌ User '{username_input}' not found.")
        print(f"💡 Available: {[u.get('username') for u in users]}")
        return

    print(f"👤 User found: {user['username']}")
    
    # 3. Ask for password
    pwd_input = getpass.getpass("Enter admin password: ")
    input_hash = hash_password(pwd_input)

    # 4. Verify against the hash from password.json
    if input_hash != STORED_ADMIN_HASH:
        print("❌ Incorrect password. Access denied.")
        return

    # 5. Update status
    if user.get("verified", False):
        print(f"⚠️ User '{user['username']}' is already verified.")
        return

    user["verified"] = True
    
    if write_json(users, DB_PATH):
        print(f"✅ Success: User '{user['username']}' is now verified.")
    else:
        print("❌ Failed to save changes.")

if __name__ == "__main__":
    set_verified()   