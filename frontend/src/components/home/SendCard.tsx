"use client";

import React, { useState } from "react";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { toast } from "sonner";
import * as bitcoin from "bitcoinjs-lib";
import { createPsbt } from "@/lib/utils/index";
import { pushTx, getUtxos } from "@/hooks/swr/index";
import { useBtcWallet } from "@/lib/context/WalletContext";

// Bitcoin address validation regex for testnet
const BITCOIN_TESTNET_ADDRESS_REGEX = /^(tb1|m|n)[a-zA-HJ-NP-Z0-9]{25,39}$/;

// Validation schema
const SendSchema = Yup.object().shape({
  recipientAddress: Yup.string()
    .matches(BITCOIN_TESTNET_ADDRESS_REGEX, "Invalid Bitcoin testnet address")
    .required("Recipient address is required"),
  amount: Yup.number()
    .positive("Amount must be positive")
    .min(546, "Minimum amount is 546 sats (dust threshold)")
    .required("Amount is required"),
});

export const SendCard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const { isConnected } = useBtcWallet();

  const handleSendTransaction = async (values: {
    recipientAddress: string;
    amount: number;
  }) => {
    // Check wallet connection
    if (!isConnected) {
      toast.error("Wallet not connected");
      return;
    }

    // Check UniSat wallet
    if (!window.unisat) {
      toast.error("UniSat wallet not installed");
      return;
    }

    try {
      setLoading(true);

      // Get sender's address
      const [senderAddress] = await window.unisat.getAccounts();

      // Fetch UTXOs
      const utxos = await getUtxos({ address: senderAddress });
      if (!utxos.length) {
        toast.error("No UTXOs found for this address");
        return;
      }

      // Create PSBT
      const psbtHex = await createPsbt(
        senderAddress,
        values.recipientAddress,
        values.amount,
        utxos,
        500
      );

      // Sign with UniSat
      const signedPsbtHex = await window.unisat.signPsbt(psbtHex);

      // Extract the final transaction
      const psbt = bitcoin.Psbt.fromHex(signedPsbtHex);
      const finalTx = psbt.extractTransaction().toHex();

      // Broadcast transaction
      const txid = await pushTx(finalTx);

      toast.success(`Transaction sent! TXID: ${txid}`);
    } catch (error) {
      console.error("Failed to create/send transaction:", error);
      toast.error("Failed to create/send transaction");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 w-full max-w-md">
      <h2 className="text-2xl font-bold mb-4 text-center">Send Bitcoin</h2>

      {!isConnected && (
        <div className="text-center text-red-500 mb-4">
          Please connect your wallet to send Bitcoin
        </div>
      )}

      <Formik
        initialValues={{
          recipientAddress: "",
          amount: "" as any,
        }}
        validationSchema={SendSchema}
        onSubmit={(values, { resetForm }) => {
          handleSendTransaction({
            recipientAddress: values.recipientAddress,
            amount: Number(values.amount),
          }).then(() => {
            resetForm();
          });
        }}
      >
        {({ errors, touched }) => (
          <Form>
            <div className="mb-4">
              <label
                htmlFor="recipientAddress"
                className="block text-sm-semibold text-gray-700 mb-2"
              >
                Recipient Address
              </label>
              <Field
                type="text"
                id="recipientAddress"
                name="recipientAddress"
                placeholder="Enter recipient Bitcoin address"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 
                  ${
                    errors.recipientAddress && touched.recipientAddress
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                disabled={!isConnected}
              />
              <ErrorMessage
                name="recipientAddress"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="amount"
                className="block text-sm-semibold text-gray-700 mb-2"
              >
                Amount (sats)
              </label>
              <Field
                type="number"
                id="amount"
                name="amount"
                placeholder="Enter amount in sats"
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 
                  ${
                    errors.amount && touched.amount
                      ? "border-red-500 focus:ring-red-500"
                      : "border-gray-300 focus:ring-blue-500"
                  }`}
                disabled={!isConnected}
              />
              <ErrorMessage
                name="amount"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>

            <button
              type="submit"
              disabled={!isConnected || loading}
              className="w-full bg-blue-500 text-white py-2 rounded-md 
                hover:bg-blue-600 transition-colors duration-300 
                disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send Bitcoin"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default SendCard;
