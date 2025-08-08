import {
  globalApiService,
  globalGetService,
} from "../../lib/utils/globalApiServices";
import API_INSTANCES from "../../lib/utils/httpInterceptor";

export const getTransactionHistory = ({ wallet_address, after_txid }) => {
  const url = after_txid
    ? `/address/${wallet_address}/txs?after_txid=${after_txid}`
    : `/address/${wallet_address}/txs`;

  const maxRetries = 3;
  const retryDelay = 1000; // 1 second

  return new Promise((resolve, reject) => {
    const attemptRequest = (retryCount = 0) => {
      return globalGetService(url)
        .then((res) => {
          if (res?.data) {
            return resolve(res?.data);
          }
          return reject(new Error("No data received"));
        })
        .catch((err) => {
          // If it's a 503 error and we haven't exceeded max retries
          if (err?.response?.status === 503 && retryCount < maxRetries) {
            return new Promise((innerResolve) =>
              setTimeout(
                () => innerResolve(attemptRequest(retryCount + 1)),
                retryDelay
              )
            );
          }
          return reject(err);
        });
    };

    attemptRequest();
  });
};

export const getTokens = ({ wallet_address }) => {
  return new Promise((resolve, reject) =>
    globalGetService(`/address/${wallet_address}`, {}, API_INSTANCES.btc)
      .then((res) => {
        if (res?.data) {
          resolve([
            {
              balance:
                res.data.chain_stats.funded_txo_sum -
                res.data.chain_stats.spent_txo_sum,
            },
          ]);
        } else {
          reject(false);
        }
      })
      .catch((err) => {
        reject(err);
      })
  );
};

export const getPrevTxHex = ({ txID }) => {
  return new Promise((resolve, reject) =>
    globalGetService(`/tx/${txID}/hex`, {}, API_INSTANCES.btc_esplora)
      .then((res) => {
        if (res?.data) {
          resolve(res.data);
        } else {
          reject(false);
        }
      })
      .catch((err) => {
        reject(err);
      })
  );
};

export const fetchBalance = async (address) => {
  try {
    const data = await getTokens({ wallet_address: address });
    const balance = data.reduce((accumulator, token) => {
      return Number(accumulator + token.balance);
    }, 0);
    return balance;
  } catch (error) {
    toast.error("Something went wrong!");
    throw error;
  }
};

export const getUtxos = ({ address }) => {
  return new Promise((resolve, reject) =>
    globalGetService(`/address/${address}/utxo`, {}, API_INSTANCES.btc_esplora)
      .then((res) => {
        if (res?.data) {
          resolve(res.data);
        } else {
          reject(false);
        }
      })
      .catch((err) => {
        reject(err);
      })
  );
};

export const getTransactionDetails = (txID) => {
  return new Promise((resolve, reject) =>
    globalGetService(`/tx/${txID}`, {}, API_INSTANCES.btc)
      .then((res) => {
        if (res?.data) {
          resolve(res.data);
        } else {
          reject(false);
        }
      })
      .catch((err) => {
        reject(err);
      })
  );
};

export const pushTx = (rawtx) => {
  return new Promise((resolve, reject) =>
    globalApiService(`/tx`, rawtx, "POST", API_INSTANCES.btc_esplora)
      .then((res) => {
        if (res?.data) {
          resolve(res.data);
        } else {
          reject(false);
        }
      })
      .catch((err) => {
        reject(err);
      })
  );
};

export const getFaucet = (wallet_address) => {
  return new Promise((resolve, reject) =>
    globalApiService(
      `/faucet?address=${wallet_address}`,
      {},
      "POST",
      API_INSTANCES.btc_faucet
    )
      .then((res) => {
        if (res?.data) {
          resolve(res.data);
        } else {
          reject(false);
        }
      })
      .catch((err) => {
        reject(err);
      })
  );
};

export const fetchTransactionHistory = async (btcAddress) => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_DVAULT_BASE_URL}/get-history?btcAddress=${btcAddress}`
    );
    const result = await response.json();
    if (response.ok) {
      console.log("History fetched successfully:", result.data);
      return result.data;
    } else {
      console.error("Error fetching history:", result.message);
      return false;
    }
  } catch (error) {
    console.error("Network error:", error);
    return false;
  }
};
