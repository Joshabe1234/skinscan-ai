import { useState, useRef, useCallback, useEffect } from "react";

/*
 * ============================================
 * BACKEND CONNECTION
 * ============================================
 * Step 1: Run the colab-api-cell.py code in your Colab notebook
 * Step 2: Copy the ngrok URL it prints (e.g. https://a1b2c3d4.ngrok-free.app)
 * Step 3: Paste it below
 * Step 4: Set USE_MOCK = false (line ~120)
 * ============================================
 */
async function analyzeWithBackend(base64Image, mediaType) {
  // ⬇️ PASTE YOUR NGROK URL HERE ⬇️
  const API_URL = "https://dakota-unmemorialized-prohibitively.ngrok-free.dev/api/analyze";

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",  // skips ngrok's interstitial page
    },
    body: JSON.stringify({ image: base64Image }),
  });

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }

  return await response.json();
}

// ── Mock response for testing UI without backend ──
async function mockAnalyze() {
  await new Promise((r) => setTimeout(r, 2500));
  return {
    condition: "Contact Dermatitis",
    confidence: "high",
    severity: "mild",
    description:
      "This appears to be contact dermatitis, a common skin reaction caused by direct contact with an irritant or allergen. The redness and slight swelling are typical indicators of an inflammatory response.",
    body_area: "forearm",
    recommendations: [
      "Wash the area gently with mild soap and cool water",
      "Apply an over-the-counter hydrocortisone cream (1%)",
      "Avoid further contact with potential irritants",
    ],
    see_doctor: false,
    see_doctor_urgency: "none",
    home_care: [
      "Apply a cool, damp cloth to soothe irritation",
      "Use fragrance-free moisturizer to prevent dryness",
      "Monitor for spreading or worsening over 48 hours",
    ],
  };
}

// ── Image resize utility ──
function resizeImage(dataURL, maxDim = 1024) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve({ base64: dataURL.split(",")[1], mediaType: "image/jpeg" });
        return;
      }
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      c.getContext("2d").drawImage(img, 0, 0, width, height);
      resolve({ base64: c.toDataURL("image/jpeg", 0.8).split(",")[1], mediaType: "image/jpeg" });
    };
    img.onerror = reject;
    img.src = dataURL;
  });
}

const LOADING_MESSAGES = [
  "Examining your image...",
  "Analyzing skin patterns...",
  "Identifying potential conditions...",
  "Preparing your results...",
];

const SEV = {
  mild: { color: "#16a34a", bg: "#f0fdf4", border: "#bbf7d0", label: "Mild", dots: 1 },
  moderate: { color: "#ca8a04", bg: "#fefce8", border: "#fde68a", label: "Moderate", dots: 2 },
  severe: { color: "#dc2626", bg: "#fef2f2", border: "#fecaca", label: "Severe", dots: 3 },
};

const URG = {
  none: { text: "No doctor visit needed", color: "#16a34a", icon: "✓" },
  routine: { text: "Consider a routine checkup", color: "#16a34a", icon: "📋" },
  soon: { text: "See a doctor within a few days", color: "#ca8a04", icon: "⏰" },
  urgent: { text: "Seek medical attention promptly", color: "#dc2626", icon: "🚨" },
};

// ══════════════════════════════════════════
// Set to false when your backend is ready
const USE_MOCK = false;
// ══════════════════════════════════════════

