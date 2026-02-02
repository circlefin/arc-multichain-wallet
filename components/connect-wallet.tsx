/**
 * Copyright 2026 Circle Internet Group, Inc.  All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useAccount, useDisconnect, useConnections } from "wagmi";
import { ConnectDialog } from "@/components/connect-wallet-dialog";
import { createClient } from "@/lib/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Copy } from "lucide-react";
import { toast } from "sonner";

type CircleWallet = {
  wallet_address: string;
};

export function ConnectWallet({ onAccountsChange }: { onAccountsChange?: (accounts: string[]) => void }) {
  const { isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const connections = useConnections();
  const [circleWallets, setCircleWallets] = useState<CircleWallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingCircleWallet, setIsCreatingCircleWallet] = useState(false);

  const handleCreateCircleWallet = async () => {
    setIsCreatingCircleWallet(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user || !user.email) {
        throw new Error("User not authenticated. Please sign in.");
      }

      // 1. Create Wallet Set
      const walletSetResponse = await fetch("/api/wallet-set", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityName: user.email }),
      });
      if (!walletSetResponse.ok) {
        const { error } = await walletSetResponse.json();
        throw new Error(error || "Failed to create wallet set.");
      }
      const createdWalletSet = await walletSetResponse.json();

      // 2. Create Wallet
      const walletResponse = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletSetId: createdWalletSet.id }),
      });
      if (!walletResponse.ok) {
        const { error } = await walletResponse.json();
        throw new Error(error || "Failed to create wallet.");
      }
      const createdWallet = await walletResponse.json();

      // 3. Insert wallet into Supabase, linking it directly to the auth user
      const { error: insertError } = await supabase.from("wallets").insert({
        user_id: user.id, // Use the user_id from auth.users
        circle_wallet_id: createdWallet.id,
        wallet_set_id: createdWalletSet.id,
        wallet_address: createdWallet.address,
      });

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        throw new Error("Failed to save wallet to your profile.");
      }

      // Show success message with onboarding info
      toast.success("Circle Wallet Created!", {
        description: "Your wallet is ready. To get started, deposit testnet USDC or use our faucet.",
        duration: 5000,
      });

      window.location.reload();
    } finally {
      setIsCreatingCircleWallet(false);
    }
  };

  useEffect(() => {
    const fetchCircleWallet = async () => {
      setIsLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from("wallets")
          .select("wallet_address, type")
          .eq("user_id", user.id)
          .neq("type", "gateway_signer"); // Exclude EOA signer wallets from UI
        if (data && !error) {
          setCircleWallets(data);
        }
      }
      setIsLoading(false);
    };
    fetchCircleWallet();
  }, []);

  useEffect(() => {
    const wagmiAddresses = connections.map(conn => conn.accounts).flat();
    const circleAddresses = circleWallets.map(w => w.wallet_address);
    const allAddresses = [...wagmiAddresses, ...circleAddresses];
    const uniqueAddresses = Array.from(new Set(allAddresses));
    onAccountsChange?.(uniqueAddresses);
  }, [connections, circleWallets, onAccountsChange]);

  const hasWagmiWallet = isConnected && connections.length > 0;
  const hasCircleWallet = circleWallets.length > 0;
  const hasAnyWallet = hasWagmiWallet || hasCircleWallet;

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (!hasAnyWallet) {
    return (
      <Button
        className="w-full"
        onClick={handleCreateCircleWallet}
        disabled={isCreatingCircleWallet}
      >
        {isCreatingCircleWallet && (
          <Loader2 className="h-4 w-4 animate-spin" />
        )}
        Create Circle Wallet
      </Button>
    )
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-sm">Connected Wallets:</span>
          <ConnectDialog>
            <Button variant="outline" size="sm">
              Connect Another Wallet
            </Button>
          </ConnectDialog>
        </div>
        <div className="space-y-2">
          {/* Render Circle Wallets */}
          {circleWallets.map((wallet, index) => (
            <div key={wallet.wallet_address} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full" title="Circle Wallet"></div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Circle Wallet {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => navigator.clipboard.writeText(wallet.wallet_address)}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="font-mono text-xs text-gray-900 dark:text-gray-100 mt-1 truncate">{wallet.wallet_address}</p>
            </div>
          ))}
          
          {/* Render Wagmi Wallets */}
          {connections.map((connection, index) => (
            <div key={`wagmi-${index}`} className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full" title="External Wallet"></div>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-400">External Wallet {index + 1}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => navigator.clipboard.writeText(connection.accounts[0])}
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {connection.accounts.map((address, addrIndex) => (
                <p key={addrIndex} className="font-mono text-xs text-gray-900 dark:text-gray-100 mt-1 truncate">{address}</p>
              ))}
            </div>
          ))}
          
          {!hasCircleWallet && !hasWagmiWallet && (
            <p className="text-xs text-muted-foreground italic">No wallets connected</p>
          )}
        </div>
      </div>
      {/* Only show Disconnect button if a wagmi wallet is connected */}
      {hasWagmiWallet && (
        <Button variant="outline" onClick={() => disconnect()} className="w-full">
          Disconnect All
        </Button>
      )}
    </div>
  );
}