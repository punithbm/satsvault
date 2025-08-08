import API_INSTANCES from "./httpInterceptor";
export const globalGetService = (
  url: string,
  params = {},
  instance = API_INSTANCES.btc
) => {
  const headerObj = {
    "Cache-Control": "no-cache",
  };
  const _axiosInstance = instance;
  const paramsObj = params;
  return new Promise(function (resolve, reject) {
    _axiosInstance({
      method: "GET",
      url: url,
      headers: headerObj,
      params: paramsObj,
    })
      .then((response) => {
        const _response = {
          data: response.data,
          statusCode: response.status,
          message: response.statusText,
        };

        resolve(_response);
      })
      .catch((error) => {
        reject(error);
      });
  });
};

export const globalApiService = (
  url: string,
  data: any,
  method: any,
  instance = API_INSTANCES.btc
) => {
  const headerObj = {
    "Cache-Control": "no-cache",
  };
  const _axiosInstance = instance;
  return new Promise(function (resolve, reject) {
    _axiosInstance({
      method: method,
      url: url,
      headers: headerObj,
      data: data,
    })
      .then((response) => {
        const _response = {
          data: response.data,
          statusCode: response.status,
          message: response.statusText,
        };
        resolve(_response);
      })
      .catch((error) => {
        reject(error);
      });
  });
};
