/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/pie.json`.
 */
export type Pie = {
    "address": "QA12DT3Hhf9Bngfox4zgctb7129VQUnuCtMK7mB9B1h";
    "metadata": {
        "name": "pie";
        "version": "0.1.0";
        "spec": "0.1.0";
        "description": "Created with Anchor";
    };
    "instructions": [
        {
            "name": "buyComponent";
            "discriminator": [
                179,
                47,
                64,
                136,
                27,
                7,
                40,
                189
            ];
            "accounts": [
                {
                    "name": "userSourceOwner";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "userFund";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "userSourceOwner";
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "amm";
                    "writable": true;
                },
                {
                    "name": "ammAuthority";
                },
                {
                    "name": "ammOpenOrders";
                    "writable": true;
                },
                {
                    "name": "ammCoinVault";
                    "writable": true;
                },
                {
                    "name": "ammPcVault";
                    "writable": true;
                },
                {
                    "name": "marketProgram";
                },
                {
                    "name": "market";
                    "writable": true;
                },
                {
                    "name": "marketBids";
                    "writable": true;
                },
                {
                    "name": "marketAsks";
                    "writable": true;
                },
                {
                    "name": "marketEventQueue";
                    "writable": true;
                },
                {
                    "name": "marketCoinVault";
                    "writable": true;
                },
                {
                    "name": "marketPcVault";
                    "writable": true;
                },
                {
                    "name": "marketVaultSigner";
                },
                {
                    "name": "userTokenSource";
                    "writable": true;
                },
                {
                    "name": "vaultTokenDestinationMint";
                },
                {
                    "name": "vaultTokenDestination";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenDestinationMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "platformFeeTokenAccount";
                    "writable": true;
                },
                {
                    "name": "creatorTokenAccount";
                    "writable": true;
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "ammProgram";
                    "address": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "maxAmountIn";
                    "type": "u64";
                },
                {
                    "name": "amountOut";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "buyComponentClmm";
            "discriminator": [
                127,
                193,
                97,
                76,
                119,
                244,
                119,
                239
            ];
            "accounts": [
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "userFund";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                },
                {
                    "name": "clmmProgram";
                    "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK";
                },
                {
                    "name": "platformFeeTokenAccount";
                    "writable": true;
                },
                {
                    "name": "creatorTokenAccount";
                    "writable": true;
                },
                {
                    "name": "ammConfig";
                    "writable": true;
                },
                {
                    "name": "poolState";
                    "writable": true;
                },
                {
                    "name": "userTokenSourceMint";
                },
                {
                    "name": "userTokenSource";
                    "writable": true;
                },
                {
                    "name": "vaultTokenDestinationMint";
                },
                {
                    "name": "vaultTokenDestination";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "account";
                                "path": "outputTokenProgram";
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenDestinationMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "outputTokenProgram";
                    "docs": [
                        "SPL program for output token transfers: Token or Token 2022 Program"
                    ];
                },
                {
                    "name": "inputVault";
                    "docs": [
                        "The vault token account for input token"
                    ];
                    "writable": true;
                },
                {
                    "name": "outputVault";
                    "docs": [
                        "The vault token account for output token"
                    ];
                    "writable": true;
                },
                {
                    "name": "observationState";
                    "writable": true;
                },
                {
                    "name": "tokenProgram";
                    "docs": [
                        "SPL program for token transfers"
                    ];
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "tokenProgram2022";
                    "docs": [
                        "SPL program 2022 for token transfers"
                    ];
                    "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
                },
                {
                    "name": "memoProgram";
                    "docs": [
                        "memo program"
                    ];
                    "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
                }
            ];
            "args": [
                {
                    "name": "amount";
                    "type": "u64";
                },
                {
                    "name": "otherAmountThreshold";
                    "type": "u64";
                },
                {
                    "name": "sqrtPriceLimitX64";
                    "type": "u128";
                }
            ];
        },
        {
            "name": "buyComponentCpmm";
            "discriminator": [
                115,
                78,
                207,
                10,
                209,
                37,
                153,
                204
            ];
            "accounts": [
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "userFund";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "platformFeeTokenAccount";
                    "writable": true;
                },
                {
                    "name": "creatorTokenAccount";
                    "writable": true;
                },
                {
                    "name": "authority";
                    "writable": true;
                },
                {
                    "name": "ammConfig";
                    "docs": [
                        "The factory state to read protocol fees"
                    ];
                },
                {
                    "name": "poolState";
                    "docs": [
                        "The program account of the pool in which the swap will be performed"
                    ];
                    "writable": true;
                },
                {
                    "name": "userTokenSourceMint";
                },
                {
                    "name": "userTokenSource";
                    "writable": true;
                },
                {
                    "name": "vaultTokenDestinationMint";
                },
                {
                    "name": "vaultTokenDestination";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "account";
                                "path": "outputTokenProgram";
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenDestinationMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "inputVault";
                    "docs": [
                        "The vault token account for input token"
                    ];
                    "writable": true;
                },
                {
                    "name": "outputVault";
                    "docs": [
                        "The vault token account for output token"
                    ];
                    "writable": true;
                },
                {
                    "name": "inputTokenProgram";
                    "docs": [
                        "SPL program for input token transfers: Token Program"
                    ];
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "outputTokenProgram";
                    "docs": [
                        "SPL program for output token transfers: Token or Token 2022 Program"
                    ];
                },
                {
                    "name": "observationState";
                    "docs": [
                        "The program account for the most recent oracle observation"
                    ];
                    "writable": true;
                },
                {
                    "name": "cpSwapProgram";
                    "address": "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "maxAmountIn";
                    "type": "u64";
                },
                {
                    "name": "amountOut";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "createBasket";
            "discriminator": [
                47,
                105,
                155,
                148,
                15,
                169,
                202,
                211
            ];
            "accounts": [
                {
                    "name": "creator";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "program_state.basket_counter";
                                "account": "programState";
                            }
                        ];
                    };
                },
                {
                    "name": "basketMint";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "program_state.basket_counter";
                                "account": "programState";
                            }
                        ];
                    };
                },
                {
                    "name": "metadataAccount";
                    "docs": [
                        "Metadata account to store Metaplex metadata"
                    ];
                    "writable": true;
                },
                {
                    "name": "metadataProgram";
                    "docs": [
                        "The Metaplex metadata program"
                    ];
                    "address": "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                },
                {
                    "name": "rent";
                    "address": "SysvarRent111111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "args";
                    "type": {
                        "defined": {
                            "name": "createBasketArgs";
                        };
                    };
                }
            ];
        },
        {
            "name": "depositWsol";
            "discriminator": [
                8,
                4,
                29,
                95,
                138,
                193,
                86,
                132
            ];
            "accounts": [
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "userFund";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "userWsolAccount";
                    "writable": true;
                },
                {
                    "name": "vaultWsolAccount";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    155,
                                    136,
                                    87,
                                    254,
                                    171,
                                    129,
                                    132,
                                    251,
                                    104,
                                    127,
                                    99,
                                    70,
                                    24,
                                    192,
                                    53,
                                    218,
                                    196,
                                    57,
                                    220,
                                    26,
                                    235,
                                    59,
                                    85,
                                    152,
                                    160,
                                    240,
                                    0,
                                    0,
                                    0,
                                    0,
                                    1
                                ];
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "platformFeeTokenAccount";
                    "writable": true;
                },
                {
                    "name": "creatorTokenAccount";
                    "writable": true;
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "amount";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "executeRebalancing";
            "discriminator": [
                98,
                179,
                1,
                85,
                246,
                199,
                227,
                164
            ];
            "accounts": [
                {
                    "name": "rebalancer";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "basketMint";
                    "writable": true;
                },
                {
                    "name": "amm";
                    "writable": true;
                },
                {
                    "name": "ammAuthority";
                },
                {
                    "name": "ammOpenOrders";
                    "writable": true;
                },
                {
                    "name": "ammCoinVault";
                    "writable": true;
                },
                {
                    "name": "ammPcVault";
                    "writable": true;
                },
                {
                    "name": "marketProgram";
                },
                {
                    "name": "market";
                    "writable": true;
                },
                {
                    "name": "marketBids";
                    "writable": true;
                },
                {
                    "name": "marketAsks";
                    "writable": true;
                },
                {
                    "name": "marketEventQueue";
                    "writable": true;
                },
                {
                    "name": "marketCoinVault";
                    "writable": true;
                },
                {
                    "name": "marketPcVault";
                    "writable": true;
                },
                {
                    "name": "marketVaultSigner";
                },
                {
                    "name": "vaultTokenSourceMint";
                },
                {
                    "name": "vaultTokenSource";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenSourceMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "vaultTokenDestinationMint";
                },
                {
                    "name": "vaultTokenDestination";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenDestinationMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "ammProgram";
                    "address": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
                }
            ];
            "args": [
                {
                    "name": "isSwapBaseOut";
                    "type": "bool";
                },
                {
                    "name": "amountIn";
                    "type": "u64";
                },
                {
                    "name": "amountOut";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "executeRebalancingClmm";
            "discriminator": [
                12,
                132,
                199,
                198,
                129,
                253,
                73,
                197
            ];
            "accounts": [
                {
                    "name": "rebalancer";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "basketMint";
                    "writable": true;
                },
                {
                    "name": "clmmProgram";
                    "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK";
                },
                {
                    "name": "ammConfig";
                    "writable": true;
                },
                {
                    "name": "poolState";
                    "writable": true;
                },
                {
                    "name": "vaultTokenSourceMint";
                },
                {
                    "name": "vaultTokenSource";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "account";
                                "path": "inputTokenProgram";
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenSourceMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "vaultTokenDestinationMint";
                },
                {
                    "name": "vaultTokenDestination";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "account";
                                "path": "outputTokenProgram";
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenDestinationMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "inputTokenProgram";
                    "docs": [
                        "SPL program for input token transfers: Token or Token 2022 Program"
                    ];
                },
                {
                    "name": "outputTokenProgram";
                    "docs": [
                        "SPL program for output token transfers: Token or Token 2022 Program"
                    ];
                },
                {
                    "name": "inputVault";
                    "docs": [
                        "The vault token account for input token"
                    ];
                    "writable": true;
                },
                {
                    "name": "outputVault";
                    "docs": [
                        "The vault token account for output token"
                    ];
                    "writable": true;
                },
                {
                    "name": "observationState";
                    "writable": true;
                },
                {
                    "name": "tokenProgram";
                    "docs": [
                        "SPL program for token transfers"
                    ];
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "tokenProgram2022";
                    "docs": [
                        "SPL program 2022 for token transfers"
                    ];
                    "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
                },
                {
                    "name": "memoProgram";
                    "docs": [
                        "memo program"
                    ];
                    "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
                }
            ];
            "args": [
                {
                    "name": "isSwapBaseOut";
                    "type": "bool";
                },
                {
                    "name": "amount";
                    "type": "u64";
                },
                {
                    "name": "otherAmountThreshold";
                    "type": "u64";
                },
                {
                    "name": "sqrtPriceLimitX64";
                    "type": "u128";
                }
            ];
        },
        {
            "name": "executeRebalancingCpmm";
            "discriminator": [
                42,
                103,
                61,
                222,
                56,
                146,
                65,
                245
            ];
            "accounts": [
                {
                    "name": "rebalancer";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "basketMint";
                    "writable": true;
                },
                {
                    "name": "authority";
                    "writable": true;
                },
                {
                    "name": "ammConfig";
                    "docs": [
                        "The factory state to read protocol fees"
                    ];
                },
                {
                    "name": "poolState";
                    "docs": [
                        "The program account of the pool in which the swap will be performed"
                    ];
                    "writable": true;
                },
                {
                    "name": "vaultTokenSourceMint";
                },
                {
                    "name": "vaultTokenSource";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "account";
                                "path": "inputTokenProgram";
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenSourceMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "vaultTokenDestinationMint";
                },
                {
                    "name": "vaultTokenDestination";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "account";
                                "path": "outputTokenProgram";
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenDestinationMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "inputVault";
                    "docs": [
                        "The vault token account for input token"
                    ];
                    "writable": true;
                },
                {
                    "name": "outputVault";
                    "docs": [
                        "The vault token account for output token"
                    ];
                    "writable": true;
                },
                {
                    "name": "inputTokenProgram";
                    "docs": [
                        "SPL program for input token transfers"
                    ];
                },
                {
                    "name": "outputTokenProgram";
                    "docs": [
                        "SPL program for output token transfers"
                    ];
                },
                {
                    "name": "observationState";
                    "docs": [
                        "The program account for the most recent oracle observation"
                    ];
                    "writable": true;
                },
                {
                    "name": "cpSwapProgram";
                    "address": "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
                }
            ];
            "args": [
                {
                    "name": "isSwapBaseOut";
                    "type": "bool";
                },
                {
                    "name": "amountIn";
                    "type": "u64";
                },
                {
                    "name": "amountOut";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "initialize";
            "discriminator": [
                175,
                175,
                109,
                31,
                13,
                152,
                155,
                237
            ];
            "accounts": [
                {
                    "name": "initializer";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "initialAdmin";
                    "type": "pubkey";
                },
                {
                    "name": "initialCreator";
                    "type": "pubkey";
                },
                {
                    "name": "initialPlatformFeeWallet";
                    "type": "pubkey";
                },
                {
                    "name": "initialPlatformFeePercentage";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "mintBasketToken";
            "discriminator": [
                190,
                65,
                196,
                32,
                108,
                156,
                87,
                42
            ];
            "accounts": [
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "userFund";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "basketMint";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "userBasketTokenAccount";
                    "writable": true;
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "amount";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "redeemBasketToken";
            "discriminator": [
                207,
                105,
                72,
                188,
                12,
                33,
                217,
                21
            ];
            "accounts": [
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                },
                {
                    "name": "userFund";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "basketMint";
                    "writable": true;
                },
                {
                    "name": "userBasketTokenAccount";
                    "writable": true;
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "amount";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "sellComponent";
            "discriminator": [
                160,
                26,
                212,
                127,
                72,
                245,
                31,
                89
            ];
            "accounts": [
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "userFund";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                },
                {
                    "name": "basketMint";
                    "writable": true;
                },
                {
                    "name": "amm";
                    "writable": true;
                },
                {
                    "name": "ammAuthority";
                },
                {
                    "name": "ammOpenOrders";
                    "writable": true;
                },
                {
                    "name": "ammCoinVault";
                    "writable": true;
                },
                {
                    "name": "ammPcVault";
                    "writable": true;
                },
                {
                    "name": "marketProgram";
                },
                {
                    "name": "market";
                    "writable": true;
                },
                {
                    "name": "marketBids";
                    "writable": true;
                },
                {
                    "name": "marketAsks";
                    "writable": true;
                },
                {
                    "name": "marketEventQueue";
                    "writable": true;
                },
                {
                    "name": "marketCoinVault";
                    "writable": true;
                },
                {
                    "name": "marketPcVault";
                    "writable": true;
                },
                {
                    "name": "marketVaultSigner";
                },
                {
                    "name": "vaultTokenSourceMint";
                },
                {
                    "name": "vaultTokenSource";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenSourceMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "userTokenDestination";
                    "writable": true;
                },
                {
                    "name": "platformFeeTokenAccount";
                    "writable": true;
                },
                {
                    "name": "creatorTokenAccount";
                    "writable": true;
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "ammProgram";
                    "address": "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "amountIn";
                    "type": "u64";
                },
                {
                    "name": "minimumAmountOut";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "sellComponentClmm";
            "discriminator": [
                32,
                156,
                82,
                195,
                145,
                199,
                215,
                229
            ];
            "accounts": [
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "userFund";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "clmmProgram";
                    "address": "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK";
                },
                {
                    "name": "platformFeeTokenAccount";
                    "writable": true;
                },
                {
                    "name": "creatorTokenAccount";
                    "writable": true;
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                },
                {
                    "name": "ammConfig";
                    "writable": true;
                },
                {
                    "name": "poolState";
                    "writable": true;
                },
                {
                    "name": "vaultTokenSourceMint";
                },
                {
                    "name": "vaultTokenSource";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "account";
                                "path": "inputTokenProgram";
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenSourceMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "inputTokenProgram";
                },
                {
                    "name": "userTokenDestinationMint";
                },
                {
                    "name": "userTokenDestination";
                    "docs": [
                        "The user token account for input token"
                    ];
                    "writable": true;
                },
                {
                    "name": "inputVault";
                    "docs": [
                        "The vault token account for input token"
                    ];
                    "writable": true;
                },
                {
                    "name": "outputVault";
                    "docs": [
                        "The vault token account for output token"
                    ];
                    "writable": true;
                },
                {
                    "name": "observationState";
                    "writable": true;
                },
                {
                    "name": "tokenProgram";
                    "docs": [
                        "SPL program for token transfers"
                    ];
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "tokenProgram2022";
                    "docs": [
                        "SPL program 2022 for token transfers"
                    ];
                    "address": "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";
                },
                {
                    "name": "memoProgram";
                    "docs": [
                        "memo program"
                    ];
                    "address": "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";
                }
            ];
            "args": [
                {
                    "name": "amount";
                    "type": "u64";
                },
                {
                    "name": "otherAmountThreshold";
                    "type": "u64";
                },
                {
                    "name": "sqrtPriceLimitX64";
                    "type": "u128";
                }
            ];
        },
        {
            "name": "sellComponentCpmm";
            "discriminator": [
                11,
                116,
                40,
                242,
                74,
                48,
                254,
                95
            ];
            "accounts": [
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "userFund";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "programState";
                    "writable": true;
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                },
                {
                    "name": "basketMint";
                    "writable": true;
                },
                {
                    "name": "platformFeeTokenAccount";
                    "writable": true;
                },
                {
                    "name": "creatorTokenAccount";
                    "writable": true;
                },
                {
                    "name": "authority";
                    "writable": true;
                },
                {
                    "name": "ammConfig";
                    "docs": [
                        "The factory state to read protocol fees"
                    ];
                },
                {
                    "name": "poolState";
                    "docs": [
                        "The program account of the pool in which the swap will be performed"
                    ];
                    "writable": true;
                },
                {
                    "name": "vaultTokenSourceMint";
                },
                {
                    "name": "vaultTokenSource";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "account";
                                "path": "inputTokenProgram";
                            },
                            {
                                "kind": "account";
                                "path": "vaultTokenSourceMint";
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "userTokenDestinationMint";
                },
                {
                    "name": "userTokenDestination";
                    "docs": [
                        "The user token account for input token"
                    ];
                    "writable": true;
                },
                {
                    "name": "inputVault";
                    "docs": [
                        "The vault token account for input token"
                    ];
                    "writable": true;
                },
                {
                    "name": "outputVault";
                    "docs": [
                        "The vault token account for output token"
                    ];
                    "writable": true;
                },
                {
                    "name": "inputTokenProgram";
                    "docs": [
                        "SPL program for input token transfers: Token 2022 or Token"
                    ];
                },
                {
                    "name": "outputTokenProgram";
                    "docs": [
                        "SPL program for output token transfers: Token"
                    ];
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "observationState";
                    "docs": [
                        "The program account for the most recent oracle observation"
                    ];
                    "writable": true;
                },
                {
                    "name": "cpSwapProgram";
                    "address": "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "amountIn";
                    "type": "u64";
                },
                {
                    "name": "minimumAmountOut";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "startRebalancing";
            "discriminator": [
                146,
                134,
                168,
                104,
                170,
                132,
                60,
                112
            ];
            "accounts": [
                {
                    "name": "rebalancer";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                }
            ];
            "args": [];
        },
        {
            "name": "stopRebalancing";
            "discriminator": [
                41,
                2,
                239,
                161,
                123,
                114,
                189,
                181
            ];
            "accounts": [
                {
                    "name": "rebalancer";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                }
            ];
            "args": [];
        },
        {
            "name": "transferAdmin";
            "discriminator": [
                42,
                242,
                66,
                106,
                228,
                10,
                111,
                156
            ];
            "accounts": [
                {
                    "name": "admin";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "newAdmin";
                    "type": "pubkey";
                }
            ];
        },
        {
            "name": "transferBasket";
            "discriminator": [
                85,
                37,
                106,
                145,
                10,
                216,
                154,
                222
            ];
            "accounts": [
                {
                    "name": "currentCreator";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "newCreator";
                    "type": "pubkey";
                }
            ];
        },
        {
            "name": "updateFee";
            "discriminator": [
                232,
                253,
                195,
                247,
                148,
                212,
                73,
                222
            ];
            "accounts": [
                {
                    "name": "admin";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                }
            ];
            "args": [
                {
                    "name": "newCreatorFeePercentage";
                    "type": "u64";
                },
                {
                    "name": "newPlatformFeePercentage";
                    "type": "u64";
                }
            ];
        },
        {
            "name": "updatePlatformFeeWallet";
            "discriminator": [
                135,
                108,
                214,
                52,
                224,
                155,
                54,
                136
            ];
            "accounts": [
                {
                    "name": "admin";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                }
            ];
            "args": [
                {
                    "name": "newPlatformFeeWallet";
                    "type": "pubkey";
                }
            ];
        },
        {
            "name": "updateRebalancer";
            "discriminator": [
                206,
                187,
                54,
                228,
                145,
                8,
                203,
                111
            ];
            "accounts": [
                {
                    "name": "creator";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "newRebalancer";
                    "type": "pubkey";
                }
            ];
        },
        {
            "name": "updateWhitelistedCreators";
            "discriminator": [
                81,
                36,
                13,
                65,
                143,
                129,
                14,
                114
            ];
            "accounts": [
                {
                    "name": "admin";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "newWhitelistedCreators";
                    "type": {
                        "vec": "pubkey";
                    };
                }
            ];
        },
        {
            "name": "withdrawWsol";
            "discriminator": [
                120,
                47,
                248,
                213,
                169,
                214,
                118,
                5
            ];
            "accounts": [
                {
                    "name": "user";
                    "writable": true;
                    "signer": true;
                },
                {
                    "name": "programState";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            }
                        ];
                    };
                },
                {
                    "name": "userFund";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "user";
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "basketConfig";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "const";
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
                                ];
                            },
                            {
                                "kind": "account";
                                "path": "basket_config.id";
                                "account": "basketConfig";
                            }
                        ];
                    };
                },
                {
                    "name": "userWsolAccount";
                    "writable": true;
                },
                {
                    "name": "vaultWsolAccount";
                    "writable": true;
                    "pda": {
                        "seeds": [
                            {
                                "kind": "account";
                                "path": "basketConfig";
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    221,
                                    246,
                                    225,
                                    215,
                                    101,
                                    161,
                                    147,
                                    217,
                                    203,
                                    225,
                                    70,
                                    206,
                                    235,
                                    121,
                                    172,
                                    28,
                                    180,
                                    133,
                                    237,
                                    95,
                                    91,
                                    55,
                                    145,
                                    58,
                                    140,
                                    245,
                                    133,
                                    126,
                                    255,
                                    0,
                                    169
                                ];
                            },
                            {
                                "kind": "const";
                                "value": [
                                    6,
                                    155,
                                    136,
                                    87,
                                    254,
                                    171,
                                    129,
                                    132,
                                    251,
                                    104,
                                    127,
                                    99,
                                    70,
                                    24,
                                    192,
                                    53,
                                    218,
                                    196,
                                    57,
                                    220,
                                    26,
                                    235,
                                    59,
                                    85,
                                    152,
                                    160,
                                    240,
                                    0,
                                    0,
                                    0,
                                    0,
                                    1
                                ];
                            }
                        ];
                        "program": {
                            "kind": "const";
                            "value": [
                                140,
                                151,
                                37,
                                143,
                                78,
                                36,
                                137,
                                241,
                                187,
                                61,
                                16,
                                41,
                                20,
                                142,
                                13,
                                131,
                                11,
                                90,
                                19,
                                153,
                                218,
                                255,
                                16,
                                132,
                                4,
                                142,
                                123,
                                216,
                                219,
                                233,
                                248,
                                89
                            ];
                        };
                    };
                },
                {
                    "name": "platformFeeTokenAccount";
                    "writable": true;
                },
                {
                    "name": "creatorTokenAccount";
                    "writable": true;
                },
                {
                    "name": "tokenProgram";
                    "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
                },
                {
                    "name": "systemProgram";
                    "address": "11111111111111111111111111111111";
                }
            ];
            "args": [
                {
                    "name": "amount";
                    "type": "u64";
                }
            ];
        }
    ];
    "accounts": [
        {
            "name": "ammConfig";
            "discriminator": [
                218,
                244,
                33,
                104,
                203,
                203,
                43,
                111
            ];
        },
        {
            "name": "basketConfig";
            "discriminator": [
                123,
                225,
                246,
                146,
                67,
                165,
                253,
                202
            ];
        },
        {
            "name": "observationState";
            "discriminator": [
                122,
                174,
                197,
                53,
                129,
                9,
                165,
                132
            ];
        },
        {
            "name": "poolState";
            "discriminator": [
                247,
                237,
                227,
                245,
                215,
                195,
                222,
                70
            ];
        },
        {
            "name": "programState";
            "discriminator": [
                77,
                209,
                137,
                229,
                149,
                67,
                167,
                230
            ];
        },
        {
            "name": "userFund";
            "discriminator": [
                11,
                55,
                142,
                181,
                228,
                65,
                176,
                30
            ];
        }
    ];
    "events": [
        {
            "name": "buyComponentEvent";
            "discriminator": [
                106,
                51,
                6,
                122,
                76,
                188,
                216,
                61
            ];
        },
        {
            "name": "createBasketEvent";
            "discriminator": [
                131,
                144,
                156,
                230,
                81,
                139,
                96,
                55
            ];
        },
        {
            "name": "depositWsolEvent";
            "discriminator": [
                196,
                52,
                26,
                9,
                198,
                101,
                172,
                134
            ];
        },
        {
            "name": "executeRebalancingEvent";
            "discriminator": [
                140,
                52,
                83,
                126,
                197,
                196,
                44,
                246
            ];
        },
        {
            "name": "mintBasketTokenEvent";
            "discriminator": [
                169,
                147,
                57,
                132,
                213,
                205,
                138,
                248
            ];
        },
        {
            "name": "redeemBasketTokenEvent";
            "discriminator": [
                157,
                112,
                230,
                146,
                69,
                114,
                243,
                112
            ];
        },
        {
            "name": "sellComponentEvent";
            "discriminator": [
                132,
                30,
                110,
                172,
                201,
                76,
                229,
                226
            ];
        },
        {
            "name": "startRebalancingEvent";
            "discriminator": [
                72,
                89,
                161,
                96,
                70,
                251,
                141,
                44
            ];
        },
        {
            "name": "stopRebalancingEvent";
            "discriminator": [
                148,
                220,
                225,
                189,
                239,
                78,
                244,
                112
            ];
        },
        {
            "name": "transferAdminEvent";
            "discriminator": [
                183,
                79,
                12,
                111,
                236,
                250,
                14,
                10
            ];
        },
        {
            "name": "transferBasketEvent";
            "discriminator": [
                82,
                4,
                62,
                5,
                36,
                38,
                192,
                114
            ];
        },
        {
            "name": "updateFeeEvent";
            "discriminator": [
                79,
                79,
                188,
                14,
                247,
                41,
                59,
                187
            ];
        },
        {
            "name": "updatePlatformFeeWalletEvent";
            "discriminator": [
                202,
                159,
                195,
                220,
                101,
                33,
                224,
                24
            ];
        },
        {
            "name": "updateRebalancerEvent";
            "discriminator": [
                229,
                233,
                159,
                66,
                82,
                132,
                153,
                70
            ];
        },
        {
            "name": "updateWhitelistedCreatorsEvent";
            "discriminator": [
                213,
                44,
                255,
                22,
                202,
                153,
                136,
                63
            ];
        },
        {
            "name": "withdrawWsolEvent";
            "discriminator": [
                36,
                236,
                197,
                89,
                39,
                95,
                209,
                74
            ];
        }
    ];
    "errors": [
        {
            "code": 6000;
            "name": "unauthorized";
            "msg": "You are not authorized to perform this action.";
        },
        {
            "code": 6001;
            "name": "programInitialized";
            "msg": "Program initialized";
        },
        {
            "code": 6002;
            "name": "invalidFee";
            "msg": "Invalid fee";
        },
        {
            "code": 6003;
            "name": "maxAssetsExceeded";
            "msg": "Max asset exceeded";
        },
        {
            "code": 6004;
            "name": "insufficientBalance";
            "msg": "Insufficient Balance";
        },
        {
            "code": 6005;
            "name": "invalidBasket";
            "msg": "Invalid Basket";
        },
        {
            "code": 6006;
            "name": "invalidAmount";
            "msg": "Invalid Amount";
        },
        {
            "code": 6007;
            "name": "componentNotFound";
            "msg": "Component not found";
        },
        {
            "code": 6008;
            "name": "notInRebalancing";
            "msg": "Not in rebalancing";
        },
        {
            "code": 6009;
            "name": "alreadyRebalancing";
            "msg": "Already rebalancing";
        },
        {
            "code": 6010;
            "name": "conversionFailure";
            "msg": "Conversion to u64 failed with an overflow or underflow";
        },
        {
            "code": 6011;
            "name": "invalidBasketMint";
            "msg": "Invalid basket mint";
        },
        {
            "code": 6012;
            "name": "duplicateComponent";
            "msg": "Duplicate component";
        },
        {
            "code": 6013;
            "name": "invalidMint";
            "msg": "Invalid mint";
        },
        {
            "code": 6014;
            "name": "invalidComponentQuantity";
            "msg": "Invalid component quantity";
        },
        {
            "code": 6015;
            "name": "invalidQuantity";
            "msg": "Invalid quantity";
        },
        {
            "code": 6016;
            "name": "rebalancingInProgress";
            "msg": "Rebalancing in process";
        },
        {
            "code": 6017;
            "name": "invalidComponent";
            "msg": "Invalid component";
        },
        {
            "code": 6018;
            "name": "maxWhitelistedCreatorsExceeded";
            "msg": "Max whitelisted creators exceeded";
        },
        {
            "code": 6019;
            "name": "invalidTokenProgram";
            "msg": "Invalid token program";
        }
    ];
    "types": [
        {
            "name": "ammConfig";
            "docs": [
                "Holds the current owner of the factory"
            ];
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "bump";
                        "docs": [
                            "Bump to identify PDA"
                        ];
                        "type": "u8";
                    },
                    {
                        "name": "disableCreatePool";
                        "docs": [
                            "Status to control if new pool can be create"
                        ];
                        "type": "bool";
                    },
                    {
                        "name": "index";
                        "docs": [
                            "Config index"
                        ];
                        "type": "u16";
                    },
                    {
                        "name": "tradeFeeRate";
                        "docs": [
                            "The trade fee, denominated in hundredths of a bip (10^-6)"
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "protocolFeeRate";
                        "docs": [
                            "The protocol fee"
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "fundFeeRate";
                        "docs": [
                            "The fund fee, denominated in hundredths of a bip (10^-6)"
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "createPoolFee";
                        "docs": [
                            "Fee for create a new pool"
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "protocolOwner";
                        "docs": [
                            "Address of the protocol fee owner"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "fundOwner";
                        "docs": [
                            "Address of the fund fee owner"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "padding";
                        "docs": [
                            "padding"
                        ];
                        "type": {
                            "array": [
                                "u64",
                                16
                            ];
                        };
                    }
                ];
            };
        },
        {
            "name": "basketComponent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "quantityInSysDecimal";
                        "type": "u128";
                    }
                ];
            };
        },
        {
            "name": "basketConfig";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "bump";
                        "type": "u8";
                    },
                    {
                        "name": "id";
                        "type": "u64";
                    },
                    {
                        "name": "creator";
                        "type": "pubkey";
                    },
                    {
                        "name": "rebalancer";
                        "type": "pubkey";
                    },
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "isRebalancing";
                        "type": "bool";
                    },
                    {
                        "name": "components";
                        "type": {
                            "vec": {
                                "defined": {
                                    "name": "basketComponent";
                                };
                            };
                        };
                    }
                ];
            };
        },
        {
            "name": "buyComponentEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "createBasketArgs";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "components";
                        "type": {
                            "vec": {
                                "defined": {
                                    "name": "basketComponent";
                                };
                            };
                        };
                    },
                    {
                        "name": "name";
                        "type": "string";
                    },
                    {
                        "name": "symbol";
                        "type": "string";
                    },
                    {
                        "name": "uri";
                        "type": "string";
                    },
                    {
                        "name": "rebalancer";
                        "type": "pubkey";
                    }
                ];
            };
        },
        {
            "name": "createBasketEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "name";
                        "type": "string";
                    },
                    {
                        "name": "symbol";
                        "type": "string";
                    },
                    {
                        "name": "uri";
                        "type": "string";
                    },
                    {
                        "name": "creator";
                        "type": "pubkey";
                    },
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "components";
                        "type": {
                            "vec": {
                                "defined": {
                                    "name": "basketComponent";
                                };
                            };
                        };
                    }
                ];
            };
        },
        {
            "name": "depositWsolEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "executeRebalancingEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "basketMint";
                        "type": "pubkey";
                    },
                    {
                        "name": "inputMint";
                        "type": "pubkey";
                    },
                    {
                        "name": "outputMint";
                        "type": "pubkey";
                    },
                    {
                        "name": "isSwapBaseOut";
                        "type": "bool";
                    },
                    {
                        "name": "initialAvailableSourceBalance";
                        "type": "u64";
                    },
                    {
                        "name": "initialAvailableDestinationBalance";
                        "type": "u64";
                    },
                    {
                        "name": "finalAvailableSourceBalance";
                        "type": "u64";
                    },
                    {
                        "name": "finalAvailableDestinationBalance";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "mintBasketTokenEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "basketMint";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "observation";
            "docs": [
                "The element of observations in ObservationState"
            ];
            "serialization": "bytemuckunsafe";
            "repr": {
                "kind": "c";
                "packed": true;
            };
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "blockTimestamp";
                        "docs": [
                            "The block timestamp of the observation"
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "cumulativeToken0PriceX32";
                        "docs": [
                            "the cumulative of token0 price during the duration time, Q32.32, the remaining 64 bit for overflow"
                        ];
                        "type": "u128";
                    },
                    {
                        "name": "cumulativeToken1PriceX32";
                        "docs": [
                            "the cumulative of token1 price during the duration time, Q32.32, the remaining 64 bit for overflow"
                        ];
                        "type": "u128";
                    }
                ];
            };
        },
        {
            "name": "observationState";
            "serialization": "bytemuckunsafe";
            "repr": {
                "kind": "c";
                "packed": true;
            };
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "initialized";
                        "docs": [
                            "Whether the ObservationState is initialized"
                        ];
                        "type": "bool";
                    },
                    {
                        "name": "observationIndex";
                        "docs": [
                            "the most-recently updated index of the observations array"
                        ];
                        "type": "u16";
                    },
                    {
                        "name": "poolId";
                        "type": "pubkey";
                    },
                    {
                        "name": "observations";
                        "docs": [
                            "observation array"
                        ];
                        "type": {
                            "array": [
                                {
                                    "defined": {
                                        "name": "observation";
                                    };
                                },
                                100
                            ];
                        };
                    },
                    {
                        "name": "padding";
                        "docs": [
                            "padding for feature update"
                        ];
                        "type": {
                            "array": [
                                "u64",
                                4
                            ];
                        };
                    }
                ];
            };
        },
        {
            "name": "poolState";
            "serialization": "bytemuckunsafe";
            "repr": {
                "kind": "c";
                "packed": true;
            };
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "ammConfig";
                        "docs": [
                            "Which config the pool belongs"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "poolCreator";
                        "docs": [
                            "pool creator"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "token0Vault";
                        "docs": [
                            "Token A"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "token1Vault";
                        "docs": [
                            "Token B"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "lpMint";
                        "docs": [
                            "Pool tokens are issued when A or B tokens are deposited.",
                            "Pool tokens can be withdrawn back to the original A or B token."
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "token0Mint";
                        "docs": [
                            "Mint information for token A"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "token1Mint";
                        "docs": [
                            "Mint information for token B"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "token0Program";
                        "docs": [
                            "token_0 program"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "token1Program";
                        "docs": [
                            "token_1 program"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "observationKey";
                        "docs": [
                            "observation account to store oracle data"
                        ];
                        "type": "pubkey";
                    },
                    {
                        "name": "authBump";
                        "type": "u8";
                    },
                    {
                        "name": "status";
                        "docs": [
                            "Bitwise representation of the state of the pool",
                            "bit0, 1: disable deposit(vaule is 1), 0: normal",
                            "bit1, 1: disable withdraw(vaule is 2), 0: normal",
                            "bit2, 1: disable swap(vaule is 4), 0: normal"
                        ];
                        "type": "u8";
                    },
                    {
                        "name": "lpMintDecimals";
                        "type": "u8";
                    },
                    {
                        "name": "mint0Decimals";
                        "docs": [
                            "mint0 and mint1 decimals"
                        ];
                        "type": "u8";
                    },
                    {
                        "name": "mint1Decimals";
                        "type": "u8";
                    },
                    {
                        "name": "lpSupply";
                        "docs": [
                            "lp mint supply"
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "protocolFeesToken0";
                        "docs": [
                            "The amounts of token_0 and token_1 that are owed to the liquidity provider."
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "protocolFeesToken1";
                        "type": "u64";
                    },
                    {
                        "name": "fundFeesToken0";
                        "type": "u64";
                    },
                    {
                        "name": "fundFeesToken1";
                        "type": "u64";
                    },
                    {
                        "name": "openTime";
                        "docs": [
                            "The timestamp allowed for swap in the pool."
                        ];
                        "type": "u64";
                    },
                    {
                        "name": "padding";
                        "docs": [
                            "padding for future updates"
                        ];
                        "type": {
                            "array": [
                                "u64",
                                32
                            ];
                        };
                    }
                ];
            };
        },
        {
            "name": "programState";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "bump";
                        "type": "u8";
                    },
                    {
                        "name": "admin";
                        "type": "pubkey";
                    },
                    {
                        "name": "platformFeeWallet";
                        "type": "pubkey";
                    },
                    {
                        "name": "basketCounter";
                        "type": "u64";
                    },
                    {
                        "name": "creatorFeePercentage";
                        "type": "u64";
                    },
                    {
                        "name": "platformFeePercentage";
                        "type": "u64";
                    },
                    {
                        "name": "isInitialized";
                        "type": "bool";
                    },
                    {
                        "name": "whitelistedCreators";
                        "type": {
                            "vec": "pubkey";
                        };
                    }
                ];
            };
        },
        {
            "name": "redeemBasketTokenEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "basketMint";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "sellComponentEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "startRebalancingEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "timestamp";
                        "type": "i64";
                    }
                ];
            };
        },
        {
            "name": "stopRebalancingEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "components";
                        "type": {
                            "vec": {
                                "defined": {
                                    "name": "basketComponent";
                                };
                            };
                        };
                    },
                    {
                        "name": "timestamp";
                        "type": "i64";
                    }
                ];
            };
        },
        {
            "name": "transferAdminEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "oldAdmin";
                        "type": "pubkey";
                    },
                    {
                        "name": "newAdmin";
                        "type": "pubkey";
                    }
                ];
            };
        },
        {
            "name": "transferBasketEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "basketMint";
                        "type": "pubkey";
                    },
                    {
                        "name": "oldCreator";
                        "type": "pubkey";
                    },
                    {
                        "name": "newCreator";
                        "type": "pubkey";
                    }
                ];
            };
        },
        {
            "name": "updateFeeEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "newCreatorFeePercentage";
                        "type": "u64";
                    },
                    {
                        "name": "newPlatformFeePercentage";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "updatePlatformFeeWalletEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "newPlatformFeeWallet";
                        "type": "pubkey";
                    }
                ];
            };
        },
        {
            "name": "updateRebalancerEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "oldRebalancer";
                        "type": "pubkey";
                    },
                    {
                        "name": "newRebalancer";
                        "type": "pubkey";
                    }
                ];
            };
        },
        {
            "name": "updateWhitelistedCreatorsEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "oldWhitelistedCreators";
                        "type": {
                            "vec": "pubkey";
                        };
                    },
                    {
                        "name": "newWhitelistedCreators";
                        "type": {
                            "vec": "pubkey";
                        };
                    }
                ];
            };
        },
        {
            "name": "userComponent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "mint";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    }
                ];
            };
        },
        {
            "name": "userFund";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "bump";
                        "type": "u8";
                    },
                    {
                        "name": "components";
                        "type": {
                            "vec": {
                                "defined": {
                                    "name": "userComponent";
                                };
                            };
                        };
                    }
                ];
            };
        },
        {
            "name": "withdrawWsolEvent";
            "type": {
                "kind": "struct";
                "fields": [
                    {
                        "name": "basketId";
                        "type": "u64";
                    },
                    {
                        "name": "user";
                        "type": "pubkey";
                    },
                    {
                        "name": "amount";
                        "type": "u64";
                    }
                ];
            };
        }
    ];
};
//# sourceMappingURL=pie.d.ts.map