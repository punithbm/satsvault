import { useState } from "react";
import { toast } from "sonner";

type TCopiedValue = string | null;
type TCopyFn = (text: string) => Promise<boolean>;

const useCopyToClipboard = (): [TCopiedValue, TCopyFn] => {
    const [copiedText, setCopiedText] = useState<TCopiedValue>(null);

    const copy: TCopyFn = async (text) => {
        if (!navigator?.clipboard) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "absolute";
            textArea.style.left = "-999999px";
            document.body.prepend(textArea);
            textArea.select();
            try {
                document.execCommand("copy");
            } catch (error) {
                console.error(error);
            } finally {
                textArea.remove();
            }
            toast.success("Copied to clipboard");

            return false;
        }

        try {
            await navigator?.clipboard?.writeText(text);
            toast.success("Copied to clipboard");

            setCopiedText?.(text);
            return true;
        } catch (error) {
            console.warn("Copy failed", error);
            setCopiedText(null);
            return false;
        }
    };

    return [copiedText, copy];
};

export { useCopyToClipboard };
