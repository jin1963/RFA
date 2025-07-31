// js/staking.js
import { tokenToWei, displayWeiToToken, getFriendlyErrorMessage } from './utils.js';
import { updateUI } from './app.js'; // จะใช้เรียกเมื่อทำธุรกรรมสำเร็จ
import { usdtAddress, kjcAddress, contractAddress } from '../config.js'; // ต้องนำเข้า contractAddress ด้วย

export async function buyAndStake() {
  if (!window.stakingContract || !window.account || !window.usdtContract || !window.routerContract || typeof window.usdtDecimals === 'undefined' || typeof window.kjcDecimals === 'undefined') {
    alert("⚠️ กำลังโหลดข้อมูล กรุณารอสักครู่แล้วลองใหม่");
    console.warn("buyAndStake: Contracts or decimals not initialized yet.");
    return;
  }

  const rawInput = document.getElementById("usdtAmount").value.trim();
  if (!rawInput || isNaN(rawInput) || parseFloat(rawInput) <= 0) {
    alert("❌ กรุณาใส่จำนวน USDT ที่จะใช้ซื้อให้ถูกต้อง (ต้องมากกว่า 0)");
    return;
  }

  const usdtAmountFloat = parseFloat(rawInput);
  const usdtInWei = tokenToWei(usdtAmountFloat, window.usdtDecimals);

  document.getElementById("buyTokenStatus").innerText = "กำลังดำเนินการซื้อ KJC...";
  document.getElementById("buyTokenStatus").classList.remove("error", "success");

  try {
    if (!window.web3.utils.isAddress(usdtAddress) || !window.web3.utils.isAddress(kjcAddress)) {
      alert("❌ ที่อยู่ Token ไม่ถูกต้องใน config.js");
      document.getElementById("buyTokenStatus").innerText = "❌ ที่อยู่ Token ไม่ถูกต้อง";
      document.getElementById("buyTokenStatus").classList.add("error");
      return;
    }

    const path = [usdtAddress, kjcAddress];
    // ตรวจสอบว่า routerContract ถูกสร้างด้วย ABI ที่มี getAmountsOut
    const amountsOut = await window.routerContract.methods.getAmountsOut(usdtInWei, path).call();
    const expectedKjcOutWei = BigInt(amountsOut[1]);

    const SLIPPAGE_PERCENTAGE = 5;
    const minOut = expectedKjcOutWei * BigInt(100 - SLIPPAGE_PERCENTAGE) / 100n;

    const allowance = await window.usdtContract.methods.allowance(window.account, contractAddress).call();

    if (BigInt(allowance) < BigInt(usdtInWei)) {
      document.getElementById("buyTokenStatus").innerText = "กำลังขออนุมัติ USDT...";
      const approveTx = await window.usdtContract.methods.approve(contractAddress, usdtInWei).send({ from: window.account });
      alert("✅ การอนุมัติ USDT สำเร็จแล้ว! กรุณากด 'ซื้อเหรียญ KJC' อีกครั้ง");
      document.getElementById("buyTokenStatus").innerText = "✅ อนุมัติสำเร็จ! กดอีกครั้งเพื่อซื้อ";
      document.getElementById("buyTokenStatus").classList.add("success");
      return;
    }

    document.getElementById("buyTokenStatus").innerText = "กำลังส่งธุรกรรมซื้อและ Stake...";
    const buyTx = await window.stakingContract.methods.buyAndStake(usdtInWei, minOut.toString()).send({ from: window.account });

    document.getElementById("buyTokenStatus").innerText = "กำลังรอการยืนยันการซื้อ KJC...";
    const receipt = await window.web3.eth.getTransactionReceipt(buyTx.transactionHash);

    if (receipt && receipt.status) {
      alert(`✅ ซื้อ ${usdtAmountFloat} USDT และ Stake สำเร็จ!`);
      document.getElementById("buyTokenStatus").innerText = `✅ ซื้อ ${usdtAmountFloat} USDT และ Stake สำเร็จ!`;
      document.getElementById("buyTokenStatus").classList.add("success");
      updateUI(); // อัปเดต UI หลังจากทำธุรกรรม
    } else {
      alert("❌ การซื้อไม่สำเร็จ หรือธุรกรรมถูกปฏิเสธ");
      document.getElementById("buyTokenStatus").innerText = "❌ การซื้อ KJC ไม่สำเร็จ!";
      document.getElementById("buyTokenStatus").classList.add("error");
    }

  } catch (e) {
    console.error("buyAndStake: Error:", e);
    const errorMessage = getFriendlyErrorMessage(e);
    document.getElementById("buyTokenStatus").innerText = `❌ ข้อผิดพลาด: ${errorMessage}`;
    document.getElementById("buyTokenStatus").classList.add("error");
    alert(`❌ เกิดข้อผิดพลาดในการซื้อเหรียญ: ${errorMessage}`);
  }
}

