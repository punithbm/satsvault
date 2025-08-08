interface SignExecuteRequest {
  unique_id: string;
  message: string;
  threshold: number;
  curve: string;
}

interface SignExecuteApiResponse {
  Message: string;
  Signature: string;
}

interface SignExecuteResponse {
  success: boolean;
  data?: SignExecuteApiResponse;
  error?: string;
}

export const executeSign = async (params: SignExecuteRequest): Promise<SignExecuteResponse> => {
  try {
    const response = await fetch("https://node1.cb-mpc.surge.dev/api/sign/execute", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        unique_id: params.unique_id,
        message: params.message,
        threshold: params.threshold,
        curve: params.curve,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: any = await response.json();

    // Validate the response structure
    if (!data.Message || !data.Signature) {
      throw new Error("Invalid response structure from sign API");
    }

    // Type assertion after validation
    const validatedData: SignExecuteApiResponse = {
      Message: data.Message,
      Signature: data.Signature,
    };

    return {
      success: true,
      data: validatedData,
    };
  } catch (error) {
    console.error("Sign execute error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
};

export const signMessage = async (uniqueId: string, message: string, threshold: number = 4, curve: string = "ecdsa", expectedAddress?: string): Promise<{ message: string; signature: string } | null> => {
  const response = await executeSign({
    unique_id: uniqueId,
    message,
    threshold,
    curve,
  });

  const result = getSigningResult(response);
  if (!result || !expectedAddress || curve === "schnorr") {
    return result;
  }

  // Try to recover address with original signature
  let recoveredAddress = recoverAddress(message, result.signature);

  if (recoveredAddress?.toLowerCase() !== expectedAddress.toLowerCase()) {
    // Try with alternate recovery parameter
    const currentRecovery = result.signature.slice(-2);
    const alternateRecovery = currentRecovery === "1c" ? "1b" : "1c";
    const alternateSignature = result.signature.slice(0, -2) + alternateRecovery;

    recoveredAddress = recoverAddress(message, alternateSignature);

    if (recoveredAddress?.toLowerCase() === expectedAddress.toLowerCase()) {
      // Use the alternate signature that recovers the correct address
      return {
        message: result.message,
        signature: alternateSignature,
      };
    } else {
      throw new Error("Invalid signature: cannot recover expected address");
    }
  }

  return result;
};

function recoverAddress(message: string, signature: string): string | null {
  try {
    const { ethers } = require("ethers");
    const recoveredAddress = ethers.recoverAddress(message, signature);
    return recoveredAddress;
  } catch (error) {
    console.error("Error recovering address:", error);
    return null;
  }
}

// Helper function to extract just the signature from the response
export const getSignatureFromResponse = (response: SignExecuteResponse): string | null => {
  if (response.success && response.data?.Signature) {
    return response.data.Signature;
  }
  return null;
};

// Helper function to get both message and signature
export const getSigningResult = (response: SignExecuteResponse): { message: string; signature: string } | null => {
  if (response.success && response.data?.Message && response.data?.Signature) {
    return {
      message: response.data.Message,
      signature: response.data.Signature,
    };
  }
  return null;
};
