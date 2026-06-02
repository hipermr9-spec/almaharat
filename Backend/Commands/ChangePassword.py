import json
import os
import hashlib
import getpass
from pathlib import Path
from werkzeug.security import generate_password_hash

# --- 1. Configuration & Paths ---
current_dir = Path(__file__).parent
# Path to the secure admin hash file (created by your temp_setup.py earlier)
ADMIN_PASSWORD_FILE = current_dir / "password.json"
# Path to the user database
DB_PATH = current_dir.parent / "Python" / "Data" / "Accounts.json"

# --- 2. Helper Functions ---
def load_admin_hash():
    """Loads the admin hash from password.json"""
    if not ADMIN_PASSWORD_FILE.exists():
        print(f"❌ CRITICAL: Admin security file not found at {ADMIN_PASSWORD_FILE}")
        print("   Please run the setup script to generate password.json first.")
        return None
    
    try:
        with open(ADMIN_PASSWORD_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data.get("admin_hash")
    except Exception as e:
        print(f"❌ Error reading admin file: {e}")
        return None

def verify_admin_password(stored_hash):
    """Asks for password and verifies it"""
    if not stored_hash:
        return False
    
    # Ask for admin password
    pwd_input = getpass.getpass("🔒 Enter Admin Password to authorize changes: ")
    
    # Hash the input using the same salt/method used to create the file
    # Note: password.json stores a SHA256 hash with a specific salt
    salt = "static_salt_for_demo_only" 
    input_hash = hashlib.sha256((pwd_input + salt).encode()).hexdigest()
    
    if input_hash != stored_hash:
        print("❌ Access Denied: Incorrect admin password.")
        return False
    return True

def change_password():
    print("--- Secure Password Change Tool ---")
    
    # 1. SECURITY CHECK: Verify Admin Identity
    admin_hash = load_admin_hash()
    if not verify_admin_password(admin_hash):
        return # Stop execution if admin auth fails

    # 2. Proceed with Password Change
    username = input("Username to change password for: ").strip()
    
    if not DB_PATH.exists():
        print("❌ Accounts file not found.")
        return

    try:
        with open(DB_PATH, 'r', encoding='utf-8') as file:
            accounts = json.load(file)
    except json.JSONDecodeError:
        print("❌ Error: Accounts file is not valid JSON.")
        return

    if not isinstance(accounts, list):
        print("❌ Error: Accounts file format is not a list.")
        return

    user_found = False
    for account in accounts:
        if account.get('username', '').lower() == username.lower():
            print(f"👤 User found: {account['username']}")
            
            # Get new password
            new_password = input("Enter New Password: ")
            confirm_password = input("Confirm New Password: ")
            
            if new_password != confirm_password:
                print("❌ Passwords do not match.")
                return

            if len(new_password) < 6:
                print("❌ Password too short (min 6 characters).")
                return

            # Hash using Werkzeug (compatible with your website)
            hashed_password = generate_password_hash(new_password)
            account['password'] = hashed_password
            user_found = True
            break

    if user_found:
        try:
            with open(DB_PATH, 'w', encoding='utf-8') as file:
                json.dump(accounts, file, indent=4, ensure_ascii=False)
            print("✅ Password changed successfully.")
        except Exception as e:
            print(f"❌ Error saving file: {e}")
    else:
        print(f"❌ Username '{username}' not found.")

if __name__ == "__main__":
    change_password()   