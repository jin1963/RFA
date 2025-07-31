// js/reward.js
import { displayWeiToToken, getFriendlyErrorMessage } from './utils.js';
import { updateUI } from './app.js'; // จะใช้เรียกเมื่อทำธุรกรรมสำเร็จ

export async function loadReferralInfo() {
  if (!window.stakingContract || !window.account || typeof window.kjcDecimals === 'undefined') {
    document.getElementById("yourReferralReward").innerText = "⚠️ กำลังโหลดข้อมูล...";
    console.warn("loadReferralInfo: Contracts or decimals not initialized.");
    return;
  }

  try {
    const rawReferralAmount = await window.stakingContract.methods.referralReward(window.account).call();
    const displayReferral = displayWeiToToken(rawReferralAmount, window.kjcDecimals);

    document.getElementById("yourReferralReward").innerText = `👥 Claimable Referral Reward: ${displayReferral} KJC`;
  } catch (e) {
    console.error("loadReferralInfo: Error:", e);
    document.getElementById("yourReferralReward").innerText =
      "❌ โหลดค่าแนะนำไม่สำเร็จ: " + (e.message || "Unknown error");
    document.getElementById("yourReferralReward").classList.add("error");
  }
}

export async function claimReferralReward() {
  if (!window.stakingContract || !window.account) {
    document.getElementById("referralClaimStatus").innerText = "⚠️ กรุณาเชื่อมกระเป๋าก่อน";
    return;
  }

  document.getElementById("referralClaimStatus").innerText = "กำลังดำเนินการเคลมรางวัลค่าแนะนำ...";
  document.getElementById("referralClaimStatus").classList.remove("error", "success");

  try {
    const rawClaimable = await window.stakingContract.methods.referralReward(window.account).call();
    if (BigInt(rawClaimable) === BigInt(0)) {
      alert("✅ ไม่มีรางวัลค่าแนะนำให้เคลม");
      document.getElementById("referralClaimStatus").innerText = "ไม่มีรางวัลค่าแนะนำ";
      document.getElementById("referralClaimStatus").classList.add("success");
      return;
    }

    const tx = await window.stakingContract.methods.claimReferralReward().send({ from: window.account });
    const receipt = await window.web3.eth.getTransactionReceipt(tx.transactionHash);

    if (receipt && receipt.status) {
      alert("🎉 เคลมรางวัลค่าแนะนำสำเร็จแล้ว!");
      document.getElementById("referralClaimStatus").innerText = "🎉 เคลมรางวัลค่าแนะนำสำเร็จแล้ว!";
      document.getElementById("referralClaimStatus").classList.add("success");
      updateUI(); // อัปเดต UI หลังจากทำธุรกรรม
    } else {
      alert("❌ การเคลมรางวัลค่าแนะนำไม่สำเร็จ หรือธุรกรรมถูกปฏิเสธ");
      document.getElementById("referralClaimStatus").innerText = "❌ การเคลมล้มเหลว!";
      document.getElementById("referralClaimStatus").classList.add("error");
    }
  } catch (e) {
    const errorMessage = getFriendlyErrorMessage(e);
    document.getElementById("referralClaimStatus").innerText = `❌ เกิดข้อผิดพลาด: ${errorMessage}`;
    document.getElementById("referralClaimStatus").classList.add("error");
    alert(`❌ เกิดข้อผิดพลาดในการเคลมรางวัล: ${errorMessage}`);
  }
}
