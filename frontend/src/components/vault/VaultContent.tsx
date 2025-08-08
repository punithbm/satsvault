import Deposit from "./Deposit";
import Stake from "./Stake";

function VaultContent() {
    return (
        <div className="text-black w-full pt-10 px-8">
            <div className="grid grid-cols-3 gap-4">
                <Deposit />
                <Stake />
            </div>
        </div>
    );
}

export default VaultContent;
