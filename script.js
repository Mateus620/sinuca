import { db, collection, addDoc, onSnapshot, updateDoc, doc } from "./firebase.js";
import { deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { auth } from "./firebase.js";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } 
from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// lista de jogadores
let jogadores = [];
let partidas = [];
let finalGerada = false;
let faseAtual = "grupos"; // ou "final"
let modoADM = false;
let campeao = null;



onSnapshot(doc(db, "config", "estado"), (docSnap) => {
    if (docSnap.exists()) {
        let data = docSnap.data();
        faseAtual = data.fase;
        campeao = data.campeao || null;
        mostrarTabela();
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        modoADM = true;
    } else {
        modoADM = false;
    }
});

function logout() {
    signOut(auth);
    location.reload();
}



function verTabela() {
    modoADM = false;

    document.getElementById("inicio").style.display = "none";
    document.getElementById("tabela").style.display = "block";
}

async function adicionarJogador() {
    let nome = document.getElementById("nomeJogador").value;

    if (nome === "") return;

    await addDoc(collection(db, "jogadores"), {
        nome: nome,
        pontos: 0
    });

    document.getElementById("nomeJogador").value = "";
}

// atualizar lista na tela
function atualizarLista() {
    let lista = document.getElementById("listaJogadores");
    lista.innerHTML = "";

    jogadores.forEach((jogador, index) => {
        let li = document.createElement("li");
        li.innerHTML = jogador.nome + 
        ` <button onclick="removerJogador(${index})">X</button>`;
        lista.appendChild(li);
    });
}

async function removerJogador(index) {
    let jogador = jogadores[index];

    await deleteDoc(doc(db, "jogadores", jogador.id));
}

async function iniciarTorneio() {

    if (partidas.length > 0) {
        document.getElementById("adm").style.display = "none";
        document.getElementById("tabela").style.display = "block";
        return;
    }

    let ordem = 1;

    for (let i = 0; i < jogadores.length; i++) {
        for (let j = i + 1; j < jogadores.length; j++) {

            await addDoc(collection(db, "partidas"), {
                jogador1: jogadores[i].nome,
                jogador2: jogadores[j].nome,
                status: "pendente",
                ordem: ordem++
            });

            await addDoc(collection(db, "partidas"), {
                jogador1: jogadores[j].nome,
                jogador2: jogadores[i].nome,
                status: "pendente",
                ordem: ordem++
            });
        }
    }

    document.getElementById("adm").style.display = "none";
    document.getElementById("tabela").style.display = "block";
}

