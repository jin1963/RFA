let web3;
let account;
let stakingContract;

async function connectWallet() {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();
      account = accounts[0];

      document.getElementById("walletAddress").innerText = `✅ ${account}`;
      stakingContract = new web3.eth.Contract(stakingABI, contractAddress);

      loadStakingInfo();
    } catch (error) {
      console.error("❌ การเชื่อมต่อกระเป๋าล้มเหลว:", error);
    }
  } else {
    alert("กรุณาติดตั้ง MetaMask หรือ Bitget Wallet");
  }
}

async function loadStakingInfo() {
  if (!stakingContract || !account) return;
  try {
    const stake = await stakingContract.methods.stakes(account).call(); // ฟังก์ชันจาก contract
    const amount = web3.utils.fromWei(stake.amount, 'ether');
    document.getElementById("stakeAmount").innerText = `${amount} KJC`;
  } catch (e) {
    document.getElementById("stakeAmount").innerText = "❌ โหลดข้อมูลไม่สำเร็จ";
    console.error(e);
  }
}

async function claimReward() {
  if (!stakingContract || !account) {
    document.getElementById("claimStatus").innerText = "⚠️ กรุณาเชื่อมกระเป๋าก่อน";
    return;
  }

  try {
    const last = await stakingContract.methods.lastClaimed(account).call();
    const interval = await stakingContract.methods.CLAIM_INTERVAL().call();
    const now = Math.floor(Date.now() / 1000);

    if (now >= parseInt(last) + parseInt(interval)) {
      await stakingContract.methods.claimStakingReward().send({ from: account });
      document.getElementById("claimStatus").innerText = "🎉 เคลมรางวัลสำเร็จแล้ว!";
      loadStakingInfo();
    } else {
      const wait = Math.ceil((parseInt(last) + parseInt(interval) - now) / 60);
      document.getElementById("claimStatus").innerText = `⏳ ต้องรออีก ${wait} นาที`;
    }
  } catch (e) {
    document.getElementById("claimStatus").innerText = "❌ เกิดข้อผิดพลาดในการเคลม";
    console.error(e);
  }
}

// หากมีปุ่ม copyRefLink ให้ทำงานได้ด้วย
function copyRefLink() {
  const input = document.getElementById("refLink");
  input.select();
  input.setSelectionRange(0, 99999); // สำหรับมือถือ
  navigator.clipboard.writeText(input.value);
  alert("✅ คัดลอกลิงก์แนะนำแล้ว!");
}
