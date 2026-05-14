/* ── QUEUE PANEL — ADD TO QUEUE wiring ────────────────────────────────────────
   Wires #add-to-queue-btn to add clip cards to #queue-list.
   Each card captures the current image filename and prompt at click time.
   Cards can be individually removed via their × button.

   WHY external file: CSP script-src 'self' blocks all inline scripts.
   WHY IIFE: no globals exposed — avoids collisions with renderer.js.
──────────────────────────────────────────────────────────────────────────── */
(function () {
  var addBtn     = document.getElementById('add-to-queue-btn');
  var queueList  = document.getElementById('queue-list');
  var queueEmpty = document.getElementById('queue-empty');
  var queueCount = document.getElementById('queue-count');

  if (!addBtn || !queueList) return;

  var count = 0;

  function updateEmptyState() {
    var hasCards = queueList.children.length > 0;
    if (queueEmpty) queueEmpty.style.display = hasCards ? 'none' : 'block';
    if (queueCount) queueCount.textContent = queueList.children.length;
  }

  function buildLabel() {
    var dropLabel = document.getElementById('drop-label');
    var promptEl  = document.getElementById('prompt-input');
    var imgName   = (dropLabel && dropLabel.dataset.filename)
      ? dropLabel.dataset.filename
      : '(no image)';
    var prompt = (promptEl && promptEl.value.trim())
      ? promptEl.value.trim().slice(0, 40)
      : '(no prompt)';
    return imgName + ' · ' + prompt;
  }

  addBtn.addEventListener('click', function () {
    count += 1;
    var id    = 'qc-' + count;
    var label = buildLabel();

    var li = document.createElement('li');
    li.className   = 'queue-card';
    li.dataset.id  = id;

    var span = document.createElement('span');
    span.className   = 'queue-card-label';
    span.textContent = label;

    var rmBtn = document.createElement('button');
    rmBtn.className   = 'queue-card-remove';
    rmBtn.textContent = '×';
    rmBtn.setAttribute('aria-label', 'Remove clip from queue');
    rmBtn.addEventListener('click', function () {
      li.remove();
      updateEmptyState();
    });

    li.appendChild(span);
    li.appendChild(rmBtn);
    queueList.appendChild(li);
    updateEmptyState();
  });

  updateEmptyState();
}());
