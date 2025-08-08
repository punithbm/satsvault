import {
    convertToVectorU8,
    extractTxIdsFromBlockTxs,
    findBlockIndex,
    getBlockHeight,
    getBlockInfo,
    getBlockTxs,
    getMerkleProof,
    parseProof,
    parseTxOutProof
} from "@/lib/utils/index";
import { Aptos, AptosConfig, InputViewFunctionData } from "@aptos-labs/ts-sdk";
import { useState } from "react";

interface IVerifyTxInclusion {
    setVerifyInclusion: (value: boolean) => void;
}

export default function VerifyTxInclusion({ setVerifyInclusion }: IVerifyTxInclusion) {
    const [txId, setTxId] = useState("");
    const [verificationStatus, setVerificationStatus] = useState<boolean>(false);

    const handleVerifyTx = async () => {
        try {
            //logic goes here
        } catch (error) {
            console.error("Error in handleVerifyTx:", error);
            setVerificationStatus(false);
            setVerifyInclusion(false);
        }
    };

    return (
        <div className="w-full border border-gray-400 p-4 bg-white mt-6 rounded-md">
            <h1 className="text-lg font-semibold mb-4 text-left">Send Transaction ID</h1>
            <div className="flex space-x-2">
                <input
                    type="text"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    placeholder="Enter Transaction ID"
                    className="flex-grow border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                    onClick={handleVerifyTx}
                    className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
                >
                    Send
                </button>
            </div>

            {verificationStatus && (
                <div className="mt-4 text-sm text-gray-700">
                    Transaction is included in the block.
                </div>
            )}
        </div>
    );
}
