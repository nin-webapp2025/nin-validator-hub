import { useNavigate } from "react-router-dom";

import { WalletBalance } from "@/components/dashboard/WalletBalance";

export default function UserOverviewPage() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <WalletBalance
        variant="hero"
        title="Wallet Balance"
        subtitle="Use your wallet across verification, printing, fulfillment, and account activity."
        onClick={() => navigate("/dashboard/user/wallet")}
      />
    </div>
  );
}
