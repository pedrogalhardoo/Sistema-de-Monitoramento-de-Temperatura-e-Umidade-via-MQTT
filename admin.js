// Conecta o dashboard admin a um broker MQTT via WebSocket.
const clienteMQTT = mqtt.connect("ws://10.79.12.66:9001"); 

// Elementos e Variáveis Globais
// Objeto que armazena todos os dispositivos conectados (indexados pelo id_cliente).
const dispositivos = {}; 
// Referência à tabela HTML onde os dispositivos serão listados.
const tabela = document.getElementById("tabela-dispositivos"); 
// Elementos da página para mostrar contadore:
const totalConectados = document.getElementById("total-conectados");
const totalAlertas = document.getElementById("total-alertas");
const totalModoManual = document.getElementById("total-modo-manual");

// Atualiza a tabela com os dados dos dispositivos
function atualizarDashboard() {
  tabela.innerHTML = ""; // Primeiro, limpa o conteúdo da tabela

  let alertas = 0;
  let manuais = 0;

  Object.values(dispositivos).forEach((d) => { //Para cada dispositivo:
    const linha = document.createElement("tr"); //Cria uma nova linha na tabela

    if (d.alerta_umidade && d.alerta_umidade.includes("⚠️")) alertas++;
    if (d.modo && d.modo !== "auto") manuais++;
    
    // Mostra informações como temperatura, umidade, estação, status do aquecedor/resfriador,
    //  modo atual, alerta de umidade e status de conexão.
    linha.innerHTML = `
      <td>${d.id_cliente}</td>
      <td>${d.estacao ?? '<span class="text-muted">—</span>'}</td>
      <td>${d.temperatura?.toFixed(1) ?? "-"} °C</td>
      <td>${d.umidade?.toFixed(1) ?? "-"} %</td>
      <td>${
        d.aquecedor
          ? '<span class="status-dot status-on"></span> ON'
          : '<span class="status-dot status-off"></span> OFF'
      }</td>
      <td>${
        d.resfriador
          ? '<span class="status-dot status-on"></span> ON'
          : '<span class="status-dot status-off"></span> OFF'
      }</td>
      <td>${d.modo === "auto" || !d.modo ? "Automático" : d.modo}</td>
      <td><span class="${
        d.alerta_umidade?.includes("⚠️") ? "text-danger" : "text-success"
      }">${d.alerta_umidade ?? "—"}</span></td>
      <td>${d.status ?? '<span class="text-muted">—</span>'}</td>
      
      <td>${d.status === "🔴 Offline (LWT)" // Se o dispositivo estiver offline (🔴 Offline (LWT)), um botão de Remover aparece.
        ? `<button class="btn btn-sm btn-danger" onclick="removerDispositivo('${d.id_cliente}')">
             <i class="bi bi-trash"></i> Remover
           </button>`
        : ""}</td>
    `;

    tabela.appendChild(linha);
  });

  const conectados = Object.values(dispositivos).filter(
    (d) => d.status === "🟢 Ativo" || d.status === "🟢 Online"
  );
  
// Atualiza no painel o número total de:
// Dispositivos conectados (🟢).
// Dispositivos em alerta.
// Dispositivos em modo manual.
  totalConectados.textContent = conectados.length;  
  totalAlertas.textContent = alertas;
  totalModoManual.textContent = manuais;
}

function removerDispositivo(id) {
  if (confirm(`Tem certeza que deseja remover o dispositivo ${id}?`)) {

     // Envia comando para o cliente parar ou se desligar
     clienteMQTT.publish(`topico/comandos/${id}`, JSON.stringify({ comando: "desligar" }));

    delete dispositivos[id];
    atualizarDashboard();
  }
}

// Conectado ao broker MQTT
clienteMQTT.on("connect", () => {
  console.log("✅ Conectado ao broker MQTT como Admin");
  // Se inscreve para receber:
  clienteMQTT.subscribe("topico/comandos/#"); // Comandos de todos os dispositivos
  clienteMQTT.subscribe("topico/status/#"); // Status de todos os dispositivos
});

// Recebendo dados
clienteMQTT.on("message", (topico, payload) => {
  try {
    // Tenta interpretar o conteúdo recebido como JSON.
    const dados = JSON.parse(payload.toString());

    // Se o tópico for de status
    // Tratamento do LWT
    if (topico.startsWith("topico/status/")) {
      const id = dados.id_cliente;
      if (!id) return;

      if (!dispositivos[id]) {
        dispositivos[id] = { id_cliente: id };
      }

      dispositivos[id].status =
        dados.status === "conectado" ? "🟢 Online" : "🔴 Offline (LWT)";

      atualizarDashboard();
      return; // Evita continuar para o restante do processamento
    }

    // Se o tópico for de dados:
    console.log("📦 Dados recebidos do tópico:", dados);
    const id = dados.id_cliente;
    if (!id) return;

    // Atualiza (ou cria) a entrada do dispositivo no objeto
    if (!dispositivos[id]) {
      dispositivos[id] = {
        id_cliente: id,
      };
    }

    // Atualiza as propriedades:
    dispositivos[id] = {
      ...dispositivos[id],
      temperatura: dados.temperatura,
      umidade: dados.umidade,
      estacao: dados.estacao,
      modo: dados.modo ?? dispositivos[id].modo ?? "auto",
      comando: dados.comando,
      alerta_umidade: dados.alerta_umidade,
      ultimaMensagem: Date.now(), // Atualiza também a hora da última mensagem recebida
      ultimaAtualizacao: new Date().toLocaleTimeString(),
    };
    dispositivos[id].status = "🟢 Ativo"; // Define o dispositivo como 🟢 Ativo.

    // Se houver um comando recebido, ajusta o estado do aquecedor e resfriador (ON/OFF).
    if (dados.comando) {
      dispositivos[id].aquecedor = dados.comando.includes("aquecedor");
      dispositivos[id].resfriador = dados.comando.includes("resfriador");

      if (dados.comando === "auto") {
        dispositivos[id].modo = "auto";
      } else if (dados.modo) {
        dispositivos[id].modo = dados.modo;
      }
    }

    // Após processar, chama atualizarDashboard().
    atualizarDashboard();
  } catch (err) {
    console.error("Erro ao processar mensagem:", err);
  }
});

// Monitorando Dispositivos Inativos
// A cada 5 segundos, verifica:
// Se algum dispositivo não enviou dados nos últimos 10 segundos.
setInterval(() => {
  const agora = Date.now();
  const tempoLimite = 10000; // 10s de inatividade

  Object.entries(dispositivos).forEach(([id, dispositivo]) => {
    const tempoInativo = agora - (dispositivo.ultimaMensagem || 0);

    // Se detectar inatividade e o dispositivo não estiver marcado como Offline (LWT), muda o status para:
    if (tempoInativo > tempoLimite && dispositivo.status !== "🔴 Offline (LWT)") {
      console.warn(`⏱️ Dispositivo ${id} sem resposta há ${tempoInativo}ms.`);
      dispositivo.status = "🟡 Inativo (Sem resposta)";
    }
  });

  atualizarDashboard();
}, 5000);

