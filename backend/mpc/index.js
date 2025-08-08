import { clusterConfig } from "./config/index.js";
import { decodeHex } from "./config/hex.js";
import {
    createKeygenSetup,
    createSignSetup,
    messageHash,
    startDkg,
    startDsg
} from "./nodes.js";
import { generateEVMAddress, generateTaprootAddress } from "./address.js";
import dotenv from 'dotenv';
dotenv.config();

const threshold = 2;
const partiesNumber = 3;

const withBusy = async (body) => {
    let busy = true;
    let loadedConfig = await clusterConfig();
    try {
        return await body(loadedConfig);
    } finally {
        busy = false;
    }
};

const handleGenKeys = async (signAlgo) => {
    let keygenStats = [];
    let startTime = Date.now();
    let keygenTimes = {};
    let selectedKeyId = "";

    return await withBusy(async (loadedConfig) => {
        let { setup, instance } = await createKeygenSetup(
            signAlgo,
            loadedConfig,
            partiesNumber,
            threshold
        );

        let resp = await Promise.all(
            loadedConfig.nodes
                .slice(0, partiesNumber)
                .map((n) => startDkg(signAlgo, n.endpoint, instance, setup))
        );

        let genEnd = Date.now();

        keygenStats = resp;
        keygenTimes = {
            totalTime: genEnd - startTime
        };
        let address = "";

        if (selectedKeyId === "") {
            selectedKeyId = resp[0].publicKey;
            address = generateEVMAddress(selectedKeyId);
        }

        return { evmAddress: address, evmPubkey: selectedKeyId, evmKeyId: resp[0].keyId };
    });
};

const handleSignGen = async (signAlgo, signMessage, keyId, hashFn) => {
    const bufString = keyId;
    return await withBusy(async (loadedConfig) => {
        let { setup, instance } = await createSignSetup(
            signAlgo,
            loadedConfig,
            threshold,
            bufString,
            signMessage,
            hashFn
        );
        try{
            let resp = await Promise.all(
                loadedConfig.nodes
                    .slice(0, threshold)
                    .map((n) => startDsg(signAlgo, n.endpoint, instance, setup))
            );
            return resp[0];
        }catch(e){
            console.log(e)
        }
        
    });
};

export { handleGenKeys, handleSignGen };
