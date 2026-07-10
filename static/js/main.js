a
const header = document.getElementById("mainHeader");
const menuBtn = document.getElementById("menuBtn");
const mobileNav = document.getElementById("mobileNav");

window.addEventListener("scroll", () => {
  header.classList.toggle("scrolled", window.scrollY > 20);
});

menuBtn.addEventListener("click", () => {
  menuBtn.classList.toggle("active");
  mobileNav.classList.toggle("active");
});

document.querySelectorAll(".top-nav a").forEach(link => {
  link.addEventListener("click", () => {
    menuBtn.classList.remove("active");
    mobileNav.classList.remove("active");
  });
});

document.querySelectorAll(".quick-tags button").forEach(tag => {
  tag.addEventListener("click", () => {
    document.querySelector(".ai-search-box input").value = tag.innerText;
  });
});