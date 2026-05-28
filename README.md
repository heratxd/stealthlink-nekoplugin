# StealthLink Plugin for NekoBox Android

Плагин протокола [StealthLink](https://github.com/komarukomaru/stealthlink) для [NekoBox for Android](https://github.com/MatsuriDayo/NekoBoxForAndroid).

## Что это

StealthLink — censorship-resistant VPN протокол с TLS 1.3 / QUIC транспортом и DPI-обходом (uTLS fingerprinting, padding, replay protection).

Этот репозиторий — **Android плагин** для NekoBox, который позволяет использовать StealthLink прямо из приложения.

## Структура

```
stealthlink-plugin/
├── plugin/               # Go-клиент (точка входа плагина)
│   ├── main.go           # Адаптер для NekoBox CLI-аргументов
│   └── go.mod            # Зависит от ../stealthlink/protocol
├── app_stealthlink/      # Android APK модуль
│   └── src/main/
│       ├── AndroidManifest.xml       # Plugin manifest
│       └── java/.../BinaryProvider.kt  # ContentProvider для NekoBox
├── common/               # Shared plugin interface (из SagerNet)
├── build.sh              # Скрипт сборки
└── .github/workflows/    # CI/CD
```

## Сборка

### Требования
- Go 1.22+
- Android SDK (для APK)
- Java 17+ (для Gradle)

### Быстрый старт

```bash
# Клонируй оба репозитория рядом
git clone https://github.com/komarukomaru/stealthlink
git clone https://github.com/heratxd/stealthlink-plugin
cd stealthlink-plugin

# Собрать всё (бинарники + APK)
bash build.sh

# Только бинарники (без Android SDK)
bash build.sh --binary

# Только APK (если бинарники уже собраны)
bash build.sh --apk
```

### Результат

APK появится в `app_stealthlink/build/outputs/apk/release/`.

## Использование в NekoBox (через Shadowsocks Plugin)

Поскольку StealthLink — это новый протокол, его интерфейс не встроен в NekoBox напрямую. Вместо этого плагин работает по официальному стандарту **Shadowsocks SIP003**.

### Способ 1. Быстрый импорт одной ссылкой из буфера (Рекомендуется) ⚡

NekoBox умеет импортировать настройки плагина прямо из буфера обмена, если они упакованы в формат Shadowsocks. 

**Шаблон ссылки:**
```text
ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@<IP_сервера>:<Порт_сервера>/?plugin=stealthlink;psk=<твой_psk>;sni=<твой_sni>;transport=<tls_или_quic>;fingerprint=chrome#StealthLink
```

1. Скопируй ссылку такого формата.
2. Открой **NekoBox** -> Нажми кнопку меню / плюсик -> **Импортировать из буфера обмена**.
3. Профиль автоматически создастся и сам настроит наш плагин со всеми ключами!

---

### Способ 2. Ручная настройка

1. Установи плагин (`.apk`) на телефон.
2. В NekoBox нажми **`+`** (Добавить профиль) -> выбери протокол **Shadowsocks**.
3. Заполни основные поля:
   - **Server / Address**: IP-адрес твоего StealthLink-сервера
   - **Port**: Порт твоего StealthLink-сервера
   - **Encryption (Шифрование)**: Любое (например, `chacha20-ietf-poly1305`)
   - **Password (Пароль)**: Любой символ (поле обязательно для SS)
4. Прокрути вниз до поля **Плагин (Plugin)**, нажми на него и выбери **StealthLink Plugin**.
5. В появившемся поле **Опции плагина (Plugin Options)** впиши:
   `psk=твой_ключ;sni=твой_домен;transport=tls;fingerprint=chrome`
6. Сохрани и подключайся!

---

## 🛠 Утилита для конвертации ссылок (Генератор)

Вы можете использовать этот простой скрипт на Python, чтобы быстро превращать стандартный конфиг StealthLink в ссылку `ss://` для импорта в NekoBox:

```python
import base64
import json
import urllib.parse

def make_nekobox_link(ip, port, psk, sni, transport="tls", fingerprint="chrome", label="StealthLink"):
    # Заглушка шифрования для Shadowsocks-валидации
    ss_auth = base64.b64encode(b"aes-128-gcm:password").decode("utf-8")
    
    # Опции плагина
    options = f"psk={psk};sni={sni};transport={transport};fingerprint={fingerprint}"
    options_escaped = urllib.parse.quote(options)
    
    # Сборка финального URI
    link = f"ss://{ss_auth}@{ip}:{port}/?plugin=stealthlink;{options_escaped}#{urllib.parse.quote(label)}"
    return link

# Пример использования:
print(make_nekobox_link(
    ip="1.2.3.4",
    port=443,
    psk="your_secret_key",
    sni="www.microsoft.com",
    label="My Home Server"
))
```

## Лицензия

AGPL-3.0 — см. [LICENSE](LICENSE)
