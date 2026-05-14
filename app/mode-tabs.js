/* ── AXIS 2 INACTIVE STATE ────────────────────────────────────────────────────
   Mode tab switching is removed — DIAL and PRODUCTION panels are now
   permanently visible in the right column. This file retains only the
   axis2 inactive state logic (syncAxis2State), which dims the optional
   second axis when no parameter is selected.

   WHY called on both load AND change:
   The select already holds value='' on load (the "— none —" default).
   Without the eager call, axis2Container stays fully opaque until the user
   makes a selection — breaking the "axis2 is optional" affordance.

   WHY safe alongside renderer.js's own axis2 change listener:
   addEventListener stacks — both fire independently. syncAxis2State() reads
   .value and toggles a CSS class; renderer.js reads .value and writes to
   number inputs. Operations target disjoint DOM properties — no conflict.

   External file required — CSP script-src 'self' blocks inline scripts.
──────────────────────────────────────────────────────────────────────────── */
(function () {
  var axis2Sel       = document.getElementById('dial-axis2-param');
  var axis2Container = document.getElementById('dial-axis2-container');

  function syncAxis2State() {
    if (!axis2Sel || !axis2Container) return;
    axis2Container.classList.toggle('axis-inactive', axis2Sel.value === '');
  }

  if (axis2Sel) axis2Sel.addEventListener('change', syncAxis2State);
  syncAxis2State();
}());
