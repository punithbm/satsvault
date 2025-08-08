import express from "express";
import cors from "cors";
import { hashMessage } from "@ethersproject/hash";
import ethers from "ethers";
import crypto from "crypto";
import { verifyMessage } from "../utils/auth";
import { handleGenKeys } from "../../mpc/index.js";
import { runZMQ } from "../blockchain/btc/btcListner";
import { getAddressMapping, getMappings } from "../database/mappings";
import { registerBTCAddress } from "../services/registerBTCAddress";
import { btcToSats, bytes32BTC, getBitcoinAddressesFromPemKey, validateTaprootSignature } from "../blockchain/btc/btcUtils";
import { getBalance } from "../payment/getBalance";
import { transferAmount } from "../payment/transfer";
import { withdraw } from "../payment/withdraw";
import { getHistory } from "../payment/getHistory";
import { addFunds } from "../payment/addFunds";
import { depositFunds } from "../payment/depositFunds";
import { getAllRecurringPayments, getBlockDataFromRecurringPayments, getPortoMappingByAddress, insertPortoMapping, updateAddressMapping, updateMappingsTable } from "../database/supabase";
import { initializeHandler } from "../services/initialiseHandler";
import { initiateEthListener } from "../blockchain/evm/etherListener";
import { setupRecurringPayment } from "../payment/setupRecurringPayment";
import { cancelRecurringPayment } from "../payment/cancelRecurringPayment";
import { processRecurringPayment } from "../payment/processRecurringPayments";
import { generateBtcData, generateEvmData } from "../utils/keygen";
import { ethSendTransaction } from "../blockchain/evm/evmUtils";
import { signMessage } from "../utils/signgen";

import { btcSendTransaction } from "../blockchain/btc/btcTransaction";

const app = express();
app.use(cors());
app.use(express.json());

app.post("/api/create-wallet", async (req, res) => {
  let { pubkey, message, signature, btcAddress } = req.body;
  if (!pubkey || !message || !signature || !btcAddress) {
    res.status(400).send({
      status: false,
      message: "Missing parameters",
    });
    return;
  }

  const portoAddress = await getPortoMappingByAddress(btcAddress);

  let _portoAddress = btcAddress;
  btcAddress = portoAddress?.[0]?.bitcoin_address;

  if (!btcAddress) {
    const btcData = await generateBtcData(Number(process.env.THRESHOLD), _portoAddress);
    console.log({ btcData });
    btcAddress = btcData.btcAddress;
    pubkey = btcData.btcPubkey;
    const portoMapping = await insertPortoMapping([{ portoAddress: _portoAddress, bitcoinAddress: btcAddress, pubkey: pubkey }]);
    if (!portoMapping?.status) {
      res.status(500).send({
        status: false,
        message: "Failed to insert porto mapping",
      });
      return;
    }
  }

  const result = verifyMessage(btcAddress, message, signature);

  if (result) {
    const mappings = await getMappings();
    const isFromRegistered = mappings.find((m) => m.btcaddress === btcAddress);
    if (isFromRegistered) {
      res.status(200).send({
        status: true,
        message: "Signed in successfully",
        newRegistration: false,
        verification: result,
        btcAddress: btcAddress,
      });
      return;
    }
    const uuid = crypto.randomUUID();
    const evmData = await generateEvmData(4, uuid);
    console.log({ evmData });
    const registerRes = await registerBTCAddress(btcAddress, evmData);
    if (!registerRes?.status) {
      res.status(500).send({
        status: false,
        message: "Failed to process request",
        verification: result,
      });
      return;
    }
    if (evmData) {
      const btcAddressHash = await bytes32BTC(btcAddress);
      const mappingRes = await updateMappingsTable([
        {
          evmAddress: evmData.evmAddress,
          evmKeyId: evmData.evmKeyId,
          evmPubkey: evmData.evmPubkey,
          btcPubkey: pubkey,
          btcAddress,
          btcAddressHash,
        },
      ]);
      if (!mappingRes?.status) {
        res.status(500).send({
          status: false,
          message: "Failed to record the mappings",
          verification: result,
        });
        return;
      }
    }
    res.status(200).send({
      status: true,
      message: "Registration completed successfully",
      verification: result,
      newRegistration: true,
      btcAddress: btcAddress,
    });
    return;
  }
  res.status(500).send({
    status: false,
    message: "Failed to process request",
    verification: result,
  });
});

