/**
 * HH GOA 2026 — BUILDER ID GENERATOR
 * Vanilla JS. No build step. No framework.
 */
(function(){
  "use strict";

  /* =====================================================================
     CONSTANTS
     ===================================================================== */
  // Card canvas matches the native pixel size of the supplied template
  // artwork (assets/branding/id-card-template.png) 1:1, so every
  // measured overlay coordinate below maps directly onto it with no
  // rescaling math required.
  const CARD_W = 999;
  const CARD_H = 1574;

  const COLORS = {
    greenTop:   "#3FE072",
    greenMid:   "#22B24C",
    greenDeep:  "#0E3B1C",
    greenDark:  "#0A2413",
    paper:      "#FFFCF0",
    paperDim:   "#F5EFDA",
    ink:        "#0A140D",
    inkSoft:    "rgba(10,20,9,0.65)",
    line:       "rgba(10,20,9,0.16)",
    lineSoft:   "rgba(255,252,240,0.14)",
    text:       "#FFFCF0",
    muted:      "rgba(255,252,240,0.62)",
    yellow:     "#FFE619",
    pink:       "#FF3E88",
    red:        "#FF4B2E",
    // colors sampled directly from the template artwork, used only to
    // paint over its placeholder labels before drawing live text
    templateBg:   "#002C19",
    templatePink: "#F55E7E",
    templateText: "#003214"
  };

  // Circular photo frame — matches the yellow ring already painted into
  // the template artwork (center ~498,851 / inner radius ~178). Radius
  // is kept a few px inside that ring so the uploaded photo never
  // overlaps or hides it.
  const PHOTO_FRAME = { x: 323, y: 676, w: 350, h: 350 };

  // Text overlay zones — each maps to one placeholder label baked into
  // the template artwork ("YOUR NAME", "TEAM NAME", "ROLE", "TAGLINE").
  // "erase" is the safe rectangle painted over the placeholder (sized to
  // avoid the confetti/rule decorations already printed around it);
  // dynamic text is then centered in the same spot.
  const NAME_ZONE  = { erase: { x: 195, y: 1055, w: 610, h: 95 },  cx: 499.5, cy: 1104, maxWidth: 560, baseSize: 72 };
  const TEAM_ZONE  = { erase: { x: 280, y: 1180, w: 440, h: 48 },  cx: 499.5, cy: 1205, maxWidth: 400, baseSize: 28 };
  const ROLE_ZONE  = { erase: { x: 110, y: 1282, w: 780, h: 66 },  cx: 499.5, cy: 1316, maxWidth: 740, baseSize: 40 };
  const TAGLINE_ZONE = { erase: { x: 340, y: 1397, w: 320, h: 38 }, cx: 499.5, cy: 1416, maxWidth: 280, baseSize: 26 };

  /* =====================================================================
     STATE
     ===================================================================== */
  const state = {
    photo: { img: null, scale: 1, offsetX: 0, offsetY: 0, maxOffsetX: 0, maxOffsetY: 0, baseScale: 1 },
    name: "",
    teamName: "",
    stacks: [],       // selected chip tags, in click order
    customStack: "",
    builderTitle: "THE BUILDER",
    idCode: generateIdCode()
  };

  const sessionId = getOrCreateSessionId();

  /* =====================================================================
     DOM
     ===================================================================== */
  const canvas       = document.getElementById("cardCanvas");
  const ctx           = canvas.getContext("2d");
  const dropzone       = document.getElementById("dropzone");
  const dropzoneEmpty  = document.getElementById("dropzoneEmpty");
  const dropzoneFilled = document.getElementById("dropzoneFilled");
  const photoInput     = document.getElementById("photoInput");
  const replacePhotoBtn= document.getElementById("replacePhotoBtn");
  const photoControls  = document.getElementById("photoControls");
  const zoomSlider      = document.getElementById("zoomSlider");
  const dragLayer      = document.getElementById("dragLayer");
  const nameInput      = document.getElementById("nameInput");
  const teamNameInput  = document.getElementById("teamNameInput");
  const chipGrid        = document.getElementById("chipGrid");
  const customStackInput = document.getElementById("customStackInput");
  const titleReadout    = document.getElementById("titleReadout");
  const downloadBtn     = document.getElementById("downloadBtn");
  const shareBtn        = document.getElementById("shareBtn");
  const statusLine      = document.getElementById("statusLine");

  let renderQueued = false;

  // the exact supplied ID card artwork — sun, ocean, sand, palm fronds,
  // umbrella, surf shack, brand marks, frame border, rule lines and all
  // placeholder labels are baked into this single image and drawn as-is.
  // Only the photo, name, team name, role and tagline are painted on top.
  const templateImg = new Image();
  let templateLoaded = false;
  function loadBrandAssets(){
    templateImg.onload = () => { templateLoaded = true; scheduleRender(); };
    templateImg.src = "assets/branding/id-card-template.png";
  }

  /* =====================================================================
     STAGE 1 — INTRO SEQUENCE
     ===================================================================== */
  const introEl   = document.getElementById("intro");
  const introWipe = document.getElementById("introWipe");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function runIntro(){
    if (!introEl) return;

    // body starts locked while the intro plays
    document.body.style.overflow = "hidden";

    let autoTimer = null;

    if (prefersReducedMotion){
      // show the final intro state immediately, skip the choreographed build-up
      introEl.classList.add("is-beach-in","is-logo-in","is-mark-in","is-graphics-in");
      autoTimer = setTimeout(leaveIntro, 900);
    } else {
      // STAGE 1 — beach illustration, full-screen, the only visual on load
      requestAnimationFrame(() => {
        introEl.classList.add("is-beach-in");                                      // 0.0s → subtle scale settles ~0.5s

        // STAGE 2 — original Hacker House × Goa logo, over the beach
        setTimeout(() => introEl.classList.add("is-logo-in"), 1000);               // 1.0s → fully visible ~1.5s

        // STAGE 3 — branding reveal (2:41PM Studio mark)
        setTimeout(() => {
          introEl.classList.add("is-mark-in","is-graphics-in");
        }, 1700);                                                                  // 1.7s → settled ~2.2s
      });
      autoTimer = setTimeout(leaveIntro, 2600);                                    // hold ends, transition begins ~2.6s
    }

    function leaveIntro(){
      if (introEl.classList.contains("is-leaving")) return;
      clearTimeout(autoTimer);
      introEl.removeEventListener("click", leaveIntro);
      introEl.removeEventListener("keydown", onKey);

      if (prefersReducedMotion){
        introEl.hidden = true;
        document.body.style.overflow = "";
        return;
      }

      introWipe.classList.add("is-wiping");
      setTimeout(() => {
        introEl.classList.add("is-leaving");
        introWipe.classList.add("is-wiped-out");
        document.body.style.overflow = "";
      }, 560);
      setTimeout(() => {
        introEl.hidden = true;
      }, 1500);
    }

    function onKey(e){
      if (e.key === "Enter" || e.key === " "){ e.preventDefault(); leaveIntro(); }
    }

    introEl.addEventListener("click", leaveIntro);
    introEl.addEventListener("keydown", onKey);
  }

  /* =====================================================================
     INIT
     ===================================================================== */
  function init(){
    loadBrandAssets();
    bindEvents();
    scheduleRender();
    runIntro();
  }

  function bindEvents(){
    dropzone.addEventListener("click", () => photoInput.click());
    dropzone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " "){ e.preventDefault(); photoInput.click(); }
    });
    replacePhotoBtn.addEventListener("click", (e) => { e.stopPropagation(); photoInput.click(); });
    photoInput.addEventListener("change", onPhotoSelected);

    ["dragenter","dragover"].forEach(evt =>
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.add("is-dragover"); })
    );
    ["dragleave","drop"].forEach(evt =>
      dropzone.addEventListener(evt, (e) => { e.preventDefault(); dropzone.classList.remove("is-dragover"); })
    );
    dropzone.addEventListener("drop", (e) => {
      const file = e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) loadPhotoFile(file);
    });

    zoomSlider.addEventListener("input", () => {
      state.photo.scale = Number(zoomSlider.value) / 100;
      clampOffsets();
      scheduleRender();
    });

    nameInput.addEventListener("input", () => {
      state.name = nameInput.value;
      recomputeTitle();
      scheduleRender();
    });

    teamNameInput.addEventListener("input", () => {
      state.teamName = teamNameInput.value;
      scheduleRender();
    });

    chipGrid.addEventListener("click", (e) => {
      const btn = e.target.closest(".chip");
      if (!btn) return;
      const tag = btn.dataset.tag;
      toggleStack(tag, btn);
    });

    customStackInput.addEventListener("input", () => {
      state.customStack = customStackInput.value.trim();
      recomputeTitle();
      scheduleRender();
    });

    downloadBtn.addEventListener("click", handleDownload);
    shareBtn.addEventListener("click", handleShare);

    bindDragToReposition();

    window.addEventListener("resize", scheduleRender);
  }

  /* =====================================================================
     PHOTO UPLOAD
     ===================================================================== */
  function onPhotoSelected(e){
    const file = e.target.files && e.target.files[0];
    if (file) loadPhotoFile(file);
  }

  function loadPhotoFile(file){
    if (!file.type.startsWith("image/")){
      setStatus("That file isn't an image — try a JPG, PNG or WEBP.", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        state.photo.img = img;
        state.photo.scale = 1;
        state.photo.offsetX = 0;
        state.photo.offsetY = 0;
        zoomSlider.value = 100;
        computeBaseScale();
        dropzoneEmpty.hidden = true;
        dropzoneFilled.hidden = false;
        photoControls.hidden = false;
        setStatus("");
        scheduleRender();
      };
      img.onerror = () => setStatus("Couldn't read that image — try a different file.", "error");
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  }

  function computeBaseScale(){
    const img = state.photo.img;
    if (!img) return;
    const frameW = PHOTO_FRAME.w, frameH = PHOTO_FRAME.h;
    // cover-fit: scale so the smaller dimension fills the frame
    state.photo.baseScale = Math.max(frameW / img.width, frameH / img.height);
    clampOffsets();
  }

  function clampOffsets(){
    const img = state.photo.img;
    if (!img) return;
    const total = state.photo.baseScale * state.photo.scale;
    const drawW = img.width * total;
    const drawH = img.height * total;
    state.photo.maxOffsetX = Math.max(0, (drawW - PHOTO_FRAME.w) / 2);
    state.photo.maxOffsetY = Math.max(0, (drawH - PHOTO_FRAME.h) / 2);
    state.photo.offsetX = clamp(state.photo.offsetX, -state.photo.maxOffsetX, state.photo.maxOffsetX);
    state.photo.offsetY = clamp(state.photo.offsetY, -state.photo.maxOffsetY, state.photo.maxOffsetY);
  }

  function clamp(v, lo, hi){ return Math.min(hi, Math.max(lo, v)); }

  /* --- drag to reposition (mouse + touch, via pointer events) --- */
  function bindDragToReposition(){
    let dragging = false;
    let lastX = 0, lastY = 0;

    dragLayer.addEventListener("pointerdown", (e) => {
      if (!state.photo.img) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      dragLayer.setPointerCapture(e.pointerId);
    });

    dragLayer.addEventListener("pointermove", (e) => {
      if (!dragging || !state.photo.img) return;
      const rect = canvas.getBoundingClientRect();
      const scaleFactor = CARD_W / rect.width; // css px -> canvas px
      const dx = (e.clientX - lastX) * scaleFactor;
      const dy = (e.clientY - lastY) * scaleFactor;
      lastX = e.clientX;
      lastY = e.clientY;
      state.photo.offsetX = clamp(state.photo.offsetX + dx, -state.photo.maxOffsetX, state.photo.maxOffsetX);
      state.photo.offsetY = clamp(state.photo.offsetY + dy, -state.photo.maxOffsetY, state.photo.maxOffsetY);
      scheduleRender();
    });

    ["pointerup","pointercancel","pointerleave"].forEach(evt =>
      dragLayer.addEventListener(evt, () => { dragging = false; })
    );
  }

  /* =====================================================================
     STACK CHIPS + BUILDER TITLE
     ===================================================================== */
  function toggleStack(tag, btn){
    const idx = state.stacks.indexOf(tag);
    if (idx === -1){
      state.stacks.push(tag);
      btn.classList.add("is-selected");
    } else {
      state.stacks.splice(idx, 1);
      btn.classList.remove("is-selected");
    }
    recomputeTitle();
    scheduleRender();
  }

  // family taxonomy for title generation
  const FAMILY_MAP = {
    "HTML": "web", "CSS": "web",
    "JavaScript": "interface", "React": "interface", "Next.js": "interface",
    "Python": "data", "AI / ML": "data",
    "C++": "systems", "Java": "systems",
    "Node.js": "backend",
    "Flutter": "mobile",
    "Designer": "design",
    "Product": "product",
    "Founder": "founder"
  };

  const FAMILY_NOUN = {
    web: "WEB", interface: "INTERFACE", data: "MODEL", systems: "SYSTEMS",
    backend: "BACKEND", mobile: "APP", design: "PIXEL", product: "PRODUCT",
    founder: "IDEA", custom: "CUSTOM"
  };

  const FAMILY_TITLE = {
    web: "THE WEB CRAFTSMAN",
    interface: "THE INTERFACE BUILDER",
    data: "THE MODEL WHISPERER",
    systems: "THE SYSTEMS BUILDER",
    backend: "THE BACKEND ARCHITECT",
    mobile: "THE APP ALCHEMIST",
    design: "THE PIXEL ARCHITECT",
    product: "THE PRODUCT SHIPPER",
    founder: "THE IDEA ENGINE"
  };

  // priority order when picking the "lead" families for a combined title
  const FAMILY_PRIORITY = ["founder","product","design","data","interface","mobile","systems","backend","web"];

  function recomputeTitle(){
    const families = new Set();
    state.stacks.forEach(tag => families.add(FAMILY_MAP[tag] || "custom"));
    if (state.customStack) families.add("custom");

    if (families.size === 0){
      state.builderTitle = "THE BUILDER";
    } else if (families.size === 1){
      const only = [...families][0];
      state.builderTitle = only === "custom"
        ? `THE ${sanitizeWord(state.customStack)} BUILDER`
        : FAMILY_TITLE[only];
    } else {
      // rank families by priority, take top two for a combined title
      const ranked = [...families].sort((a,b) => FAMILY_PRIORITY.indexOf(a) - FAMILY_PRIORITY.indexOf(b));
      const known = ranked.filter(f => f !== "custom");

      if (known.length >= 3){
        state.builderTitle = "THE FULL-STACK BUILDER";
      } else if (known.length === 2){
        const [a,b] = known;
        state.builderTitle = `THE ${FAMILY_NOUN[a]} × ${FAMILY_NOUN[b]} BUILDER`;
      } else if (known.length === 1 && families.has("custom")){
        state.builderTitle = `THE ${FAMILY_NOUN[known[0]]} × ${sanitizeWord(state.customStack)} BUILDER`;
      } else {
        state.builderTitle = `THE ${sanitizeWord(state.customStack)} BUILDER`;
      }
    }
    if (titleReadout.textContent !== state.builderTitle){
      titleReadout.textContent = state.builderTitle;
      titleReadout.classList.remove("is-popping");
      void titleReadout.offsetWidth; // restart animation
      titleReadout.classList.add("is-popping");
    }
  }

  function sanitizeWord(str){
    if (!str) return "CUSTOM";
    return str.trim().split(/\s+/)[0].toUpperCase().replace(/[^A-Z0-9+]/g, "") || "CUSTOM";
  }

  /* =====================================================================
     RENDER LOOP
     ===================================================================== */
  function scheduleRender(){
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(() => { renderQueued = false; renderCard(); });
  }

  function renderCard(){
    ctx.clearRect(0,0,CARD_W,CARD_H);
    drawTemplateBackground();
    if (!templateLoaded) return; // nothing to overlay onto yet
    drawPhotoBadge();
    drawIdentityBlock();
  }

  /* --- the supplied template artwork, drawn 1:1, untouched --- */
  function drawTemplateBackground(){
    if (templateLoaded){
      ctx.drawImage(templateImg, 0, 0, CARD_W, CARD_H);
    } else {
      // simple placeholder fill while the template image is loading
      ctx.fillStyle = COLORS.templateBg;
      ctx.fillRect(0, 0, CARD_W, CARD_H);
    }
  }

  /* --- circular photo, clipped just inside the template's yellow ring --- */
  function drawPhotoBadge(){
    if (!state.photo.img) return; // no upload yet: template's own "YOUR PHOTO" placeholder shows through
    const { x, y, w } = PHOTO_FRAME;
    const r = w/2, cx = x + r, cy = y + r;
    const img = state.photo.img;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.closePath();
    ctx.clip();

    const total = state.photo.baseScale * state.photo.scale;
    const drawW = img.width * total;
    const drawH = img.height * total;
    const px = cx + state.photo.offsetX;
    const py = cy + state.photo.offsetY;
    ctx.drawImage(img, px - drawW/2, py - drawH/2, drawW, drawH);
    ctx.restore();
  }

  /* --- name, team, role, tagline: painted over the template's own
     placeholder labels at their exact positions --- */
  function drawIdentityBlock(){
    drawNameZone();
    drawTeamZone();
    drawRoleZone();
    drawTaglineZone();
  }

  function eraseZone(erase, fillColor){
    ctx.save();
    ctx.fillStyle = fillColor;
    ctx.fillRect(erase.x, erase.y, erase.w, erase.h);
    ctx.restore();
  }

  function drawNameZone(){
    const displayName = state.name.trim();
    if (!displayName) return; // template already reads "YOUR NAME"
    const zone = NAME_ZONE;
    eraseZone(zone.erase, COLORS.templateBg);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.paper;
    const text = displayName.toUpperCase();
    ctx.font = fitFont(text, `900 ${zone.baseSize}px 'Archivo Black', sans-serif`, zone.baseSize, zone.maxWidth);
    ctx.fillText(text, zone.cx, zone.cy);
    ctx.restore();
  }

  function drawTeamZone(){
    const teamName = state.teamName.trim();
    if (!teamName) return; // template already reads "TEAM NAME" on the pill
    const zone = TEAM_ZONE;
    eraseZone(zone.erase, COLORS.templatePink);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.templateText;
    const text = teamName.toUpperCase();
    ctx.font = fitFont(text, `800 ${zone.baseSize}px 'Archivo Black', sans-serif`, zone.baseSize, zone.maxWidth);
    ctx.fillText(text, zone.cx, zone.cy);
    ctx.restore();
  }

  function drawRoleZone(){
    // builderTitle always has a value (defaults to "THE BUILDER"), so this
    // always overlays the template's generic "ROLE" placeholder.
    const zone = ROLE_ZONE;
    eraseZone(zone.erase, COLORS.templateBg);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.paper;
    ctx.font = fitFont(state.builderTitle, `900 ${zone.baseSize}px 'Archivo Black', sans-serif`, zone.baseSize, zone.maxWidth);
    ctx.fillText(state.builderTitle, zone.cx, zone.cy);
    ctx.restore();
  }

  function drawTaglineZone(){
    // always-on hashtag, in the template's own plain-white style
    const zone = TAGLINE_ZONE;
    eraseZone(zone.erase, COLORS.templateBg);
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.paper;
    const text = "#FrameInGoa";
    ctx.font = fitFont(text, `800 ${zone.baseSize}px 'Archivo Black', sans-serif`, zone.baseSize, zone.maxWidth);
    ctx.fillText(text, zone.cx, zone.cy);
    ctx.restore();
  }

  function fitFont(text, baseFont, baseSize, maxWidth){
    ctx.font = baseFont;
    let size = baseSize;
    while (ctx.measureText(text).width > maxWidth && size > 16){
      size -= 2;
      ctx.font = baseFont.replace(String(baseSize)+"px", size+"px");
    }
    return ctx.font;
  }

  function roundRectPath(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  /* =====================================================================
     DOWNLOAD
     ===================================================================== */
  function handleDownload(){
    if (!state.name.trim()){
      setStatus("Add your name before downloading.", "error");
      nameInput.focus();
      return;
    }
    downloadBtn.disabled = true;
    setStatus("Rendering PNG…");

    // ensure final frame is drawn at full res before export
    renderCard();

    canvas.toBlob((blob) => {
      if (!blob){
        setStatus("Couldn't generate the PNG — try again.", "error");
        downloadBtn.disabled = false;
        return;
      }
      const filename = buildFilename(state.name);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setStatus("Downloaded ✓ — saved as " + filename, "success");
      downloadBtn.disabled = false;

      // fire-and-forget cloud sync; never blocks the download
      saveCardAsync(blob).catch(() => {});
    }, "image/png", 1);
  }

  function buildFilename(name){
    const clean = name.trim().replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
    return `HH-Goa-2026-${clean || "Builder"}.png`;
  }

  /* =====================================================================
     SHARE TO X
     ===================================================================== */
  function handleShare(){
    const stackList = [...state.stacks, state.customStack].filter(Boolean).join(", ");
    const lines = [
      "Just unlocked my HH Goa 2026 Builder ID.",
      stackList ? `Building with ${stackList}.` : "Building at HH Goa 2026.",
      "#FrameInGoa"
    ];
    const text = lines.join("\n\n");
    const url = "https://twitter.com/intent/tweet?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener,noreferrer");
    setStatus("Opened X — attach your downloaded PNG to the post.", "success");
  }

  /* =====================================================================
     SUPABASE (optional, async, never blocks the UI)
     ===================================================================== */
  let supabaseClient = null;

  function initSupabase(){
    try {
      const cfg = window.SUPABASE_CONFIG;
      if (!cfg || !window.supabase) return;
      if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes("YOUR_")) return;
      if (!cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes("YOUR_")) return;
      supabaseClient = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    } catch (err){
      console.warn("Supabase unavailable — running fully offline.", err);
      supabaseClient = null;
    }
  }

  async function saveCardAsync(blob){
    if (!supabaseClient) return; // offline mode: core app already worked
    const cfg = window.SUPABASE_CONFIG;
    try {
      const path = `cards/${sessionId}-${Date.now()}.png`;
      let imageUrl = null;

      const { error: upErr } = await supabaseClient
        .storage.from(cfg.STORAGE_BUCKET)
        .upload(path, blob, { contentType: "image/png", upsert: true });

      if (!upErr){
        const { data } = supabaseClient.storage.from(cfg.STORAGE_BUCKET).getPublicUrl(path);
        imageUrl = data ? data.publicUrl : null;
      } else {
        console.warn("Supabase storage upload skipped:", upErr.message);
      }

      const { error: dbErr } = await supabaseClient.from(cfg.TABLE_NAME).insert({
        name: state.name,
        stack: [...state.stacks, state.customStack].filter(Boolean),
        role: state.stacks.find(t => ["Designer","Product","Founder"].includes(t)) || null,
        builder_title: state.builderTitle,
        image_url: imageUrl,
        session_id: sessionId
      });

      if (dbErr) console.warn("Supabase metadata insert skipped:", dbErr.message);
    } catch (err){
      console.warn("Supabase sync skipped (offline or unreachable):", err);
    }
  }

  /* =====================================================================
     HELPERS
     ===================================================================== */
  function setStatus(msg, kind){
    statusLine.textContent = msg || "";
    statusLine.classList.remove("is-success","is-error");
    if (kind === "success") statusLine.classList.add("is-success");
    if (kind === "error") statusLine.classList.add("is-error");
  }

  function generateIdCode(){
    return "HH26-" + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function getOrCreateSessionId(){
    try {
      let id = localStorage.getItem("hhgoa_session_id");
      if (!id){
        id = "s_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
        localStorage.setItem("hhgoa_session_id", id);
      }
      return id;
    } catch (e){
      return "s_" + Math.random().toString(36).slice(2, 10);
    }
  }

  /* =====================================================================
     GO
     ===================================================================== */
  document.addEventListener("DOMContentLoaded", () => {
    init();
    // give Supabase UMD (deferred script) a tick to attach to window
    window.addEventListener("load", initSupabase);
  });
})();
