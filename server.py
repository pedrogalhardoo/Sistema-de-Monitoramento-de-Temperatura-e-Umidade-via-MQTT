import json
import random
import paho.mqtt.client as mqtt

broker = "10.79.12.66" # Alterar IP
client = mqtt.Client("servidor_central")

estado_dispositivos = {} # armazena se o aquecedor/resfriador de cada cliente está ligado ou desligado.
modo_clientes = {} # guarda o modo de operação (manual ou automático) de cada cliente.
temperaturas_atuais = {} # mantém o controle da temperatura atual de cada cliente.

# Simula como a temperatura do ambiente varia naturalmente, 
# dependendo da estação e se o aquecedor/resfriador estão ligados.
def get_variacao_ambiental(estacao, aquecedor_ligado, resfriador_ligado):
    if aquecedor_ligado:
        return 1.5
    elif resfriador_ligado:
        return -1.5
    else:
        if estacao == "Inverno":
            return random.uniform(-1.2, -0.4)
        elif estacao == "Verão":
            return random.uniform(0.4, 1.2)
    return 0

# Define como o servidor deve agir:
# Se em modo manual: força aquecedor/resfriador ligado.
# Se em modo alvo: ajusta para ficar entre temperatura mínima e máxima.
# Se em modo automático: decide baseado na estação do ano.
def controlar_temperatura(id_cliente, temperatura, estacao, modo_manual, estado_atual, alvo_min=None, alvo_max=None):
    if modo_manual == "forca_aquecedor" and temperatura >= 45:
        estado_atual["aquecedor"] = False
        estado_atual["resfriador"] = False
        return "auto", temperatura, "Forçar Auto"

    if modo_manual == "forca_resfriador" and temperatura <= 5:
        estado_atual["aquecedor"] = False
        estado_atual["resfriador"] = False
        return "auto", temperatura, "Forçar Auto"

    if modo_manual == "forca_aquecedor":
        estado_atual["aquecedor"] = True
        estado_atual["resfriador"] = False
        return "ligar_aquecedor", temperatura, "Manter Aquecedor Ligado"

    if modo_manual == "forca_resfriador":
        estado_atual["resfriador"] = True
        estado_atual["aquecedor"] = False
        return "ligar_resfriador", temperatura, "Manter Resfriador Ligado"

    if modo_manual == "modo_alvo" and alvo_min is not None and alvo_max is not None:
        if temperatura < alvo_min:
            estado_atual["aquecedor"] = True
            estado_atual["resfriador"] = False
            return "ligar_aquecedor", temperatura, f"Aumentar para {alvo_min}°C"
        elif temperatura > alvo_max:
            estado_atual["resfriador"] = True
            estado_atual["aquecedor"] = False
            return "ligar_resfriador", temperatura, f"Reduzir para {alvo_max}°C"
        else:
            estado_atual["resfriador"] = False
            estado_atual["aquecedor"] = False
            return "sem_acao", temperatura, "Dentro do intervalo"

    # Controle automático
    if estacao == "Inverno":
        if temperatura < 10:
            estado_atual["aquecedor"] = True
            estado_atual["resfriador"] = False
            return "ligar_aquecedor", temperatura, "Ligar Aquecedor"
        elif temperatura > 22 and estado_atual["aquecedor"]:
            estado_atual["aquecedor"] = False
            return "desligar_aquecedor", temperatura, "Desligar Aquecedor"

    elif estacao == "Verão":
        if temperatura > 30:
            estado_atual["resfriador"] = True
            estado_atual["aquecedor"] = False
            return "ligar_resfriador", temperatura, "Ligar Resfriador"
        elif temperatura < 26 and estado_atual["resfriador"]:
            estado_atual["resfriador"] = False
            return "desligar_resfriador", temperatura, "Desligar Resfriador"

    return "sem_acao", temperatura, "Sem Ação"

