/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pie.json`.
 */
export type Pie = {
  "address": "GkkuKbHCeiUZQX4yGpDqQktfG92WSdjRiP7nqkh9gG9W",
  "metadata": {
    "name": "pie",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "addRebalancer",
      "discriminator": [
        129,
        213,
        114,
        48,
        6,
        140,
        208,
        11
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "rebalancerState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  98,
                  97,
                  108,
                  97,
                  110,
                  99,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "rebalancer"
              }
            ]
          }
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  97,
                  100,
                  109,
                  105,
                  110,
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
          "name": "rebalancer",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "createIndexFundVault",
      "discriminator": [
        203,
        243,
        38,
        17,
        100,
        44,
        52,
        174
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "indexFundConfig",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  102,
                  117,
                  110,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "indexFundMint"
              }
            ]
          }
        },
        {
          "name": "indexFundMint",
          "writable": true,
          "signer": true
        },
        {
          "name": "metadataAccount",
          "docs": [
            "To store metaplex metadata"
          ],
          "writable": true
        },
        {
          "name": "metadataProgram",
          "docs": [
            "Program to create NFT metadata"
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
          "name": "underlyAssets",
          "type": {
            "vec": {
              "defined": {
                "name": "underlyAsset"
              }
            }
          }
        }
      ]
    },
    {
      "name": "deleteRebalancer",
      "discriminator": [
        132,
        217,
        124,
        141,
        200,
        18,
        138,
        51
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "rebalancerState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  114,
                  101,
                  98,
                  97,
                  108,
                  97,
                  110,
                  99,
                  101,
                  114,
                  95,
                  115,
                  116,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "arg",
                "path": "rebalancer"
              }
            ]
          }
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
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
          "name": "rebalancer",
          "type": "pubkey"
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
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
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
      "name": "swapUnderlyAsset",
      "discriminator": [
        116,
        173,
        105,
        158,
        132,
        199,
        239,
        76
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
                  114
                ]
              },
              {
                "kind": "account",
                "path": "userSourceOwner"
              },
              {
                "kind": "account",
                "path": "indexFundConfig"
              }
            ]
          }
        },
        {
          "name": "config",
          "writable": true
        },
        {
          "name": "indexFundConfig",
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
          "name": "vaultTokenAccount",
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
        },
        {
          "name": "indexMint",
          "writable": true
        },
        {
          "name": "userIndexToken",
          "writable": true
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
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
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
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "indexFundConfig",
      "discriminator": [
        222,
        31,
        187,
        7,
        113,
        240,
        222,
        204
      ]
    },
    {
      "name": "rebalancerState",
      "discriminator": [
        63,
        210,
        4,
        138,
        3,
        220,
        212,
        209
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
  "errors": [
    {
      "code": 6000,
      "name": "unauthorized",
      "msg": "You are not authorized to perform this action."
    },
    {
      "code": 6001,
      "name": "rebalancerNotFound",
      "msg": "Can't found rebalancer info."
    },
    {
      "code": 6002,
      "name": "maxAssetsExceeded",
      "msg": "Max asset exceeded"
    },
    {
      "code": 6003,
      "name": "insufficientBalance",
      "msg": "Insufficient Balance"
    },
    {
      "code": 6004,
      "name": "invalidAmount",
      "msg": "Invalid Amount"
    }
  ],
  "types": [
    {
      "name": "config",
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
            "name": "counter",
            "type": "u32"
          }
        ]
      }
    },
    {
      "name": "indexFundConfig",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "id",
            "type": "u32"
          },
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "underlyAssets",
            "type": {
              "vec": {
                "defined": {
                  "name": "underlyAsset"
                }
              }
            }
          }
        ]
      }
    },
    {
      "name": "rebalancerState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "balancer",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "underlyAsset",
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
            "name": "assetInfo",
            "type": {
              "vec": {
                "defined": {
                  "name": "underlyAsset"
                }
              }
            }
          }
        ]
      }
    }
  ]
};
