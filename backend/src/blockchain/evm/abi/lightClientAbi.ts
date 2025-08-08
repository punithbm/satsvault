const LIGHT_CLIENT_CONTRACT_ABI = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint256",
                name: "blockNumber",
                type: "uint256"
            },
            {
                indexed: false,
                internalType: "bytes32",
                name: "blockHash",
                type: "bytes32"
            },
            {
                indexed: false,
                internalType: "bytes32",
                name: "merkleRoot",
                type: "bytes32"
            }
        ],
        name: "BlockInfoAdded",
        type: "event"
    },
    {
        inputs: [],
        name: "SYSTEM_CALLER",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        name: "blockHashes",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [],
        name: "blockNumber",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256"
            }
        ],
        name: "evmAddress",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256"
            }
        ],
        name: "getBlockHash",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_blockHash",
                type: "bytes32"
            }
        ],
        name: "getWitnessRootByHash",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256"
            }
        ],
        name: "getWitnessRootByNumber",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256"
            }
        ],
        name: "initializeBlockNumber",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_blockHash",
                type: "bytes32"
            },
            {
                internalType: "bytes32",
                name: "_witnessRoot",
                type: "bytes32"
            }
        ],
        name: "setBlockInfo",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_blockNumber",
                type: "uint256"
            },
            {
                internalType: "bytes32",
                name: "_wtxId",
                type: "bytes32"
            },
            {
                internalType: "bytes",
                name: "_proof",
                type: "bytes"
            },
            {
                internalType: "uint256",
                name: "_index",
                type: "uint256"
            }
        ],
        name: "verifyInclusion",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "_blockHash",
                type: "bytes32"
            },
            {
                internalType: "bytes32",
                name: "_wtxId",
                type: "bytes32"
            },
            {
                internalType: "bytes",
                name: "_proof",
                type: "bytes"
            },
            {
                internalType: "uint256",
                name: "_index",
                type: "uint256"
            }
        ],
        name: "verifyInclusion",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool"
            }
        ],
        stateMutability: "view",
        type: "function"
    },
    {
        inputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            }
        ],
        name: "witnessRoots",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32"
            }
        ],
        stateMutability: "view",
        type: "function"
    }
];

const LIGHT_CLIENT_CONTRACT_ADDRESS = "0x594C409f8e4c7Ed3C0dD00Cc4e25e8b98412a8BC";

export { LIGHT_CLIENT_CONTRACT_ABI, LIGHT_CLIENT_CONTRACT_ADDRESS };