app.post("/api/deposit-sign-verification", async (req, res) => {
  const { message, signature, btcAddress } = req.body;
  if (!message || !signature || !btcAddress) {
    res.status(400).send({
      status: false,
      message: "Missing parameters",
    });
    return;
  }
  const result = verifyMessage(btcAddress, message, signature);
  if (result) {
    const mappings = await getMappings();
    const mapping = mappings.find((m) => m.btcaddress === btcAddress);

    if (!mapping) {
      res.status(500).send({
        status: false,
        message: "Address not registered",
      });
      return;
    }

    const { evmAddress } = mapping;

    const btcAddressHash = mapping?.btcaddresshash;
    const message = `${btcAddressHash}`;
    const hashMessage = "0x" + crypto.createHash("sha256").update(message).digest("hex");
    const signature = await signMessage(mapping?.evmkeyid, hashMessage);
    const signatureBytes = ethers.getBytes(signature.signature);
    res.status(200).send({
      status: true,
      message: "Registration completed successfully",
      verification: result,
      data: {
        signature,
        hashMessage,
        signatureWithRecId: signature.signature,
        signatureBytes,
        evmAddress,
      },
    });
    return;
  }
  res.status(500).send({
    status: false,
    message: "Failed to process request",
    verification: result,
  });
});

app.get("/api/get-balance", async (req, res) => {
  const { btcAddress } = req.query;
  if (!btcAddress) {
    res.status(400).send({
      status: false,
      message: "Missing btcAddress parameter",
    });
    return;
  }
  const result = await getBalance(btcAddress as string);
  res.status(200).send({
    status: true,
    message: "Balance fetched successfully",
    data: result,
  });
});

app.get("/api/get-history", async (req, res) => {
  const { btcAddress } = req.query;
  if (!btcAddress) {
    res.status(400).send({
      status: false,
      message: "Missing btcAddress parameter",
    });
    return;
  }
  const result = await getHistory(btcAddress as string);
  if (!result?.status) {
    res.status(500).send({
      status: false,
      message: "Failed to get history",
    });
    return;
  }

  // Serialize BigInt values to strings
  const serializedData = result.data.map((tx) => ({
    timestamp: tx.timestamp.toString(),
    amount: tx.amount.toString(),
    type: tx.type,
    fromAddress: tx.fromAddress,
    toAddress: tx.toAddress,
    txHash: tx.txHash,
  }));

  res.status(200).send({
    status: true,
    message: "History fetched successfully",
    data: serializedData,
  });
});

app.post("/api/transfer", async (req, res) => {
  const { message, signature, btcAddress, amount, toAddress } = req.body;
  const result = verifyMessage(btcAddress, message, signature);
  if (result) {
    const mappings = await getMappings();
    const isFromRegistered = mappings.find((m) => m.btcaddress === btcAddress);
    const isToRegistered = mappings.find((m) => m.btcaddress === toAddress);
    if (!isFromRegistered) {
      res.status(500).send({
        status: false,
        message: "Address not registered",
        verification: result,
      });
      return;
    }
    const evmAddress = isFromRegistered.evmaddress;
    const fromAddressHash = isFromRegistered.btcaddresshash;
    let toAddressHash = isToRegistered?.btcaddresshash;
    if (!toAddressHash) {
      toAddressHash = await bytes32BTC(toAddress);
    }
    const transferResult = await transferAmount(btcAddress, toAddress, amount, evmAddress, toAddressHash, mappings, fromAddressHash);
    if (!transferResult?.status) {
      res.status(500).send({
        status: false,
        message: "Failed to process request",
        verification: result,
      });
      return;
    }
    res.status(200).send({
      status: true,
      message: "Data transferred successfully",
    });
    return;
  }
  res.status(500).send({
    status: false,
    message: "Signature verification failed",
    verification: result,
  });
});

app.post("/api/withdraw", async (req, res) => {
  const { pubkey, message, signature, btcAddress, amount, toAddress } = req.body;
  const result = verifyMessage(btcAddress, message, signature);
  if (!result) {
    res.status(500).send({
      status: false,
      message: "Signature verification failed",
      verification: result,
    });
    return;
  }
  const mappings = await getMappings();
  const isAddressRegistered = mappings.find((m) => m.btcaddress === btcAddress);
  if (!isAddressRegistered) {
    res.status(500).send({
      status: false,
      message: "Address must be registered",
    });
    return;
  }
  const withdrawResult = await withdraw(btcAddress, amount);
  if (!withdrawResult?.status) {
    res.status(500).send({
      status: false,
      message: "Failed to process request",
    });
    return;
  }
  res.status(200).send({
    status: true,
    message: "Withdrawal successful",
    data: withdrawResult.data,
  });
});

app.post("/api/add-funds", async (req, res) => {
  const { pubkey, message, signature, btcAddress } = req.body;
  const result = verifyMessage(btcAddress, message, signature);
  if (result) {
    const mappings = await getMappings();
    const isFromRegistered = mappings.find((m) => m.btcaddress === btcAddress);
    if (isFromRegistered) {
      const response = await addFunds(btcAddress);
      if (response.status) {
        res.status(200).send({
          status: true,
          message: "Deposit successful",
          data: response.data,
        });
        return;
      } else {
        res.status(500).send({
          status: false,
          message: response.data,
        });
        return;
      }
    }
    return;
  }
  res.status(500).send({
    status: false,
    message: "Failed to process request",
    verification: result,
  });
  return;
});

