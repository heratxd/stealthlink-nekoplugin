#!/usr/bin/env bash
# build.sh — сборка StealthLink Plugin для NekoBox Android
#
# Требования:
#   - Go 1.22+
#   - Android SDK (только для сборки APK, опционально для тестирования бинарника)
#
# Использование:
#   ./build.sh              — собрать бинарники + APK
#   ./build.sh --binary     — только бинарники (без Gradle)
#   ./build.sh --apk        — только APK (бинарники уже в libs/)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLUGIN_DIR="$SCRIPT_DIR/plugin"
LIBS_DIR="$SCRIPT_DIR/app_stealthlink/libs"

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# Проверка Go
check_go() {
    if ! command -v go &>/dev/null; then
        log_error "Go не найден. Установи Go 1.22+: https://go.dev/dl/"
    fi
    GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
    log_info "Go version: $GO_VERSION"
}

# Синхронизация зависимостей
sync_deps() {
    log_info "Синхронизация Go зависимостей..."
    cd "$PLUGIN_DIR"
    go mod tidy
    cd "$SCRIPT_DIR"
}

# Кросс-компиляция под Android ABI
build_binary() {
    local GOOS="$1"
    local GOARCH="$2"
    local GOARM="${3:-}"
    local ABI="$4"
    local OUT_DIR="$LIBS_DIR/$ABI"
    local OUT_FILE="$OUT_DIR/libstealthlink.so"

    mkdir -p "$OUT_DIR"

    log_info "Сборка для $ABI (GOARCH=$GOARCH${GOARM:+ GOARM=$GOARM})..."

    cd "$PLUGIN_DIR"
    local ENV_VARS="GOOS=$GOOS GOARCH=$GOARCH CGO_ENABLED=0"
    if [ -n "$GOARM" ]; then
        ENV_VARS="$ENV_VARS GOARM=$GOARM"
    fi
    env $ENV_VARS go build \
        -trimpath \
        -ldflags="-s -w -buildid=" \
        -o "$OUT_FILE" \
        .

    if [ -f "$OUT_FILE" ]; then
        SIZE=$(du -sh "$OUT_FILE" | cut -f1)
        log_success "$ABI → $OUT_FILE ($SIZE)"
    else
        log_error "Сборка $ABI провалилась"
    fi

    cd "$SCRIPT_DIR"
}

build_all_binaries() {
    log_info "=== Сборка Go бинарников для Android ==="
    build_binary "android" "arm64"  ""  "arm64-v8a"
    # android/arm требует CGO; используем linux/arm — бинарник работает на Android arm32
    build_binary "linux"   "arm"    "7" "armeabi-v7a"
    build_binary "linux"   "386"    ""  "x86"
    build_binary "linux"   "amd64"  ""  "x86_64"
    log_success "=== Все бинарники собраны ==="
}

build_apk() {
    log_info "=== Сборка Android APK ==="

    if [ ! -f "$SCRIPT_DIR/gradlew" ]; then
        log_error "gradlew не найден. Убедись что Gradle wrapper есть в проекте."
    fi

    if ! command -v java &>/dev/null; then
        log_warn "Java не найдена — пропускаем сборку APK. Бинарники готовы в $LIBS_DIR"
        return
    fi

    cd "$SCRIPT_DIR"
    chmod +x gradlew

    log_info "Запуск Gradle assembleDebug..."
    ./gradlew :app_stealthlink:assembleDebug

    APK_DIR="$SCRIPT_DIR/app_stealthlink/build/outputs/apk/debug"
    if ls "$APK_DIR"/*.apk &>/dev/null; then
        log_success "=== APK готов ==="
        ls -lh "$APK_DIR"/*.apk
    fi

    cd "$SCRIPT_DIR"
}

# --- Main ---
MODE="${1:-}"

check_go
sync_deps

case "$MODE" in
    "--binary")
        build_all_binaries
        ;;
    "--apk")
        build_apk
        ;;
    *)
        build_all_binaries
        build_apk
        ;;
esac

log_success "Готово!"
