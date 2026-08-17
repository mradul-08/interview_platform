document.addEventListener("click", (event) => {
  const item = event.target.closest?.(".sg-member-item");
  if (!item) return;
  const groupIndex = window.location.pathname.split("/").indexOf("groups");
  const groupId = window.location.pathname.split("/")[groupIndex + 1];
  const memberName = item.querySelector("strong")?.textContent?.trim();
  if (!groupId || !memberName) return;
  event.preventDefault();
  const nextPath = `/dashboard/groups/${groupId}/members/${encodeURIComponent(memberName)}`;
  window.history.pushState({}, "", nextPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
});

const activateMembersByDefault = () => {
  const workspace = document.querySelector(".sg-workspace-head");
  const firstTab = workspace?.querySelector(".sg-tabs button");
  if (workspace && firstTab && !workspace.dataset.membersDefaulted) {
    if (!firstTab.classList.contains("active")) firstTab.click();
    workspace.dataset.membersDefaulted = "true";
  }
};
const tabObserver = new MutationObserver(activateMembersByDefault);
tabObserver.observe(document.body, { childList: true, subtree: true });
setTimeout(activateMembersByDefault, 0);
setTimeout(activateMembersByDefault, 120);
const defaultTabTimer = setInterval(() => {
  const firstTab = document.querySelector(".sg-workspace-head .sg-tabs button");
  if (!firstTab) return;
  if (!firstTab.classList.contains("active")) firstTab.click();
  if (firstTab.classList.contains("active")) clearInterval(defaultTabTimer);
}, 200);
setTimeout(() => clearInterval(defaultTabTimer), 3000);
setTimeout(() => {
  const firstTab = document.querySelector(".sg-workspace-head .sg-tabs button");
  if (firstTab) firstTab.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
}, 700);
