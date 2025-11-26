# import base64
# import json
# import requests

# # ==== ТВОИ ВХОДНЫЕ ДАННЫЕ ====
# data = {
#     "cms": {
#         "url": "https://consulthole.s2-tastewp.com",
#         "pass": "nh7A gEAZ T3UO EAjR 8Glv A9Cg",
#         "user": "super_admin"
#     },
#     "wpPost": {
#         "title": "О компании Innovaventis",
#         "content": "<h1>О компании Innovaventis</h1><p>Описание…</p>",
#         "status": "publish"
#     }
# }


# import requests
# import os

# APP_ID = "17841478321076796"
# APP_SECRET = "9b0c4b4d65fe9aeb7c98cc0df0376f7b"

# TOKEN_FILE = "token.txt"

# def load_token():
#     if not os.path.exists(TOKEN_FILE):
#         return None
#     return open(TOKEN_FILE, "r").read().strip()

# def save_token(token):
#     with open(TOKEN_FILE, "w") as f:
#         f.write(token)

# def validate_token(token):
#     url = "https://graph.facebook.com/debug_token"
#     params = {
#         "input_token": token,
#         "access_token": f"{APP_ID}|{APP_SECRET}"
#     }
#     r = requests.get(url, params=params).json()
#     return r

# def refresh_long_lived(token):
#     url = "https://graph.facebook.com/v24.0/oauth/access_token"
#     params = {
#         "grant_type": "fb_exchange_token",
#         "client_id": APP_ID,
#         "client_secret": APP_SECRET,
#         "fb_exchange_token": token
#     }
#     r = requests.get(url, params=params).json()
#     return r.get("access_token")

# def get_valid_token():
#     current = load_token()
    
#     if current is None:
#         raise Exception("❗ Нет initial long-lived token. Нужно один раз получить вручную.")

#     debug = validate_token(current)

#     # Если токен истёк → обновить (если Meta ещё позволяет)
#     if debug.get("data", {}).get("is_valid"):
#         print("✓ Token valid")
#         return current

#     print("⚠️ Token expired. Trying to refresh...")
#     new_token = refresh_long_lived(current)
    
#     if not new_token:
#         raise Exception("❌ Невозможно обновить токен. Нужно снова вручную получить short-lived token → long-lived")

#     save_token(new_token)
#     print("✓ Token refreshed")

#     return new_token


# # ======================
# # ТЕСТ РАБОТЫ
# # ======================
# if __name__ == "__main__":
#     token = get_valid_token()
#     print("\nYour working token:\n", token)

import os
import requests
import json

# ---------------------------------------------------------
# ТВОИ ДАННЫЕ — ВСТАВЬ СЮДА
# ---------------------------------------------------------
# PROJECT_URL = "https://cfojkqktuqfvarqhmcxfn.supabase.co"
# SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmb2prcXR1cWZ2YXJxaG1jeGZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODczNzksImV4cCI6MjA3OTE2MzM3OX0.c_SB4cyJhuWpzf_YuD_75RZzYvn3gMx1DWBkcLFDnrk"
# BUCKET_NAME = "images"

# # Имя, под которым загрузится файл
# UPLOAD_NAME = "test-upload.png"

# # Локальный файл из чата
# LOCAL_FILE = "file.jpg"
# # ---------------------------------------------------------

# # Переменные окружения
# SUPABASE_URL = "https://cfojkqtuqfvarqhmcxfn.supabase.co"  # пример: https://xyzcompany.supabase.co
# SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNmb2prcXR1cWZ2YXJxaG1jeGZuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzU4NzM3OSwiZXhwIjoyMDc5MTYzMzc5fQ.fzHZZNrsx5C1R3GV4HG2xpwyC4kpw2bgswtoUBvkOg0"

# bucket_id = "image"
# file_path = "image.jpg"  # путь внутри бакета
# local_file = "file.jpg"         # локальный файл для загрузки

# # 1. Загружаем файл в Supabase Storage
# upload_url = f"{SUPABASE_URL}/storage/v1/object/{bucket_id}/{file_path}"
# headers = {
#     "apikey": SUPABASE_SERVICE_KEY,
#     "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}"
# }

