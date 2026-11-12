/* Browser regression probe. Load on the rendered demo at a phone width.
   It uses the real DOM and event handlers; no application code is mocked.
   Evaluate this file, then call runDemoRegressionChecks(). */
window.runDemoRegressionChecks = function () {
  'use strict';
  function go(hash) {
    history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }
  var results = {};
  go('#/assessments/ASM-001?at=a1-profiling');
  var box = document.getElementById('a1-profiling').closest('.ar-step');
  box.querySelector('.ar-fold').click();
  results.collapseSetup = box.classList.contains('is-collapsed');
  go('#/dashboard');
  go('#/assessments/ASM-001?at=a1-profiling');
  results.deepLinkUnfolds = !box.classList.contains('is-collapsed');
  if (!box.classList.contains('is-collapsed')) { box.querySelector('.ar-fold').click(); }
  go('#/assessments/ASM-001?s=segments');
  results.flaggedSectionUnfolds = !box.classList.contains('is-collapsed');
  results.hiddenElementsStayHidden = Array.from(document.querySelectorAll('#ar-demo [hidden]')).every(function (el) {
    return getComputedStyle(el).display === 'none';
  });
  go('#/ai-systems');
  document.querySelector('[data-sheet="records"]').click();
  results.sheetOpened = document.querySelector('.ar-sheet').open;
  document.querySelector('.ar-sheet [data-nav="ai-systems"]').click();
  results.currentRouteClosesSheet = !document.querySelector('.ar-sheet').open;
  document.querySelector('[data-close-sheet]').click();
  go('#/dashboard');
  return results;
};