export default function SkinScanAI() {
  const [screen, setScreen] = useState("home");
  const [image, setImage] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loadIdx, setLoadIdx] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  const fileRef = useRef(null);

  useEffect(() => {
    if (screen !== "loading") return;
    const iv = setInterval(() => setLoadIdx((p) => (p + 1) % LOADING_MESSAGES.length), 2400);
    return () => clearInterval(iv);
  }, [screen]);

  const onFile = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const url = r.result;
      setImage({ src: url, base64: url.split(",")[1], mediaType: f.type || "image/jpeg" });
      setScreen("preview");
    };
    r.readAsDataURL(f);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = () => {
      const url = r.result;
      setImage({ src: url, base64: url.split(",")[1], mediaType: f.type });
      setScreen("preview");
    };
    r.readAsDataURL(f);
  }, []);

  const analyze = useCallback(async () => {
    if (!image) return;
    setScreen("loading");
    setLoadIdx(0);
    setError(null);
    try {
      let b64 = image.base64;
      let mt = image.mediaType;
      try {
        const resized = await resizeImage(image.src, 1024);
        b64 = resized.base64;
        mt = resized.mediaType;
      } catch {}

      const data = USE_MOCK ? await mockAnalyze() : await analyzeWithBackend(b64, mt);
      setResult(data);
      setScreen("results");
    } catch (err) {
      setError(err.message || "Analysis failed. Please try again.");
      setScreen("preview");
    }
  }, [image]);

  const reset = useCallback(() => {
    setScreen("home");
    setImage(null);
    setResult(null);
    setError(null);
  }, []);

  return (
    <div className="ss-app">
      <input ref={fileRef} type="file" accept="image/*" onChange={onFile} hidden />

      {/* HEADER */}
      <header className="ss-header">
        <div className="ss-header-inner">
          {screen !== "home" && (
            <button onClick={reset} className="ss-back">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
            </button>
          )}
          <div className="ss-logo">
            <div className="ss-logo-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span className="ss-logo-text">SkinScan</span>
            <span className="ss-logo-ai">AI</span>
          </div>
        </div>
      </header>

      <main className="ss-main">
        {/* ─── HOME ─── */}
        {screen === "home" && (
          <div className="ss-home ss-fadein">
            <div className="ss-hero">
              <div className="ss-hero-badge">Powered by AI</div>
              <h1 className="ss-hero-title">
                Your skin, <em>understood</em>
              </h1>
              <p className="ss-hero-sub">
               Upload a photo of your skin to check for signs of acne, eczema, or just confirm everything looks good.
              </p>
            </div>

            <div
              className={`ss-dropzone ${dragOver ? "active" : ""}`}
              onClick={() => fileRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
            >
              <div className="ss-drop-icon">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </div>
              <strong className="ss-drop-title">Upload an image</strong>
              <span className="ss-drop-sub">Drag & drop or click to browse</span>
              <span className="ss-drop-formats">JPG, PNG, WEBP supported</span>
            </div>

            <div className="ss-features">
              {[
                { icon: "⚡", label: "Instant analysis" },
                { icon: "🛡️", label: "Private & secure" },
                { icon: "💊", label: "Care recommendations" },
              ].map((f) => (
                <div key={f.label} className="ss-feature-chip">
                  <span>{f.icon}</span> {f.label}
                </div>
              ))}
            </div>

            <div className="ss-disclaimer">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              <span>
                For informational purposes only. This is not a substitute for professional
                medical advice, diagnosis, or treatment.
              </span>
            </div>
          </div>
        )}

        {/* ─── PREVIEW ─── */}
        {screen === "preview" && image && (
          <div className="ss-preview ss-fadein">
            <div className="ss-preview-img-wrap">
              <img src={image.src} alt="Captured skin" className="ss-preview-img" />
            </div>
            {error && <div className="ss-error">{error}</div>}
            <div className="ss-preview-btns">
              <button onClick={reset} className="ss-btn-outline">Retake</button>
              <button onClick={analyze} className="ss-btn-primary">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                Analyze
              </button>
            </div>
          </div>
        )}

        {/* ─── LOADING ─── */}
        {screen === "loading" && (
          <div className="ss-loading ss-fadein">
            <div className="ss-loader">
              <div className="ss-pulse-ring" />
              <div className="ss-pulse-ring r2" />
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" className="ss-loader-icon">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
            </div>
            <p className="ss-load-msg">{LOADING_MESSAGES[loadIdx]}</p>
            <div className="ss-load-bar"><div className="ss-load-fill" /></div>
          </div>
        )}

        {/* ─── RESULTS ─── */}
        {screen === "results" && result && (
          <div className="ss-results ss-fadein">
            <div className="ss-res-header">
              {image && <img src={image.src} alt="" className="ss-res-thumb" />}
              <div>
                <h2 className="ss-res-condition">{result.condition}</h2>
                <div className="ss-res-tags">
                  {result.body_area && <span className="ss-tag teal">{result.body_area}</span>}
                  {result.confidence && <span className="ss-tag gray">{result.confidence} confidence</span>}
                </div>
              </div>
            </div>

            {result.severity && SEV[result.severity] && (
              <div className="ss-severity" style={{ background: SEV[result.severity].bg, borderColor: SEV[result.severity].border }}>
                <div className="ss-sev-dots">
                  {[1, 2, 3].map((d) => (
                    <span key={d} className="ss-sev-dot" style={{ background: d <= SEV[result.severity].dots ? SEV[result.severity].color : "#e2e8f0" }} />
                  ))}
                </div>
                <span style={{ color: SEV[result.severity].color, fontWeight: 600, fontSize: 14 }}>
                  {SEV[result.severity].label} Severity
                </span>
              </div>
            )}

            {result.description && (
              <div className="ss-card">
                <h3 className="ss-card-title">Assessment</h3>
                <p className="ss-card-body">{result.description}</p>
              </div>
            )}

            {result.see_doctor_urgency && result.see_doctor_urgency !== "none" && URG[result.see_doctor_urgency] && (
              <div className="ss-urgency" style={{ borderColor: URG[result.see_doctor_urgency].color + "40" }}>
                <span className="ss-urg-icon">{URG[result.see_doctor_urgency].icon}</span>
                <span style={{ color: URG[result.see_doctor_urgency].color, fontWeight: 600, fontSize: 14 }}>
                  {URG[result.see_doctor_urgency].text}
                </span>
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div className="ss-card">
                <h3 className="ss-card-title">Recommendations</h3>
                <div className="ss-rec-list">
                  {result.recommendations.map((r, i) => (
                    <div key={i} className="ss-rec-item">
                      <div className="ss-rec-num">{i + 1}</div>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {result.home_care?.length > 0 && (
              <div className="ss-card">
                <h3 className="ss-card-title">Home Care</h3>
                <div className="ss-rec-list">
                  {result.home_care.map((t, i) => (
                    <div key={i} className="ss-rec-item">
                      <span className="ss-tip-icon">💡</span>
                      <span>{t}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="ss-res-disclaimer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              <span>This is not a medical diagnosis. Always consult a healthcare provider for proper evaluation.</span>
            </div>

            <button onClick={reset} className="ss-btn-outline full">Scan Another Area</button>
          </div>
        )}
      </main>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,400;0,9..144,600;1,9..144,400&display=swap');

        * { margin:0; padding:0; box-sizing:border-box; }

        .ss-app {
          --teal: #0d9488;
          --teal-light: #ccfbf1;
          --teal-bg: #f0fdfa;
          --bg: #fafbfc;
          --card: #ffffff;
          --border: #e8ecf1;
          --text: #1e293b;
          --text2: #475569;
          --text3: #94a3b8;
          --radius: 16px;
          min-height: 100vh;
          background: var(--bg);
          font-family: 'Plus Jakarta Sans', sans-serif;
          color: var(--text);
          -webkit-font-smoothing: antialiased;
        }

        .ss-header {
          position: sticky; top: 0; z-index: 50;
          background: rgba(250,251,252,0.88);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
        }
        .ss-header-inner {
          max-width: 520px; margin: 0 auto;
          padding: 14px 20px;
          display: flex; align-items: center; gap: 12px;
        }
        .ss-back {
          background: none; border: none; cursor: pointer;
          color: var(--teal); display: flex; padding: 4px;
        }
        .ss-logo { display: flex; align-items: center; gap: 8px; }
        .ss-logo-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--teal-light);
          display: flex; align-items: center; justify-content: center;
        }
        .ss-logo-text {
          font-size: 17px; font-weight: 700; letter-spacing: -0.03em; color: var(--text);
        }
        .ss-logo-ai {
          font-size: 11px; font-weight: 700; letter-spacing: 0.04em;
          color: var(--teal); background: var(--teal-light);
          padding: 2px 7px; border-radius: 6px;
        }

        .ss-main {
          max-width: 520px; margin: 0 auto; width: 100%;
          padding: 0 20px 48px;
        }

        .ss-fadein { animation: fadeUp 0.45s ease both; }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0% { transform: scale(0.85); opacity: 0.5; }
          50% { transform: scale(1.35); opacity: 0; }
          100% { transform: scale(0.85); opacity: 0.5; }
        }
        @keyframes barSlide {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(0); }
          100% { transform: translateX(100%); }
        }

        .ss-hero { padding: 44px 0 32px; }
        .ss-hero-badge {
          display: inline-block;
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: var(--teal); background: var(--teal-light);
          padding: 5px 12px; border-radius: 20px;
          margin-bottom: 18px;
        }
        .ss-hero-title {
          font-family: 'Fraunces', serif;
          font-size: 36px; font-weight: 400;
          line-height: 1.15; color: var(--text);
          letter-spacing: -0.02em;
        }
        .ss-hero-title em { color: var(--teal); font-style: italic; }
        .ss-hero-sub {
          margin-top: 14px; font-size: 15px; line-height: 1.65;
          color: var(--text2); max-width: 400px;
        }

        .ss-actions { display: flex; flex-direction: column; gap: 10px; margin-bottom: 24px; }

        .ss-dropzone {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; gap: 10px;
          background: var(--card); border: 2px dashed var(--border);
          border-radius: 20px; padding: 44px 24px;
          cursor: pointer; transition: all 0.25s ease;
          margin-bottom: 24px;
        }
        .ss-dropzone:hover, .ss-dropzone.active {
          border-color: var(--teal);
          background: var(--teal-bg);
          box-shadow: 0 4px 20px rgba(13,148,136,0.08);
        }
        .ss-drop-icon {
          width: 64px; height: 64px; border-radius: 16px;
          background: var(--teal-light);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 4px;
          transition: transform 0.2s;
        }
        .ss-dropzone:hover .ss-drop-icon { transform: translateY(-2px); }
        .ss-drop-title {
          font-size: 16px; font-weight: 600; color: var(--text);
        }
        .ss-drop-sub {
          font-size: 13px; color: var(--text2);
        }
        .ss-drop-formats {
          font-size: 11px; color: var(--text3);
          background: #f1f5f9; padding: 3px 10px;
          border-radius: 8px; margin-top: 2px;
        }

        .ss-features { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 20px; }
        .ss-feature-chip {
          font-size: 12px; font-weight: 500; color: var(--text2);
          background: var(--card); border: 1px solid var(--border);
          padding: 7px 14px; border-radius: 20px;
          display: flex; align-items: center; gap: 6px;
        }

        .ss-disclaimer {
          display: flex; gap: 10px; padding: 14px 16px;
          background: var(--card); border: 1px solid var(--border);
          border-radius: 12px;
        }
        .ss-disclaimer span { font-size: 11.5px; color: var(--text3); line-height: 1.6; }

        .ss-error {
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 12px; padding: 12px 16px;
          font-size: 13px; color: #dc2626; line-height: 1.5;
          margin-bottom: 12px;
        }

        .ss-preview { padding-top: 20px; }
        .ss-preview-img-wrap {
          border-radius: 20px; overflow: hidden;
          margin-bottom: 18px; border: 1px solid var(--border);
          background: #f1f5f9;
        }
        .ss-preview-img {
          width: 100%; display: block; max-height: 380px; object-fit: contain;
        }
        .ss-preview-btns { display: flex; gap: 10px; }
        .ss-btn-outline {
          flex: 1; padding: 15px 20px; border-radius: 14px;
          border: 1px solid var(--border); background: var(--card);
          color: var(--text); font-size: 14px; font-weight: 600;
          font-family: inherit; cursor: pointer; transition: all 0.2s;
        }
        .ss-btn-outline:hover { border-color: var(--teal); color: var(--teal); }
        .ss-btn-outline.full { width: 100%; }
        .ss-btn-primary {
          flex: 2; padding: 15px 24px; border-radius: 14px;
          border: none; background: var(--teal); color: white;
          font-size: 14px; font-weight: 600; font-family: inherit;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px; transition: opacity 0.2s;
          box-shadow: 0 2px 10px rgba(13,148,136,0.25);
        }
        .ss-btn-primary:hover { opacity: 0.9; }

        .ss-loading {
          display: flex; flex-direction: column; align-items: center;
          padding-top: 110px; gap: 26px;
        }
        .ss-loader {
          position: relative; width: 90px; height: 90px;
          display: flex; align-items: center; justify-content: center;
        }
        .ss-pulse-ring {
          position: absolute; width: 90px; height: 90px; border-radius: 50%;
          border: 2px solid var(--teal);
          animation: pulseRing 2s ease-in-out infinite;
        }
        .ss-pulse-ring.r2 { animation-delay: 0.5s; border-width: 1px; }
        .ss-loader-icon { position: relative; z-index: 1; }
        .ss-load-msg {
          font-size: 14px; color: var(--text2); font-weight: 500; text-align: center;
        }
        .ss-load-bar {
          width: 180px; height: 3px; background: var(--border);
          border-radius: 2px; overflow: hidden;
        }
        .ss-load-fill {
          width: 40%; height: 100%; background: var(--teal);
          border-radius: 2px; animation: barSlide 1.8s ease-in-out infinite;
        }

        .ss-results {
          padding-top: 24px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .ss-res-header { display: flex; gap: 14px; align-items: center; }
        .ss-res-thumb {
          width: 68px; height: 68px; border-radius: 16px;
          object-fit: cover; border: 1px solid var(--border); flex-shrink: 0;
        }
        .ss-res-condition {
          font-family: 'Fraunces', serif;
          font-size: 22px; font-weight: 400;
          color: var(--text); line-height: 1.2;
        }
        .ss-res-tags { display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap; }
        .ss-tag {
          font-size: 11px; font-weight: 600; padding: 3px 10px;
          border-radius: 16px; text-transform: capitalize;
        }
        .ss-tag.teal { background: var(--teal-light); color: var(--teal); }
        .ss-tag.gray { background: #f1f5f9; color: var(--text3); }

        .ss-severity {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 18px; border-radius: 14px; border: 1.5px solid;
        }
        .ss-sev-dots { display: flex; gap: 5px; }
        .ss-sev-dot {
          width: 10px; height: 10px; border-radius: 50%; transition: background 0.3s;
        }

        .ss-card {
          background: var(--card); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 18px 20px;
        }
        .ss-card-title {
          font-size: 11px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: var(--text3); margin-bottom: 10px;
        }
        .ss-card-body { font-size: 14px; line-height: 1.7; color: var(--text2); }

        .ss-urgency {
          display: flex; align-items: center; gap: 10px;
          padding: 14px 18px; border-radius: 14px;
          background: var(--card); border: 1.5px solid;
        }
        .ss-urg-icon { font-size: 16px; flex-shrink: 0; }

        .ss-rec-list { display: flex; flex-direction: column; gap: 10px; }
        .ss-rec-item {
          display: flex; align-items: flex-start; gap: 10px;
          font-size: 13.5px; line-height: 1.6; color: var(--text2);
        }
        .ss-rec-num {
          width: 22px; height: 22px; border-radius: 7px;
          background: var(--teal-light); color: var(--teal);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; flex-shrink: 0; margin-top: 1px;
        }
        .ss-tip-icon { font-size: 14px; flex-shrink: 0; margin-top: 1px; }

        .ss-res-disclaimer {
          display: flex; gap: 8px; align-items: flex-start;
          padding: 12px 14px; background: #f8fafc;
          border-radius: 10px; border: 1px solid var(--border);
        }
        .ss-res-disclaimer span { font-size: 11.5px; color: var(--text3); line-height: 1.5; }
      `}</style>
    </div>
  );
}
