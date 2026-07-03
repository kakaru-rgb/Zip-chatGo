document.addEventListener("DOMContentLoaded", function () {
    var footer = document.querySelector(".jipgo-footer");

    if (!footer) {
        return;
    }

    var hoverTargets = footer.querySelectorAll(
        ".jipgo-footer__policy a, .jipgo-footer__nav-button, .jipgo-footer__nav-list a, .jipgo-footer__social a, .jipgo-footer__family-menu a"
    );

    hoverTargets.forEach(function (target) {
        target.addEventListener("mouseenter", function () {
            target.classList.add("is-hovered");
        });

        target.addEventListener("mouseleave", function () {
            target.classList.remove("is-hovered");
        });
    });

    var family = footer.querySelector(".jipgo-footer__family");
    var familyButton = footer.querySelector(".jipgo-footer__family-button");

    if (family && familyButton) {
        familyButton.addEventListener("click", function () {
            var isOpen = family.classList.toggle("is-open");
            familyButton.setAttribute("aria-expanded", String(isOpen));
        });

        document.addEventListener("click", function (event) {
            if (!family.contains(event.target)) {
                family.classList.remove("is-open");
                familyButton.setAttribute("aria-expanded", "false");
            }
        });

        document.addEventListener("keydown", function (event) {
            if (event.key === "Escape") {
                family.classList.remove("is-open");
                familyButton.setAttribute("aria-expanded", "false");
                familyButton.blur();
            }
        });
    }

    var sitemap = footer.querySelector(".jipgo-footer__sitemap");
    var sitemapButtons = footer.querySelectorAll(".jipgo-footer__nav-button");

    function setSitemapOpen(isOpen) {
        if (!sitemap) {
            return;
        }

        sitemap.classList.toggle("is-open", isOpen);

        sitemapButtons.forEach(function (button) {
            button.setAttribute("aria-expanded", String(isOpen));
        });
    }

    if (sitemap) {
        sitemap.addEventListener("mouseenter", function () {
            setSitemapOpen(true);
        });

        sitemap.addEventListener("mouseleave", function () {
            setSitemapOpen(false);

            if (sitemap.contains(document.activeElement)) {
                document.activeElement.blur();
            }
        });

        sitemap.addEventListener("focusin", function () {
            setSitemapOpen(true);
        });

        sitemap.addEventListener("focusout", function (event) {
            if (!sitemap.contains(event.relatedTarget)) {
                setSitemapOpen(false);
            }
        });
    }

    var topButton = footer.querySelector(".jipgo-footer__top-button");

    if (topButton) {
        topButton.addEventListener("click", function (event) {
            event.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        });
    }
});
