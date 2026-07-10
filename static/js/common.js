/* ==========================
   common.js
   공통 헤더 / 모바일 메뉴 / 로그인 상태 처리
========================== */

document.addEventListener("DOMContentLoaded", () => {
  initHeaderScroll();
  initMobileMenu();
  updateLoginMenu();
});

/* ==========================
   스크롤 헤더 효과
========================== */

function initHeaderScroll() {
  const header = document.getElementById("mainHeader");

  if (!header) return;

  window.addEventListener("scroll", () => {
    header.classList.toggle("scrolled", window.scrollY > 20);
  });
}

/* ==========================
   모바일 메뉴
========================== */

function initMobileMenu() {
  const menuBtn = document.getElementById("menuBtn");
  const mobileNav = document.getElementById("mobileNav");

  if (!menuBtn || !mobileNav) return;

  menuBtn.addEventListener("click", () => {
    const isOpen = mobileNav.classList.toggle("active");
    menuBtn.classList.toggle("active", isOpen);
    document.body.classList.toggle("nav-open", isOpen);
    menuBtn.setAttribute("aria-expanded", String(isOpen));
    menuBtn.setAttribute("aria-label", isOpen ? "메뉴 닫기" : "메뉴 열기");
  });

  document.querySelectorAll(".top-nav a").forEach(link => {
    link.addEventListener("click", () => {
      menuBtn.classList.remove("active");
      mobileNav.classList.remove("active");
      document.body.classList.remove("nav-open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "메뉴 열기");
    });
  });
}

/* ==========================
   로그인 상태 메뉴 변경
========================== */

function updateLoginMenu() {
  const loginUser = localStorage.getItem("jipchatgoLoginUser");
  const logoutButtons = document.querySelectorAll(".logout-btn");

  if (loginUser) {
    document.body.classList.add("login-active");
  } else {
    document.body.classList.remove("login-active");
  }

  logoutButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();

      localStorage.removeItem("jipchatgoLoginUser");
      document.body.classList.remove("login-active");

      alert("로그아웃 되었습니다.");
      location.href = "/index.html";
    });
  });
}