# with open(local_file, "rb") as f:
#     response = requests.put(upload_url, headers=headers, data=f)

# if response.status_code in (200, 201):
#     print("Файл успешно загружен")
# else:
#     print("Ошибка загрузки:", response.status_code, response.text)
#     exit()

# # 2. Создаём signed URL
# sign_url = f"{SUPABASE_URL}/storage/v1/object/sign/{bucket_id}/{file_path}"
# headers["Content-Type"] = "application/json"
# data = {"expiresIn": 5}  # URL действителен 1 час

# response = requests.post(sign_url, headers=headers, data=json.dumps(data))
# if response.status_code == 200:
#     signed_url = response.json()
#     print("Signed URL:", signed_url)
# else:
#     print("Ошибка генерации signed URL:", response.status_code, response.text)



# {"app_id": "1127484442518846", "app_secret": "e6110366e878a7fc2ecfa4c8c02ab33b", "access_token": "EAAQBcO2vpT4BPZCStHP4KuEUyqoTxI83s7unvAR968k6h9Kzmri6UZBvMbLuoZAtOexrm3JgQvLA45ZBWSr9KHL2ULG9JZAyYIKt8ycedsW3wmcZCiZAUp5WKOZAI9htFWFdAZBZAL1OZCyOaab5PNJB4APusD2c9xXtwXmseSh4QkbFYZAWLOtyRvJR89ZCuevAv", "ig_user_id": "17841478321076796"}


# import requests
# import time
# import os
# import json

# APP_ID = "1127484442518846"
# APP_SECRET = "e6110366e878a7fc2ecfa4c8c02ab33b"
# SHORT_LIVED_TOKEN = "EAAQBcO2vpT4BP0tuIsYrQZBXBNnmpu4pzGYClQzQtc8t2immkY5ZCeys0ZBqXDs6pjtYVWCPyGUksnlOA2BOHJl9ICp5gdw9R3LtZAgNxF7i1TcvLGk5WpvmrgyL6JQGiSHE187g8qblPQYLemCBIkHkZCWuKNECibDOcOXiw4WHuRQZBuIXz35oZBiXvUt"
# IG_USER_ID = "17841478321076796"
# IMAGE_URL = "https://ldaily.ua/wp-content/uploads/2020/02/google_company.jpg"
# CAPTION = "Hello from Python via Instagram Graph API!"
# TOKEN_FILE = "token.json"

# def save_token(token):
#     with open(TOKEN_FILE, "w") as f:
#         json.dump({"access_token": token}, f)
# def load_token():
#     try:
#         with open(TOKEN_FILE, "r") as f:
#             return json.load(f).get("access_token")
#     except:
#         return None

# def get_long_lived_token(short_token):
#     print("Получаю long-lived token...")
#     url = "https://graph.facebook.com/v24.0/oauth/access_token"
#     params = {
#         "grant_type": "fb_exchange_token",
#         "client_id": APP_ID,
#         "client_secret": APP_SECRET,
#         "fb_exchange_token": short_token
#     }
#     r = requests.get(url, params=params)
#     data = r.json()
#     if "access_token" not in data:
#         raise Exception("Ошибка получения long token: " + str(data))
#     return data["access_token"]

# def refresh_long_token(long_token):
#     """
#     Facebook позволяет обновлять long-lived токен — 
#     просто обмениваешь его сам на себя.
#     """
#     print("Обновляю long-lived token...")
#     print("OLD: ", long_token)
#     url = "https://graph.facebook.com/v24.0/oauth/access_token"
#     params = {
#         "grant_type": "fb_exchange_token",
#         "client_id": APP_ID,
#         "client_secret": APP_SECRET,
#         "fb_exchange_token": long_token
#     }
#     r = requests.get(url, params=params)
#     data = r.json()
#     if "access_token" not in data:
#         raise Exception("Ошибка обновления токена: " + str(data))
#     print("NEW: ", data["access_token"])
#     return data["access_token"]

