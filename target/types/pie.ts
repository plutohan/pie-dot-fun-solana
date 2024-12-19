/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pie.json`.
 */
export type Pie = {
  "address": "devi51mZmdwUJGU9hjN27vEz64Gps7uUefqxg27EAtH",
  "metadata": {
    "name": "pie",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "buyComponent",
      "discriminator": [
        179,
        47,
        64,
        136,
        27,
        7,
        40,
        189
      ],
      "accounts": [
        {
          "name": "userSourceOwner",
          "writable": true,
          "signer": true
        },
        {
          "name": "userFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "userSourceOwner"
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "programState",
          "writable": true
        },
        {
          "name": "basketConfig",
          "writable": true
        },
        {
          "name": "mintOut",
          "writable": true
        },
        {
          "name": "amm",
          "writable": true
        },
        {
          "name": "ammAuthority"
        },
        {
          "name": "ammOpenOrders",
          "writable": true
        },
        {
          "name": "ammCoinVault",
          "writable": true
        },
        {
          "name": "ammPcVault",
          "writable": true
        },
        {
          "name": "marketProgram"
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "marketBids",
          "writable": true
        },
        {
          "name": "marketAsks",
          "writable": true
        },
        {
          "name": "marketEventQueue",
          "writable": true
        },
        {
          "name": "marketCoinVault",
          "writable": true
        },
        {
          "name": "marketPcVault",
          "writable": true
        },
        {
          "name": "marketVaultSigner"
        },
        {
          "name": "userTokenSource",
          "writable": true
        },
        {
          "name": "vaultTokenDestination",
          "writable": true
        },
        {
          "name": "platformFeeTokenAccount",
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "ammProgram",
          "writable": true,
          "address": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxAmountIn",
          "type": "u64"
        },
        {
          "name": "amountOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyComponentCpmm",
      "discriminator": [
        115,
        78,
        207,
        10,
        209,
        37,
        153,
        204
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "programState",
          "writable": true
        },
        {
          "name": "basketConfig",
          "writable": true
        },
        {
          "name": "platformFeeTokenAccount",
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "authority",
          "writable": true
        },
        {
          "name": "ammConfig",
          "docs": [
            "The factory state to read protocol fees"
          ]
        },
        {
          "name": "poolState",
          "docs": [
            "The program account of the pool in which the swap will be performed"
          ],
          "writable": true
        },
        {
          "name": "userTokenSource",
          "docs": [
            "The user token account for input token"
          ],
          "writable": true
        },
        {
          "name": "vaultTokenDestination",
          "docs": [
            "The user token account for output token"
          ],
          "writable": true
        },
        {
          "name": "inputVault",
          "docs": [
            "The vault token account for input token"
          ],
          "writable": true
        },
        {
          "name": "outputVault",
          "docs": [
            "The vault token account for output token"
          ],
          "writable": true
        },
        {
          "name": "inputTokenProgram",
          "docs": [
            "SPL program for input token transfers: Token Program"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "outputTokenProgram",
          "docs": [
            "SPL program for output token transfers: Token or Token 2022 Program"
          ]
        },
        {
          "name": "inputTokenMint",
          "docs": [
            "The mint of input token"
          ]
        },
        {
          "name": "outputTokenMint",
          "docs": [
            "The mint of output token"
          ]
        },
        {
          "name": "observationState",
          "docs": [
            "The program account for the most recent oracle observation"
          ],
          "writable": true
        },
        {
          "name": "cpSwapProgram",
          "address": "CPMDWBwJDtYax9qW7AyRuVC19Cc4L4Vcy4n2BHAbHkCW"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxAmountIn",
          "type": "u64"
        },
        {
          "name": "amountOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "buyComponentClmm",
      "discriminator": [
        127,
        193,
        97,
        76,
        119,
        244,
        119,
        239
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "programState",
          "writable": true
        },
        {
          "name": "basketConfig",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "clmmProgram",
          "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
        },
        {
          "name": "platformFeeTokenAccount",
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "ammConfig",
          "docs": [
            "The factory state to read protocol fees"
          ]
        },
        {
          "name": "poolState",
          "docs": [
            "The program account of the pool in which the swap will be performed"
          ],
          "writable": true
        },
        {
          "name": "userTokenSource",
          "docs": [
            "The user token account for input token"
          ],
          "writable": true
        },
        {
          "name": "vaultTokenDestination",
          "docs": [
            "The user token account for output token"
          ],
          "writable": true
        },
        {
          "name": "inputVault",
          "docs": [
            "The vault token account for input token"
          ],
          "writable": true
        },
        {
          "name": "outputVault",
          "docs": [
            "The vault token account for output token"
          ],
          "writable": true
        },
        {
          "name": "observationState",
          "docs": [
            "The program account for the most recent oracle observation"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL program for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "tokenProgram2022",
          "docs": [
            "SPL program 2022 for token transfers"
          ],
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "memoProgram",
          "docs": [
            "memo program"
          ],
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "inputVaultMint",
          "docs": [
            "The mint of token vault 0"
          ]
        },
        {
          "name": "outputVaultMint",
          "docs": [
            "The mint of token vault 1"
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "otherAmountThreshold",
          "type": "u64"
        },
        {
          "name": "sqrtPriceLimitX64",
          "type": "u128"
        }
      ]
    },
    {
      "name": "createBasket",
      "discriminator": [
        47,
        105,
        155,
        148,
        15,
        169,
        202,
        211
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "programState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "basketConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "program_state.basket_counter",
                "account": "programState"
              }
            ]
          }
        },
        {
          "name": "basketMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "program_state.basket_counter",
                "account": "programState"
              }
            ]
          }
        },
        {
          "name": "metadataAccount",
          "docs": [
            "Metadata account to store Metaplex metadata"
          ],
          "writable": true
        },
        {
          "name": "metadataProgram",
          "docs": [
            "The Metaplex metadata program"
          ],
          "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "rent",
          "address": "SysvarRent111111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "args",
          "type": {
            "defined": {
              "name": "createBasketArgs"
            }
          }
        }
      ]
    },
    {
      "name": "executeRebalancing",
      "discriminator": [
        98,
        179,
        1,
        85,
        246,
        199,
        227,
        164
      ],
      "accounts": [
        {
          "name": "rebalancer",
          "writable": true,
          "signer": true
        },
        {
          "name": "basketConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "writable": true
        },
        {
          "name": "basketMint",
          "writable": true
        },
        {
          "name": "amm",
          "writable": true
        },
        {
          "name": "ammAuthority"
        },
        {
          "name": "ammOpenOrders",
          "writable": true
        },
        {
          "name": "ammCoinVault",
          "writable": true
        },
        {
          "name": "ammPcVault",
          "writable": true
        },
        {
          "name": "marketProgram"
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "marketBids",
          "writable": true
        },
        {
          "name": "marketAsks",
          "writable": true
        },
        {
          "name": "marketEventQueue",
          "writable": true
        },
        {
          "name": "marketCoinVault",
          "writable": true
        },
        {
          "name": "marketPcVault",
          "writable": true
        },
        {
          "name": "marketVaultSigner"
        },
        {
          "name": "vaultTokenSource",
          "writable": true
        },
        {
          "name": "vaultTokenDestination",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "ammProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "isBuy",
          "type": "bool"
        },
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "amountOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "executeRebalancingClmm",
      "discriminator": [
        12,
        132,
        199,
        198,
        129,
        253,
        73,
        197
      ],
      "accounts": [
        {
          "name": "rebalancer",
          "writable": true,
          "signer": true
        },
        {
          "name": "programState",
          "writable": true
        },
        {
          "name": "basketConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "tokenMint",
          "writable": true
        },
        {
          "name": "basketMint",
          "writable": true
        },
        {
          "name": "platformFeeTokenAccount",
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "clmmProgram",
          "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
        },
        {
          "name": "ammConfig",
          "docs": [
            "The factory state to read protocol fees"
          ]
        },
        {
          "name": "poolState",
          "docs": [
            "The program account of the pool in which the swap will be performed"
          ],
          "writable": true
        },
        {
          "name": "vaultTokenSource",
          "docs": [
            "The user token account for input token"
          ],
          "writable": true
        },
        {
          "name": "vaultTokenDestination",
          "docs": [
            "The user token account for output token"
          ],
          "writable": true
        },
        {
          "name": "inputVault",
          "docs": [
            "The vault token account for input token"
          ],
          "writable": true
        },
        {
          "name": "outputVault",
          "docs": [
            "The vault token account for output token"
          ],
          "writable": true
        },
        {
          "name": "observationState",
          "docs": [
            "The program account for the most recent oracle observation"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL program for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "tokenProgram2022",
          "docs": [
            "SPL program 2022 for token transfers"
          ],
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "memoProgram",
          "docs": [
            "memo program"
          ],
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "inputVaultMint",
          "docs": [
            "The mint of token vault 0"
          ]
        },
        {
          "name": "outputVaultMint",
          "docs": [
            "The mint of token vault 1"
          ]
        }
      ],
      "args": [
        {
          "name": "isBuy",
          "type": "bool"
        },
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "otherAmountThreshold",
          "type": "u64"
        },
        {
          "name": "sqrtPriceLimitX64",
          "type": "u128"
        }
      ]
    },
    {
      "name": "initialize",
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "programState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "mintBasketToken",
      "discriminator": [
        190,
        65,
        196,
        32,
        108,
        156,
        87,
        42
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "basketConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "userFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "basketMint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116,
                  95,
                  109,
                  105,
                  110,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "userBasketTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "redeemBasketToken",
      "discriminator": [
        207,
        105,
        72,
        188,
        12,
        33,
        217,
        21
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "programState",
          "writable": true
        },
        {
          "name": "basketConfig",
          "writable": true
        },
        {
          "name": "userFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "basketMint",
          "writable": true
        },
        {
          "name": "userBasketTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sellComponent",
      "discriminator": [
        160,
        26,
        212,
        127,
        72,
        245,
        31,
        89
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "programState",
          "writable": true
        },
        {
          "name": "basketConfig",
          "writable": true
        },
        {
          "name": "basketMint",
          "writable": true
        },
        {
          "name": "mintIn",
          "writable": true
        },
        {
          "name": "amm",
          "writable": true
        },
        {
          "name": "ammAuthority"
        },
        {
          "name": "ammOpenOrders",
          "writable": true
        },
        {
          "name": "ammCoinVault",
          "writable": true
        },
        {
          "name": "ammPcVault",
          "writable": true
        },
        {
          "name": "marketProgram"
        },
        {
          "name": "market",
          "writable": true
        },
        {
          "name": "marketBids",
          "writable": true
        },
        {
          "name": "marketAsks",
          "writable": true
        },
        {
          "name": "marketEventQueue",
          "writable": true
        },
        {
          "name": "marketCoinVault",
          "writable": true
        },
        {
          "name": "marketPcVault",
          "writable": true
        },
        {
          "name": "marketVaultSigner"
        },
        {
          "name": "vaultTokenSource",
          "writable": true
        },
        {
          "name": "userTokenDestination",
          "writable": true
        },
        {
          "name": "platformFeeTokenAccount",
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "ammProgram"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amountIn",
          "type": "u64"
        },
        {
          "name": "minimumAmountOut",
          "type": "u64"
        }
      ]
    },
    {
      "name": "sellComponentClmm",
      "discriminator": [
        32,
        156,
        82,
        195,
        145,
        199,
        215,
        229
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "userFund",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  115,
                  101,
                  114,
                  95,
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "programState",
          "writable": true
        },
        {
          "name": "basketConfig",
          "writable": true
        },
        {
          "name": "basketMint",
          "writable": true
        },
        {
          "name": "clmmProgram",
          "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK"
        },
        {
          "name": "platformFeeTokenAccount",
          "writable": true
        },
        {
          "name": "creatorTokenAccount",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "ammConfig",
          "docs": [
            "The factory state to read protocol fees"
          ]
        },
        {
          "name": "poolState",
          "docs": [
            "The program account of the pool in which the swap will be performed"
          ],
          "writable": true
        },
        {
          "name": "userTokenDestination",
          "docs": [
            "The user token account for input token"
          ],
          "writable": true
        },
        {
          "name": "vaultTokenSource",
          "docs": [
            "The user token account for output token"
          ],
          "writable": true
        },
        {
          "name": "inputVault",
          "docs": [
            "The vault token account for input token"
          ],
          "writable": true
        },
        {
          "name": "outputVault",
          "docs": [
            "The vault token account for output token"
          ],
          "writable": true
        },
        {
          "name": "observationState",
          "docs": [
            "The program account for the most recent oracle observation"
          ],
          "writable": true
        },
        {
          "name": "tokenProgram",
          "docs": [
            "SPL program for token transfers"
          ],
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "tokenProgram2022",
          "docs": [
            "SPL program 2022 for token transfers"
          ],
          "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"
        },
        {
          "name": "memoProgram",
          "docs": [
            "memo program"
          ],
          "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
        },
        {
          "name": "inputVaultMint",
          "docs": [
            "The mint of token vault 0"
          ]
        },
        {
          "name": "outputVaultMint",
          "docs": [
            "The mint of token vault 1"
          ]
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        },
        {
          "name": "otherAmountThreshold",
          "type": "u64"
        },
        {
          "name": "sqrtPriceLimitX64",
          "type": "u128"
        }
      ]
    },
    {
      "name": "startRebalancing",
      "discriminator": [
        146,
        134,
        168,
        104,
        170,
        132,
        60,
        112
      ],
      "accounts": [
        {
          "name": "rebalancer",
          "writable": true,
          "signer": true
        },
        {
          "name": "basketConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "stopRebalancing",
      "discriminator": [
        41,
        2,
        239,
        161,
        123,
        114,
        189,
        181
      ],
      "accounts": [
        {
          "name": "rebalancer",
          "writable": true,
          "signer": true
        },
        {
          "name": "programState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "vaultWrappedSol",
          "writable": true
        },
        {
          "name": "wrappedSolMint",
          "writable": true
        },
        {
          "name": "basketConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "transferAdmin",
      "discriminator": [
        42,
        242,
        66,
        106,
        228,
        10,
        111,
        156
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "programState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newAdmin",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateFee",
      "discriminator": [
        232,
        253,
        195,
        247,
        148,
        212,
        73,
        222
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "programState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newCreatorFeePercentage",
          "type": {
            "option": "u64"
          }
        },
        {
          "name": "newPlatformFeePercentage",
          "type": {
            "option": "u64"
          }
        }
      ]
    },
    {
      "name": "updatePlatformFeeWallet",
      "discriminator": [
        135,
        108,
        214,
        52,
        224,
        155,
        54,
        136
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "programState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newPlatformFeeWallet",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "updateRebalanceMargin",
      "discriminator": [
        230,
        223,
        85,
        5,
        40,
        87,
        87,
        193
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "programState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  114,
                  111,
                  103,
                  114,
                  97,
                  109,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              }
            ]
          }
        }
      ],
      "args": [
        {
          "name": "newMargin",
          "type": "u64"
        }
      ]
    },
    {
      "name": "updateRebalancer",
      "discriminator": [
        206,
        187,
        54,
        228,
        145,
        8,
        203,
        111
      ],
      "accounts": [
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "basketConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  97,
                  115,
                  107,
                  101,
                  116,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              },
              {
                "kind": "account",
                "path": "basket_config.id",
                "account": "basketConfig"
              }
            ]
          }
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "newRebalancer",
          "type": "pubkey"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "ammConfig",
      "discriminator": [
        218,
        244,
        33,
        104,
        203,
        203,
        43,
        111
      ]
    },
    {
      "name": "basketConfig",
      "discriminator": [
        123,
        225,
        246,
        146,
        67,
        165,
        253,
        202
      ]
    },
    {
      "name": "observationState",
      "discriminator": [
        122,
        174,
        197,
        53,
        129,
        9,
        165,
        132
      ]
    },
    {
      "name": "poolState",
      "discriminator": [
        247,
        237,
        227,
        245,
        215,
        195,
        222,
        70
      ]
    },
    {
      "name": "programState",
      "discriminator": [
        77,
        209,
        137,
        229,
        149,
        67,
        167,
        230
      ]
    },
    {
      "name": "userFund",
      "discriminator": [
        11,
        55,
        142,
        181,
        228,
        65,
        176,
        30
      ]
    }
  ],
  "events": [
    {
      "name": "buyComponentClmmEvent",
      "discriminator": [
        225,
        145,
        103,
        197,
        71,
        109,
        221,
        255
      ]
    },
    {
      "name": "buyComponentEvent",
      "discriminator": [
        106,
        51,
        6,
        122,
        76,
        188,
        216,
        61
      ]
    },
    {
      "name": "createBasketEvent",
      "discriminator": [
        131,
        144,
        156,
        230,
        81,
        139,
        96,
        55
      ]
    },
    {
      "name": "executeRebalancingClmmEvent",
      "discriminator": [
        152,
        132,
        253,
        68,
        214,
        188,
        138,
        112
      ]
    },
    {
      "name": "executeRebalancingEvent",
      "discriminator": [
        140,
        52,
        83,
        126,
        197,
        196,
        44,
        246
      ]
    },
    {
      "name": "mintBasketTokenEvent",
      "discriminator": [
        169,
        147,
        57,
        132,
        213,
        205,
        138,
        248
      ]
    },
    {
      "name": "redeemBasketTokenEvent",
      "discriminator": [
        157,
        112,
        230,
        146,
        69,
        114,
        243,
        112
      ]
    },
    {
      "name": "sellComponentClmmEvent",
      "discriminator": [
        8,
        67,
        30,
        160,
        240,
        184,
        212,
        234
      ]
    },
    {
      "name": "sellComponentEvent",
      "discriminator": [
        132,
        30,
        110,
        172,
        201,
        76,
        229,
        226
      ]
    },
    {
      "name": "startRebalancingEvent",
      "discriminator": [
        72,
        89,
        161,
        96,
        70,
        251,
        141,
        44
      ]
    },
    {
      "name": "stopRebalancingEvent",
      "discriminator": [
        148,
        220,
        225,
        189,
        239,
        78,
        244,
        112
      ]
    },
    {
      "name": "transferAdminEvent",
      "discriminator": [
        183,
        79,
        12,
        111,
        236,
        250,
        14,
        10
      ]
    },
    {
      "name": "transferBasketEvent",
      "discriminator": [
        82,
        4,
        62,
        5,
        36,
        38,
        192,
        114
      ]
    },
    {
      "name": "updateFeeEvent",
      "discriminator": [
        79,
        79,
        188,
        14,
        247,
        41,
        59,
        187
      ]
    },
    {
      "name": "updateMaxRebalanceMarginEvent",
      "discriminator": [
        5,
        89,
        213,
        109,
        67,
        201,
        59,
        195
      ]
    },
    {
      "name": "updatePlatformFeeWalletEvent",
      "discriminator": [
        202,
        159,
        195,
        220,
        101,
        33,
        224,
        24
      ]
    },
    {
      "name": "updateRebalancerEvent",
      "discriminator": [
        229,
        233,
        159,
        66,
        82,
        132,
        153,
        70
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "You are not authorized to perform this action."
    },
    {
      "code": 6001,
      "name": "programInitialized",
      "msg": "Program initialized"
    },
    {
      "code": 6002,
      "name": "invalidInitializeAdminAddress",
      "msg": "Invalid initialized admin address"
    },
    {
      "code": 6003,
      "name": "rebalancerNotFound",
      "msg": "Can't found rebalancer info."
    },
    {
      "code": 6004,
      "name": "invalidFee",
      "msg": "Invalid fee"
    },
    {
      "code": 6005,
      "name": "maxAssetsExceeded",
      "msg": "Max asset exceeded"
    },
    {
      "code": 6006,
      "name": "invalidBasket",
      "msg": "Invalid Basket"
    },
    {
      "code": 6007,
      "name": "insufficientBalance",
      "msg": "Insufficient Balance"
    },
    {
      "code": 6008,
      "name": "invalidAmount",
      "msg": "Invalid Amount"
    },
    {
      "code": 6009,
      "name": "componentNotFound",
      "msg": "Component not found"
    },
    {
      "code": 6010,
      "name": "notInRebalancing",
      "msg": "Not in rebalancing"
    },
    {
      "code": 6011,
      "name": "alreadyRebalancing",
      "msg": "Already rebalancing"
    },
    {
      "code": 6012,
      "name": "invalidMargin",
      "msg": "Invalid margin value"
    },
    {
      "code": 6013,
      "name": "invalidMarginBottom",
      "msg": "Margin value for bottom exceeds the allowed limit"
    },
    {
      "code": 6014,
      "name": "conversionFailure",
      "msg": "Conversion to u64 failed with an overflow or underflow"
    }
  ],
  "types": [
    {
      "name": "ammConfig",
      "docs": [
        "Holds the current owner of the factory"
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "Bump to identify PDA"
            ],
            "type": "u8"
          },
          {
            "name": "index",
            "type": "u16"
          },
          {
            "name": "owner",
            "docs": [
              "Address of the protocol owner"
            ],
            "type": "pubkey"
          },
          {
            "name": "protocolFeeRate",
            "docs": [
              "The protocol fee"
            ],
            "type": "u32"
          },
          {
            "name": "tradeFeeRate",
            "docs": [
              "The trade fee, denominated in hundredths of a bip (10^-6)"
            ],
            "type": "u32"
          },
          {
            "name": "tickSpacing",
            "docs": [
              "The tick spacing"
            ],
            "type": "u16"
          },
          {
            "name": "fundFeeRate",
            "docs": [
              "The fund fee, denominated in hundredths of a bip (10^-6)"
            ],
            "type": "u32"
          },
          {
            "name": "paddingU32",
            "type": "u32"
          },
          {
            "name": "fundOwner",
            "type": "pubkey"
          },
          {
            "name": "padding",
            "type": {
              "array": [
                "u64",
                3
              ]
            }
          }
        ]
      }
    },
    {
      "name": "basketComponent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "quantityInSysDecimal",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "basketConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "id",
            "type": "u64"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "rebalancer",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "isRebalancing",
            "type": "bool"
          },
          {
            "name": "components",
            "type": {
              "vec": {
                "defined": {
                  "name": "basketComponent"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "buyComponentClmmEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "buyComponentEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "createBasketArgs",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "components",
            "type": {
              "vec": {
                "defined": {
                  "name": "basketComponent"
                }
              }
            }
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "rebalancer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "createBasketEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "symbol",
            "type": "string"
          },
          {
            "name": "uri",
            "type": "string"
          },
          {
            "name": "creator",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "components",
            "type": {
              "vec": {
                "defined": {
                  "name": "basketComponent"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "executeRebalancingClmmEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "basketMint",
            "type": "pubkey"
          },
          {
            "name": "isBuy",
            "type": "bool"
          },
          {
            "name": "initialSourceBalance",
            "type": "u64"
          },
          {
            "name": "initialDestinationBalance",
            "type": "u64"
          },
          {
            "name": "finalSourceBalance",
            "type": "u64"
          },
          {
            "name": "finalDestinationBalance",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "executeRebalancingEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "basketMint",
            "type": "pubkey"
          },
          {
            "name": "isBuy",
            "type": "bool"
          },
          {
            "name": "initialSourceBalance",
            "type": "u64"
          },
          {
            "name": "initialDestinationBalance",
            "type": "u64"
          },
          {
            "name": "finalSourceBalance",
            "type": "u64"
          },
          {
            "name": "finalDestinationBalance",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "mintBasketTokenEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "basketMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "observation",
      "docs": [
        "The element of observations in ObservationState"
      ],
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "blockTimestamp",
            "docs": [
              "The block timestamp of the observation"
            ],
            "type": "u32"
          },
          {
            "name": "sqrtPriceX64",
            "docs": [
              "the price of the observation timestamp, Q64.64"
            ],
            "type": "u128"
          },
          {
            "name": "cumulativeTimePriceX64",
            "docs": [
              "the cumulative of price during the duration time, Q64.64"
            ],
            "type": "u128"
          },
          {
            "name": "padding",
            "docs": [
              "padding for feature update"
            ],
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "observationState",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "initialized",
            "docs": [
              "Whether the ObservationState is initialized"
            ],
            "type": "bool"
          },
          {
            "name": "poolId",
            "type": "pubkey"
          },
          {
            "name": "observations",
            "docs": [
              "observation array"
            ],
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "observation"
                  }
                },
                1000
              ]
            }
          },
          {
            "name": "padding",
            "docs": [
              "padding for feature update"
            ],
            "type": {
              "array": [
                "u128",
                5
              ]
            }
          }
        ]
      }
    },
    {
      "name": "poolState",
      "docs": [
        "The pool state",
        "",
        "PDA of `[POOL_SEED, config, token_mint_0, token_mint_1]`",
        ""
      ],
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "docs": [
              "Bump to identify PDA"
            ],
            "type": {
              "array": [
                "u8",
                1
              ]
            }
          },
          {
            "name": "ammConfig",
            "type": "pubkey"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "tokenMint0",
            "docs": [
              "Token pair of the pool, where token_mint_0 address < token_mint_1 address"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenMint1",
            "type": "pubkey"
          },
          {
            "name": "tokenVault0",
            "docs": [
              "Token pair vault"
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenVault1",
            "type": "pubkey"
          },
          {
            "name": "observationKey",
            "docs": [
              "observation account key"
            ],
            "type": "pubkey"
          },
          {
            "name": "mintDecimals0",
            "docs": [
              "mint0 and mint1 decimals"
            ],
            "type": "u8"
          },
          {
            "name": "mintDecimals1",
            "type": "u8"
          },
          {
            "name": "tickSpacing",
            "docs": [
              "The minimum number of ticks between initialized ticks"
            ],
            "type": "u16"
          },
          {
            "name": "liquidity",
            "docs": [
              "The currently in range liquidity available to the pool."
            ],
            "type": "u128"
          },
          {
            "name": "sqrtPriceX64",
            "docs": [
              "The current price of the pool as a sqrt(token_1/token_0) Q64.64 value"
            ],
            "type": "u128"
          },
          {
            "name": "tickCurrent",
            "docs": [
              "The current tick of the pool, i.e. according to the last tick transition that was run."
            ],
            "type": "i32"
          },
          {
            "name": "observationIndex",
            "docs": [
              "the most-recently updated index of the observations array"
            ],
            "type": "u16"
          },
          {
            "name": "observationUpdateDuration",
            "type": "u16"
          },
          {
            "name": "feeGrowthGlobal0X64",
            "docs": [
              "The fee growth as a Q64.64 number, i.e. fees of token_0 and token_1 collected per",
              "unit of liquidity for the entire life of the pool."
            ],
            "type": "u128"
          },
          {
            "name": "feeGrowthGlobal1X64",
            "type": "u128"
          },
          {
            "name": "protocolFeesToken0",
            "docs": [
              "The amounts of token_0 and token_1 that are owed to the protocol."
            ],
            "type": "u64"
          },
          {
            "name": "protocolFeesToken1",
            "type": "u64"
          },
          {
            "name": "swapInAmountToken0",
            "docs": [
              "The amounts in and out of swap token_0 and token_1"
            ],
            "type": "u128"
          },
          {
            "name": "swapOutAmountToken1",
            "type": "u128"
          },
          {
            "name": "swapInAmountToken1",
            "type": "u128"
          },
          {
            "name": "swapOutAmountToken0",
            "type": "u128"
          },
          {
            "name": "status",
            "docs": [
              "Bitwise representation of the state of the pool",
              "bit0, 1: disable open position and increase liquidity, 0: normal",
              "bit1, 1: disable decrease liquidity, 0: normal",
              "bit2, 1: disable collect fee, 0: normal",
              "bit3, 1: disable collect reward, 0: normal",
              "bit4, 1: disable swap, 0: normal"
            ],
            "type": "u8"
          },
          {
            "name": "padding",
            "docs": [
              "Leave blank for future use"
            ],
            "type": {
              "array": [
                "u8",
                7
              ]
            }
          },
          {
            "name": "rewardInfos",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "rewardInfo"
                  }
                },
                3
              ]
            }
          },
          {
            "name": "tickArrayBitmap",
            "docs": [
              "Packed initialized tick array state"
            ],
            "type": {
              "array": [
                "u64",
                16
              ]
            }
          },
          {
            "name": "totalFeesToken0",
            "docs": [
              "except protocol_fee and fund_fee"
            ],
            "type": "u64"
          },
          {
            "name": "totalFeesClaimedToken0",
            "docs": [
              "except protocol_fee and fund_fee"
            ],
            "type": "u64"
          },
          {
            "name": "totalFeesToken1",
            "type": "u64"
          },
          {
            "name": "totalFeesClaimedToken1",
            "type": "u64"
          },
          {
            "name": "fundFeesToken0",
            "type": "u64"
          },
          {
            "name": "fundFeesToken1",
            "type": "u64"
          },
          {
            "name": "openTime",
            "type": "u64"
          },
          {
            "name": "padding1",
            "type": {
              "array": [
                "u64",
                25
              ]
            }
          },
          {
            "name": "padding2",
            "type": {
              "array": [
                "u64",
                32
              ]
            }
          }
        ]
      }
    },
    {
      "name": "programState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "platformFeeWallet",
            "type": "pubkey"
          },
          {
            "name": "basketCounter",
            "type": "u64"
          },
          {
            "name": "rebalanceMarginLamports",
            "type": "u64"
          },
          {
            "name": "creatorFeePercentage",
            "type": "u64"
          },
          {
            "name": "platformFeePercentage",
            "type": "u64"
          },
          {
            "name": "enableCreator",
            "type": "bool"
          },
          {
            "name": "isInitialized",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "redeemBasketTokenEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "basketMint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "rewardInfo",
      "serialization": "bytemuckunsafe",
      "repr": {
        "kind": "c",
        "packed": true
      },
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "rewardState",
            "docs": [
              "Reward state"
            ],
            "type": "u8"
          },
          {
            "name": "openTime",
            "docs": [
              "Reward open time"
            ],
            "type": "u64"
          },
          {
            "name": "endTime",
            "docs": [
              "Reward end time"
            ],
            "type": "u64"
          },
          {
            "name": "lastUpdateTime",
            "docs": [
              "Reward last update time"
            ],
            "type": "u64"
          },
          {
            "name": "emissionsPerSecondX64",
            "docs": [
              "Q64.64 number indicates how many tokens per second are earned per unit of liquidity."
            ],
            "type": "u128"
          },
          {
            "name": "rewardTotalEmissioned",
            "docs": [
              "The total amount of reward emissioned"
            ],
            "type": "u64"
          },
          {
            "name": "rewardClaimed",
            "docs": [
              "The total amount of claimed reward"
            ],
            "type": "u64"
          },
          {
            "name": "tokenMint",
            "docs": [
              "Reward token mint."
            ],
            "type": "pubkey"
          },
          {
            "name": "tokenVault",
            "docs": [
              "Reward vault token account."
            ],
            "type": "pubkey"
          },
          {
            "name": "authority",
            "docs": [
              "The owner that has permission to set reward param"
            ],
            "type": "pubkey"
          },
          {
            "name": "rewardGrowthGlobalX64",
            "docs": [
              "Q64.64 number that tracks the total tokens earned per unit of liquidity since the reward",
              "emissions were turned on."
            ],
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "sellComponentClmmEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "sellComponentEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "startRebalancingEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "stopRebalancingEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "components",
            "type": {
              "vec": {
                "defined": {
                  "name": "basketComponent"
                }
              }
            }
          },
          {
            "name": "timestamp",
            "type": "i64"
          }
        ]
      }
    },
    {
      "name": "transferAdminEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "oldAdmin",
            "type": "pubkey"
          },
          {
            "name": "newAdmin",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "transferBasketEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "basketMint",
            "type": "pubkey"
          },
          {
            "name": "oldCreator",
            "type": "pubkey"
          },
          {
            "name": "newCreator",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "updateFeeEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newCreatorFeePercentage",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "newPlatformFeePercentage",
            "type": {
              "option": "u64"
            }
          }
        ]
      }
    },
    {
      "name": "updateMaxRebalanceMarginEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newMargin",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "updatePlatformFeeWalletEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newPlatformFeeWallet",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "updateRebalancerEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "basketId",
            "type": "u64"
          },
          {
            "name": "oldRebalancer",
            "type": "pubkey"
          },
          {
            "name": "newRebalancer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "userComponent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "userFund",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "components",
            "type": {
              "vec": {
                "defined": {
                  "name": "userComponent"
                }
              }
            }
          }
        ]
      }
    }
  ]
};
