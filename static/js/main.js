/* 대화 시작 문장 빠른 입력 */
document.querySelectorAll(".quick-tags button").forEach(tag => {
  tag.addEventListener("click", () => {
    const input = document.querySelector(".ai-search-box input");
    if (input) {
      input.value = tag.innerText;
      input.focus();
    }
  });
});

const conversationInput = document.querySelector(".ai-search-box input");
const conversationButton = document.querySelector(".ai-search-box button");

function startDemoConversation() {
  const firstMessage = conversationInput?.value.trim();
  if (firstMessage) sessionStorage.setItem("jipchatgoFirstMessage", firstMessage);
  location.href = "./templates/ai/chat.html";
}

conversationButton?.addEventListener("click", startDemoConversation);
conversationInput?.addEventListener("keydown", event => {
  if (event.key === "Enter") startDemoConversation();
});
