let web3, account, contract, usdt;

const contractAddress = "0xC444F117806B725E12154Fa7D0cd090Eec325B48";
const usdtAddress = "0x55d398326f99059fF775485246999027B3197955";

// ✅ เชื่อมกระเป๋าแบบไม่ force switch
async function connectWallet() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      await ethereum.request({ method: "eth_requestAccounts" });
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];

      contract = new web3.eth.Contract(contractABI, contractAddress);
      usdt = new web3.eth.Contract(usdtABI, usdtAddress);

      document.getElementById("walletAddress").innerText = "✅ " + account;
      document.getElementById("refSection").style.display = "block";
      document.getElementById("refLink").value = window.location.origin + window.location.pathname + "?ref=" + account;
    } catch (err) {
      alert("❌ เชื่อมต่อกระเป๋าไม่สำเร็จ");
    }
  } else {
    alert("⚠️ กรุณาติดตั้ง MetaMask หรือ Bitget Wallet");
  }
}

// ✅ ป้องกันผิด chain
async function ensureOnBSC() {
  const chainId = await web3.eth.getChainId();
  if (chainId !== 56) {
    alert("❌ กรุณาเปลี่ยนเครือข่ายเป็น BNB Smart Chain ก่อนทำรายการ");
    return false;
  }
  return true;
}

// ✅ คัดลอกลิงก์แนะนำ
async function copyRefLink() {
  const refInput = document.getElementById("refLink");
  refInput.select();
  document.execCommand("copy");
  alert("📋 คัดลอกลิงก์แล้ว!");
}

// ✅ สมัคร Referrer (เฉพาะบน BSC)
async function registerReferrer() {
  if (!(await ensureOnBSC())) return;

  const ref = document.getElementById("refInput").value;
  if (!ref || ref.toLowerCase() === account.toLowerCase()) {
    document.getElementById("status").innerText = "❌ ลิงก์ไม่ถูกต้องหรือแนะนำตนเองไม่ได้";
    return;
  }

  try {
    await contract.methods.registerReferrer(ref).send({ from: account });
    document.getElementById("status").innerText = "✅ สมัคร Referrer สำเร็จ";
  } catch (e) {
    document.getElementById("status").innerText = "❌ สมัครไม่สำเร็จ: " + e.message;
  }
}

// ✅ ซื้อ KJC (เฉพาะบน BSC)
async function purchase() {
  if (!(await ensureOnBSC())) return;

  const amount = document.getElementById("usdtAmount").value;
  if (!amount || amount <= 0) {
    alert("⚠️ กรุณาระบุจำนวน USDT");
    return;
  }

  const usdtAmount = web3.utils.toWei(amount, "mwei"); // USDT ใช้ 6 decimals

  try {
    const balance = await usdt.methods.balanceOf(account).call();
    if (Number(balance) < Number(usdtAmount)) {
      document.getElementById("status").innerText = "❌ คุณมี USDT ไม่เพียงพอ";
      return;
    }

    document.getElementById("status").innerText = "⏳ กำลังอนุมัติ USDT...";
    await usdt.methods.approve(contractAddress, usdtAmount).send({ from: account });

    document.getElementById("status").innerText = "⏳ กำลังซื้อ KJC...";
    await contract.methods.buyWithReferral(usdtAmount).send({ from: account });

    document.getElementById("status").innerText = "✅ ซื้อ KJC สำเร็จ";
  } catch (e) {
    document.getElementById("status").innerText = "❌ เกิดข้อผิดพลาด: " + e.message;
  }
}
