import surgeLogo from "../../../../public/images/surge_short_dark.svg";
import satsVaultLogo from "../../../../public/images/sats_vault_logo.png";
import linkBreak from "../../../../public/images/link_break.svg";
import btcControlImg from "../../../../public/images/btc_control.png";
import btcPaymentsImg from "../../../../public/images/btc_payments.png";
import btcSmartImg from "../../../../public/images/btc_smart.png";
import linesBg from "../../../../public/images/lines_bg.png";

export type TImages =
  | "surgeLogo"
  | "satsVaultLogo"
  | "linkBreak"
  | "btcControlImg"
  | "btcPaymentsImg"
  | "btcSmartImg"
  | "linesBg";

export type TNextImage = {
  src: string;
  height: number;
  width: number;
};

export const icons: Record<TImages, TNextImage> = {
  surgeLogo,
  satsVaultLogo,
  linkBreak,
  btcControlImg,
  btcPaymentsImg,
  btcSmartImg,
  linesBg,
};