app.get("/api/get-address", async (req, res) => {
  const { btcAddressHash } = req.query;
  if (!btcAddressHash) {
    res.status(400).send({
      status: false,
      message: "Missing btcAddressHash parameter",
    });
    return;
  }
  const result = await getMappings();
  let addressMapping = result?.find((m) => m.btcaddresshash === btcAddressHash);

  if (!addressMapping) {
    const addressMappings = await getAddressMapping();
    addressMapping = addressMappings?.find((m) => m.btcaddresshash === btcAddressHash);
  }

  if (!addressMapping) {
    res.status(500).send({
      status: false,
      message: "Failed to get address mapping",
    });
    return;
  }

  const data = {
    btcAddress: addressMapping.btcaddress,
    btcAddressHash: addressMapping.btcaddresshash,
  };

  res.status(200).send({
    status: true,
    message: "Address fetched successfully",
    data,
  });
});

app.post("/api/setup-recurring-payment", async (req, res) => {
  const { message, signature, btcAddress, amount, toAddress, frequency, label } = req.body;
  const result = verifyMessage(btcAddress, message, signature);
  if (result) {
    const mappings = await getMappings();
    const addressMappings = await getAddressMapping();
    const isFromRegistered = mappings.find((m) => m.btcaddress === btcAddress);
    const isToRegistered = mappings.find((m) => m.btcaddress === toAddress);
    if (isFromRegistered) {
      let toAddressHash = isToRegistered?.btcaddresshash;
      if (!toAddressHash) {
        const addressMapping = addressMappings.find((m) => m.btcaddress === toAddress);
        if (!addressMapping) {
          toAddressHash = await bytes32BTC(toAddress);
          const mappingRes = await updateAddressMapping([
            {
              btcAddress: toAddress,
              btcAddressHash: toAddressHash,
            },
          ]);
          if (!mappingRes?.status) {
            res.status(500).send({
              status: false,
              message: "Failed to update address mapping",
            });
            return;
          }
        } else {
          toAddressHash = addressMapping?.btcaddresshash;
        }
      }
      const response = await setupRecurringPayment({
        fromBTCAddressHash: isFromRegistered.btcaddresshash,
        toBTCAddressHash: toAddressHash,
        amount,
        frequency: frequency,
        evmAddress: isFromRegistered.evmaddress,
        mappings,
        fromAddress: btcAddress,
        toAddress: toAddress,
        label,
      });
      if (response.status) {
        res.status(200).send({
          status: true,
          message: "Deposit successful",
          data: response.data,
        });
        return;
      } else {
        res.status(500).send({
          status: false,
          message: response.data,
        });
        return;
      }
    }
    return;
  }
  res.status(500).send({
    status: false,
    message: "Failed to process request",
    verification: result,
  });
  return;
});

app.post("/api/cancel-recurring-payment", async (req, res) => {
  const { message, signature, btcAddress, id } = req.body;
  const result = verifyMessage(btcAddress, message, signature);
  if (result) {
    const response = await cancelRecurringPayment(id);
    if (response.status) {
      res.status(200).send({
        status: true,
        message: "Recurring payment cancelled successfully",
        data: response.data,
      });
      return;
    } else {
      res.status(500).send({
        status: false,
        message: response.data,
      });
      return;
    }
  }
  res.status(500).send({
    status: false,
    message: "Signature verification failed",
    verification: result,
  });
});

app.get("/api/get-auto-payments", async (req, res) => {
  const { btcAddress } = req.query;
  try {
    const records = await getAllRecurringPayments(btcAddress as string);
    res.status(200).send({
      status: true,
      message: "Recurring payments fetched successfully",
      data: records,
    });
  } catch (error) {
    res.status(500).send({
      status: false,
      message: "Failed to fetch recurring payments",
    });
  }
});

app.post("/api/cancel-auto-payment", async (req, res) => {
  const { message, signature, btcAddress, id } = req.body;
  const result = verifyMessage(btcAddress, message, signature);
  if (result) {
    const response = await cancelRecurringPayment(id);
    if (response.status) {
      res.status(200).send({
        status: true,
        message: "Recurring payment cancelled successfully",
        data: response.data,
      });
      return;
    } else {
      res.status(500).send({
        status: false,
        message: response.data,
      });
      return;
    }
  }
  res.status(500).send({
    status: false,
    message: "Signature verification failed",
    verification: result,
  });
});

app.post("/api/deposit-funds", async (req, res) => {
  const { bitcoinAddress } = req.body;

  if (!bitcoinAddress) {
    res.status(400).send({
      status: false,
      message: "Missing bitcoinAddress parameter",
    });
    return;
  }

  try {
    const result = await depositFunds(bitcoinAddress);

    if (result.status) {
      res.status(200).send({
        status: true,
        message: "Deposit funds transaction initiated successfully",
        data: result.data,
      });
    } else {
      res.status(400).send({
        status: false,
        message: "Failed to deposit funds",
        error: result.data,
      });
    }
  } catch (error) {
    console.error("Error in deposit funds endpoint:", error);
    res.status(500).send({
      status: false,
      message: "Internal server error",
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  runZMQ();
  initiateEthListener();
});
