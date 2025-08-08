import { useRouter } from "next/navigation";
import { useBtcWallet } from "@/lib/context/WalletContext";
import { toast } from "sonner";

interface ActionCardProps {
  title: string;
  description: string;
  icon: any;
  action: string;
}

export default function ActionCard({
  title,
  description,
  icon,
  action,
}: ActionCardProps) {
  const router = useRouter();
  const { isConnected, checkCookieValidity } = useBtcWallet();

  const handleClick = () => {
    // Check if the route requires wallet connection
    const protectedRoutes = ["/deposit", "/withdraw", "/send", "/transactions", "/autopay"];
    const isProtectedRoute = protectedRoutes.some(route => action.startsWith(route));
    
    if (isProtectedRoute) {
      if (!isConnected) {
        toast.error("Please connect your wallet first");
        return;
      }
      // Check if cookie is still valid before navigation
      if (!checkCookieValidity()) {
        return; // checkCookieValidity already shows error toast
      }
    }
    
    router.push(action);
  };

  return (
    <button
      className="w-full px-4 py-6 bg-grey-50 rounded-md flex items-center gap-x-3"
      onClick={handleClick}
    >
      {icon}
      <div className="flex flex-col gap-y-1 items-start text-start">
        <p className="text-sm-semibold text-grey-600 leading-[140%] tracking-[3%]">
          {title}
        </p>
        <p className="text-sm text-grey-400 leading-[150%]">{description}</p>
      </div>
    </button>
  );
}