function mostrarTabela() {

    let div = document.getElementById("conteudoTabela");
    div.innerHTML = "";

    let tituloFase = document.createElement("h2");

    if (faseAtual === "grupos") {
        tituloFase.textContent = "📊 Fase de Grupos";
    } else {
        tituloFase.textContent = "🏆 FINAL";
    }

    div.appendChild(tituloFase);

    // 🔥 STATUS
    let status = document.createElement("div");
    status.classList.add("status-box");
    let textoStatus = obterStatus();
    status.textContent = `📌 Status: ${textoStatus}`;

    if (textoStatus === "Não iniciado") {
        status.style.background = "#374151";
    }

    if (textoStatus === "Montando jogadores") {
        status.style.background = "#2563eb";
    }

    if (textoStatus === "Fase de Grupos") {
        status.style.background = "#16a34a";
    }

    if (textoStatus === "Final") {
        status.style.background = "#f59e0b";
        status.style.color = "#000";
    }
    status.style.fontWeight = "bold";
    div.appendChild(status);

    // 🔥 PROGRESSO
    let progresso = document.createElement("p");

    if (faseAtual === "final") {

        let listaFinal = partidas.filter(p => p.fase === "final");
        let finalizadas = listaFinal.filter(p => p.status === "finalizada").length;

        progresso.textContent = `Final: ${finalizadas}/3`;

    } else {

        let total = partidas.length;
        let finalizadas = partidas.filter(p => p.status === "finalizada").length;

        progresso.textContent = `Progresso: ${finalizadas}/${total}`;
    }

    div.appendChild(progresso);
  

    // 🔥 CAMPEÃO
    if (campeao) {
        let divCampeao = document.createElement("div");
        divCampeao.innerHTML = `🏆 CAMPEÃO: ${campeao}`;
        divCampeao.style.background = "gold";
        divCampeao.style.color = "black";
        divCampeao.style.padding = "10px";
        divCampeao.style.borderRadius = "10px";
        divCampeao.style.marginBottom = "10px";
        div.appendChild(divCampeao);
    }

    let pendentes = partidas
        .filter(p => p.status === "pendente")
        .sort((a, b) => a.ordem - b.ordem);

    let atual = pendentes[0];

    let tituloPartidas = document.createElement("h3");
    tituloPartidas.textContent = faseAtual === "final"
        ? "🏆 Partida da Final"
        : "Partida Atual";
    div.appendChild(tituloPartidas);

    if (atual) {
        let linha = document.createElement("div");
        linha.classList.add("partida-destaque");

        if (modoADM) {
            linha.innerHTML = `
                🏆 ${atual.jogador1} vs ${atual.jogador2}
                <button onclick="vitoriaPorId('${atual.id}', 1)">✔ ${atual.jogador1}</button>
                <button onclick="vitoriaPorId('${atual.id}', 2)">✔ ${atual.jogador2}</button>
                <button onclick="cancelarPorId('${atual.id}')">Cancelar</button>
            `;
        } else {
            linha.innerHTML = `
                🏆 ${atual.jogador1} vs ${atual.jogador2}
                <span style="opacity: 0.6;">(aguardando resultado)</span>
            `;
        }

        if (atual.fase === "final") {
            linha.style.border = "2px solid gold";
        }

        div.appendChild(linha);
    } else {
        let p = document.createElement("p");
        p.textContent = "Nenhuma partida pendente";
        div.appendChild(p);
    }

    // 🔥 ordenar ranking
    let ranking = [...jogadores].sort((a, b) => b.pontos - a.pontos);

    if (faseAtual === "grupos") {
        let tituloRanking = document.createElement("h3");
        tituloRanking.textContent = "Ranking";
        div.appendChild(tituloRanking);

        ranking.forEach((j, i) => {
            let p = document.createElement("p");
            p.textContent = `${i + 1}º - ${j.nome} (${j.pontos} pts)`;
            if (i === 0) {
                p.style.background = "#16a34a";
            }
            div.appendChild(p);
        });

    }
    

    verificarFinal();
    if (faseAtual === "final") {

        let finalistas = ranking.slice(0, 2);
        let eliminados = ranking.slice(2);

        let divPlacar = document.createElement("div");
        divPlacar.innerHTML = "<h3>🔥 Placar da Final</h3>";
        let finais = partidas.filter(p => p.fase === "final" && p.status === "finalizada");
        let placar = {};

        finais.forEach(p => {
            if (!p.vencedor) return;
            placar[p.vencedor] = (placar[p.vencedor] || 0) + 1;
        });

        for (let nome in placar) {
            let p = document.createElement("p");
            p.textContent = `${nome}: ${placar[nome]} vitória(s)`;
            divPlacar.appendChild(p);
        }
        
        let divFinalistas = document.createElement("div");
        divFinalistas.innerHTML = "<h3>🏆 Finalistas</h3>";

        div.appendChild(divPlacar);

        finalistas.forEach(j => {
            let p = document.createElement("p");
            p.textContent = j.nome;
            divFinalistas.appendChild(p);
        });

        div.appendChild(divFinalistas);

        let divEliminados = document.createElement("div");
        divEliminados.innerHTML = "<h3>❌ Eliminados</h3>";

        eliminados.forEach(j => {
            let p = document.createElement("p");
            p.textContent = j.nome;
            divEliminados.appendChild(p);
        });

        div.appendChild(divEliminados);
    }
}


async function cancelar(index) {
    let partida = partidas[index];

    await updateDoc(doc(db, "partidas", partida.id), {
        status: "cancelada"
    });
}


