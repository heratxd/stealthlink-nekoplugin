// Copyright (C) 2026 HeratXD
// Licensed under the GNU Affero General Public License v3.0.

// StealthLink Plugin for NekoBox for Android
//
// NekoBox передаёт конфигурацию через переменные окружения SIP003:
//
//   SS_REMOTE_HOST      — адрес StealthLink сервера
//   SS_REMOTE_PORT      — порт StealthLink сервера
//   SS_LOCAL_HOST       — localhost (127.0.0.1)
//   SS_LOCAL_PORT       — порт для SOCKS5 (NekoBox сам выбирает)
//   SS_PLUGIN_OPTIONS   — доп. параметры в формате key=val;key2=val2
//
// Поддерживаемые ключи в SS_PLUGIN_OPTIONS:
//   psk=<key>            pre-shared key (обязательный)
//   sni=<hostname>       SNI для TLS
//   transport=<tls|quic> транспорт (по умолчанию: tls)
//   path=<path>          секретный HTTP путь (по умолчанию: /api/v2/sync)
//   fingerprint=<fp>     uTLS fingerprint (chrome/firefox/ios/android/random)
//   insecure=true        отключить проверку TLS сертификата
//   no-padding=true      отключить паддинг
//   no-stealth=true      отключить stealth-фичи
//   sub=<url>            subscription URL (stealthlink://...)
//   log=<path>           путь к файлу логов

package main

import (
	"flag"
	"fmt"
	"log"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"syscall"

	"stealthlink/core/transport"
)

