# StealthLink Plugin for NekoBox Android

Плагин протокола [StealthLink](https://github.com/heratxd/stealthlink) для [NekoBox for Android](https://github.com/MatsuriDayo/NekoBoxForAndroid).

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
git clone https://github.com/heratxd/stealthlink
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

## Использование в NekoBox

1. Установи plugin APK на Android-устройство
2. Открой NekoBox → Настройки → Плагины — плагин должен появиться в списке
3. Добавь новый профиль, выбери **StealthLink** как протокол
4. Введи параметры:
   - **Server**: `host:port`
   - **PSK**: pre-shared key
   - **SNI**: SNI для TLS (например `www.microsoft.com`)
   - **Transport**: `tls` или `quic`
   - **Fingerprint**: `chrome`, `firefox`, `ios`, `android`, `random`...

## Параметры CLI

NekoBox запускает плагин с аргументами:

| Флаг | Описание | По умолчанию |
|------|----------|--------------|
| `-server` | Адрес сервера `host:port` | — |
| `-psk` | Pre-shared key | — |
| `-sni` | SNI hostname | — |
| `-transport` | `tls`, `quic`, `auto` | `tls` |
| `-socks` | SOCKS5 адрес | `127.0.0.1:1080` |
| `-path` | Секретный HTTP путь | `/api/v2/sync` |
| `-fingerprint` | uTLS fingerprint | `chrome` |
| `-sub` | Subscription URL `stealthlink://...` | — |

## Лицензия

AGPL-3.0 — см. [LICENSE](LICENSE)
