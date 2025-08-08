import { Porto, Mode, Dialog } from "porto";
import { toast } from "sonner";

// Get Porto instance (singleton pattern)
let portoInstance: any = null;

export const getPortoInstance = () => {
  if (!portoInstance) {
    portoInstance = Porto.create({
      mode: Mode.dialog({
        renderer: Dialog.iframe(),
      }),
    });
  }
  return portoInstance;
};

// Get Porto wallet account
export const getPortoAccount = async () => {
  try {
    const porto = getPortoInstance();
    
    const connectResult = await porto.provider.request({
      method: "wallet_connect",
    });

    if (connectResult && connectResult.accounts && connectResult.accounts.length > 0) {
      return connectResult.accounts[0];
    } else {
      throw new Error("No Porto accounts found");
    }
  } catch (error: any) {
    console.error("Failed to get Porto account:", error);
    if (error?.code === 4001) {
      toast.error("User rejected the connection request");
    } else {
      toast.error("Failed to connect to Porto wallet");
    }
    throw error;
  }
};

// Sign message with Porto wallet
export const signMessageWithPorto = async (message: string) => {
  try {
    const porto = getPortoInstance();
    const account = await getPortoAccount();
    
    // Convert message to hex format as required by personal_sign
    const messageHex = `0x${Buffer.from(message, "utf8").toString("hex")}`;

    const signature = await porto.provider.request({
      method: "personal_sign",
      params: [messageHex, account.address],
    });

    if (!signature) {
      throw new Error("Failed to get signature");
    }

    return {
      signature,
      account,
      message,
    };
  } catch (error: any) {
    console.error("Porto message signing error:", error);
    
    if (error?.code === 4001) {
      toast.error("User rejected the signature request");
    } else {
      toast.error("Failed to sign message with Porto wallet");
    }
    throw error;
  }
};

// Get Porto authentication data from localStorage
export const getPortoAuthData = () => {
  try {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem("porto_auth");
      if (storedData) {
        return JSON.parse(storedData);
      }
    }
    return null;
  } catch (error) {
    console.error("Failed to get Porto auth data:", error);
    return null;
  }
};

// Check if Porto wallet is available and connected
export const isPortoConnected = async () => {
  try {
    const authData = getPortoAuthData();
    if (!authData) return false;

    // Try to get account to verify connection is still active
    const account = await getPortoAccount();
    return !!account;
  } catch (error) {
    return false;
  }
};

// Sign PSBT with Porto (for deposit functionality)
export const signPsbtWithPorto = async (psbtHex: string) => {
  try {
    const porto = getPortoInstance();
    const account = await getPortoAccount();

    // Porto PSBT signing - this might need to be adapted based on Porto's actual API
    const signedPsbt = await porto.provider.request({
      method: "wallet_signPSBT",
      params: {
        psbt: psbtHex,
        account: account.address,
      },
    });

    if (!signedPsbt) {
      throw new Error("Failed to sign PSBT");
    }

    return {
      signedPsbt,
      account,
    };
  } catch (error: any) {
    console.error("Porto PSBT signing error:", error);
    
    if (error?.code === 4001) {
      toast.error("User rejected the transaction");
    } else {
      toast.error("Failed to sign transaction with Porto wallet");
    }
    throw error;
  }
};