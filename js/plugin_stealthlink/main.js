import { util } from "../common/util.js";
import { LANG, LANG_TR } from "../common/translate.js";

import { stealthlink } from "./stealthlink.js";

// Init

export function nekoInit(b64Str) {
  let args = util.decodeB64Str(b64Str);

  LANG = args.lang;

  let plgConfig = {
    ok: true,
    reason: "",
    minVersion: 1,
    protocols: [
      {
        protocolId: "stealthlink",
        links: ["stealthlink://"],
        haveStandardLink: true,
        canShare: true,
        canMux: true,
        canMapping: true,
        canTCPing: true,
        canICMPing: true,
        needBypassRootUid: true,
      }
    ],
  };
  return JSON.stringify(plgConfig);
}

export function nekoProtocol(protocolId) {
  if (protocolId == "stealthlink") {
    return stealthlink;
  }
}

export function nekoAbout() {
  return "StealthLink plugin v0.1.0\n" +
    "uTLS fingerprinting support\n" +
    "TLS 1.3 / QUIC transport support\n" +
    "DPI circumvention and active probing protection\n" +
    "For more info visit https://github.com/komarukomaru/stealthlink"
}

// export interface to browser
global_export("nekoInit", nekoInit)
global_export("nekoProtocol", nekoProtocol)
global_export("nekoAbout", nekoAbout)