# def get_valid_token():
#     token = load_token()

#     if token is None:
#         # Первый запуск — создаём long-lived token из короткого
#         token = get_long_lived_token(SHORT_LIVED_TOKEN)
#         save_token(token)
#         print("Сохранил первый long-lived token.")
#         return token

#     # Если токен уже есть — просто обновляем его каждые 30 дней
#     try:
#         new_token = refresh_long_token(token)
#         save_token(new_token)
#         print("Long-lived token обновлен.")
#         return new_token
#     except Exception as e:
#         print("Ошибка обновления, пробую получить заново:", e)
#         # Последняя попытка — полностью восстановить токен
#         token = get_long_lived_token(SHORT_LIVED_TOKEN)
#         save_token(token)
#         print("Сгенерирован новый long-lived token.")
#         return token

# def publish_instagram_post():
#     access_token = get_valid_token()

#     # 1. Создание медиаконтейнера
#     create_url = f"https://graph.facebook.com/v24.0/{IG_USER_ID}/media"
#     payload_create = {
#         "image_url": IMAGE_URL,
#         "caption": CAPTION,
#         "access_token": access_token
#     }

#     r = requests.post(create_url, data=payload_create)
#     data = r.json()
#     print("Ответ (создание контейнера):", data)

#     if "id" not in data:
#         raise Exception("Ошибка создания контейнера: " + str(data))

#     creation_id = data["id"]

#     # 2. Публикация контейнера
#     time.sleep(2)  # На всякий случай
#     publish_url = f"https://graph.facebook.com/v24.0/{IG_USER_ID}/media_publish"
#     payload_publish = {
#         "creation_id": creation_id,
#         "access_token": access_token
#     }
#     print(access_token)

#     r = requests.post(publish_url, data=payload_publish)
#     result = r.json()
#     print("Ответ (публикация):", result)

# publish_instagram_post()

# {"access_token": "EAAQBcO2vpT4BQMoyDbPRvaX0XUiGPJPSqQGGH9PZCP9OtlUwoZC9vZBwLHjLZB7G3wwHUVyRDYSxWR8sBRIfoeeBrKZCxBALiIZAnWRJMJcsDvXfVhNPTeVEJfRSFbFjGIPADh6L2uj8ZBJVyZB5xg19KJ6Wmeoih2rsD6KC55ZBYpZBmv7A23fbwWpZBXr4mnB"}
import requests
import time
import os
import json

APP_ID = "1127484442518846"
APP_SECRET = "e6110366e878a7fc2ecfa4c8c02ab33b"
SHORT_LIVED_TOKEN = "EAAQBcO2vpT4BQMRwJfMzwnHwAfZCtnOStR6UwvrXHek0crNmalQFNeEHLTZCNAhkvr75mScZCZCZAChgSN1lhLxuTGeZA0ZAfsYklWSZCSOiaB1exN2FRu3Nn0fEFDkKILTd8J4gihCeSIhh4J7BmhTFIA8zUwD9gFIBIFMW1lKZCviDuTq5bvkZC7reB2ZAf2mie2dYuxPMoROZCaHyelzRt6QtOOzTHHWHYELTTkAV33nN"
PAGE_ID = "866043503258464"

IMAGE_URL = "https://ldaily.ua/wp-content/uploads/2020/02/google_company.jpg"
MESSAGE = "Hello from Python via Facebook Graph API!"

TOKEN_FILE = "token.json"


# --------------------------- TOKEN UTILS ---------------------------

def save_token(token):
    with open(TOKEN_FILE, "w") as f:
        json.dump({"access_token": token}, f)

def load_token():
    try:
        with open(TOKEN_FILE, "r") as f:
            return json.load(f).get("access_token")
    except:
        return None


def get_long_lived_token(short_token):
    print("Получаю long-lived token (Facebook Page)...")
    url = "https://graph.facebook.com/v24.0/oauth/access_token"
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": APP_ID,
        "client_secret": APP_SECRET,
        "fb_exchange_token": short_token
    }

    r = requests.get(url, params=params)
    data = r.json()
    if "access_token" not in data:
        raise Exception("Ошибка получения long token: " + str(data))

    return data["access_token"]


