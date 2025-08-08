export default function Stake() {
    return (
        <div className="bg-white shadow-md rounded-lg p-4 w-full relative">
            <button className="absolute top-4 right-4 ">
                <span
                    className="
                            w-[110px]
                            block
                px-2 py-2 rounded-full 
                text-sm uppercase tracking-wider 
                transition-all duration-300 
                bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg
              "
                >
                    Stake
                </span>
            </button>
            <h2 className="text-lg font-semibold text-[#83858a] mb-4">Staked</h2>
            <p className="text-black text-2xl font-semibold">
                1 BTC <span className="text-gray-400 text-base pt-2 block">$51</span>
            </p>
        </div>
    );
}
