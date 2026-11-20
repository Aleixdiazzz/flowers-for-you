#!/usr/bin/env python3
"""Send the daily flowers link from your own Telegram account (userbot).

Credentials live in /root/flowers-for-you/config.env (root-only). Ephemeral
values (login code, 2FA password) are passed as env vars for the one-time login.

Commands:
  python3 send_flowers.py request   -> Telegram sends a login code to your phone
  python3 send_flowers.py login     -> completes sign-in (needs TG_CODE, TG_2FA)
  python3 send_flowers.py check     -> verify session + recipient, print the message (no send)
  python3 send_flowers.py           -> send the message (what cron runs)
"""
import os
import sys
import json
import asyncio

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError

CONFIG_FILE = "/root/flowers-for-you/config.env"
SESSION = "/root/flowers-for-you/flowers.session"
STATE = "/root/flowers-for-you/login_state.json"

GREETING = "Bon dia 🖤"


def load_config():
    cfg = {}
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    cfg[k.strip()] = v.strip()
    for k, v in os.environ.items():  # env overrides file (for TG_CODE / TG_2FA)
        if k.startswith("TG_"):
            cfg[k] = v
    os.environ.update(cfg)


def client():
    return TelegramClient(SESSION, int(os.environ["TG_API_ID"]), os.environ["TG_API_HASH"])


async def main():
    load_config()
    url = os.environ.get("TG_URL", "")
    cmd = sys.argv[1] if len(sys.argv) > 1 else "send"
    c = client()
    await c.connect()
    try:
        if cmd == "request":
            phone = os.environ["TG_PHONE"]
            sent = await c.send_code_request(phone)
            with open(STATE, "w") as f:
                json.dump({"phone": phone, "phone_code_hash": sent.phone_code_hash}, f)
            print("CODE_REQUESTED")
        elif cmd == "login":
            st = json.load(open(STATE))
            try:
                await c.sign_in(st["phone"], os.environ["TG_CODE"],
                                phone_code_hash=st["phone_code_hash"])
            except SessionPasswordNeededError:
                await c.sign_in(password=os.environ.get("TG_2FA", ""))
            print("LOGGED_IN")
        elif cmd == "check":
            if not await c.is_user_authorized():
                print("NOT_AUTHORIZED")
                return
            print("AUTHORIZED")
            try:
                ent = await c.get_entity(os.environ["TG_RECIPIENT"])
                print("RECIPIENT_OK", getattr(ent, "first_name", ""))
            except Exception as e:
                print("RECIPIENT_UNRESOLVED", type(e).__name__, str(e)[:120])
            print("WOULD_SEND:", repr(GREETING + "\n" + url))
        else:
            if not await c.is_user_authorized():
                print("NOT_AUTHORIZED")
                return
            text = GREETING + "\n" + url
            await c.send_message(os.environ["TG_RECIPIENT"], text)
            print("SENT")
    finally:
        await c.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
