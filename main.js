let web3, account, contract, usdt;

async function connectWallet() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
    const accounts = await web3.eth.getAccounts();
    account = accounts[0];

    const networkId = await web3.eth.getChainId();
    if (networkId !== chainId) {
      alert("⚠ กรุณาเชื่อมต่อกับ BNB Smart Chain");
      return;
    }

    contract = new web3.eth.Contract(contractABI, contractAddress);
    usdt = new web3.eth.Contract(usdtABI, usdtAddress);

    document.getElementById("walletAddress").innerText = "✅ " + account;
    document.getElementById("refSection").style.display = "block";
    document.getElementById("refLink").value =
      window.location.origin + window.location.pathname + "?ref=" + account;
  } else {
    alert("กรุณาติดตั้ง MetaMask หรือ Bitget Wallet");
  }
}

async function copyRefLink() {
  const refInput = document.getElementById("refLink");
  refInput.select();
  document.execCommand("copy");
  alert("คัดลอกลิงก์แล้ว!");
}

async function registerReferrer() {
  const ref = document.getElementById("refInput").value;
  if (!ref || ref.toLowerCase() === account.toLowerCase()) {
    document.getElementById("status").innerText =
      "❌ ลิงก์ไม่ถูกต้องหรือไม่สามารถแนะนำตนเองได้";
    return;
  }
  try {
    await contract.methods.setReferrer(ref).send({ from: account });
    document.getElementById("status").innerText = "✅ สมัคร referrer สำเร็จ";
  } catch (e) {
    document.getElementById("status").innerText =
      "❌ สมัครไม่สำเร็จ: " + e.message;
  }
}

async function purchase() {
  const amount = document.getElementById("usdtAmount").value;
  if (!amount || amount <= 0) {
    alert("กรุณาระบุจำนวน USDT");
    return;
  }

  const usdtAmount = web3.utils.toWei(amount, "mwei"); // USDT = 6 decimals

  try {
    const balance = await usdt.methods.balanceOf(account).call();
    if (Number(balance) < Number(usdtAmount)) {
      document.getElementById("status").innerText =
        "❌ คุณไม่มี USDT เพียงพอในกระเป๋า";
      return;
    }

    document.getElementById("status").innerText = "⏳ อนุมัติ USDT...";
    await usdt.methods
      .approve(contractAddress, usdtAmount)
      .send({ from: account });

    document.getElementById("status").innerText =
      "⏳ ซื้อและ stake KJC...";
    await contract.methods
      .buyAndStake(usdtAmount, 0)
      .send({ from: account });

    document.getElementById("status").innerText = "✅ สำเร็จแล้ว!";
  } catch (e) {
    document.getElementById("status").innerText =
      "❌ เกิดข้อผิดพลาด: " + e.message;
  }
}
async function claimReward() {
  if (!account || !stakingContract) {
    document.getElementById("claimStatus").innerText = "⚠️ กรุณาเชื่อมกระเป๋าหรือรอสักครู่ แล้วลองใหม่อีกครั้ง";
    return;
  }

  try {
    const lastClaimed = await stakingContract.methods.lastClaimed(account).call();
    const interval = await stakingContract.methods.CLAIM_INTERVAL().call();
    const now = Math.floor(Date.now() / 1000);

    if (now >= parseInt(lastClaimed) + parseInt(interval)) {
      await stakingContract.methods.claimStakingReward().send({ from: account });
      document.getElementById("claimStatus").innerText = "🎉 คุณเคลมรางวัลสำเร็จแล้ว!";
    } else {
      const remaining = parseInt(lastClaimed) + parseInt(interval) - now;
      const minutes = Math.ceil(remaining / 60);
      document.getElementById("claimStatus").innerText = `⏳ คุณต้องรออีก ${minutes} นาที จึงจะเคลมได้`;
    }
  } catch (error) {
    console.error(error);
    document.getElementById("claimStatus").innerText = "❌ เกิดข้อผิดพลาดในการเคลมรางวัล";
  }
}
async function claimReward() {
  if (!account || !stakingContract) {
    document.getElementById("claimStatus").innerText = "⚠️ กรุณาเชื่อมกระเป๋าหรือรอสักครู่ แล้วลองใหม่อีกครั้ง";
    return;
  }

  try {
    const lastClaimed = await stakingContract.methods.lastClaimed(account).call();
    const interval = await stakingContract.methods.CLAIM_INTERVAL().call();
    const now = Math.floor(Date.now() / 1000);

    if (now >= parseInt(lastClaimed) + parseInt(interval)) {
      await stakingContract.methods.claimStakingReward().send({ from: account });
      document.getElementById("claimStatus").innerText = "🎉 คุณเคลมรางวัลสำเร็จแล้ว!";
    } else {
      const remaining = parseInt(lastClaimed) + parseInt(interval) - now;
      const minutes = Math.ceil(remaining / 60);
      document.getElementById("claimStatus").innerText = `⏳ คุณต้องรออีก ${minutes} นาที จึงจะเคลมได้`;
    }
  } catch (error) {
    console.error(error);
    document.getElementById("claimStatus").innerText = "❌ เกิดข้อผิดพลาดในการเคลมรางวัล";
  }
}
