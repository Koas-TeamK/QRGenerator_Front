import CryptoJS from "crypto-js";

const KEY_STR = import.meta.env.VITE_AES_KEY;
const IV_STR = import.meta.env.VITE_AES_IV;
if (!KEY_STR) throw new Error("VITE_AES_KEY 없음");
if (!IV_STR) throw new Error("VITE_AES_IV 없음");

const KEY = CryptoJS.enc.Utf8.parse(KEY_STR);
const IV = CryptoJS.enc.Utf8.parse(IV_STR);

const toB64Url = (b64) =>
    b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
const fromB64Url = (u) => {
    const b64 = u.replace(/-/g, "+").replace(/_/g, "/");
    return b64 + "===".slice((b64.length + 3) % 4);
};

// 🔒 암호화 → URL-safe Base64
export function makeTokenUrlSafe(plain) {
    const enc = CryptoJS.AES.encrypt(plain, KEY, {
        iv: IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });
    // key/iv 방식에서는 enc.toString() == base64(ciphertext)
    return toB64Url(enc.toString());
}

// 🔓 복호화 (URL-safe Base64 입력)
export function decryptTokenUrlSafe(tokenUrlB64) {
    const tokenB64 = fromB64Url(tokenUrlB64);
    // decrypt에 바로 문자열을 넣어도 되지만, 명확성을 위해 CipherParams 사용
    const params = CryptoJS.lib.CipherParams.create({
        ciphertext: CryptoJS.enc.Base64.parse(tokenB64),
    });
    const dec = CryptoJS.AES.decrypt(params, KEY, {
        iv: IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });
    return CryptoJS.enc.Utf8.stringify(dec);
}
