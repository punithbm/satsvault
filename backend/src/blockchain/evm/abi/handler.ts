const HANDLER_CONTRACT_ABI = [
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "btcAddress",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "evmAddress",
				"type": "address"
			}
		],
		"name": "BTCAddressRegistered",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "fromAddress",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "toAddress",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "BTCsent",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "wtxId",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "Deposit",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bytes",
				"name": "depositScript",
				"type": "bytes"
			},
			{
				"indexed": false,
				"internalType": "bytes",
				"name": "scriptSuffix",
				"type": "bytes"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "requiredSigsCount",
				"type": "uint256"
			}
		],
		"name": "DepositScriptUpdate",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "recovered",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "expected",
				"type": "address"
			}
		],
		"name": "InvalidSignature",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "oldOperator",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "newOperator",
				"type": "address"
			}
		],
		"name": "OperatorUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferRequested",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "previousOwner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "OwnershipTransferred",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": true,
				"internalType": "bytes32",
				"name": "fromAddress",
				"type": "bytes32"
			},
			{
				"indexed": true,
				"internalType": "bytes32",
				"name": "toAddress",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "frequency",
				"type": "uint256"
			}
		],
		"name": "RecurringPaymentSetup",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "oldSigner",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "address",
				"name": "newSigner",
				"type": "address"
			}
		],
		"name": "SignerUpdated",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "bytes32",
				"name": "bitcoin_address",
				"type": "bytes32"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			}
		],
		"name": "Withdrawal",
		"type": "event"
	},
	{
		"stateMutability": "payable",
		"type": "fallback"
	},
	{
		"inputs": [],
		"name": "DEPOSIT_AMOUNT",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "LIGHT_CLIENT",
		"outputs": [
			{
				"internalType": "contract BitcoinLightClient",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "SYSTEM_CALLER",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "acceptOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"name": "btcAddressOwners",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"name": "btcDeposits",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "autoPayID",
				"type": "uint256"
			}
		],
		"name": "cancelRecurringPayment",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "bytes4",
						"name": "version",
						"type": "bytes4"
					},
					{
						"internalType": "bytes2",
						"name": "flag",
						"type": "bytes2"
					},
					{
						"internalType": "bytes",
						"name": "vin",
						"type": "bytes"
					},
					{
						"internalType": "bytes",
						"name": "vout",
						"type": "bytes"
					},
					{
						"internalType": "bytes",
						"name": "witness",
						"type": "bytes"
					},
					{
						"internalType": "bytes4",
						"name": "locktime",
						"type": "bytes4"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					},
					{
						"internalType": "bytes32",
						"name": "bitcoin_address",
						"type": "bytes32"
					},
					{
						"internalType": "bytes",
						"name": "intermediate_nodes",
						"type": "bytes"
					},
					{
						"internalType": "uint256",
						"name": "block_height",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "index",
						"type": "uint256"
					},
					{
						"internalType": "bytes32",
						"name": "block_hash",
						"type": "bytes32"
					},
					{
						"internalType": "bytes32",
						"name": "transaction_id",
						"type": "bytes32"
					},
					{
						"internalType": "bytes32",
						"name": "transaction_hash",
						"type": "bytes32"
					},
					{
						"internalType": "address",
						"name": "evm_address",
						"type": "address"
					}
				],
				"internalType": "struct dAppVault.DepositParams",
				"name": "p",
				"type": "tuple"
			}
		],
		"name": "deposit",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "bytes4",
						"name": "version",
						"type": "bytes4"
					},
					{
						"internalType": "bytes2",
						"name": "flag",
						"type": "bytes2"
					},
					{
						"internalType": "bytes",
						"name": "vin",
						"type": "bytes"
					},
					{
						"internalType": "bytes",
						"name": "vout",
						"type": "bytes"
					},
					{
						"internalType": "bytes",
						"name": "witness",
						"type": "bytes"
					},
					{
						"internalType": "bytes4",
						"name": "locktime",
						"type": "bytes4"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					},
					{
						"internalType": "bytes32",
						"name": "bitcoin_address",
						"type": "bytes32"
					},
					{
						"internalType": "bytes",
						"name": "intermediate_nodes",
						"type": "bytes"
					},
					{
						"internalType": "uint256",
						"name": "block_height",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "index",
						"type": "uint256"
					},
					{
						"internalType": "bytes32",
						"name": "block_hash",
						"type": "bytes32"
					},
					{
						"internalType": "bytes32",
						"name": "transaction_id",
						"type": "bytes32"
					},
					{
						"internalType": "bytes32",
						"name": "transaction_hash",
						"type": "bytes32"
					},
					{
						"internalType": "address",
						"name": "evm_address",
						"type": "address"
					}
				],
				"internalType": "struct Vaultdapp.DepositParams",
				"name": "p",
				"type": "tuple"
			}
		],
		"name": "requestDeposit",
		"outputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "depositScript",
		"outputs": [
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "btcAddressHash",
				"type": "bytes32"
			}
		],
		"name": "getBtcDepositAmount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_owner",
				"type": "address"
			}
		],
		"name": "initialize",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "initialized",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "user",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "actionType",
				"type": "uint256"
			},
			{
				"internalType": "bytes32",
				"name": "transactionHash",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "bytes32",
				"name": "bitcoinAddress",
				"type": "bytes32"
			}
		],
		"name": "logUserExternalTx",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "operator",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "owner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "pendingOwner",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "processRecurringPayments",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "autoPayID",
				"type": "uint256"
			}
		],
		"name": "processRecurringPaymentsId",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"name": "recurringPayments",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "frequency",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "lastPaymentTime",
				"type": "uint256"
			},
			{
				"internalType": "bytes32",
				"name": "btcAddressFrom",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "btcAddressTo",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "payId",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "recurringPaymentsByteList",
		"outputs": [
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "recurringPaymentsList",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "frequency",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "lastPaymentTime",
				"type": "uint256"
			},
			{
				"internalType": "bytes32",
				"name": "btcAddressFrom",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "btcAddressTo",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "payId",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "evmAddress",
				"type": "address"
			},
			{
				"internalType": "bytes",
				"name": "signature",
				"type": "bytes"
			},
			{
				"internalType": "bytes32",
				"name": "bitcoin_address_hash",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "messagehash",
				"type": "bytes32"
			}
		],
		"name": "registerUser",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "renounceOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "requiredSigsCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "scriptSuffix",
		"outputs": [
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "fromBTCAddressHash",
				"type": "bytes32"
			},
			{
				"internalType": "bytes32",
				"name": "toBTCAddressHash",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "evmAddress",
				"type": "address"
			}
		],
		"name": "sendBTC",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_operator",
				"type": "address"
			}
		],
		"name": "setOperator",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"components": [
					{
						"internalType": "bytes32",
						"name": "fromBTCAddressHash",
						"type": "bytes32"
					},
					{
						"internalType": "bytes32",
						"name": "toBTCAddressHash",
						"type": "bytes32"
					},
					{
						"internalType": "uint256",
						"name": "amount",
						"type": "uint256"
					},
					{
						"internalType": "uint256",
						"name": "frequency",
						"type": "uint256"
					},
					{
						"internalType": "bytes",
						"name": "signature",
						"type": "bytes"
					},
					{
						"internalType": "bytes32",
						"name": "messageHash",
						"type": "bytes32"
					},
					{
						"internalType": "uint256",
						"name": "payId",
						"type": "uint256"
					}
				],
				"internalType": "struct dAppVault.RecurringPaymentParam",
				"name": "p",
				"type": "tuple"
			}
		],
		"name": "setupRecurringPayment",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "",
				"type": "bytes32"
			}
		],
		"name": "spentWtxIds",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "newOwner",
				"type": "address"
			}
		],
		"name": "transferOwnership",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "userTxCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "userTxsByIndex",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "timestamp",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "actionType",
				"type": "uint256"
			},
			{
				"internalType": "bytes32",
				"name": "transactionHash",
				"type": "bytes32"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			},
			{
				"internalType": "bytes32",
				"name": "bitcoin_address",
				"type": "bytes32"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "bytes32",
				"name": "bitcoin_address",
				"type": "bytes32"
			},
			{
				"internalType": "bytes",
				"name": "signature",
				"type": "bytes"
			},
			{
				"internalType": "bytes32",
				"name": "messageHash",
				"type": "bytes32"
			},
			{
				"internalType": "address",
				"name": "evmAddress",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "withdraw",
		"outputs": [],
		"stateMutability": "payable",
		"type": "function"
	},
	{
		"stateMutability": "payable",
		"type": "receive"
	}
];

const HANDLER_CONTRACT_ADDRESS = process.env.HANDLER_CONTRACT_ADDRESS;

export { HANDLER_CONTRACT_ABI, HANDLER_CONTRACT_ADDRESS };
