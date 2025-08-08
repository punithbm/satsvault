"use client";

import React from "react";
import VaultTittle from "@/components/vault/VaultTittle";
import VaultContent from "@/components/vault/VaultContent";

export default function Vault() {
    return (
        <div className="container mx-auto gap-4 pt-[68px]">
            <VaultTittle />
            <VaultContent />
        </div>
    );
}