async function gerarFinal() {

    faseAtual = "final";

    let ranking = [...jogadores].sort((a, b) => b.pontos - a.pontos);

    let primeiro = ranking[0];

    // 🔥 pega todos que estão empatados com o 2º lugar
    let segundoLugarPontos = ranking[1].pontos;
    
    let candidatos = ranking.filter(j => j.pontos === segundoLugarPontos && j.nome !== primeiro.nome);
    
    // 🔥 inclui também o 1º automaticamente
    let finalistas;
    
    if (candidatos.length > 1) {
        // empate → mata-mata entre eles
        finalistas = [primeiro, ...candidatos];
    } else {
        finalistas = [primeiro, ranking[1]];
    }
    
    let eliminados = ranking.filter(j => !finalistas.includes(j));

    if (finalistas.length > 2) {

        mostrarToast("⚖ Desempate para definir finalista!", "warning");
    
        let ordem = 900;
    
        for (let i = 1; i < finalistas.length; i++) {
            for (let j = i + 1; j < finalistas.length; j++) {
    
                await addDoc(collection(db, "partidas"), {
                    jogador1: finalistas[i].nome,
                    jogador2: finalistas[j].nome,
                    status: "pendente",
                    fase: "desempate",
                    ordem: ordem++
                });
            }
        }
    
        return; // 🔥 NÃO entra na final ainda
    }

    mostrarToast("🏆 Final iniciada!", "warning");

    // 🔥 criar jogos da final
    await addDoc(collection(db, "partidas"), {
        jogador1: finalistas[0].nome,
        jogador2: finalistas[1].nome,
        status: "pendente",
        fase: "final",
        ordem: 999
    });

    await addDoc(collection(db, "partidas"), {
        jogador1: finalistas[0].nome,
        jogador2: finalistas[1].nome,
        status: "pendente",
        fase: "final",
        ordem: 1000
    });

    await updateDoc(doc(db, "config", "estado"), {
        fase: "final"
    });

    // 🔥 salvar lista (opcional depois)
    window.finalistas = finalistas;
    window.eliminados = eliminados;
}

async function vitoria(index, vencedor) {
    let partida = partidas[index];

    if (campeao) return;
    if (partida.status !== "pendente") return;

    let nomeVencedor = vencedor === 1 ? partida.jogador1 : partida.jogador2;

    // 🔥 atualizar partida
    await updateDoc(doc(db, "partidas", partida.id), {
        status: "finalizada",
        vencedor: nomeVencedor
    });

    // ❗ SÓ soma pontos se NÃO for final
    if (partida.fase === undefined) {
        let jogador = jogadores.find(j => j.nome === nomeVencedor);

        if (jogador) {
            await updateDoc(doc(db, "jogadores", jogador.id), {
                pontos: jogador.pontos + 1
            });
        }
    }

    // 🔥 verificar final
    verificarResultadoFinal();
}

async function verificarDesempate() {

    let finais = partidas.filter(p => p.fase === "final");
    let finalizadas = finais.filter(p => p.status === "finalizada");

    if (finalizadas.length === 2) {

        let ranking = [...jogadores].sort((a, b) => b.pontos - a.pontos);

        if (ranking[0].pontos === ranking[1].pontos) {

            await addDoc(collection(db, "partidas"), {
                jogador1: ranking[0].nome,
                jogador2: ranking[1].nome,
                status: "pendente",
                fase: "final",
                ordem: 2000
            });
        }
    }
}

onSnapshot(collection(db, "jogadores"), (snapshot) => {
    jogadores = [];

    snapshot.forEach(doc => {
        jogadores.push({
            id: doc.id,
            ...doc.data()
        });
    });

    atualizarLista();

    // 🔥 ADICIONA ISSO
    mostrarTabela();
});

async function verificarFinal() {

    if (faseAtual === "final") return;

    if (jogadores.length < 2 || partidas.length === 0) return;

    let pendente = partidas.some(p => p.status === "pendente");

    let desempates = partidas.filter(p => p.fase === "desempate");

    let desempatesPendentes = desempates.some(p => p.status === "pendente");
    
    if (desempates.length > 0 && !desempatesPendentes) {

        let jaTemFinal = partidas.some(p => p.fase === "final");
        if (jaTemFinal) return;
        
        // 🔥 calcula vencedor do desempate
        let vitorias = {};
    
        desempates.forEach(p => {
            if (!p.vencedor) return;
            vitorias[p.vencedor] = (vitorias[p.vencedor] || 0) + 1;
        });
    
        let vencedor = Object.keys(vitorias).sort((a, b) => vitorias[b] - vitorias[a])[0];
    
        let ranking = [...jogadores].sort((a, b) => b.pontos - a.pontos);
        let primeiro = ranking[0];
    
        // 🔥 agora sim gera final correta
        await addDoc(collection(db, "partidas"), {
            jogador1: primeiro.nome,
            jogador2: vencedor,
            status: "pendente",
            fase: "final",
            ordem: 999
        });
    
        await addDoc(collection(db, "partidas"), {
            jogador1: primeiro.nome,
            jogador2: vencedor,
            status: "pendente",
            fase: "final",
            ordem: 1000
        });
    
        await updateDoc(doc(db, "config", "estado"), {
            fase: "final"
        });
    
        return;
    }
    
    if (!pendente && desempates.length === 0) {
        gerarFinal();
    }
}


