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

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { circleDeveloperSdk } from "@/lib/circle/sdk";
import type { SupportedChain } from "@/lib/circle/gateway-sdk";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { getGatewayEOAWalletId } = await import("@/lib/circle/create-gateway-eoa-wallets");
    
    const chains = ["BASE-SEPOLIA", "AVAX-FUJI", "ARC-TESTNET"];
    const chainMap: Record<string, SupportedChain> = {
      "BASE-SEPOLIA": "baseSepolia",
      "AVAX-FUJI": "avalancheFuji",
      "ARC-TESTNET": "arcTestnet",
    };
    
    const wallets = await Promise.all(
      chains.map(async (blockchain) => {
        try {
          const { walletId, address } = await getGatewayEOAWalletId(user.id, blockchain);
          return {
            chain: chainMap[blockchain],
            blockchain,
            walletId,
            address,
          };
        } catch (error) {
          console.error(`Error fetching EOA wallet for ${blockchain}:`, error);
          return null;
        }
      })
    );

    return NextResponse.json({
      wallets: wallets.filter(w => w !== null),
    });
  } catch (error: any) {
    console.error("Error fetching EOA wallets:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch EOA wallets" },
      { status: 500 }
    );
  }
}