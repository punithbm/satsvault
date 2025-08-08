import { getBitcoinAddressesFromPemKey } from "../blockchain/btc/btcUtils";
import { generateEVMAddress } from "./address";

interface DKGExecuteRequest {
    threshold: number;
    unique_id: string;
    curve: string;
}

interface DKGExecuteResponse {
    success: boolean;
    data?: any;
    error?: string;
}

export const executeDKG = async (params: DKGExecuteRequest): Promise<DKGExecuteResponse> => {
    try {
        const response = await fetch('https://node1.cb-mpc.surge.dev/api/dkg/execute', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                threshold: params.threshold,
                unique_id: params.unique_id,
                curve: params.curve
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            data
        };
    } catch (error) {
        console.error('DKG execute error:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
        };
    }
};

export const generateEvmData = async (threshold: number = 4, uniqueId?: string): Promise<any> => {
    const unique_id = uniqueId || `my-wallet-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const response = await executeDKG({
        threshold,
        unique_id,
        curve: "ecdsa"  
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to generate wallet keys');
    }

    const { PemKey, PublicKey } = response.data;

    return {
        evmAddress: PublicKey.toLowerCase(),
        evmPubkey: PemKey,
        evmKeyId: uniqueId
    };
};

export const generateBtcData = async (threshold: number = 4, uniqueId?: string): Promise<{btcAddress: string, btcPubkey: string, keyId: string}> => {
    const unique_id = uniqueId || `my-wallet-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const response = await executeDKG({
        threshold,
        unique_id,
        curve: "schnorr"  
    });

    if (!response.success) {
        throw new Error(response.error || 'Failed to generate wallet keys');
    }

    const { PemKey } = response.data;

    const addresses = getBitcoinAddressesFromPemKey(PemKey);

    return {
        btcAddress: addresses.taproot.toLowerCase(),
        btcPubkey: addresses.publicKey,
        keyId: uniqueId
    };
};

