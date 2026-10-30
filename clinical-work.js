(function () {
  var grid = document.getElementById("case-grid");
  var count = document.querySelector(".case-count");
  var modal = document.querySelector(".case-modal");
  var modalContent = document.querySelector(".modal-content");
  var activeFilter = "all";
  var visibleCases = clinicalCases.slice();
  var activeCaseIndex = 0;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.getElementById("year").textContent = String(new Date().getFullYear());

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (character) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character];
    });
  }

  function detailRow(label, value) {
    if (!value) return "";
    return '<div><dt>' + label + '</dt><dd>' + escapeHtml(value) + '</dd></div>';
  }

  function comparisonMarkup(item, prefix) {
    var beforeAlt = "Before treatment: " + item.title;
    var afterAlt = "After treatment: " + item.title;
    return '<div class="comparison" data-comparison style="--position:50%" aria-label="Before and after comparison for ' + escapeHtml(item.title) + '">' +
      '<picture class="after-layer"><img src="' + escapeHtml(item.after) + '" alt="' + escapeHtml(afterAlt) + '" width="1200" height="900" loading="lazy" draggable="false"></picture>' +
      '<picture class="before-layer"><img src="' + escapeHtml(item.before) + '" alt="' + escapeHtml(beforeAlt) + '" width="1200" height="900" loading="lazy" draggable="false"></picture>' +
      '<span class="comparison-label comparison-label--before">Before</span><span class="comparison-label comparison-label--after">After</span>' +
      '<button class="comparison-handle" type="button" role="slider" tabindex="0" aria-label="Compare before and after treatment for ' + escapeHtml(item.title) + '" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"></button>' +
      '<div class="comparison-tools"><button class="view-toggle" type="button" aria-pressed="false" aria-label="Switch to side by side images">Side by side</button></div>' +
    '</div>';
  }

  function cardMarkup(item) {
    var details = detailRow("Chief complaint / Diagnosis", item.diagnosis) + detailRow("What I did", item.treatment);
    var durations = (item.duration ? '<span><strong>Duration:</strong> ' + escapeHtml(item.duration) + '</span>' : "") +
      (item.result ? '<span><strong>Result:</strong> ' + escapeHtml(item.result) + '</span>' : "");
    return '<article class="case-card reveal" tabindex="0" data-case-id="' + escapeHtml(item.id) + '" aria-label="Open case details: ' + escapeHtml(item.title) + '">' +
      comparisonMarkup(item, "card") +
      '<div class="case-copy"><span class="case-tag">' + escapeHtml(item.treatmentLabel || item.category) + '</span>' +
      '<h2>' + escapeHtml(item.title) + '</h2>' +
      '<dl class="case-details">' + details + '</dl>' +
      (durations ? '<div class="card-duration">' + durations + '</div>' : "") +
      '</div></article>';
  }

  function attachComparisonEvents(scope) {
    scope.querySelectorAll("[data-comparison]").forEach(function (comparison) {
      var slider = comparison.querySelector(".comparison-handle");
      var toggle = comparison.querySelector(".view-toggle");
      function setPosition(position) {
        var bounded = Math.max(0, Math.min(100, position));
        comparison.style.setProperty("--position", bounded + "%");
        slider.setAttribute("aria-valuenow", String(Math.round(bounded)));
      }
      comparison.addEventListener("pointerdown", function (event) {
        if (event.target.closest(".view-toggle")) return;
        if (event.button !== undefined && event.button !== 0) return;
        comparison.setPointerCapture(event.pointerId);
        setPosition(((event.clientX - comparison.getBoundingClientRect().left) / comparison.clientWidth) * 100);
      });
      comparison.addEventListener("pointermove", function (event) {
        if (!comparison.hasPointerCapture(event.pointerId)) return;
        setPosition(((event.clientX - comparison.getBoundingClientRect().left) / comparison.clientWidth) * 100);
      });
      slider.addEventListener("keydown", function (event) {
        var current = Number(slider.getAttribute("aria-valuenow"));
        if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
          event.preventDefault();
          setPosition(current - 2);
        } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
          event.preventDefault();
          setPosition(current + 2);
        } else if (event.key === "Home") {
          event.preventDefault();
          setPosition(0);
        } else if (event.key === "End") {
          event.preventDefault();
          setPosition(100);
        }
      });
      toggle.addEventListener("click", function (event) {
        event.stopPropagation();
        var sideBySide = comparison.classList.toggle("side-by-side");
        toggle.setAttribute("aria-pressed", String(sideBySide));
        toggle.setAttribute("aria-label", sideBySide ? "Switch to comparison slider" : "Switch to side by side images");
        toggle.textContent = sideBySide ? "Slider view" : "Side by side";
      });
      comparison.querySelectorAll("img").forEach(function (image) {
        function loaded() { image.classList.add("is-loaded"); }
        if (image.complete && image.naturalWidth) loaded();
        image.addEventListener("load", loaded, { once: true });
      });
    });
  }

  function setVisibleCases() {
    visibleCases = clinicalCases.filter(function (item) {
      return activeFilter === "all" || item.category === activeFilter;
    });
    count.textContent = visibleCases.length + (visibleCases.length === 1 ? " case" : " cases");
    grid.classList.add("is-changing");
    window.setTimeout(function () {
      grid.innerHTML = visibleCases.map(cardMarkup).join("");
      attachComparisonEvents(grid);
      if (!reduceMotion && "IntersectionObserver" in window) {
        var observer = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              observer.unobserve(entry.target);
            }
          });
        }, { threshold: .08 });
        grid.querySelectorAll(".case-card").forEach(function (card) { observer.observe(card); });
      } else {
        grid.querySelectorAll(".case-card").forEach(function (card) { card.classList.add("is-visible"); });
      }
      requestAnimationFrame(function () { grid.classList.remove("is-changing"); });
    }, reduceMotion ? 0 : 120);
  }

  function renderModal(index) {
    activeCaseIndex = (index + visibleCases.length) % visibleCases.length;
    var item = visibleCases[activeCaseIndex];
    modalContent.innerHTML = comparisonMarkup(item, "modal") +
      '<div class="case-copy"><span class="case-tag">' + escapeHtml(item.treatmentLabel || item.category) + '</span>' +
      '<h2>' + escapeHtml(item.title) + '</h2><dl class="case-details">' +
      detailRow("Chief complaint / Diagnosis", item.diagnosis) + detailRow("What I did", item.treatment) +
      '</dl>' +
      ((item.duration || item.result) ? '<div class="card-duration">' +
        (item.duration ? '<span><strong>Duration:</strong> ' + escapeHtml(item.duration) + '</span>' : "") +
        (item.result ? '<span><strong>Result:</strong> ' + escapeHtml(item.result) + '</span>' : "") +
      '</div>' : "") + '</div>';
    attachComparisonEvents(modalContent);
  }

  grid.addEventListener("click", function (event) {
    if (event.target.closest("button")) return;
    var card = event.target.closest(".case-card");
    if (!card) return;
    var index = visibleCases.findIndex(function (item) { return item.id === card.dataset.caseId; });
    if (index < 0) return;
    renderModal(index);
    modal.showModal();
  });
  grid.addEventListener("keydown", function (event) {
    if (event.target !== event.currentTarget && !event.target.classList.contains("case-card")) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!event.target.classList.contains("case-card")) return;
    event.preventDefault();
    event.target.click();
  });

  document.querySelectorAll(".filter-chip").forEach(function (button) {
    button.addEventListener("click", function () {
      activeFilter = button.dataset.filter;
      document.querySelectorAll(".filter-chip").forEach(function (chip) {
        var selected = chip === button;
        chip.classList.toggle("is-active", selected);
        chip.setAttribute("aria-pressed", String(selected));
      });
      setVisibleCases();
    });
  });

  document.querySelector(".modal-close").addEventListener("click", function () { modal.close(); });
  document.querySelector(".modal-prev").addEventListener("click", function () { renderModal(activeCaseIndex - 1); });
  document.querySelector(".modal-next").addEventListener("click", function () { renderModal(activeCaseIndex + 1); });
  modal.addEventListener("cancel", function (event) {
    event.preventDefault();
    modal.close();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && modal.open) modal.close();
  });
  modal.addEventListener("click", function (event) {
    if (event.target === modal) modal.close();
  });

  var menuButton = document.querySelector(".nav-toggle");
  var menu = document.getElementById("nav-links");
  if (menuButton && menu) {
    menuButton.addEventListener("click", function () {
      var open = menuButton.getAttribute("aria-expanded") !== "true";
      menuButton.setAttribute("aria-expanded", String(open));
      menuButton.setAttribute("aria-label", open ? "Close navigation menu" : "Open navigation menu");
      menu.classList.toggle("is-open", open);
    });
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
        menu.classList.remove("is-open");
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation menu");
        menu.classList.remove("is-open");
      }
    });
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: .1 });
    document.querySelectorAll(".reveal").forEach(function (item) { revealObserver.observe(item); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (item) { item.classList.add("is-visible"); });
  }

  setVisibleCases();
}());