onSnapshot(collection(db, "partidas"), (snapshot) => {
    partidas = [];

    snapshot.forEach(doc => {
        partidas.push({
            id: doc.id,
            ...doc.data()
        });
    });

    mostrarTabela();
});


async function resetarTorneio() {

    // 🔥 limpar jogadores (se já tiver, mantém)
    jogadores = [];

    // 🔥 limpar partidas
    partidas = [];

    // 🔥 limpar final
    campeao = null;

    let snapJogadores = await getDocs(collection(db, "jogadores"));
    snapJogadores.forEach(async (d) => {
        await deleteDoc(doc(db, "jogadores", d.id));
    });

    let snapPartidas = await getDocs(collection(db, "partidas"));
    snapPartidas.forEach(async (d) => {
        await deleteDoc(doc(db, "partidas", d.id));
    });
    // 🔥 resetar no Firebase
    await updateDoc(doc(db, "config", "estado"), {
        fase: "grupos",
        campeao: null
    });

    mostrarToast("Torneio resetado!", "success");
}


function vitoriaPorId(id, vencedor) {
    let index = partidas.findIndex(p => p.id === id);
    vitoria(index, vencedor);
}

function cancelarPorId(id) {
    let index = partidas.findIndex(p => p.id === id);
    cancelar(index);
}

async function verificarResultadoFinal() {

    let finais = partidas.filter(p => p.fase === "final");

    if (finais.length === 0) return;

    let finalizadas = finais.filter(p => p.status === "finalizada");

    // precisa de pelo menos 2 jogos
    if (finalizadas.length < 2) return;

    let vitorias = {};

    finalizadas.forEach(p => {
        if (!p.vencedor) return;

        vitorias[p.vencedor] = (vitorias[p.vencedor] || 0) + 1;
    });

    let jogadoresFinal = Object.keys(vitorias);

    if (jogadoresFinal.length < 2) return;

    let j1 = jogadoresFinal[0];
    let j2 = jogadoresFinal[1];

    let v1 = vitorias[j1] || 0;
    let v2 = vitorias[j2] || 0;

    // 🏆 campeão
    if (v1 >= 2) {
        await updateDoc(doc(db, "config", "estado"), {
            campeao: j1
        });
        return;
    }

    if (v2 >= 2) {
        await updateDoc(doc(db, "config", "estado"), {
            campeao: j2
        });
        return;
    }

    // ⚖ empate → criar desempate
    if (v1 === 1 && v2 === 1 && finais.length === 2) {
        criarDesempate(j1, j2);
    }
}

function mostrarLogin() {
    document.getElementById("loginBox").style.display = "block";
}

async function fazerLogin() {
    let email = document.getElementById("email").value;
    let senha = document.getElementById("senha").value;

    try {
        await signInWithEmailAndPassword(auth, email, senha);

        modoADM = true;

        document.getElementById("inicio").style.display = "none";
        document.getElementById("adm").style.display = "block";

    } catch (erro) {mostrarToast("Senha errada, COLOQUE O NÚMERO DO CARTÃO QUE VAI FUNCIONAR");}   
}

function obterStatus() {

    if (jogadores.length > 0 && partidas.length === 0) return "Montando jogadores";
    if (partidas.length === 0) return "Não iniciado";
    if (faseAtual === "grupos") return "Fase de Grupos";
    if (faseAtual === "final") return "Final";

    return "";
}

async function criarDesempate(j1, j2) {

    await addDoc(collection(db, "partidas"), {
        jogador1: j1,
        jogador2: j2,
        status: "pendente",
        fase: "final",
        ordem: 2000
    });
}

function mostrarToast(msg, tipo = "info") {

    let toast = document.createElement("div");
    toast.className = "toast " + tipo;
    toast.textContent = msg;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}


window.addEventListener("DOMContentLoaded", () => {

    document.getElementById("nomeJogador").addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            adicionarJogador();
        }
    });

    document.getElementById("senha").addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            fazerLogin();
        }
    });

});

window.verTabela = verTabela;
window.adicionarJogador = adicionarJogador;
window.removerJogador = removerJogador;
window.iniciarTorneio = iniciarTorneio;
window.vitoria = vitoria;
window.cancelar = cancelar;
window.resetarTorneio = resetarTorneio;
window.vitoriaPorId = vitoriaPorId;
window.cancelarPorId = cancelarPorId;
window.logout = logout;
window.fazerLogin = fazerLogin;
window.mostrarLogin = mostrarLogin;
