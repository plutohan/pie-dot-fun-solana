"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSdk = void 0;
const raydium_sdk_v2_1 = require("@raydium-io/raydium-sdk-v2");
let raydium;
const initSdk = async (connection, cluster) => {
    if (raydium)
        return raydium;
    raydium = await raydium_sdk_v2_1.Raydium.load({
        connection,
        cluster,
        disableFeatureCheck: true,
        blockhashCommitment: "finalized",
    });
    return raydium;
};
exports.initSdk = initSdk;
//# sourceMappingURL=config.js.map