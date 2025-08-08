import axios from "axios";

export const BTC_API = process.env.NEXT_PUBLIC_BTC_API;
export const BTC_ESPLORA_API = process.env.NEXT_PUBLIC_BTC_ESPLORA_API;
export const BTC_FAUCET_API = process.env.NEXT_PUBLIC_BTC_FAUCET_API;

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
function axiosInstanceCreator(baseURL) {
  const axiosInstance = axios.create();
  axiosInstance.defaults.baseURL = baseURL;
  axiosInstance.interceptors.request.use(
    function (config) {
      return config;
    },
    function (error) {
      return Promise.reject(error);
    }
  );

  axiosInstance.interceptors.response.use(
    function (response) {
      if (response.status >= 200 && response.status <= 299) {
        return response;
      } else {
        return Promise.reject(response);
      }
    },

    function (error) {
      return Promise.reject(error);
    }
  );

  return axiosInstance;
}

const btcInstance = axiosInstanceCreator(BTC_API);
const btcEsploraInstance = axiosInstanceCreator(BTC_ESPLORA_API);
const btcFaucetInstance = axiosInstanceCreator(BTC_FAUCET_API);

export const API_INSTANCES = {
  btc: btcInstance,
  btc_esplora: btcEsploraInstance,
  btc_faucet: btcFaucetInstance,
};
export default API_INSTANCES;
