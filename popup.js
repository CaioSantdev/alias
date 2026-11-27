const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const authForm = document.querySelector("#auth-form");
const authButton = document.querySelector("#auth-button");
const toggleAuth = document.querySelector("#toggle-auth");
const authStatus = document.querySelector("#auth-status");
const logoutButton = document.querySelector("#logout-button");
const form = document.querySelector("#alias-form");
const shortcutInput = document.querySelector("#shortcut");
const messageInput = document.querySelector("#message");
const list = document.querySelector("#alias-list");
const count = document.querySelector("#count");
const status = document.querySelector("#status");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-button");
let editingShortcut = null;
let isSignUp = false;

function setAuthStatus(message, isError = true) {
  authStatus.textContent = message;
  authStatus.className = isError ? "error" : "success";
}

function setLoggedIn(loggedIn) {
  authView.hidden = loggedIn;
  appView.hidden = !loggedIn;
}

async function enterApp() {
  setLoggedIn(true);
  try {
    render(await loadRemoteAliases());
    status.textContent = "Login realizado. Seus aliases foram carregados.";
  } catch (error) {
    setLoggedIn(false);
    setAuthStatus(`Login realizado, mas não foi possível carregar os aliases: ${error.message}`);
  }
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authButton.disabled = true;
  authButton.textContent = isSignUp ? "Criando conta..." : "Entrando...";
  setAuthStatus("Conectando ao Supabase...", false);
  const email = document.querySelector("#email").value.trim();
  const password = document.querySelector("#password").value;
  try {
    if (isSignUp) {
      const result = await signUp(email, password);
      if (!result.access_token) {
        setAuthStatus("Conta criada. Verifique seu e-mail e depois volte para entrar.", false);
        return;
      }
      setAuthStatus("Conta criada. Entrando...", false);
    } else {
      await signIn(email, password);
      setAuthStatus("Login realizado. Carregando seus aliases...", false);
    }
    await enterApp();
  } catch (error) {
    setAuthStatus(`Não foi possível concluir: ${error.message}`);
  } finally {
    authButton.disabled = false;
    authButton.textContent = isSignUp ? "Criar conta" : "Entrar";
  }
});

toggleAuth.addEventListener("click", () => {
  isSignUp = !isSignUp;
  authButton.textContent = isSignUp ? "Criar conta" : "Entrar";
  toggleAuth.textContent = isSignUp ? "Já tenho uma conta" : "Criar uma conta";
  setAuthStatus("", false);
});

logoutButton.addEventListener("click", async () => { await signOut(); setLoggedIn(false); resetForm(); });

function render(aliases) {
  const entries = Object.entries(aliases).sort(([a], [b]) => a.localeCompare(b));
  count.textContent = entries.length;
  list.innerHTML = entries.length ? entries.map(([shortcut, message]) => `
    <div class="alias-item"><div><strong>${escapeHtml(shortcut)}</strong><span>${escapeHtml(message)}</span></div>
    <div class="item-actions"><button class="edit" data-shortcut="${escapeHtml(shortcut)}" title="Editar">✎</button><button class="delete" data-shortcut="${escapeHtml(shortcut)}" title="Excluir">×</button></div></div>`).join("") : '<div class="empty">Nenhum alias cadastrado.</div>';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const shortcut = shortcutInput.value.trim().toLowerCase();
  const message = messageInput.value.trim();
  if (!shortcut.startsWith("-")) { status.textContent = "O atalho precisa começar com hífen, por exemplo: -bd"; return; }
  try {
    await saveRemoteAlias(shortcut, message, editingShortcut);
    render(await loadRemoteAliases());
    status.textContent = `Alias ${shortcut} salvo.`;
    resetForm();
  } catch (error) { status.textContent = error.message; }
});

list.addEventListener("click", async (event) => {
  const editButton = event.target.closest(".edit");
  if (editButton) { const aliases = await loadRemoteAliases(); startEditing(editButton.dataset.shortcut, aliases[editButton.dataset.shortcut]); return; }
  const deleteButton = event.target.closest(".delete");
  if (!deleteButton) return;
  try { await deleteRemoteAlias(deleteButton.dataset.shortcut); render(await loadRemoteAliases()); status.textContent = "Alias removido."; }
  catch (error) { status.textContent = error.message; }
});

function startEditing(shortcut, message) {
  editingShortcut = shortcut;
  shortcutInput.value = shortcut;
  messageInput.value = message;
  saveButton.textContent = "Salvar alteração";
  cancelButton.hidden = false;
  shortcutInput.focus();
}

function resetForm() {
  editingShortcut = null;
  form.reset();
  saveButton.textContent = "Adicionar alias";
  cancelButton.hidden = true;
}

cancelButton.addEventListener("click", resetForm);

(async () => {
  if (!isSupabaseConfigured()) { setAuthStatus("Configure o arquivo config.js antes de entrar."); return; }
  setAuthStatus("Verificando sessão...", false);
  if (await currentUser()) await enterApp();
  else setAuthStatus("Pronto para entrar.", false);
})();
