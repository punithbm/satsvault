import { getAddressMappingsData, getMappingsData } from "./supabase/index";

// export const addAddressToMappings = (data: {
//     evmAddress: string;
//     evmPubkey: string;
//     evmKeyId: string;
//     btcPubkey: string;
//     btcAddress: string;
//     btcAddressHash: string;
// }) => {
//     mappings.push(data);
//     fs.writeFileSync(filePath, JSON.stringify(mappings, null, 2));
//     console.log("Mappings updated and saved to file:", mappings);
// };

export const getMappings = async () => {
    const mappings = await getMappingsData();
    return mappings;
};

// export const addAddressToAddressMapping = (data: {
//     btcAddress: string;
//     btcAddressHash: string;
// }) => {
//     addressMappings.push(data);
//     fs.writeFileSync(addressFilePath, JSON.stringify(addressMappings, null, 2));
//     console.log("Address mappings updated and saved to file:", addressMappings);
// };

export const getAddressMapping = async () => {
    const addressMappings = await getAddressMappingsData();
    return addressMappings;
};
