import json
import os
from werkzeug.security import generate_password_hash

def change_password():
    username = input("Username Password Changes: ").strip()
    accounts_path = r"Backend\Python\Data\Accounts.json"
    
    if not os.path.exists(accounts_path):
        print("Accounts file not found.")
        return

    try:
        with open(accounts_path, 'r', encoding='utf-8') as file:
            accounts = json.load(file)
    except json.JSONDecodeError:
        print("Error: Accounts file is not valid JSON.")
        return

    if not isinstance(accounts, list):
        print("Error: Accounts file format is not a list of users.")
        return

    user_found = False
    for account in accounts:
        if account.get('username') == username:
            new_password = input("What's New Password: ")
            # Hash the new password using the same method as Flask/Werkzeug
            hashed_password = generate_password_hash(new_password)
            account['password'] = hashed_password
            user_found = True
            break

    if user_found:
        try:
            with open(accounts_path, 'w', encoding='utf-8') as file:
                json.dump(accounts, file, indent=4, ensure_ascii=False)
            print("Password changed successfully.")
        except Exception as e:
            print(f"Error saving file: {e}")
    else:
        print("Username not found.")

if __name__ == "__main__":
    change_password()   