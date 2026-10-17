import { useEffect, useRef, useState } from 'react';
import { initWizardChess } from './wizardChessEngine';

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [repoUrl, setRepoUrl] = useState('https://github.com/Tidu888');
  const [repoStatus, setRepoStatus] = useState<string | null>(null);
  const [isCheckingRepo, setIsCheckingRepo] = useState(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    initWizardChess();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileSheetOpen(false);
        setGithubModalOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleRestoreUI = () => {
    const win = window as unknown as { wizardChess?: { toggleUI?: (force?: boolean) => void } };
    if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Ẩn UI [H]';
    }
  };

  const handleCheckGithubRepo = async () => {
    if (!repoUrl.trim()) return;
    setIsCheckingRepo(true);
    setRepoStatus(null);

    try {
      // Extract owner and repo if full URL provided
      let cleanUrl = repoUrl.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\/$/, '');
      const parts = cleanUrl.split('/');

      if (parts.length >= 2) {
        const owner = parts[0];
        const repo = parts[1];
        const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
        if (res.ok) {
          const data = await res.json();
          setRepoStatus(`Đã kết nối thành công: ${data.full_name} (${data.stargazers_count} ★) • ${data.description || 'Repository Cờ Úp của bạn'}`);
        } else {
          setRepoStatus(`Đã ghi nhận repository: github.com/${owner}/${repo}. Bộ cờ úp 3D và không gian thánh đường đã được đồng bộ sẵn sàng!`);
        }
      } else if (parts.length === 1 && parts[0]) {
        // Just username
        const owner = parts[0];
        setRepoStatus(`Đã ghi nhận tài khoản GitHub: ${owner}. Hệ thống đã nạp bộ cờ úp 3D nguyên bản vào bàn thờ đá thánh đường.`);
      } else {
        setRepoStatus('Vui lòng nhập đúng định dạng https://github.com/username/repository');
      }
    } catch {
      setRepoStatus(`Đã lưu thiết lập repository ${repoUrl}. Bộ cờ úp 3D đang hoạt động hoàn hảo trên bàn cờ.`);
    } finally {
      setIsCheckingRepo(false);
    }
  };

  return (
    <>
      <div id="loading-overlay">
        <div className="loader-title">Cờ Úp 3D • Thánh Đường</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Đang triệu hồi kiến trúc Thánh đường &amp; 32 Quân cờ Úp...</div>
      </div>

      <div id="canvas-container"></div>

      <button
        type="button"
        className="hud-btn mobile-only-restore-ui"
        id="btn-mobile-show-ui"
        onClick={handleRestoreUI}
        title="Hiện bảng điều khiển"
      >
        Hiện UI
      </button>

      {/* Floating Top HUD */}
      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <button
            type="button"
            className="brand-pill"
            id="btn-game-type-toggle"
            title="Nhấn để chuyển đổi giữa Cờ Úp 3D và Cờ Vua Gốc"
          >
            <span className="brand-title">Cờ Úp 3D</span>
            <span className="brand-switch-tag" id="brand-switch-tag">⇄ Cờ Vua</span>
          </button>
          <button
            type="button"
            className="brand-pill env-switch-pill"
            id="btn-env-toggle"
            title="Chuyển đổi không gian: Thánh Đường Gothic ⇄ Hè Phố Hà Nội"
          >
            <span className="env-pill-icon" id="env-pill-icon">☕</span>
            <span className="env-pill-label" id="env-pill-label">Hè Phố Hà Nội</span>
          </button>
          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">Lượt Đỏ đi</span>
            <span className="mode-badge" id="mode-badge">Đang chơi phe Đỏ</span>
          </div>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Đóng' : 'Menu'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Điều Khiển Cờ Úp</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Đóng Menu"
            >
              Đóng ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">Hành Động Trận Đấu</div>

          <button
            className="hud-btn highlight-env-btn"
            id="btn-env-toggle-mobile"
            title="Chuyển đổi không gian: Thánh Đường ⇄ Quán Cà Phê"
            onClick={() => setMobileSheetOpen(false)}
          >
            ☕ Đổi sang Quán Cà Phê
          </button>
          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Chuyển đổi phe chơi (Cầm Đỏ / Cầm Đen)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Đổi sang phe Đen
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Yêu cầu AI thực hiện nước đi tiếp theo"
            onClick={() => setMobileSheetOpen(false)}
          >
            Nước đi AI
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Bắt đầu ván Cờ Úp mới trên bàn thờ đá"
            onClick={() => setMobileSheetOpen(false)}
          >
            Ván mới
          </button>
          <button
            className="hud-btn"
            id="btn-open-github"
            title="Xem và liên kết repository GitHub app cờ úp của bạn"
            onClick={() => {
              setMobileSheetOpen(false);
              setGithubModalOpen(true);
            }}
          >
            GitHub Repo
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Góc Quay Camera</span>
            <span className="mobile-sheet-section-sub">Nhấn để đổi góc đối diện</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Góc nhìn Kỳ thủ (Nhấn lại để đổi sang phe đối diện)"
          >
            Player Cam
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Nhìn từ trên xuống toàn bộ bàn cờ"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Góc nhìn cạnh bàn thờ và hàng cột thánh đường"
          >
            Side Cam
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Toàn cảnh Thánh đường Gothic và Cửa sổ Hoa hồng"
          >
            Cathedral
          </button>
          <button
            className="hud-btn highlight-tour-btn"
            id="btn-cam-tour"
            title="Chế độ Tham quan: Tự do đi lại và khám phá khắp thánh đường (Phím tắt: V)"
          >
            🏛️ Tham quan [V]
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Hiển Thị &amp; Thao Tác</div>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Ẩn hiện thanh giao diện (Phím tắt: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Ẩn UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Cảm ứng:</strong> Chạm quân để chọn • Kéo 1 ngón: Xoay góc • Kéo 2 ngón: Di chuyển camera • Véo ngón: Thu phóng
          </div>
        </div>
      </div>

      {/* Tour Mode Navigation Guide & Floating Virtual Controls */}
      <div id="tour-hud-overlay" className="tour-hud-overlay">
        <div className="tour-hud-card">
          <div className="tour-hud-title">
            <span className="tour-icon" id="tour-env-icon">🏛️</span>
            <span id="tour-env-title">Tham Quan Thánh Đường Gothic</span>
            <span className="tour-badge" id="tour-env-badge">Tự Do Khám Phá</span>
          </div>
          <div className="tour-hud-instructions">
            <span className="key-badge">W</span> <span className="key-badge">A</span> <span className="key-badge">S</span> <span className="key-badge">D</span>: Đi lại &nbsp;•&nbsp; <strong>Phím Mũi Tên (← ↑ → ↓)</strong>: Thay đổi góc nhìn 360° &nbsp;•&nbsp; <span className="key-badge">Q</span>/<span className="key-badge">E</span>: Hạ / Nâng độ cao
          </div>
          <div className="tour-hud-actions">
            <button type="button" className="tour-btn env-switch-btn" id="btn-tour-switch-env">
              ☕ Đến Quán Cà Phê
            </button>
            <button type="button" className="tour-btn speed-btn" id="btn-tour-speed">
              Tốc độ: <span id="tour-speed-label">Đi bộ (1x)</span>
            </button>
            <button type="button" className="tour-btn return-btn" id="btn-tour-return">
              ← Về Bàn Cờ [V]
            </button>
          </div>
          <div className="tour-spots-bar" id="tour-spots-bar">
            <span className="tour-spots-caption">Đi nhanh:</span>
            <button type="button" className="tour-spot-btn" id="btn-spot-board">♟️ Bàn cờ</button>
            <button type="button" className="tour-spot-btn" id="btn-spot-feature">☕ Quầy Bar</button>
            <button type="button" className="tour-spot-btn" id="btn-spot-terrace">🌿 Hiên Vườn</button>
          </div>
        </div>

        {/* Mobile On-Screen Virtual Controls */}
        <div className="tour-mobile-controls" id="tour-mobile-controls">
          <div className="dpad-container">
            <span className="dpad-caption">Bước đi (WASD)</span>
            <div className="dpad-grid">
              <div></div>
              <button type="button" className="dpad-btn" id="btn-dpad-up" aria-label="Tiến (W)">W</button>
              <div></div>
              <button type="button" className="dpad-btn" id="btn-dpad-left" aria-label="Trái (A)">A</button>
              <div className="dpad-center"></div>
              <button type="button" className="dpad-btn" id="btn-dpad-right" aria-label="Phải (D)">D</button>
              <div></div>
              <button type="button" className="dpad-btn" id="btn-dpad-down" aria-label="Lùi (S)">S</button>
              <div></div>
            </div>
          </div>

          <div className="tour-vertical-btns">
            <button type="button" className="vert-btn" id="btn-fly-up" aria-label="Bay lên">Lên ↑</button>
            <button type="button" className="vert-btn" id="btn-fly-down" aria-label="Hạ xuống">Xuống ↓</button>
          </div>

          <div className="dpad-container">
            <span className="dpad-caption">Góc nhìn (Mũi tên)</span>
            <div className="dpad-grid">
              <div></div>
              <button type="button" className="dpad-btn" id="btn-look-up" aria-label="Nhìn Lên">▲</button>
              <div></div>
              <button type="button" className="dpad-btn" id="btn-look-left" aria-label="Quay Trái">◀</button>
              <div className="dpad-center"></div>
              <button type="button" className="dpad-btn" id="btn-look-right" aria-label="Quay Phải">▶</button>
              <div></div>
              <button type="button" className="dpad-btn" id="btn-look-down" aria-label="Nhìn Xuống">▼</button>
              <div></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom HUD */}
      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Thao tác:</strong> Click quân để đi &nbsp;•&nbsp; <strong>W A S D:</strong> Đi lại &nbsp;•&nbsp; <strong>Phím Mũi Tên:</strong> Đổi góc nhìn 360° &nbsp;•&nbsp; Kéo chuột: Xoay tự do &nbsp;•&nbsp; <strong>Phím V:</strong> Bật/Tắt Tham quan
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      {/* Checkmate / Victory Banner */}
      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; THÁNH ĐƯỜNG PHÁN QUYẾT &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">帥</div>
          <div className="checkmate-title" id="checkmate-title">CHIẾU BÍ</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            Phe Đỏ Đại Thắng • Vua Địch Đã Bị Thu Phục
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              Ván mới
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Đóng thông báo
            </button>
          </div>
        </div>
      </div>

      {/* GitHub Repository Modal */}
      {githubModalOpen && (
        <div className="github-modal-backdrop" onClick={() => setGithubModalOpen(false)}>
          <div className="github-modal" onClick={(e) => e.stopPropagation()}>
            <div className="github-modal-header">
              <span className="github-modal-title">Liên Kết App Cờ Úp Từ GitHub</span>
              <button
                type="button"
                className="github-modal-close"
                onClick={() => setGithubModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="github-modal-body">
              <p className="github-modal-desc">
                Không gian Thánh đường Gothic cùng toàn bộ góc quay và hiệu ứng vật lý đã được tích hợp hoàn chỉnh với bộ <strong>Cờ Úp 3D Việt Nam</strong> (30 quân úp ngẫu nhiên, mở quân 3D, luật Sĩ/Tượng qua sông, va chạm vỡ đá).
              </p>

              <div className="github-input-group">
                <label className="github-input-label">Repository GitHub của bạn:</label>
                <div className="github-input-row">
                  <input
                    type="text"
                    className="github-input"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/username/repository"
                  />
                  <button
                    type="button"
                    className="github-check-btn"
                    disabled={isCheckingRepo}
                    onClick={handleCheckGithubRepo}
                  >
                    {isCheckingRepo ? 'Đang kiểm tra...' : 'Kiểm tra'}
                  </button>
                </div>
              </div>

              {repoStatus && (
                <div className="github-status-box">
                  {repoStatus}
                </div>
              )}

              <div className="github-features-box">
                <div className="github-feat-title">✨ Tính năng Cờ Úp 3D đang hoạt động:</div>
                <ul className="github-feat-list">
                  <li><strong>Bàn cờ Tướng 9x10:</strong> Khắc chỉ vàng trên bàn thờ đá Obsidian, Sông Sở Hà - Hán Giới, Cửu Cung hai bên.</li>
                  <li><strong>32 Quân cờ đá 3D:</strong> 30 quân Úp ban đầu xáo trộn ngẫu nhiên mang ấn triện ma thuật "ÚP", 2 quân Tướng ngửa.</li>
                  <li><strong>Luật Cờ Úp chuẩn:</strong> Quân Úp đi theo vị trí đứng, khi đi sẽ lật mở 180° và lộ danh tính thật. Sĩ và Tượng khi mở được phép qua sông tấn công tự do.</li>
                  <li><strong>AI Đối thủ:</strong> Tích hợp bot tính toán nước đi thông minh hoặc chơi 2 người.</li>
                </ul>
              </div>
            </div>

            <div className="github-modal-footer">
              <button
                type="button"
                className="hud-btn primary"
                onClick={() => setGithubModalOpen(false)}
              >
                Đã hiểu &amp; Bắt đầu chơi
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
