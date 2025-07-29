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

      generateReferralLink();
      loadStakingInfo();
    } catch (error) {
      console.error("❌ การเชื่อมต่อกระเป๋าล้มเหลว:", error);
    }
  } else {
    alert("กรุณาติดตั้ง MetaMask หรือ Bitget Wallet");
  }
}

function generateReferralLink() {
  const link = `${window.location.origin}${window.location.pathname}?ref=${account}`;
  document.getElementById("refLink").value = link;
}

function copyRefLink() {
  const input = document.getElementById("refLink");
  input.select();
  input.setSelectionRange(0, 99999);
  navigator.clipboard.writeText(input.value);
  alert("✅ คัดลอกลิงก์เรียบร้อยแล้ว!");
}

async function loadStakingInfo() {
  if (!stakingContract || !account) return;
  try {
    const rawAmount = await stakingContract.methods.stakedAmount(account).call();
    const display = web3.utils.fromWei(rawAmount, 'ether');
    document.getElementById("stakeAmount").innerText = `${display} KJC`;
  } catch (e) {
    console.error("โหลดยอด Stake ผิดพลาด:", e);
    document.getElementById("stakeAmount").innerText = "❌ โหลดไม่สำเร็จ";
  }
}

async function claimReward() {
  if (!stakingContract || !account) {
    document.getElementById("claimStatus").innerText = "⚠️ กรุณาเชื่อมกระเป๋าก่อน";
    return;
  }

  try {
    const last = await stakingContract.methods.lastClaim(account).call();
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
    console.error("❌ เคลมล้มเหลว:", e);
    document.getElementById("claimStatus").innerText = "❌ เกิดข้อผิดพลาดในการเคลมรางวัล";
  }
}

function getReferrerFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  const ref = urlParams.get('ref');
  if (ref && web3.utils.isAddress(ref)) {
    document.getElementById("refAddress").value = ref;
  }
}

window.addEventListener('load', () => {
  getReferrerFromURL();
});
