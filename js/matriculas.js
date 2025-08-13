// js/matriculas.js — Firebase compat (sem imports ES Module)

// Config do seu projeto
const firebaseConfig = {
  apiKey: "AIzaSyAzavu7lRQPAi--SFecOg2FE6f0WlDyTPE",
  authDomain: "matriculas-madeinsertao.firebaseapp.com",
  projectId: "matriculas-madeinsertao",
  storageBucket: "matriculas-madeinsertao.appspot.com",
  messagingSenderId: "426884127493",
  appId: "1:426884127493:web:7c83d74f972af209c8b56c",
  measurementId: "G-V2DH0RHXEE"
};

// Inicializa só uma vez
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

/* ===== Helpers ===== */
function notify(msg, isErr = false) {
  const n = document.getElementById("notificacao");
  if (!n) return alert(msg);
  n.textContent = msg;
  n.style.cssText = `
    position:fixed;top:20px;left:50%;transform:translateX(-50%);
    padding:12px 24px;border-radius:10px;color:#fff;font-weight:600;font-size:16px;
    background:${isErr ? '#c0392b' : '#27ae60'};z-index:10000;box-shadow:0 4px 12px rgba(0,0,0,.2)
  `;
  setTimeout(() => { n.textContent = ""; n.removeAttribute("style"); }, 6000);
}

function validarCPF(cpf) {
  if (!cpf) return false;
  cpf = cpf.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let s = 0; for (let i = 0; i < 9; i++) s += +cpf[i] * (10 - i);
  let r = (s * 10) % 11; if (r === 10 || r === 11) r = 0; if (r !== +cpf[9]) return false;
  s = 0; for (let i = 0; i < 10; i++) s += +cpf[i] * (11 - i);
  r = (s * 10) % 11; if (r === 10 || r === 11) r = 0; return r === +cpf[10];
}

function codEscola(nome) {
  const c = {
    "Escola de Ensino Infantil e Fundamental Maria do Carmo": "MC",
    "Escola de Ensino Médio Alfredo Machado": "AM",
    "CEI Mãe Toinha": "MT",
    "CEI Sara Rosita": "SR",
    "CEI Raio de Luz": "RL",
    "CEI Pequeno Aprendiz": "PA",
    "CEI Criança Feliz": "CF",
    "CEI Luz do Saber": "LS",
    "CEI Mundo Encantado": "ME",
    "CEI Sonho de Criança": "SC",
    "CEI José Edson do Nascimento": "JE",
    "CEI José Alzir Silva Lima": "JA"
  };
  return c[nome] || "EMM";
}

/* ===== Lógica ===== */
window.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("formMatricula");
  if (!form) return console.warn("Form #formMatricula não encontrado.");
  const btn = document.getElementById("btnEnviar");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (btn) { btn.disabled = true; btn.textContent = "Enviando..."; }

    try {
      const fd = new FormData(form);

      // Aluno
      const nome   = (fd.get("nome") || "").toString().trim();
      const cpf    = (fd.get("cpf") || "").toString().replace(/\D/g, "");
      const idade  = (fd.get("idade") || "").toString().trim();
      const sexo   = (fd.get("sexo") || "").toString();
      const raca   = (fd.get("raca") || "").toString();
      const religiao = (fd.get("religiao") || "").toString();
      const escola   = (fd.get("escola") || "").toString();
      const rede     = (fd.get("rede") || "").toString();
      const bairro   = (fd.get("bairro") || "").toString();
      const tipoMatricula = (fd.get("tipoMatricula") || "").toString(); // A/B
      // suporta ambos: telefoneAluno (novo) ou telefone (antigo)
      const telefoneAluno = (fd.get("telefoneAluno") || fd.get("telefone") || "").toString().trim();

      const oficinas  = fd.getAll("oficinas[]").map(v => v.toString());
      const programas = fd.getAll("programas[]").map(v => v.toString());

      // Responsável
      const responsavel = {
        nome: (fd.get("responsavel") || "").toString().trim(),
        telefone: (fd.get("telefoneResponsavel") || "").toString().trim(),
        email: (fd.get("email") || "").toString().trim(),
        integrantes: (fd.get("integrantes") || "").toString()
      };

      // Validações
      if (!nome) throw new Error("Informe o nome do aluno.");
      if (!validarCPF(cpf)) { notify("❗ CPF inválido.", true); return; }
      if (!escola) throw new Error("Selecione a escola.");
      if (!tipoMatricula) throw new Error("Selecione Matrícula (A) ou Rematrícula (B).");

      // Duplicidade por CPF
      const dup = await db.collection("matriculas").where("cpf", "==", cpf).get();
      if (!dup.empty) { notify("❗ CPF já cadastrado.", true); return; }

      // Número de matrícula
      const ano = 2025; // ou new Date().getFullYear()
      const ce  = codEscola(escola);
      const seq = await db.collection("matriculas")
        .where("ano", "==", ano)
        .where("escola", "==", escola)
        .get();
      const numeroMatricula = `${ano}-${tipoMatricula}-${ce}-${String(seq.size + 1).padStart(4, "0")}`;

      // Salvar
      await db.collection("matriculas").add({
        numeroMatricula, ano, nome, cpf, idade, sexo, raca, religiao,
        escola, bairro, rede, tipoMatricula, telefoneAluno, oficinas, programas, responsavel,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        dataEnvio: new Date().toISOString()
      });

      notify(`${nome}, sua matrícula foi efetuada com sucesso!`);
      form.reset();
    } catch (err) {
      console.error(err);
      notify(`❌ Erro ao enviar matrícula. ${err?.message || ""}`, true);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = "Enviar Matrícula"; }
    }
  });
});
