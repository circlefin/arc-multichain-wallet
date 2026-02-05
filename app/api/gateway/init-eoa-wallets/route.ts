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
import { storeGatewayEOAWalletForUser } from "@/lib/circle/create-gateway-eoa-wallets";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if EOA wallet already exists for this user
    const { data: existingWallet } = await supabase
      .from("wallets")
      .select("circle_wallet_id, address")
      .eq("user_id", user.id)
      .eq("type", "gateway_signer")
      .limit(1);

    if (existingWallet && existingWallet.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Gateway EOA wallet already exists for this user",
        wallet: existingWallet[0],
      });
    }

    // Get the user's wallet_set_id from their SCA wallet
    const { data: scaWallet, error: scaError } = await supabase
      .from("wallets")
      .select("wallet_set_id")
      .eq("user_id", user.id)
      .eq("type", "sca")
      .limit(1)
      .single();

    if (scaError || !scaWallet) {
      return NextResponse.json(
        { error: "No SCA wallet found. Please create a wallet first." },
        { status: 404 }
      );
    }

    // Create multichain EOA wallet for the user
    const wallet = await storeGatewayEOAWalletForUser(user.id, scaWallet.wallet_set_id);

    return NextResponse.json({
      success: true,
      message: "Gateway EOA wallet created successfully",
      wallet: wallet[0],
    });
  } catch (error: any) {
    console.error("Error initializing EOA wallet:", error);
    return NextResponse.json(
      { error: error.message || "Failed to initialize EOA wallet" },
      { status: 500 }
    );
  }
}
