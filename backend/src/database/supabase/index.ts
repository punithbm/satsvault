import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface Mapping {
    evmAddress: string;
    evmKeyId: string;
    evmPubkey: string;
    btcPubkey: string;
    btcAddress: string;
    btcAddressHash: string;
}

async function updateMappingsTable(mappings: Mapping[]) {
    for (const mapping of mappings) {
        const { data, error } = await supabase.from("mappings").upsert({
            evmaddress: mapping.evmAddress,
            evmkeyid: mapping.evmKeyId,
            evmpubkey: mapping.evmPubkey,
            btcpubkey: mapping.btcPubkey,
            btcaddress: mapping.btcAddress,
            btcaddresshash: mapping.btcAddressHash
        });
        console.log({ data, error });
        if (error) {
            return { status: false, message: "failed to update database" };
        } else {
            return { status: true, message: "mappings updated successfully" };
        }
    }
}

interface AddressMapping {
    btcAddress: string;
    btcAddressHash: string;
}

interface PortoMapping {
    portoAddress: string;
    bitcoinAddress: string;
    pubkey: string;
}

async function updateAddressMapping(addressMappings: AddressMapping[]) {
    for (const mapping of addressMappings) {
        const { data, error } = await supabase.from("address_mapping").upsert({
            btcaddress: mapping.btcAddress,
            btcaddresshash: mapping.btcAddressHash
        });
        console.log({ data, error });
        if (error) {
            return { status: false, message: "Failed to update address mapping" };
        }
    }
    return { status: true, message: "Address mappings updated successfully" };
}

async function insertPortoMapping(portoMappings: PortoMapping[]) {
    for (const mapping of portoMappings) {
        const { data, error } = await supabase.from("porto_mapping").upsert({
            porto_address: mapping.portoAddress,
            bitcoin_address: mapping.bitcoinAddress,
            pub_key: mapping.pubkey
        });
        console.log({ data, error });
        if (error) {
            return { status: false, message: "Failed to insert porto mapping" };
        }
    }
    return { status: true, message: "Porto mappings inserted successfully" };
}

async function insertRecurringPaymentList(recurringPaymentList: any[]) {
    const results = [];
    for (const payment of recurringPaymentList) {
        const { data, error } = await supabase
            .from("recurring_payments")
            .upsert({
                label: payment.label,
                from: payment.fromBTCAddressHash,
                to: payment.toBTCAddressHash,
                amount: payment.amount,
                frequency: payment.frequency,
                block: payment.block,
                uuid: payment.uuid,
                on_status: payment.on_status
            })
            .select("*");
        console.log({ data, error });
        results.push({ data, error });
        if (error) {
            return {
                status: false,
                message: "Failed to update recurring payment list",
                results
            };
        }
    }
    return {
        status: true,
        message: "Recurring payment list updated successfully",
        results
    };
}

const getMappingsData = async () => {
    const { data, error } = await supabase.from("mappings").select("*");
    if (error) {
        console.error("Error fetching mappings:", error);
        return [];
    }
    return data || [];
};

const getAddressMappingsData = async () => {
    const { data, error } = await supabase.from("address_mapping").select("*");
    if (error) {
        console.error("Error fetching address mappings:", error);
        return [];
    }
    return data || [];
};

const getBlockDataFromRecurringPayments = async (): Promise<any[]> => {
    const { data, error } = await supabase
        .from("recurring_payments")
        .select("*")
        .eq("status", true)
        .eq("on_status", "COMPLETED");
    if (error) {
        console.error("Error fetching block data:", error);
        return [];
    }

    return data || [];
};

const getAllRecurringPayments = async (btcAddress: string): Promise<any[]> => {
    const mappings = await getMappingsData();
    const addressMappings = await getAddressMappingsData();
    const { data, error } = await supabase
        .from("recurring_payments")
        .select("*")
        .eq("on_status", "COMPLETED")
        .order("created_at", { ascending: false });
    if (error) {
        console.error("Error fetching block data:", error);
        return [];
    }

    const fromBTCAddressHash = mappings.find(
        (mapping) => mapping.btcaddress === btcAddress
    )?.btcaddresshash;

    const filteredData = data.filter((record) => record.from === fromBTCAddressHash);

    const updatedData = filteredData.map((record) => {
        const mapping = mappings.find((m) => m.btcaddresshash === record.to);
        if (mapping) {
            record.to = mapping.btcaddress;
        } else {
            const addressMapping = addressMappings.find(
                (m) => m.btcaddresshash === record.to
            );
            if (addressMapping) {
                record.to = addressMapping.btcaddress;
            }
        }
        return record;
    });

    console.log({ updatedData });

    return updatedData;
};

const updateRecurringPaymentBlock = async (block: number, updatedBlockNumber: number) => {
    const { data, error } = await supabase
        .from("recurring_payments")
        .update({ block: updatedBlockNumber })
        .eq("block", block);
    if (error) {
        console.error("Error updating recurring payment status:", error);
        return false;
    }
    return true;
};

const updateRecurringPaymentStatusById = async (
    id: number,
    status: boolean
): Promise<boolean> => {
    console.log({
        id,
        status
    });
    const { data, error } = await supabase
        .from("recurring_payments")
        .update({ status: status })
        .eq("id", id);
    if (error) {
        console.error("Error updating recurring payment status:", error);
        return false;
    }
    return true;
};

const updateRecurringPaymentCurrStatusById = async (
    id: number,
    curStatus: string,
    status?: boolean
): Promise<boolean> => {
    console.log({
        id,
        curStatus,
        status
    });
    const updateObj = { on_status: curStatus, status: true };
    if (status) {
        updateObj.status = status;
    }
    const { data, error } = await supabase
        .from("recurring_payments")
        .update(updateObj)
        .eq("id", id);
    if (error) {
        console.error("Error updating recurring payment status:", error);
        return false;
    }
    return true;
};

const getPortoMappingByAddress = async (portoAddress: string): Promise<any[]> => {
    const { data, error } = await supabase
        .from("porto_mapping")
        .select("*")
        .eq("porto_address", portoAddress);
    if (error) {
        console.error("Error fetching porto mapping:", error);
        return [];
    }
    return data || [];
};

export {
    updateMappingsTable,
    updateAddressMapping,
    insertPortoMapping,
    getMappingsData,
    getAddressMappingsData,
    getPortoMappingByAddress,
    insertRecurringPaymentList,
    getBlockDataFromRecurringPayments,
    updateRecurringPaymentBlock,
    getAllRecurringPayments,
    updateRecurringPaymentStatusById,
    updateRecurringPaymentCurrStatusById
};
