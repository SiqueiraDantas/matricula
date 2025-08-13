// js/index.js
// Painel inicial com Auth guard + Firestore (SDK modular v10)

import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ------------- ELEMENTOS DA PÁGINA -------------
const totalInscritosCard = document.getElementById("totalInscritosCard");
const tabelaWrap = document.getElementById("tabelaAlunos");
// ❗ id sem acentos
const tabelaBody = document.querySelector("#tabelaMatriculas tbody");

// ------------- GUARD DE AUTENTICAÇÃO -------------
const LOGIN_PAGE = "login.html";

let guardHandled = false;
function safeReplace(url) {
  if (guardHandled) return;
  guardHandled = true;
  window.location.replace(url);
}

onAuthStateChanged(auth, async (user) => {
  const path = window.location.pathname.toLowerCase();
  const isOnLogin = path.endsWith("/login") || path.endsWith("/login.html");

  if (!user) {
    if (!isOnLogin) safeReplace(LOGIN_PAGE);
    return;
  }

  // Autenticado → carrega dados do painel
  try {
    await carregarTotalInscritos();
    wireEventos();
  } catch (e) {
    console.error("Erro ao iniciar painel:", e);
  }
});

// ------------- AÇÕES -------------
async function carregarTotalInscritos() {
  try {
    const snap = await getDocs(collection(db, "matriculas"));
    const total = snap.size;
    const numeroEl = document.querySelector("#totalInscritosCard .numero");
    if (numeroEl) numeroEl.textContent = total;
  } catch (error) {
    console.error("Erro ao contar inscritos:", error);
    const numeroEl = document.querySelector("#totalInscritosCard .numero");
    if (numeroEl) numeroEl.textContent = "Erro";
  }
}

function wireEventos() {
  // Clique no card → mostra/oculta a tabela e busca os dados
  totalInscritosCard?.addEventListener("click", async () => {
    if (!tabelaWrap || !tabelaBody) return;

    if (tabelaWrap.style.display === "block") {
      tabelaWrap.style.display = "none";
      return;
    }

    tabelaWrap.style.display = "block";
    tabelaBody.innerHTML = "<tr><td colspan='16'>🔄 Carregando dados...</td></tr>";

    try {
      // 🔧 Fallback de ordenação: tenta por dataEnvio; se falhar, tenta createdAt
      let snap;
      try {
        const q1 = query(collection(db, "matriculas"), orderBy("dataEnvio", "desc"));
        snap = await getDocs(q1);
      } catch (e1) {
        console.warn("orderBy(dataEnvio) falhou, tentando createdAt…", e1.code || e1.message);
        const q2 = query(collection(db, "matriculas"), orderBy("createdAt", "desc"));
        snap = await getDocs(q2);
      }

      const linhas = [];
      snap.forEach((doc) => {
        const data = doc.data();
        linhas.push(`
          <tr>
            <td>${safe(data.numeroMatricula)}</td>
            <td>${safe(data.nome)}</td>
            <td>${safe(data.cpf)}</td>
            <td>${safe(data.idade)}</td>
            <td>${safe(data.sexo)}</td>
            <td>${safe(data.raca)}</td>
            <td>${safe(data.religiao)}</td>
            <td>${safe(data.escola)}</td>
            <td>${safe(data.rede)}</td>
            <td>${data.tipoMatricula === "A" ? "Matrícula" : (data.tipoMatricula === "B" ? "Rematrícula" : "-")}</td>
            <td>${Array.isArray(data.oficinas) ? data.oficinas.join(", ") : "-"}</td>
            <td>${Array.isArray(data.programas) ? data.programas.join(", ") : "-"}</td>
            <td>${safe(data?.responsavel?.nome)}</td>
            <td>${safe(data?.responsavel?.telefone)}</td>
            <td>${safe(data?.responsavel?.email)}</td>
            <td>${safe(data?.responsavel?.integrantes)}</td>
          </tr>
        `);
      });

      tabelaBody.innerHTML = linhas.length
        ? linhas.join("")
        : `<tr><td colspan="16">Nenhuma matrícula encontrada.</td></tr>`;
    } catch (erro) {
      console.error("Erro ao buscar matrículas:", erro);
      tabelaBody.innerHTML = `<tr><td colspan="16">❌ Erro ao carregar dados.</td></tr>`;
    }
  });
}

// Logout para o botão "Sair"
window.logout = async () => {
  try {
    await signOut(auth);
    safeReplace(LOGIN_PAGE);
  } catch (e) {
    console.error("Erro ao sair:", e);
  }
};

// Helper para mostrar "-" quando faltar o dado
function safe(v) {
  if (v === undefined || v === null || v === "") return "-";
  return String(v);
}