# Analisa o valor da umidade e retorna um alerta de status (Ideal, Ar Seco, Umidade Alta).
def analisar_umidade(umidade):
    if umidade < 30:
        return "⚠️ Ar seco"
    elif umidade > 60:
        return "⚠️ Umidade alta"
    return "✅ Ideal"

# Quando conecta ao broker, se inscreve no tópico "topico/sensores" para receber dados dos dispositivos.
def on_connect(client, userdata, flags, rc):
    print(f"✅ Conectado com código {rc}")
    client.subscribe("topico/sensores")

# Toda vez que uma mensagem chega:
def on_message(client, userdata, msg):
    try:
        # 1) Decodifica o JSON.
        data = json.loads(msg.payload.decode("utf-8"))
        id_cliente = data.get("id_cliente")
        temperatura = data.get("temperatura")
        umidade = data.get("umidade")
        estacao = data.get("estacao")
        modo = data.get("modo")
        alvo_min = data.get("alvo_min")
        alvo_max = data.get("alvo_max")

        # 2) Valida os dados recebidos.
        if not all([id_cliente, temperatura, umidade, estacao]):
            return

        # 3) Atualiza informações do dispositivo.
        if id_cliente not in estado_dispositivos:
            estado_dispositivos[id_cliente] = {"aquecedor": False, "resfriador": False}
            print(f"🟢 Cliente {id_cliente} conectado.")

        if id_cliente not in temperaturas_atuais:
            temperaturas_atuais[id_cliente] = temperatura

        # 4) Controla temperatura conforme a lógica (modo automático ou manual).
        if modo == "auto":
            modo_clientes[id_cliente] = None
        elif modo is not None:
            modo_clientes[id_cliente] = modo

        modo_manual = modo_clientes.get(id_cliente)
        temperatura_atual = temperaturas_atuais[id_cliente]

        # 5) Simula nova temperatura com variação ambiental.
        comando, temperatura_controlada, acao = controlar_temperatura(
            id_cliente, temperatura_atual, estacao, modo_manual,
            estado_dispositivos[id_cliente], alvo_min, alvo_max
        )

        aquecedor = estado_dispositivos[id_cliente]["aquecedor"]
        resfriador = estado_dispositivos[id_cliente]["resfriador"]
        variacao = get_variacao_ambiental(estacao, aquecedor, resfriador)

        temperatura_nova = temperatura_controlada + variacao
        temperaturas_atuais[id_cliente] = temperatura_nova

        if comando == "auto":
            modo_clientes[id_cliente] = None

        # 6) Gera alertas de umidade.
        alerta_umidade = analisar_umidade(umidade)

        # 7) Imprime no terminal informações atualizadas.
        print(
            f"🆔 {id_cliente.ljust(12)} | ☀️ {estacao.ljust(7)} | 🌡️ {temperatura_atual:5.1f}°C → {temperatura_nova:5.1f}°C | "
            f"💧 {umidade:5.1f}% {alerta_umidade.ljust(20)} | "
            f"🔥 {'ON ' if aquecedor else 'OFF'} | ❄️ {'ON ' if resfriador else 'OFF'} | "
            f"🛠️ {modo_manual or 'Automático':<11} | 🔧 {acao}"
        )
        
        resposta = {
            "id_cliente": id_cliente,
            "comando": comando,
            "temperatura": temperatura_nova,
            "umidade": umidade,
            "estacao": estacao,
            "modo": modo_manual or "auto",
            "alerta_umidade": alerta_umidade
        }

        if comando == "auto":
            resposta["modo"] = "auto"

        # 8) Publica resposta com comando para o cliente no tópico topico/comandos/<id_cliente>.
        client.publish(f"topico/comandos/{id_cliente}", json.dumps(resposta))

    except Exception as e:
        print(f"❌ Erro ao processar mensagem: {e}")
        
# Conexão com o Broker
# Define os callbacks.
# Conecta ao broker Mosquitto.
# Mantém o servidor rodando eternamente ouvindo e enviando mensagens.
client.on_connect = on_connect
client.on_message = on_message
client.connect(broker)
client.loop_forever()
