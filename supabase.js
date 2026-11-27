const SESSION_KEY = "supabase_session";

function isSupabaseConfigured() {
  return typeof SUPABASE_CONFIG !== "undefined" && SUPABASE_CONFIG.url && !SUPABASE_CONFIG.url.includes("SEU-PROJETO") && SUPABASE_CONFIG.publishableKey && !SUPABASE_CONFIG.publishableKey.includes("SUA_CHAVE");
}

function getSession() {
  return new Promise((resolve) => chrome.storage.local.get({ [SESSION_KEY]: null }, (result) => resolve(result[SESSION_KEY])));
}

function saveSession(session) {
  return new Promise((resolve) => chrome.storage.local.set({ [SESSION_KEY]: session }, resolve));
}

async function supabaseRequest(path, options = {}) {
  if (!isSupabaseConfigured()) throw new Error("Configure o arquivo config.js com os dados do Supabase.");
  const session = await getSession();
  const headers = { apikey: SUPABASE_CONFIG.publishableKey, "Content-Type": "application/json", ...(options.headers || {}) };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  const response = await fetch(`${SUPABASE_CONFIG.url}${path}`, { ...options, headers, body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.msg || data.message || data.error_description || "Não foi possível concluir a operação.");
  return data;
}

async function signIn(email, password) {
  const result = await supabaseRequest("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  await saveSession(result);
  return result.user;
}

async function signUp(email, password) {
  const result = await supabaseRequest("/auth/v1/signup", { method: "POST", body: { email, password } });
  if (result.access_token) await saveSession(result);
  return result;
}

async function signOut() {
  const session = await getSession();
  if (session?.access_token && isSupabaseConfigured()) fetch(`${SUPABASE_CONFIG.url}/auth/v1/logout`, { method: "POST", headers: { apikey: SUPABASE_CONFIG.publishableKey, Authorization: `Bearer ${session.access_token}` } }).catch(() => {});
  return new Promise((resolve) => chrome.storage.local.remove([SESSION_KEY], resolve));
}

async function currentUser() {
  const session = await getSession();
  if (!session?.access_token) return null;
  try { return await supabaseRequest("/auth/v1/user"); } catch { await signOut(); return null; }
}

async function loadRemoteAliases() {
  const rows = await supabaseRequest("/rest/v1/aliases?select=shortcut,message&order=shortcut.asc");
  return Object.fromEntries(rows.map((row) => [row.shortcut, row.message]));
}

async function saveRemoteAlias(shortcut, message, previousShortcut = null) {
  const user = await currentUser();
  if (!user) throw new Error("Sua sessão expirou. Entre novamente.");
  if (previousShortcut && previousShortcut !== shortcut) await deleteRemoteAlias(previousShortcut);
  await supabaseRequest("/rest/v1/aliases?on_conflict=user_id,shortcut", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: [{ user_id: user.id, shortcut, message }] });
}

async function deleteRemoteAlias(shortcut) {
  await supabaseRequest(`/rest/v1/aliases?shortcut=eq.${encodeURIComponent(shortcut)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
}
