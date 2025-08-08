import Image from "next/image";
import { useState, useEffect } from "react";
import { icons } from "@/lib/utils/images";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { Button } from "../ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Porto, Mode, Dialog } from "porto";

const carouselMessages = [
  {
    img: icons.btcControlImg.src,
    title: "Your Bitcoin, Your Control.",
    description: "No middlemen. Just you and your money.",
  },
  {
    img: icons.btcPaymentsImg.src,
    title: "Payments That Just Work.",
    description: "Send and receive in seconds, with Bitcoin-level security.",
  },
  {
    img: icons.btcSmartImg.src,
    title: "Smarter Ways to Use Your Bitcoin.",
    description: "Set rules. Automate actions. Make Bitcoin work for you.",
  },
];

function CarouselMessages({ current }: { current: number }) {
  return (
    <div className="lg:w-[430px] lg:h-[430px] flex items-center justify-center mx-auto w-full h-fit">
      <Image
        src={carouselMessages[current].img}
        width={430}
        height={430}
        alt=""
        className="lg:object-contain lg:w-full lg:h-full object-contain w-full h-fit rounded-xl"
        priority
      />
    </div>
  );
}

export default function GetStarted() {
  const router = useRouter();
  const { setConnected } = useBtcWallet();
  const [current, setCurrent] = useState(0);
  const [portoLoading, setPortoLoading] = useState(false);
  const [portoInstance, setPortoInstance] = useState<any>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % carouselMessages.length);
    }, 5000);
    return () => clearTimeout(timer);
  }, [current]);

  async function callCreateWallet(
    message: string,
    signature: string,
    account: any
  ) {
    const publicKey = account?.address;
    const address = account?.address;

    const baseUrl = process.env.NEXT_PUBLIC_DVAULT_BASE_URL;
    const url = `${baseUrl}/create-wallet`;
    const data = {
      pubkey: publicKey,
      message: message,
      signature: signature,
      btcAddress: address,
    };

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.text();
      const resultData = JSON.parse(result);
      if (resultData.status) {
        // Set wallet connection with btcAddress from API response
        setConnected(account, resultData.btcAddress);

        if (resultData.newRegistration) {
          toast.success("Registration completed successfully");
        } else {
          toast.success("Signin completed successfully");
        }
        router.push("/");
      } else {
        toast.error("Failed to register");
        setPortoLoading(false);
      }
    } catch (error) {
      console.error("Error calling API:", error);
      toast.error("Failed to create wallet");
      setPortoLoading(false);
    }
  }

  // Porto sign in function
  const handlePortoSignIn = async () => {
    setPortoLoading(true);
    try {
      // Initialize Porto if not already done
      let porto = portoInstance;
      if (!porto) {
        porto = Porto.create({
          mode: Mode.dialog({
            renderer: Dialog.iframe(),
          }),
        });
        setPortoInstance(porto);
      }

      // Connect to Porto wallet using the correct API from documentation
      const connectResult = await porto.provider.request({
        method: "wallet_connect",
      });

      if (
        connectResult &&
        connectResult.accounts &&
        connectResult.accounts.length > 0
      ) {
        const account = connectResult.accounts[0];

        // Sign a message for authentication
        const message = `Sign in to SatsVault, you gateway to Bitcoin`;
        // Convert message to hex format as required by personal_sign
        const messageHex = `0x${Buffer.from(message, "utf8").toString("hex")}`;

        try {
          // Use personal_sign method for message signing (params: [message, address])
          console.log("account", account);

          const signature = await porto.provider.request({
            method: "personal_sign",
            params: [messageHex, account.address],
          });

          if (signature) {
            // Call the createWallet API with Porto credentials
            await callCreateWallet(message, signature, account);

            // Store Porto authentication data for future use
            const authData = {
              account: account,
              message: message,
              signature: signature,
              timestamp: Date.now(),
            };

            localStorage.setItem("porto_auth", JSON.stringify(authData));
          } else {
            toast.error("Failed to sign authentication message");
          }
        } catch (signError: any) {
          console.error("Signature error:", signError);
          if (signError?.code === 4001) {
            toast.error("User rejected the signature request");
          } else {
            toast.error("Failed to sign message. Please try again.");
          }
        }
      } else {
        toast.error(
          "No accounts found. Please ensure Porto wallet is connected."
        );
      }
    } catch (error: any) {
      console.error("Porto sign in error:", error);
      if (error.code === 4001) {
        toast.error("User rejected the connection request");
      } else {
        toast.error(`Porto connection failed: ${error.message || error}`);
      }
    } finally {
      setPortoLoading(false);
    }
  };

  return (
    <div className="w-full h-full text-center max-w-[432px] md:px-0">
      <CarouselMessages current={current} />
      <div className="mt-8 pb-10">
        <div className="lg:text-2xl text-lg font-bold text-black mb-2">
          {carouselMessages[current].title}
        </div>
        <div className="lg:text-base text-sm text-gray-400 mb-4 min-h-[40px]">
          {carouselMessages[current].description}
        </div>
        {/* Carousel dots */}
        <div className="flex justify-center items-center gap-2 mb-8">
          {carouselMessages.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              className={`w-2 h-2 rounded-full transition-all duration-200 focus:outline-none ${
                idx === current ? "bg-orangeSecondary scale-110" : "bg-gray-200"
              }`}
              onClick={() => setCurrent(idx)}
            />
          ))}
        </div>
        <div className="flex flex-col gap-4">
          <Button
            className="w-full lg:text-[20px] text-[16px] leading-[140%] tracking-wide rounded-full text-white font-bold"
            onClick={handlePortoSignIn}
            variant="primary"
            disabled={portoLoading}
          >
            {portoLoading ? "Signing in..." : "Sign In"}
          </Button>
        </div>
      </div>
    </div>
  );
}
