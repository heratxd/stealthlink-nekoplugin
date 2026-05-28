import { util } from "../common/util.js";
import { commomClass } from "../common/common.js";
import { TR } from "../common/translate.js";

class stealthlinkClass {
    constructor() {
        this.sharedStorage = {};
        this.defaultSharedStorage = {};
        this.common = new commomClass();
    }

    _initDefaultSharedStorage() {
        // Default base keys required by NekoBox
        this.defaultSharedStorage.jsVersion = 1;
        this.defaultSharedStorage.name = "stealthlink";
        
        // StealthLink specific settings
        this.defaultSharedStorage.serverAddress = "127.0.0.1";
        this.defaultSharedStorage.serverPort = "443";
        this.defaultSharedStorage.psk = "";
        this.defaultSharedStorage.sni = "";
        this.defaultSharedStorage.transport = "tls";
        this.defaultSharedStorage.path = "/api/v2/sync";
        this.defaultSharedStorage.fingerprint = "chrome";
        this.defaultSharedStorage.insecure = false;
        this.defaultSharedStorage.noPadding = false;
        this.defaultSharedStorage.noStealth = false;

        for (var k in this.defaultSharedStorage) {
            let v = this.defaultSharedStorage[k];
            this.common._setType(k, typeof v);

            if (!this.sharedStorage.hasOwnProperty(k)) {
                this.sharedStorage[k] = v;
            }
        }
    }

    _onSharedStorageUpdated() {
        for (var k in this.sharedStorage) {
            if (this.sharedStorage[k] == null) {
                this.sharedStorage[k] = "";
            }
        }
        this._setShareLink();
    }

    _setShareLink() {
        // Generate a standard share link: stealthlink://host:port/?psk=...&sni=...
        var hostPort = this.sharedStorage.serverAddress + ":" + this.sharedStorage.serverPort;
        var builder = util.newURL("stealthlink://" + hostPort + "/");
        
        if (this.sharedStorage.name.isNotBlank()) {
            builder.hash = "#" + encodeURIComponent(this.sharedStorage.name);
        }

        builder.searchParams.set("psk", this.sharedStorage.psk);
        builder.searchParams.set("sni", this.sharedStorage.sni);
        builder.searchParams.set("transport", this.sharedStorage.transport);
        builder.searchParams.set("path", this.sharedStorage.path);
        builder.searchParams.set("fingerprint", this.sharedStorage.fingerprint);

        if (this.sharedStorage.insecure) builder.searchParams.set("insecure", "1");
        if (this.sharedStorage.noPadding) builder.searchParams.set("noPadding", "1");
        if (this.sharedStorage.noStealth) builder.searchParams.set("noStealth", "1");

        this.sharedStorage.shareLink = builder.toString();
    }

    // UI Configuration Screen
    requirePreferenceScreenConfig() {
        let sb = [
            {
                title: "StealthLink Server Configuration",
                preferences: [
                    {
                        type: "EditTextPreference",
                        key: "serverAddress",
                        icon: "ic_action_globe",
                    },
                    {
                        type: "EditTextPreference",
                        key: "serverPort",
                        icon: "ic_action_settings",
                    },
                    {
                        type: "EditTextPreference",
                        key: "psk",
                        icon: "ic_notification_enhanced_encryption",
                    },
                    {
                        type: "EditTextPreference",
                        key: "sni",
                        icon: "ic_action_copyright",
                    },
                    {
                        type: "EditTextPreference",
                        key: "transport",
                        icon: "ic_hardware_router",
                    },
                    {
                        type: "EditTextPreference",
                        key: "path",
                        icon: "ic_baseline_view_list_24",
                    },
                    {
                        type: "EditTextPreference",
                        key: "fingerprint",
                        icon: "ic_baseline_fingerprint_24",
                    },
                    {
                        type: "SwitchPreference",
                        key: "insecure",
                        icon: "ic_service_busy",
                    },
                    {
                        type: "SwitchPreference",
                        key: "noPadding",
                        icon: "ic_baseline_layers_24",
                    },
                    {
                        type: "SwitchPreference",
                        key: "noStealth",
                        icon: "ic_baseline_timelapse_24",
                    },
                ],
            }
        ];
        this.common._applyTranslateToPreferenceScreenConfig(sb, TR);
        return JSON.stringify(sb);
    }

