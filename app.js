// js/app.js
// นำเข้าฟังก์ชันจาก module ต่างๆ
import { connectWallet } from './wallet.js';
import { generateReferralLink, copyRefLink, getReferrerFromURL, registerReferrer } from './referral.js';
import { buyAndStake, loadStakingInfo, claimStakingReward } from './staking.js';
import { loadReferralInfo, claimReferralReward } from './reward.js';

// กำหนดให้ฟังก์ชันที่ต้องการให้เรียกใช้ได้จาก HTML เป็น global (window object)
// วิธีนี้เป็นวิธีง่ายๆ สำหรับโปรเจกต์ขนาดเล็ก
window.connectWallet = connectWallet;
window.copyRefLink = copyRefLink;
window.registerReferrer = registerReferrer;
window.buyAndStake = buyAndStake;
window.claimStakingReward = claimStakingReward;
window.claimReferralReward = claimReferralReward;

// ฟังก์ชันสำหรับอัปเดต UI ทั้งหมด
// จะถูกเรียกหลังจากเชื่อมต่อกระเป๋าสำเร็จ หรือทำธุรกรรมสำเร็จ
export function updateUI() {
  generateReferralLink(); // สร้างลิงก์แนะนำใหม่ถ้า account เปลี่ยน
  loadStakingInfo();
  loadReferralInfo();
}

// เมื่อโหลดหน้าเว็บเสร็จสมบูรณ์
window.addEventListener('load', () => {
  getReferrerFromURL(); // ตรวจสอบ referrer จาก URL เมื่อหน้าโหลด
  // ไม่ต้องเรียก connectWallet() อัตโนมัติ เพื่อให้ผู้ใช้เป็นคนเริ่มเชื่อมต่อเอง
  // แต่สามารถเรียก updateUI() ได้หากต้องการให้ข้อมูลแสดงขึ้นมา (แม้จะยังไม่มีกระเป๋าเชื่อมต่อ)
  // loadStakingInfo(); // ถ้าต้องการให้แสดง "กำลังโหลดข้อมูล..." ตั้งแต่แรก
  // loadReferralInfo(); // ถ้าต้องการให้แสดง "กำลังโหลดข้อมูล..." ตั้งแต่แรก
});

// หากต้องการให้ตรวจจับการเปลี่ยน Account หรือ Network
// window.ethereum.on('accountsChanged', (accounts) => {
//   if (accounts.length > 0) {
//     window.account = accounts[0];
//     updateUI();
//   } else {
//     window.account = null;
//     document.getElementById("walletAddress").innerText = `❌ ยังไม่เชื่อมต่อกระเป๋า`;
//     document.getElementById("walletAddress").classList.remove("success");
//     // ล้างข้อมูล UI
//   }
// });

// window.ethereum.on('chainChanged', (chainId) => {
//   console.log("Chain changed to:", chainId);
//   // อาจจะต้อง re-initialize contracts หรือเรียก connectWallet ใหม่
//   // เพื่อให้มั่นใจว่าทุกอย่างทำงานบนเชนที่ถูกต้อง
//   connectWallet();
// });
