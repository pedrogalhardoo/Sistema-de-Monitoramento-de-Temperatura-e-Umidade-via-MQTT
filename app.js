const id_cliente = "cliente_" + Math.floor(Math.random() * 10000); //Gera um identificador único para cada cliente (sensor).
const estacoes = ["Verão", "Inverno"];
const estacao = estacoes[Math.floor(Math.random() * estacoes.length)]; //Simula se o ambiente está no Verão ou Inverno.

//Variáveis de estado
//Armazena os valores simulados de temperatura e umidade.
let temperatura = Math.random() * 10 + 20;
let umidade = Math.random() * 20 + 40;
let modoManual = null; //Define se o usuário está forçando aquecimento/resfriamento ou no modo automático.
let modoAlvoAtivo = false;
let temperaturaAlvoMin = null;
let temperaturaAlvoMax = null;
let servidorAtivo = false; //Indica se está recebendo comandos do servidor.

const brokerIP = "10.79.12.66"; // Alterar IP
const client = mqtt.connect(`ws://${brokerIP}:9001`, { //Conecta ao broker Mosquitto via WebSocket
  clientId: id_cliente,
  keepalive: 60, //Mantém conexão viva 
  reconnectPeriod: 2000, //Tenta reconectar a cada 2s
  connectTimeout: 30 * 1000,
  clean: true,
  //Configura o Last Will and Testament (LWT) para que, caso o cliente caia sem avisar,
  //o status seja enviado como "desconectado".
  will: {
    topic: `topico/status/${id_cliente}`,
    payload: JSON.stringify({ id_cliente: id_cliente, status: "desconectado" }),
    qos: 1,
    retain: true,
  },
});

client.on("connect", () => {
  console.log("✅ Conectado como", id_cliente);
  client.subscribe(`topico/comandos/${id_cliente}`); //Assina o tópico para receber comandos do servidor.
  servidorAtivo = true;
  // Publica que está online
  client.publish(`topico/status/${id_cliente}`, JSON.stringify({
    id_cliente: id_cliente,
    status: "conectado"
  }), { retain: true });

  //Atualiza os elementos da interface mostrando que o cliente está online.
  document.getElementById("id-cliente").textContent = id_cliente;
  document.getElementById("estacao").textContent = estacao;
  document.getElementById("modo-atual").textContent = "Automático";
  document.getElementById("status-broker").textContent = "🟢 Conectado";
  document.getElementById("status-broker").className = "badge bg-success";

  // Inicia o envio de dados a cada 5 segundos
  setInterval(simularEDisparar, 5000);
});

// Se perder a conexão com o broker, atualiza a interface para indicar que está desconectado.
// O servidor perceberá isso através do LWT.
client.on("offline", () => {
  console.warn("⚠️ Desconectado do broker MQTT!");
  document.getElementById("status-broker").textContent = "🔴 Desconectado";
  document.getElementById("status-broker").className = "badge bg-danger";

  servidorAtivo = false;
});

// Recebe comandos do servidor via MQTT.
client.on("message", (topic, message) => {
  let data = {};
  try {
    data = JSON.parse(message.toString());
  } catch (err) {
    console.error("⚠️ JSON malformado recebido:", message.toString());
    return;
  }

  // Exibe alertas de umidade.
  document.getElementById("alerta-umidade").textContent =
    data.alerta_umidade || "";

  temperatura = data.temperatura;

  // Atualiza o status do cliente (modo automático ou manual).
  if (data.modo === "auto") {
    modoManual = null;
    modoAlvoAtivo = false;
    document.getElementById("modo-atual").textContent = "Automático";
  } else if (modoManual === "forca_aquecedor") {
    document.getElementById("modo-atual").textContent = "Aquecedor Forçado";
  } else if (modoManual === "forca_resfriador") {
    document.getElementById("modo-atual").textContent = "Resfriador Forçado";
  } else if (modoManual === "modo_alvo") {
    document.getElementById(
      "modo-atual"
    ).textContent = `Modo Alvo (${temperaturaAlvoMin}°C - ${temperaturaAlvoMax}°C)`;
  }

  // Atualiza os gráficos.
  updateGrafico(temperatura, umidade);
});

