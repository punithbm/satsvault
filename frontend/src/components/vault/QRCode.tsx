import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import useQRCodeStyling from "@/hooks/useQRCodesStyling";
import { truncateAddress } from "@/lib/utils";
import { Options as QRCodeStylingOptions } from "qr-code-styling";
import { useEffect, useMemo, useRef, useState } from "react";
import { CopyIcon } from "../shared/CopyIcon";
import VerifyTxInclusion from "../home/VerifyTxInclusion";

const ReceiveQR = () => {
    const [verifyInclusion, setVerifyInclusion] = useState(false);
    const [, copyToClipBoard] = useCopyToClipboard();
    const ref = useRef<HTMLDivElement>(null);
    const qrOptions: QRCodeStylingOptions = useMemo(() => {
        return {
            width: 200,
            height: 200,
            type: "svg",
            data:
                process.env.NEXT_PUBLIC_BTC_VAULT ??
                "tb1pqqyu858p78u7ws3rlqw4xp4sdas3nnlna75v7jue4pfx3spejufs89w7f7",
            // image: icons.logo.src,
            qrOptions: {
                typeNumber: 0,
                mode: "Byte",
                errorCorrectionLevel: "Q"
            },
            dotsOptions: {
                type: "extra-rounded",
                color: "#fff"
            },
            imageOptions: {
                hideBackgroundDots: true,
                imageSize: 0.6,
                margin: 0,
                crossOrigin: "anonymous"
            },
            backgroundOptions: {
                color: "#000"
            }
        };
    }, []);

    const qrCode = useQRCodeStyling(qrOptions);

    useEffect(() => {
        if (ref.current && qrCode) {
            qrCode.append(ref.current);
        }
    }, [qrCode]);

    return (
        <div className="pt-8 text-center">
            <p className="body1_regular text-center text-text-200">
                Scan this QR for address
            </p>
            <div ref={ref} className="mx-auto inline-block p-4" />
            <p className="body2_regular mb-[20px] text-center text-text-200">
                or copy this wallet address
            </p>
            <button
                className="mb-4 flex w-full items-center justify-center gap-3 rounded-2xl bg-[#1b1b1b] p-2 transition-all active:scale-95"
                onClick={() => {
                    copyToClipBoard(
                        process.env.NEXT_PUBLIC_BTC_VAULT ??
                            "tb1pqqyu858p78u7ws3rlqw4xp4sdas3nnlna75v7jue4pfx3spejufs89w7f7"
                    );
                }}
            >
                <div className="flex items-center gap-2">
                    <p className="body1_medium text-white">
                        {truncateAddress(
                            process.env.NEXT_PUBLIC_BTC_VAULT ??
                                "tb1pqqyu858p78u7ws3rlqw4xp4sdas3nnlna75v7jue4pfx3spejufs89w7f7"
                        )}
                    </p>
                    <CopyIcon
                        text={
                            process.env.NEXT_PUBLIC_BTC_VAULT ??
                            "tb1pqqyu858p78u7ws3rlqw4xp4sdas3nnlna75v7jue4pfx3spejufs89w7f7"
                        }
                    />
                </div>
            </button>
            <div>
                <p className="body2_medium mt-8  text-center text-yellow-500">
                    Deposit the BTC to the vault address and verify the transaction hash.
                </p>
                <VerifyTxInclusion setVerifyInclusion={setVerifyInclusion} />
            </div>
        </div>
    );
};

export default ReceiveQR;
