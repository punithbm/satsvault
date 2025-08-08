import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { useCallback, useState } from "react";
import { Button } from "../ui/button";
import ReceiveQR from "./QRCode";

export default function Deposit() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const closeDialog = useCallback(() => setIsDialogOpen(false), []);
    return (
        <div className=" bg-white shadow-md rounded-lg p-4 w-full relative">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button
                        className="
                             w-[110px]
                            d-inline-block
                px-2 py-2 rounded-full 
                text-sm uppercase tracking-wider 
                transition-all duration-300 
                bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg
                absolute top-4 right-4
              "
                    >
                        Add Supply
                    </Button>
                </DialogTrigger>
                <ConnectWalletDialog close={closeDialog} />
            </Dialog>
            <h2 className="text-lg font-semibold text-[#83858a] mb-4">Deposits</h2>
            <p className="text-black text-2xl font-semibold">
                1 BTC <span className="text-gray-400 text-base pt-2 block">$51</span>
            </p>
        </div>
    );
}

function ConnectWalletDialog({ close }: { close: () => void }) {
    return (
        <DialogContent className="max-h-screen overflow-auto">
            <DialogHeader>
                <DialogTitle className="text-2xl">Deposit</DialogTitle>
            </DialogHeader>
            <div>
                <div className="flex flex-col gap-2 items-center">
                    <ReceiveQR />
                </div>
            </div>
        </DialogContent>
    );
}
