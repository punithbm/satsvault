export const decodeHex = (s) => {
    let bytes = s.match(/[0-9A-Fa-f]{2}/g);
    if (!bytes) {
        throw new Error("bad hex string");
    }
    return Uint8Array.from(bytes.map((byte) => parseInt(byte, 16)));
};

export const encodeHex = (a) =>
    a.reduce((s, b) => s + b.toString(16).padStart(2, "0"), "");
