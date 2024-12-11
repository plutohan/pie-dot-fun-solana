/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pie.json`.
 */
export type Pie = {
  "address": "BFxEd1UCCxQZR4KVnmzFtKQ95WZoxRCu6irHoQjFvSCo",
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
          "name": "ammProgram"
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
            "To store Metaplex metadata"
          ],
          "writable": true
        },
        {
          "name": "metadataProgram",
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
          "name": "newMintRedeemFeePercentage",
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
      "name": "basketComponent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "ratio",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
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
            "name": "isRebalancing",
            "type": "bool"
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
            "name": "mintRedeemFeePercentage",
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
            "name": "newMintRedeemFeePercentage",
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
