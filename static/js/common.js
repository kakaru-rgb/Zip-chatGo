const menuBtn = document.getElementById("menuBtn");
const mobileNav = document.getElementById("mobileNav");
const mainHeader = document.getElementById("mainHeader");

/* ==========================
   모바일 메뉴
========================== */

if (menuBtn && mobileNav) {

    menuBtn.addEventListener("click", () => {

        menuBtn.classList.toggle("active");
        mobileNav.classList.toggle("active");

    });

}

/* ==========================
   스크롤 헤더 효과
========================== */

if (mainHeader) {

    window.addEventListener("scroll", () => {

        if (window.scrollY > 20) {

            mainHeader.classList.add("scrolled");

        } else {

            mainHeader.classList.remove("scrolled");

        }

    });

}

/* ==========================
   새 창으로 열기
========================== */

document.querySelectorAll(".new-window").forEach(link => {
    link.target = "_blank";
    link.rel = "noopener noreferrer";
});