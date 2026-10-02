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
import { circleDeveloperSdk } from "@/lib/circle/sdk";
import { requireUser } from "@/lib/utils/api-auth";

export async function PUT(req: NextRequest) {
  try {
    // Authenticate caller on PUT to prevent unauthenticated wallet-set generation
    const authz = await requireUser();
    if (!authz.ok) return authz.response;

    let body: { entityName?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const entityName = body?.entityName;
    if (!entityName || typeof entityName !== "string" || !entityName.trim()) {
      return NextResponse.json(
        { error: "entityName is required" },
        { status: 400 }
      );
    }

    const response = await circleDeveloperSdk.createWalletSet({
      name: entityName.trim(),
    });

    if (!response.data?.walletSet) {
      return NextResponse.json(
        { error: "The response did not include a valid wallet set" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ...response.data.walletSet }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Wallet set creation failed: ${message}`);
    return NextResponse.json(
      { error: "Failed to create wallet set" },
      { status: 500 }
    );
  }
}

export async function POST(_req: NextRequest) {
  try {
    const authz = await requireUser();
    if (!authz.ok) return authz.response;

    const { user, supabase } = authz;

    // Check if wallet set already exists for this user
    const { data: existingWallets } = await supabase
      .from("wallets")
      .select("wallet_set_id")
      .eq("user_id", user.id)
      .limit(1);

    if (existingWallets && existingWallets.length > 0) {
      return NextResponse.json({
        success: true,
        message: "Wallet set already exists for this user",
      });
    }

    // Create wallet set
    const walletSetResponse = await circleDeveloperSdk.createWalletSet({
      name: `User ${user.id.substring(0, 8)} - Wallet Set`,
    });

    if (!walletSetResponse.data?.walletSet) {
      throw new Error("Failed to create wallet set");
    }

    const walletSetId = walletSetResponse.data.walletSet.id;

    // Create multichain SCA wallet across supported testnet chains
    const walletsResponse = await circleDeveloperSdk.createWallets({
      accountType: "SCA",
      blockchains: ["ARC-TESTNET", "BASE-SEPOLIA", "AVAX-FUJI"],
      count: 1,
      walletSetId,
    });

    if (!walletsResponse.data?.wallets || walletsResponse.data.wallets.length === 0) {
      throw new Error("Failed to create wallet");
    }

    const wallet = walletsResponse.data.wallets[0];
    const walletRecords = [
      {
        user_id: user.id,
        circle_wallet_id: wallet.id,
        wallet_set_id: walletSetId,
        wallet_address: wallet.address,
        address: wallet.address,
        blockchain: "MULTICHAIN",
        type: "sca",
        name: "Multichain Wallet",
      },
    ];

    const { error: insertError } = await supabase
      .from("wallets")
      .insert(walletRecords);

    if (insertError) {
      console.error("Error storing wallets in database:", insertError);
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      walletSetId,
      wallets: walletRecords,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create wallet set";
    console.error("Wallet set creation failed:", error);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}