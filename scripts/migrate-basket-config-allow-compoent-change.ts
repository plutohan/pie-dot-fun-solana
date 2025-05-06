import { Connection, Keypair, sendAndConfirmTransaction, } from '@solana/web3.js';
import { BN } from "@coral-xyz/anchor";
import fs from 'fs';
import { PieProgram } from "../sdk";

const RPC_URL = process.env.RPC_URL;
const KEYPAIR_PATH = process.env.KEYPAIR_PATH;

async function main() {
  const connection = new Connection(RPC_URL, 'confirmed');
  const secretKey = new Uint8Array(JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8')));
  const wallet = Keypair.fromSecretKey(secretKey);

  console.log(`사용하는 지갑 주소: ${wallet.publicKey.toString()}`);

  const pieProgram = new PieProgram({
    connection,
    cluster: "mainnet-beta",
    jitoRpcUrl: RPC_URL
  });

  //
  const programState = await pieProgram.state.getProgramState();
  const maxBasketId = programState.basketCounter.toNumber();
  for (let i = 0; i < maxBasketId; i++) {
    const basketId = new BN(i);
    const basketConfig = await pieProgram.state.getBasketConfig({
      basketId
    });
    if (basketConfig == null) {
      console.log(`계정 ${i} 없음`);
      continue;
    }

    try {
      console.log(`계정 ${basketConfig.mint.toString()} 마이그레이션 중...`);

      // 마이그레이션 트랜잭션 생성
      const tx = await pieProgram.admin.migrateBasketAllowComponentChange({
        creator: wallet.publicKey,
        basketId,
        allowComponentChange: true, // true로 설정
      })

      // 트랜잭션 전송
      const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
      console.log(`마이그레이션 성공: ${signature}`);
    } catch (error) {
      console.error(`계정 ${basketConfig.mint.toString()} 마이그레이션 실패: ${error}`);
    }
  }
}

console.log('마이그레이션 완료');


main().catch(err => {
  console.error(err);
  process.exit(1);
});