def refresh_long_token(long_token):
    print("Обновляю long-lived token (Facebook Page)...")
    print("OLD: ", long_token)
    url = "https://graph.facebook.com/v24.0/oauth/access_token"
    params = {
        "grant_type": "fb_exchange_token",
        "client_id": APP_ID,
        "client_secret": APP_SECRET,
        "fb_exchange_token": long_token
    }

    r = requests.get(url, params=params)
    data = r.json()
    if "access_token" not in data:
        raise Exception("Ошибка обновления токена: " + str(data))
    print("NEW: ", long_token)
    return data["access_token"]


def get_valid_token():
    token = load_token()

    if token is None:
        token = get_long_lived_token(SHORT_LIVED_TOKEN)
        save_token(token)
        print("Сохранил первый long-lived token.")
        return token

    try:
        new_token = refresh_long_token(token)
        save_token(new_token)
        print("Long-lived token обновлен.")
        return new_token
    except Exception as e:
        print("Ошибка обновления, пробую получить заново:", e)
        token = get_long_lived_token(SHORT_LIVED_TOKEN)
        save_token(token)
        print("Сгенерирован новый long-lived token.")
        return token


# --------------------------- FACEBOOK POSTING ---------------------------

def publish_facebook_post():
    access_token = get_valid_token()

    # 1. Загружаем фото как attachment (медиa)
    create_media_url = f"https://graph.facebook.com/v24.0/{PAGE_ID}/photos"
    payload_media = {
        "url": IMAGE_URL,
        "caption": MESSAGE,
        "access_token": access_token
    }

    r = requests.post(create_media_url, data=payload_media)
    data = r.json()
    print("Ответ (создание фото):", data)

    if "post_id" not in data:
        raise Exception("Ошибка публикации фото: " + str(data))

    print("Пост успешно опубликован!")
    print("ID:", data["post_id"])


publish_facebook_post()





# # ==== 1. Генерируем BASE64 авторизацию ====
# user = data["cms"]["user"]
# password = data["cms"]["pass"]
# auth_string = f"{user}:{password}"
# auth_encoded = base64.b64encode(auth_string.encode()).decode()

# headers = {
#     "Authorization": f"Basic {auth_encoded}",
#     "Content-Type": "application/json"
# }

# # ==== 2. Создаём пост ====
# post_url = f"{data['cms']['url']}/wp-json/wp/v2/posts"

# post_payload = {
#     "title": data["wpPost"]["title"],
#     "content": data["wpPost"]["content"],
#     "status": data["wpPost"]["status"]
# }

# response = requests.post(
#     post_url,
#     headers=headers,
#     data=json.dumps(post_payload)
# )

# # ==== 3. Проверяем результат ====
# if response.status_code not in [200, 201]:
#     print("Ошибка создания поста:", response.text)
# else:
#     print("Пост успешно создан!")
#     print("ID:", response.json()["id"])




# IGAAS7TtXAlRVBZAFNOaWJLUlU3QTBvcjJYTlhGdi1oTGVaSnJ5WFlERVNNV1pnMEdJVlp0eVcwN3VjY2owQWVaYmJieC00SGMyT2E3R2FDTnBfRDhYMGM5Q2gyRU9aVldEaHd2LUJZAWnVWeHZAKNHJYRXhnbWdQLXBGaHJpTWtZATQZDZD


# EAAQBcO2vpT4BP0UgiB7iLywCwUPObVAozwbZAtjmdqNmruBheobiVvhzxKMjkoBRQPeHkOOBg1WjExsw6wt3E2mSWpk24GgyB7ZCeKZAhSdZBBwBm3AZCuxaIODCjdSAUhzbWM8TPEJs2pYFpbVPnyANyPA82CNGBB5f3ZAZCcLmjAXfBLwnrcnJce1rcdIrhDBRK1jTyB2gj3m4ZCk1VbLzVwvIuIJJB92TyTvmNWeYDuLS