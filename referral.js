// js/referral.js
import { getFriendlyErrorMessage } from './utils.js';
import { updateUI } from './app.js'; // จะใช้เรียกเมื่อทำธุรกรรมสำเร็จ

// แสดงลิงก์แนะนำของผู้ใช้
export function generateReferralLink() {
  if (!window.account) {
    document.getElementById("refLink").value = "โปรดเชื่อมต่อกระเป๋าเพื่อสร้างลิงก์";
    return;
  }
  const link = `${window.location.origin}${window.location.pathname}?ref=${window.account}`;
  document.getElementById("refLink").value = link;
}

// คัดลอกลิงก์แนะนำ
export function copyRefLink() {
  const input = document.getElementById("refLink");
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value);
  alert("✅ คัดลอกลิงก์เรียบร้อยแล้ว!");
}

// ตรวจ referrer address จาก URL และแสดงผลในช่องกรอก
export function getReferrerFromURL() {
  if (window.web3 && window.web3.utils) {
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    if (ref && window.web3.utils.isAddress(ref)) {
      document.getElementById("refAddress").value = ref;
    }
  } else {
    console.warn("getReferrerFromURL: web3 หรือ utils ยังไม่พร้อม");
  }
}

// สมัคร Referrer ผ่าน smart contract
export async function registerReferrer() {
  if (!window.stakingContract || !window.account) {
    alert("กรุณาเชื่อมกระเป๋าก่อน");
    return;
  }

  const ref = document.getElementById("refAddress").value;
  if (!window.web3.utils.isAddress(ref) || ref.toLowerCase() === window.account.toLowerCase()) {
    alert("❌ Referrer address ไม่ถูกต้อง หรือเป็น Address ของคุณเอง");
    return;
  }

  document.getElementById("registerStatus").innerText = "กำลังดำเนินการสมัคร Referrer...";
  document.getElementById("registerStatus").classList.remove("error", "success");

  try {
    const txResponse = await window.stakingContract.methods.setReferrer(ref).send({ from: window.account });
    console.log("registerReferrer: Tx Hash:", txResponse.transactionHash);

    document.getElementById("registerStatus").innerText = "กำลังรอการยืนยันการสมัคร Referrer...";
    const receipt = await window.web3.eth.getTransactionReceipt(txResponse.transactionHash);

    if (receipt && receipt.status) {
      document.getElementById("registerStatus").innerText = "✅ สมัคร Referrer สำเร็จแล้ว!";
      document.getElementById("registerStatus").classList.add("success");
      updateUI(); // อัปเดต UI หลังจากทำธุรกรรม
    } else {
      document.getElementById("registerStatus").innerText = "❌ การสมัคร Referrer ไม่สำเร็จ หรือธุรกรรมถูกปฏิเสธ";
      document.getElementById("registerStatus").classList.add("error");
    }
  } catch (e) {
    const errorMessage = getFriendlyErrorMessage(e);
    document.getElementById("registerStatus").innerText = `❌ เกิดข้อผิดพลาด: ${errorMessage}`;
    document.getElementById("registerStatus").classList.add("error");
    alert(`❌ เกิดข้อผิดพลาดในการสมัคร Referrer: ${errorMessage}`);
  }
}
