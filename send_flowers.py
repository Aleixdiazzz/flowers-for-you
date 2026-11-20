#!/usr/bin/env python3
"""Send the daily flowers link from your own Telegram account (userbot).

Flow (env-driven, so it works over non-interactive SSH):

  TG_API_ID=.. TG_API_HASH=.. TG_PHONE=+34... python3 send_flowers.py request
      -> Telegram sends a login code to your phone; the code hash is saved.

  TG_API_ID=.. TG_API_HASH=.. TG_CODE=12345 [TG_2FA=..] python3 send_flowers.py login
      -> completes sign-in and saves the session (one time only).

  TG_API_ID=.. TG_API_HASH=.. TG_RECIPIENT=.. python3 send_flowers.py
      -> sends the message to her (this is what cron runs daily).
"""
import os
import sys
import json
import random
import asyncio

from telethon import TelegramClient
from telethon.errors import SessionPasswordNeededError

SESSION = "/root/flowers-for-you/flowers.session"
STATE = "/root/flowers-for-you/login_state.json"
URL = "https://flowers.example.com"

GREETINGS = [
    "Buenos días, amor ♥",
    "Buenos días, preciosa ♥",
    "Despierta, que hoy también hay flores para ti ♥",
    "Para que empieces el día con una sonrisa ♥",
]


def client():
    return TelegramClient(SESSION, int(os.environ["TG_API_ID"]), os.environ["TG_API_HASH"])


async def main():
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
        else:
            if not await c.is_user_authorized():
                print("NOT_AUTHORIZED")
                return
            text = random.choice(GREETINGS) + "\n\nTe he traído flores:\n" + URL
            await c.send_message(os.environ["TG_RECIPIENT"], text)
            print("SENT")
    finally:
        await c.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