export async function loadStakingInfo() {
  if (!window.stakingContract || !window.account || typeof window.kjcDecimals === 'undefined') {
    document.getElementById("yourStake").innerText = "⚠️ กำลังโหลดข้อมูล...";
    document.getElementById("yourStakingReward").innerText = "⚠️ กำลังโหลดข้อมูล...";
    console.warn("loadStakingInfo: Contracts or decimals not initialized.");
    return;
  }

  try {
    const rawStakedAmount = await window.stakingContract.methods.stakedAmount(window.account).call();
    const stakingReward = await window.stakingContract.methods.getClaimable(window.account).call(); // ใช้ getClaimable เพื่ออ่านรางวัลที่เคลมได้

    const stakeDisplay = displayWeiToToken(rawStakedAmount, window.kjcDecimals);
    const stakingRewardDisplay = displayWeiToToken(stakingReward, window.kjcDecimals);

    document.getElementById("yourStake").innerText = `💰 Your Stake: ${stakeDisplay} KJC`;
    document.getElementById("yourStakingReward").innerText = `🎉 Claimable Stake Reward: ${stakingRewardDisplay} KJC`;

  } catch (e) {
    console.error("loadStakingInfo: Error:", e);
    document.getElementById("yourStake").innerText = "❌ โหลดไม่สำเร็จ: " + (e.message || "Unknown error");
    document.getElementById("yourStake").classList.add("error");
    document.getElementById("yourStakingReward").innerText = "❌ โหลดไม่สำเร็จ: " + (e.message || "Unknown error");
    document.getElementById("yourStakingReward").classList.add("error");
  }
}

export async function claimStakingReward() {
  if (!window.stakingContract || !window.account) {
    document.getElementById("claimStakeStatus").innerText = "⚠️ กรุณาเชื่อมกระเป๋าก่อน";
    return;
  }

  document.getElementById("claimStakeStatus").innerText = "กำลังดำเนินการเคลมรางวัล Stake...";
  document.getElementById("claimStakeStatus").classList.remove("error", "success");

  try {
    const lastClaimTime = await window.stakingContract.methods.lastClaim(window.account).call();
    const claimInterval = await window.stakingContract.methods.CLAIM_INTERVAL().call();
    const now = Math.floor(Date.now() / 1000);
    const nextClaimTime = Number(lastClaimTime) + Number(claimInterval);

    if (now >= nextClaimTime) {
      const tx = await window.stakingContract.methods.claimStakingReward().send({ from: window.account });
      const receipt = await window.web3.eth.getTransactionReceipt(tx.transactionHash);

      if (receipt && receipt.status) {
        alert("🎉 เคลมรางวัล Stake สำเร็จแล้ว!");
        document.getElementById("claimStakeStatus").innerText = "🎉 เคลมรางวัล Stake สำเร็จแล้ว!";
        document.getElementById("claimStakeStatus").classList.add("success");
        updateUI(); // อัปเดต UI หลังจากทำธุรกรรม
      } else {
        alert("❌ การเคลมไม่สำเร็จ");
        document.getElementById("claimStakeStatus").innerText = "❌ การเคลมล้มเหลว!";
        document.getElementById("claimStakeStatus").classList.add("error");
      }
    } else {
      const remainingSeconds = nextClaimTime - now;
      const waitMinutes = Math.ceil(remainingSeconds / 60);
      const waitHours = Math.floor(waitMinutes / 60);
      const remainingMins = waitMinutes % 60;
      let waitString = "";
      if (waitHours > 0) waitString += `${waitHours} ชั่วโมง `;
      if (remainingMins > 0 || waitHours === 0) waitString += `${remainingMins} นาที`;
      document.getElementById("claimStakeStatus").innerText = `⏳ ต้องรออีก ${waitString}`;
    }
  } catch (e) {
    const errorMessage = getFriendlyErrorMessage(e);
    document.getElementById("claimStakeStatus").innerText = `❌ เกิดข้อผิดพลาด: ${errorMessage}`;
    document.getElementById("claimStakeStatus").classList.add("error");
    alert(`❌ เกิดข้อผิดพลาดในการเคลมรางวัล: ${errorMessage}`);
  }
}
