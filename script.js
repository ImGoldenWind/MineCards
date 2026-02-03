document.addEventListener("DOMContentLoaded", () => {
  const tg = window.Telegram?.WebApp;
  const user = tg?.initDataUnsafe?.user;

  const pages = document.querySelectorAll(".page");
  const navButtons = document.querySelectorAll(".nav-btn");
  const cardsContainer = document.getElementById("cards-container");
  const timerElem = document.getElementById("timer");
  const btn = document.getElementById("collect-btn");
  const paidSpinBtn = document.getElementById("paid-spin-btn");
  const paidSpinCount = document.getElementById("paid-spin-count");
  const donatePage = document.getElementById("donate-page");
  const cardsPage = document.getElementById("cards-page");
  const homePage = document.getElementById("home-page");
  const adminPage = document.getElementById("admin-page");
  const adminBtn = document.getElementById("admin-btn");
  const rewardForm = document.getElementById("reward-form");
  const adminResult = document.getElementById("admin-result");
  const massForm = document.getElementById("mass-form");
  const massRewardInput = document.getElementById("mass-reward-count");

  const API_BASE = "/api";
  const COOLDOWN_MS = 6 * 60 * 60 * 1000;
  const ADMIN_TELEGRAM_ID = 7212088382;

  if (!user) {
    timerElem.innerText = "Запустите мини-игру через Telegram";
    return;
  }

  if (user.id != ADMIN_TELEGRAM_ID) {
    adminBtn.style.display = "none";
  }

  let interval;
  let nextClaimAt = 0;

  function updateTimer() {
    const now = Date.now();
    const diff = nextClaimAt - now;

    const progressBar = document.getElementById("btn-progress");
    const label = document.getElementById("btn-label");

    if (diff <= 0) {
      clearInterval(interval);
      timerElem.innerText = "Можно собрать карточку!";
      btn.disabled = false;
      progressBar.style.width = "100%";
      label.innerText = "Собрать";
      label.style.color = "#fff";
    } else {
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      timerElem.innerText = `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

      const progress = 1 - diff / COOLDOWN_MS;
      const percentage = (progress * 100).toFixed(2);

      progressBar.style.width = `${percentage}%`;
      label.innerText = `${Math.floor(percentage)}%`;

      const colorValue = Math.floor(255 - progress * 255);
      label.style.color = `rgb(${colorValue}, ${colorValue}, ${colorValue})`;

      btn.disabled = true;
    }
  }

  function loadSpinBalance() {
    fetch(`${API_BASE}/entry.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegram_id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        nextClaimAt = new Date(data.next_claim_at).getTime();
        updateTimer();
        interval = setInterval(updateTimer, 1000);

        if (data.spins_balance > 0) {
          paidSpinBtn.style.display = "block";
          paidSpinCount.textContent = data.spins_balance;
        } else {
          paidSpinBtn.style.display = "none";
        }
      })
      .catch((err) => console.error(err));
  }

  function showConfetti(rarity) {
    const colors = {
      common: ["#aaa", "#ddd"],
      rare: ["#39f", "#6cf"],
      epic: ["#93f", "#c6f"],
      legendary: ["#fc0", "#ff6"],
    };
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: colors[rarity.toLowerCase()] || ["#fff"],
    });
  }

  function playSound(rarity) {
    const sounds = {
      common: "sound-common",
      rare: "sound-rare",
      epic: "sound-epic",
      legendary: "sound-legendary",
    };
    const soundId = sounds[rarity.toLowerCase()];
    if (soundId) {
      document.getElementById(soundId).play();
    }
  }

  function showCardModal(card) {
    const modal = document.getElementById("card-modal");
    const cardImage = document.getElementById("card-image");
    const cardName = document.getElementById("card-name");
    const cardFront = modal.querySelector(".card-front");
    const flipInner = modal.querySelector(".card-flip-inner");
    cardImage.src = card.image || card.image_url;
    cardName.textContent = card.name;
    cardFront.setAttribute("data-rarity", card.rarity);

    if (card.rarity.toLowerCase() === "legendary") {
      cardFront.style.boxShadow = "0 0 25px 10px gold, 0 0 50px 20px orange";
      cardFront.style.animation = "glow-pulse 1.5s infinite alternate";
    } else {
      cardFront.style.boxShadow = "none";
      cardFront.style.animation = "none";
    }

    modal.classList.remove("hidden");
    flipInner.classList.remove("show-front");
    gsap.set(modal.querySelector(".modal-content"), { y: "100vh", opacity: 0 });
    gsap.to(modal.querySelector(".modal-content"), {
      y: 0,
      opacity: 1,
      duration: 0.6,
      ease: "power3.out",
      onComplete: () =>
        setTimeout(() => flipInner.classList.add("show-front"), 200),
    });
  }

  function switchPage(pageId) {
    pages.forEach((p) => {
      p.classList.toggle("active", p.id === pageId);
    });

    navButtons.forEach((b) => {
      b.classList.toggle("active", b.dataset.page === pageId);
    });

    if (homePage)
      homePage.style.display = pageId === "home-page" ? "flex" : "none";
    if (cardsPage)
      cardsPage.style.display = pageId === "cards-page" ? "flex" : "none";
    if (donatePage)
      donatePage.style.display = pageId === "donate-page" ? "flex" : "none";
    if (adminPage)
      adminPage.style.display = pageId === "admin-page" ? "flex" : "none";
  }

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      switchPage(btn.dataset.page);
      if (btn.dataset.page === "cards-page") {
        loadCards();
      }
    });
  });

  document.getElementById("close-modal").addEventListener("click", () => {
    document.getElementById("card-modal").classList.add("hidden");
  });

  btn.addEventListener("click", () => {
    fetch(`${API_BASE}/claim.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id: user.id, type: "free" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) return alert(data.error);

        const card = data.card;
        showCardModal(card);
        showConfetti(card.rarity);
        playSound(card.rarity);

        nextClaimAt = Date.now() + COOLDOWN_MS;
        clearInterval(interval);
        updateTimer();
        interval = setInterval(updateTimer, 1000);
        loadSpinBalance();
      })
      .catch((err) => alert(err.message));
  });

  paidSpinBtn.addEventListener("click", () => {
    fetch(`${API_BASE}/claim.php`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegram_id: user.id, type: "paid" }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) return alert(data.error);

        const card = data.card;
        showCardModal(card);
        showConfetti(card.rarity);
        playSound(card.rarity);
        loadSpinBalance();
      })
      .catch((err) => alert(err.message));
  });

  rewardForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const targetId = document.getElementById("target-id").value;
    const count = parseInt(document.getElementById("reward-count").value);
    fetch(
      `${API_BASE}/admin.php?pass=supersecret&telegram_id=${targetId}&count=${count}`,
    )
      .then((res) => res.text())
      .then((msg) => (adminResult.textContent = msg));
  });

  massForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const count = parseInt(massRewardInput.value);
    if (!count || count <= 0) return alert("Введите корректное количество");
    fetch(`${API_BASE}/admin.php?pass=supersecret&mass=give_all&count=${count}`)
      .then((res) => res.text())
      .then((msg) => (adminResult.textContent = msg));
  });

  function loadCards() {
    cardsContainer.innerHTML = "Загрузка...";
    fetch(`${API_BASE}/get_user_cards.php?telegram_id=${user.id}`)
      .then((res) => res.json())
      .then((cards) => {
        cardsContainer.innerHTML = "";
        if (cards.length === 0) {
          cardsContainer.innerHTML = "<p>У вас нет карт.</p>";
          return;
        }
        cards.forEach((card) => {
          const el = document.createElement("div");
          el.className = "card-item";
          el.innerHTML = `<img src="${card.image_url}" alt=""><div><strong>${card.name}</strong><br>${card.rarity} — x${card.count}</div>`;
          el.addEventListener("click", () => showCardModal(card));
          cardsContainer.appendChild(el);
        });
      });
  }

  loadSpinBalance();

  const style = document.createElement("style");
  style.textContent = `
    @keyframes glow-pulse {
      0% { box-shadow: 0 0 25px 10px gold, 0 0 50px 20px orange; }
      50% { box-shadow: 0 0 35px 15px #ffd700, 0 0 60px 30px #ff9900; }
      100% { box-shadow: 0 0 25px 10px gold, 0 0 50px 20px orange; }
    }
  `;
  document.head.appendChild(style);
});

window.addEventListener("deviceorientation", (event) => {
  const flipContainer = document.querySelector(".card-flip-container");
  if (!flipContainer || flipContainer.closest(".modal.hidden")) return;

  const tiltX = event.gamma || 0;
  const maxTilt = 15;
  const clampedTiltX = Math.max(-maxTilt, Math.min(maxTilt, tiltX));

  flipContainer.style.transform = `perspective(800px) rotateY(${clampedTiltX}deg)`;
});
