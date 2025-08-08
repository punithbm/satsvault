"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ArrowLeft, Shield, Clock, DollarSign, User, Calendar } from "lucide-react";
import { toast } from "sonner";
import BackButton from "@/components/shared/BackButton";

interface Policy {
  id: string;
  type: "spending_limit" | "time_restriction" | "recipient_whitelist" | "multi_approval";
  name: string;
  conditions: Record<string, any>;
  enabled: boolean;
}

export default function PoliciesPage() {
  const router = useRouter();
  const [selectedPolicyType, setSelectedPolicyType] = useState<string>("");
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // Form states for different policy types
  const [spendingLimit, setSpendingLimit] = useState({ daily: "", monthly: "" });
  const [timeRestriction, setTimeRestriction] = useState({ startTime: "", endTime: "", days: [] });
  const [recipientAddress, setRecipientAddress] = useState("");
  const [approvalCount, setApprovalCount] = useState("2");

  const policyTypes = [
    {
      id: "spending_limit",
      name: "Spending Limits",
      description: "Set daily/monthly spending limits",
      icon: <DollarSign size={24} color="#919191" />,
    },
    {
      id: "time_restriction",
      name: "Time Restrictions",
      description: "Restrict transactions to specific time windows",
      icon: <Clock size={24} color="#919191" />,
    },
    {
      id: "recipient_whitelist",
      name: "Recipient Whitelist",
      description: "Only allow transactions to approved addresses",
      icon: <User size={24} color="#919191" />,
    },
    {
      id: "multi_approval",
      name: "Multi-Approval",
      description: "Require multiple confirmations for transactions",
      icon: <Shield size={24} color="#919191" />,
    },
  ];

  const handleCreatePolicy = () => {
    if (!selectedPolicyType) {
      toast.error("Please select a policy type");
      return;
    }

    let conditions = {};
    let name = "";

    switch (selectedPolicyType) {
      case "spending_limit":
        if (!spendingLimit.daily && !spendingLimit.monthly) {
          toast.error("Please set at least one spending limit");
          return;
        }
        conditions = spendingLimit;
        name = "Spending Limit Policy";
        break;
      case "time_restriction":
        if (!timeRestriction.startTime || !timeRestriction.endTime) {
          toast.error("Please set both start and end times");
          return;
        }
        conditions = timeRestriction;
        name = "Time Restriction Policy";
        break;
      case "recipient_whitelist":
        if (!recipientAddress.trim()) {
          toast.error("Please enter a recipient address");
          return;
        }
        conditions = { addresses: [recipientAddress.trim()] };
        name = "Recipient Whitelist Policy";
        break;
      case "multi_approval":
        conditions = { requiredApprovals: parseInt(approvalCount) };
        name = "Multi-Approval Policy";
        break;
    }

    const newPolicy: Policy = {
      id: Date.now().toString(),
      type: selectedPolicyType as Policy["type"],
      name,
      conditions,
      enabled: true,
    };

    setPolicies([...policies, newPolicy]);
    setIsCreating(false);
    setSelectedPolicyType("");
    resetForms();
    toast.success("Policy created successfully!");
  };

  const resetForms = () => {
    setSpendingLimit({ daily: "", monthly: "" });
    setTimeRestriction({ startTime: "", endTime: "", days: [] });
    setRecipientAddress("");
    setApprovalCount("2");
  };

  const togglePolicy = (id: string) => {
    setPolicies(policies.map((policy) => (policy.id === id ? { ...policy, enabled: !policy.enabled } : policy)));
  };

  const deletePolicy = (id: string) => {
    setPolicies(policies.filter((policy) => policy.id !== id));
    toast.success("Policy deleted");
  };

  const renderPolicyForm = () => {
    switch (selectedPolicyType) {
      case "spending_limit":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Daily Limit (BTC)</label>
              <Input type="number" step="0.00000001" placeholder="0.01" value={spendingLimit.daily} onChange={(e) => setSpendingLimit({ ...spendingLimit, daily: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Limit (BTC)</label>
              <Input type="number" step="0.00000001" placeholder="1.0" value={spendingLimit.monthly} onChange={(e) => setSpendingLimit({ ...spendingLimit, monthly: e.target.value })} />
            </div>
          </div>
        );
      case "time_restriction":
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <Input type="time" value={timeRestriction.startTime} onChange={(e) => setTimeRestriction({ ...timeRestriction, startTime: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <Input type="time" value={timeRestriction.endTime} onChange={(e) => setTimeRestriction({ ...timeRestriction, endTime: e.target.value })} />
            </div>
          </div>
        );
      case "recipient_whitelist":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Bitcoin Address</label>
            <Input placeholder="bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh" value={recipientAddress} onChange={(e) => setRecipientAddress(e.target.value)} />
          </div>
        );
      case "multi_approval":
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Required Approvals</label>
            <Select value={approvalCount} onChange={(e) => setApprovalCount(e.target.value)}>
              <option value="2">2 Approvals</option>
              <option value="3">3 Approvals</option>
              <option value="4">4 Approvals</option>
              <option value="5">5 Approvals</option>
            </Select>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full">
      {/* Header */}
      <div className="px-4 pt-6 mt-24 pb-4">
        <div className="max-w-md mx-auto">
          <BackButton />
          <div className="mt-4">
            <h1 className="text-xl font-semibold text-gray-900">Wallet Policies</h1>
            <p className="text-sm text-gray-500">Configure security rules for your vault</p>
          </div>
        </div>
      </div>

      <div className="px-4 pb-6 pt-4">
        <div className="max-w-md mx-auto">
          {/* Create Policy Section */}
          {!isCreating ? (
            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                <Shield size={20} color="#374151" />
                Create New Policy
              </h2>
              <div className="grid gap-3">
                {policyTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => {
                      setSelectedPolicyType(type.id);
                      setIsCreating(true);
                    }}
                    className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
                  >
                    {type.icon}
                    <div>
                      <p className="font-medium text-gray-900">{type.name}</p>
                      <p className="text-sm text-gray-500">{type.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium">{policyTypes.find((t) => t.id === selectedPolicyType)?.name}</h2>
                <button
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedPolicyType("");
                    resetForms();
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              {renderPolicyForm()}

              <div className="flex gap-3 mt-6">
                <Button onClick={handleCreatePolicy} className="flex-1">
                  Create Policy
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCreating(false);
                    setSelectedPolicyType("");
                    resetForms();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