    setSharedStorage(b64Str) {
        this.sharedStorage = util.decodeB64Str(b64Str);
        this._initDefaultSharedStorage();
    }

    requireSetProfileCache() {
        for (var k in this.defaultSharedStorage) {
            this.common.setKV(k, this.sharedStorage[k]);
        }
    }

    onPreferenceCreated() {
        // No dynamically hidden fields needed for now
    }

    sharedStorageFromProfileCache() {
        for (var k in this.defaultSharedStorage) {
            this.sharedStorage[k] = this.common.getKV(k);
        }
        this._onSharedStorageUpdated();
        return JSON.stringify(this.sharedStorage);
    }

    onPreferenceChanged(b64Str) {
        let args = util.decodeB64Str(b64Str);
        this.sharedStorage[args.key] = args.newValue;
        this._onSharedStorageUpdated();
    }

    // Share link parser (clipboard import)
    parseShareLink(b64Str) {
        let args = util.decodeB64Str(b64Str);

        this.sharedStorage = {};
        this._initDefaultSharedStorage();

        var url = util.tryParseURL(args.shareLink);
        if (typeof url == "string") return url; // error string

        // Parse host and port
        if (url.host) {
            var parts = url.host.split(":");
            this.sharedStorage.serverAddress = parts[0];
            if (parts.length > 1) {
                this.sharedStorage.serverPort = parts[1];
            }
        }

        // Parse queries
        util.ifNotNull(url.searchParams.get("psk"), (it) => { this.sharedStorage.psk = it; });
        util.ifNotNull(url.searchParams.get("sni"), (it) => { this.sharedStorage.sni = it; });
        util.ifNotNull(url.searchParams.get("transport"), (it) => { this.sharedStorage.transport = it; });
        util.ifNotNull(url.searchParams.get("path"), (it) => { this.sharedStorage.path = it; });
        util.ifNotNull(url.searchParams.get("fingerprint"), (it) => { this.sharedStorage.fingerprint = it; });

        util.ifNotNull(url.searchParams.get("insecure"), (it) => {
            if (it == "1" || it == "true") this.sharedStorage.insecure = true;
        });
        util.ifNotNull(url.searchParams.get("noPadding"), (it) => {
            if (it == "1" || it == "true") this.sharedStorage.noPadding = true;
        });
        util.ifNotNull(url.searchParams.get("noStealth"), (it) => {
            if (it == "1" || it == "true") this.sharedStorage.noStealth = true;
        });

        // Set name from hash if exists
        if (url.hash) {
            var name = decodeURIComponent(url.hash.substring(1));
            if (name) this.sharedStorage.name = name;
        }

        this._onSharedStorageUpdated();
        return JSON.stringify(this.sharedStorage);
    }

    // Config compilation for native execution
    buildAllConfig(b64Str) {
        try {
            let args = util.decodeB64Str(b64Str);
            let stealth = util.decodeB64Str(args.sharedStorage);

            var serverHostPort = stealth.serverAddress + ":" + stealth.serverPort;

            // Generate CLI command array for launching the Go executable
            let nekoCommands = [
                "%exe%",
                "-server", serverHostPort,
                "-psk", stealth.psk,
                "-sni", stealth.sni,
                "-transport", stealth.transport,
                "-fingerprint", stealth.fingerprint,
                "-socks", "127.0.0.1:" + args.port,
                "-path", stealth.path
            ];

            if (stealth.insecure) {
                nekoCommands.push("-insecure=true");
            }
            if (stealth.noPadding) {
                nekoCommands.push("-no-padding=true");
            }
            if (stealth.noStealth) {
                nekoCommands.push("-no-stealth=true");
            }

            let v = {};
            v.nekoCommands = nekoCommands;
            v.nekoRunConfigs = []; // No extra config files needed
            return JSON.stringify(v);
        } catch (error) {
            neko.logError(error.toString());
        }
    }
}

export const stealthlink = new stealthlinkClass();