// Gera pequenas variações na temperatura e umidade (simulação).
function simularEDisparar() {
  umidade += randomFloat(-1.5, 1.5);
  umidade = Math.max(20, Math.min(90, umidade));

  if (!servidorAtivo) {
    if (estacao === "Inverno") {
      temperatura += randomFloat(-1.2, -0.4);
    } else {
      temperatura += randomFloat(0.4, 1.2);
    }
  }

  temperatura = Math.max(5, Math.min(45, temperatura));

  document.getElementById("temp-value").textContent = temperatura.toFixed(1);
  document.getElementById("umidade-value").textContent = umidade.toFixed(1);

  const payload = {
    id_cliente,
    temperatura,
    umidade,
    estacao,
    modo: modoManual,
  };

  if (modoManual === "modo_alvo") {
    payload.alvo_min = temperaturaAlvoMin;
    payload.alvo_max = temperaturaAlvoMax;
  }

  // Publica os dados no tópico topico/sensores para o servidor processar.
  client.publish("topico/sensores", JSON.stringify(payload));
}

// Garante que os valores fiquem dentro dos limites aceitáveis.
function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

// Botões para controle manual:
// Os botões permitem que o usuário altere o modo do cliente para forçar aquecedor, resfriador ou automático.
// Como exemplo o botão Aquecedor: define que o aquecedor deve ser ligado e publica a nova configuração.
document.getElementById("aquecedor-btn").addEventListener("click", () => {
  modoManual = "forca_aquecedor";
  document.getElementById("modo-atual").textContent = "Aquecedor Forçado";
  simularEDisparar();
});

document.getElementById("resfriador-btn").addEventListener("click", () => {
  modoManual = "forca_resfriador";
  document.getElementById("modo-atual").textContent = "Resfriador Forçado";
  simularEDisparar();
});

document.getElementById("auto-btn").addEventListener("click", () => {
  modoManual = "auto";
  modoAlvoAtivo = false;
  document.getElementById("modo-atual").textContent = "Automático";
  document.getElementById("alvo-controles").style.display = "none";
  simularEDisparar();
});

document.getElementById("alvo-btn").addEventListener("click", () => {
  document.getElementById("alvo-controles").style.display = "block";
});

document.getElementById("confirmar-alvo").addEventListener("click", () => {
  const min = parseFloat(document.getElementById("alvo-min").value);
  const max = parseFloat(document.getElementById("alvo-max").value);

  if (isNaN(min) || isNaN(max)) {
    alert(
      "Por favor, insira valores numéricos válidos para os limites de temperatura."
    );
    return;
  }

  if (min > max) {
    alert("O valor mínimo não pode ser maior que o valor máximo.");
    return;
  }

  temperaturaAlvoMin = min;
  temperaturaAlvoMax = max;
  modoManual = "modo_alvo";
  modoAlvoAtivo = true;
  document.getElementById(
    "modo-atual"
  ).textContent = `Modo Alvo (${temperaturaAlvoMin}°C - ${temperaturaAlvoMax}°C)`;
  simularEDisparar();
});

// Gráfico Chart.js
const labels = [];
const dadosTemperatura = [];
const dadosUmidade = [];

const ctx = document.getElementById("grafico").getContext("2d");
const grafico = new Chart(ctx, {
  type: "line",
  data: {
    labels: labels,
    datasets: [
      {
        label: "Temperatura (°C)",
        data: dadosTemperatura,
        borderColor: "red",
        fill: false,
        tension: 0.3,
      },
      {
        label: "Umidade (%)",
        data: dadosUmidade,
        borderColor: "blue",
        fill: false,
        tension: 0.3,
      },
    ],
  },
  options: {
    scales: {
      x: {
        display: true,
        title: { display: true, text: "Horário" },
      },
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  },
});

function updateGrafico(temp, umi) {
  const hora = new Date().toLocaleTimeString();
  labels.push(hora);
  dadosTemperatura.push(temp);
  dadosUmidade.push(umi);

  if (labels.length > 10) {
    labels.shift();
    dadosTemperatura.shift();
    dadosUmidade.shift();
  }

  grafico.update();
}
