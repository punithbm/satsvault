import QRCodeStyling, { Options as QRCodeStylingOptions } from "qr-code-styling";

const useQRCodeStyling = (options: QRCodeStylingOptions): QRCodeStyling | null => {
    if (typeof window !== "undefined") {
        const QRCodeStylingLib = require("qr-code-styling");
        const qrCodeStyling: QRCodeStyling = new QRCodeStylingLib(options);
        return qrCodeStyling;
    }
    return null;
};

export default useQRCodeStyling;