// parsePluginOptions разбирает строку формата "key=val;key2=val2"
// с поддержкой экранирования: \; \= \\
func parsePluginOptions(opts string) map[string]string {
	result := make(map[string]string)
	if opts == "" {
		return result
	}

	var key, val strings.Builder
	inVal := false
	escaped := false

	for _, ch := range opts {
		if escaped {
			if inVal {
				val.WriteRune(ch)
			} else {
				key.WriteRune(ch)
			}
			escaped = false
			continue
		}
		switch ch {
		case '\\':
			escaped = true
		case '=':
			if !inVal {
				inVal = true
			} else {
				val.WriteRune(ch)
			}
		case ';':
			if inVal {
				result[key.String()] = val.String()
			} else if key.Len() > 0 {
				result[key.String()] = ""
			}
			key.Reset()
			val.Reset()
			inVal = false
		default:
			if inVal {
				val.WriteRune(ch)
			} else {
				key.WriteRune(ch)
			}
		}
	}
	// последний ключ
	if inVal {
		result[key.String()] = val.String()
	} else if key.Len() > 0 {
		result[key.String()] = ""
	}

	return result
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func main() {
	// Поддержка CLI-аргументов для NekoBox (SagerNet Native Plugin)
	flagServerAddr := flag.String("server", "", "Адрес сервера host:port")
	flagPsk := flag.String("psk", "", "Pre-shared key")
	flagSni := flag.String("sni", "", "SNI hostname")
	flagTransportM := flag.String("transport", "", "tls, quic, auto")
	flagSocksAddr := flag.String("socks", "", "SOCKS5 адрес")
	flagSecretPath := flag.String("path", "", "Секретный HTTP путь")
	flagFingerprint := flag.String("fingerprint", "", "uTLS fingerprint")
	flagSubURL := flag.String("sub", "", "Subscription URL stealthlink://...")
	flagLogPath := flag.String("log", "", "Путь к файлу логов")
	flagInsecure := flag.Bool("insecure", false, "Отключить проверку TLS сертификата")
	flagNoPadding := flag.Bool("no-padding", false, "Отключить паддинг")
	flagNoStealth := flag.Bool("no-stealth", false, "Отключить stealth-фичи")
	flag.Parse()

	// === SIP003 переменные окружения (Shadowsocks compat) ===
	remoteHost := getEnv("SS_REMOTE_HOST", "")
	remotePort := getEnv("SS_REMOTE_PORT", "443")
	localHost  := getEnv("SS_LOCAL_HOST", "127.0.0.1")
	localPort  := getEnv("SS_LOCAL_PORT", "1080")
	pluginOpts := getEnv("SS_PLUGIN_OPTIONS", "")

	// Парсим дополнительные опции (SIP003)
	opts := parsePluginOptions(pluginOpts)

	// Объединяем конфигурации (CLI имеет приоритет над SIP003, если задано)
	subURL := opts["sub"]
	if *flagSubURL != "" {
		subURL = *flagSubURL
	}

	serverAddr := ""
	if *flagServerAddr != "" {
		serverAddr = *flagServerAddr
	} else if remoteHost != "" {
		serverAddr = fmt.Sprintf("%s:%s", remoteHost, remotePort)
	}

	socksAddr := ""
	if *flagSocksAddr != "" {
		socksAddr = *flagSocksAddr
	} else {
		socksAddr = fmt.Sprintf("%s:%s", localHost, localPort)
	}

	psk := opts["psk"]
	if *flagPsk != "" {
		psk = *flagPsk
	}

	sni := opts["sni"]
	if *flagSni != "" {
		sni = *flagSni
	}

	transportM := opts["transport"]
	if *flagTransportM != "" {
		transportM = *flagTransportM
	}
	if transportM == "" {
		transportM = "tls"
	}

	secretPath := opts["path"]
	if *flagSecretPath != "" {
		secretPath = *flagSecretPath
	}
	if secretPath == "" {
		secretPath = "/api/v2/sync"
	}

	fingerprint := opts["fingerprint"]
	if *flagFingerprint != "" {
		fingerprint = *flagFingerprint
	}
	if fingerprint == "" {
		fingerprint = "chrome"
	}

	insecure, _ := strconv.ParseBool(opts["insecure"])
	if *flagInsecure {
		insecure = true
	}

	noPadding, _ := strconv.ParseBool(opts["no-padding"])
	if *flagNoPadding {
		noPadding = true
	}

	noStealth, _ := strconv.ParseBool(opts["no-stealth"])
	if *flagNoStealth {
		noStealth = true
	}

	logPath := opts["log"]
	if *flagLogPath != "" {
		logPath = *flagLogPath
	}

	// === Настройка логирования ===
	if logPath != "" {
		f, err := os.OpenFile(logPath, os.O_CREATE|os.O_WRONLY|os.O_APPEND, 0644)
		if err == nil {
			log.SetOutput(f)
			defer f.Close()
		}
	}
	log.SetFlags(log.LstdFlags | log.Lmicroseconds)
	log.Printf("[StealthLink Plugin v0.1.0] Starting...")

	// === Конфигурация ===

	if subURL == "" && serverAddr == "" {
		log.Fatal("[StealthLink] serverAddr не задан и sub= не указан")
	}

	if psk == "" && subURL == "" {
		log.Fatal("[StealthLink] psk= обязателен (или использовать sub=)")
	}

	// Подписка
	var subscription *transport.SubscriptionConfig
	if subURL != "" {
		sub, err := transport.DecodeSubscriptionURL(subURL)
		if err != nil {
			log.Fatalf("[StealthLink] Невалидный subscription URL: %v", err)
		}
		subscription = sub
		log.Printf("[StealthLink] Подписка: %s (%d серверов)", sub.Name, len(sub.Servers))
	}

	// Padding
	paddingCfg := transport.DefaultPaddingConfig()
	if noPadding {
		paddingCfg.Enabled = false
	}

	// Stealth
	stealthCfg := transport.DefaultStealthConfig()
	if noStealth {
		stealthCfg.Enabled = false
	}

	cfg := transport.ClientConfig{
		ServerAddr:   serverAddr,
		PSK:          psk,
		SNI:          sni,
		Transport:    transportM,
		SecretPath:   secretPath,
		SOCKSAddr:    socksAddr,
		InsecureSkip: insecure,
		PaddingCfg:   paddingCfg,
		StealthCfg:   stealthCfg,
		Subscription: subscription,
		Fingerprint:  fingerprint,
	}

	client := transport.NewClient(cfg)

	log.Printf("[StealthLink] Transport:  %s", transportM)
	log.Printf("[StealthLink] SOCKS5:     %s", socksAddr)
	log.Printf("[StealthLink] Fingerprint: %s", fingerprint)
	if serverAddr != "" {
		log.Printf("[StealthLink] Server:     %s", serverAddr)
	}
	if subscription != nil {
		log.Printf("[StealthLink] Servers:    %d (подписка)", len(subscription.Servers))
	}

	// Graceful shutdown по SIGTERM от NekoBox
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGTERM, syscall.SIGINT)
	go func() {
		sig := <-sigCh
		log.Printf("[StealthLink] Получен сигнал %v, завершаем...", sig)
		client.Stop()
		os.Exit(0)
	}()

	if err := client.Start(); err != nil {
		log.Fatalf("[StealthLink] Ошибка клиента: %v", err)
	}
}
