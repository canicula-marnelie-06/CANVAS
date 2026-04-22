document.addEventListener('DOMContentLoaded', function () {
 
      // Get references to the canvas, its 2D context, and the status elements
      const canvas = document.getElementById('mainCanvas'); // ← fixed from 'c2'
      const ctx    = canvas.getContext('2d');
      const msgEl  = document.getElementById('s2msg');
      const cntEl  = document.getElementById('s2cnt');
 
      // Circle size constants
      const DEF_R = 24;   // Default radius when a new circle is created
      const MIN_R = 5;    // Minimum allowed radius (prevents shrinking to nothing)
      const STEP  = 3;    // How many pixels to grow/shrink per scroll tick
 
      // Default blue color for all circles; red is applied when selected
      const DEFAULT_COLOR = '#6baed6'; // Blue
      const SELECTED_COLOR = '#e03030'; // Red
 
      // Application state
      let circles  = [];   // Array holding all circle objects { x, y, r, color }
      let selIdx   = -1;   // Index of the currently selected circle (-1 = none)
      let dragging = false; // Whether the user is currently dragging a circle
      let offX = 0, offY = 0; // Mouse offset from circle center during drag
 
      // ── Helpers ──────────────────────────────────────────────────────────────
 
      // Converts a mouse event's client coordinates to canvas pixel coordinates,
      // accounting for any CSS scaling applied to the canvas element.
      const scalePos = function (e) {
        const r = canvas.getBoundingClientRect();
        return {
          x: (e.clientX - r.left) * (canvas.width  / r.width),
          y: (e.clientY - r.top)  * (canvas.height / r.height)
        };
      };
 
      // Returns the index of the topmost circle that contains point (px, py),
      // or -1 if no circle is hit. Iterates in reverse so the last-drawn
      // (visually topmost) circle is tested first.
      const hitTest = function (px, py) {
        for (let i = circles.length - 1; i >= 0; i--) {
          if (Math.hypot(px - circles[i].x, py - circles[i].y) <= circles[i].r) return i;
        }
        return -1;
      };
 
      // ── Draw ─────────────────────────────────────────────────────────────────
 
      const draw = function () {
        // Clear the entire canvas before redrawing
        ctx.clearRect(0, 0, canvas.width, canvas.height);
 
        // Polka-dot background pattern
        ctx.fillStyle = 'rgba(180,140,230,0.07)';
        for (let gx = 30; gx < canvas.width; gx += 40) {
          for (let gy = 30; gy < canvas.height; gy += 40) {
            ctx.beginPath();
            ctx.arc(gx, gy, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
 
        // Draw each circle
        circles.forEach(function (c, i) {
          const isSelected = (i === selIdx);
          const baseCol    = isSelected ? SELECTED_COLOR : c.color;
 
          // Drop shadow
          ctx.shadowColor   = baseCol + '55';
          ctx.shadowBlur    = isSelected ? 18 : 10;
          ctx.shadowOffsetY = 3;
 
          // Radial gradient fill (gives a shiny bubble look)
          const grad = ctx.createRadialGradient(
            c.x - c.r * 0.3, c.y - c.r * 0.35, c.r * 0.1,
            c.x, c.y, c.r
          );
          grad.addColorStop(0,   'rgba(255,255,255,0.85)');
          grad.addColorStop(0.4, baseCol + 'cc');
          grad.addColorStop(1,   baseCol);
 
          ctx.beginPath();
          ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
 
          // Reset shadow so the stroke isn't blurred
          ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
 
          // Circle border
          ctx.strokeStyle = isSelected ? '#a00000' : 'rgba(255,255,255,0.6)';
          ctx.lineWidth   = isSelected ? 2.5 : 1.5;
          ctx.stroke();
 
          // Dashed selection ring drawn outside the circle when selected
          if (isSelected) {
            ctx.beginPath();
            ctx.arc(c.x, c.y, c.r + 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#e0303088';
            ctx.lineWidth   = 2;
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]); // Reset dash pattern
          }
        });
 
        // Update the circle counter in the status bar
        const n = circles.length;
        cntEl.textContent = n + (n === 1 ? ' circle' : ' circles');
      };
 
      // ── Event Listeners ───────────────────────────────────────────────────────
 
      // mousedown: select an existing circle OR create a new one
      canvas.addEventListener('mousedown', function (e) {
        if (e.button !== 0) return;
        canvas.focus(); // Ensure canvas has focus for keyboard events
        const p   = scalePos(e);
        const hit = hitTest(p.x, p.y);
 
        if (hit !== -1) {
          // Clicked on an existing circle → select it and prepare for dragging
          selIdx   = hit;
          dragging = true;
          offX = p.x - circles[hit].x;
          offY = p.y - circles[hit].y;
          canvas.classList.add('dragging');
          msgEl.textContent = '✅ Selected!  Drag, scroll to resize, or press Delete.';
        } else {
          // Clicked on empty space → deselect and add a new circle
          selIdx = -1;
          circles.push({ x: p.x, y: p.y, r: DEF_R, color: DEFAULT_COLOR });
          selIdx = circles.length - 1; // Auto-select the new circle
          msgEl.textContent = '🫧 New circle added!';
        }
        draw();
      });
 
      // mousemove: drag selected circle OR update hover cursor
      canvas.addEventListener('mousemove', function (e) {
        const p = scalePos(e);
        if (dragging && selIdx !== -1) {
          // Move the selected circle, keeping the grab offset consistent
          circles[selIdx].x = p.x - offX;
          circles[selIdx].y = p.y - offY;
          draw();
        } else {
          // Toggle a CSS class that shows a pointer cursor over circles
          canvas.classList.toggle('on-circle', hitTest(p.x, p.y) !== -1);
        }
      });
 
      // End drag on mouse release or when cursor leaves the canvas
      canvas.addEventListener('mouseup',    function () { dragging = false; canvas.classList.remove('dragging'); });
      canvas.addEventListener('mouseleave', function () { dragging = false; canvas.classList.remove('dragging'); });
 
      // wheel: resize the selected circle
      canvas.addEventListener('wheel', function (e) {
        e.preventDefault(); // Prevent the page from scrolling
        if (selIdx === -1) return;
        const c = circles[selIdx];
        // Scroll up (negative deltaY) → grow; scroll down → shrink
        c.r = Math.max(MIN_R, c.r + (e.deltaY < 0 ? STEP : -STEP));
        msgEl.textContent = '📏 Radius: ' + c.r + 'px';
        draw();
      }, { passive: false });
 
      // keydown: Delete or Backspace removes the selected circle
      // Listening on both canvas and document ensures it works regardless of focus
      function deleteSelected(e) {
        if ((e.key === 'Delete' || e.key === 'Backspace') && selIdx !== -1) {
          e.preventDefault();
          circles.splice(selIdx, 1);
          selIdx = -1;
          msgEl.textContent = '💥 circle popped!';
          draw();
        }
      }
      canvas.addEventListener('keydown', deleteSelected);
      document.addEventListener('keydown', deleteSelected);
 
      // Suppress the right-click context menu on the canvas
      canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
 
      // Initial draw call to render the empty canvas
      draw();
    });
  