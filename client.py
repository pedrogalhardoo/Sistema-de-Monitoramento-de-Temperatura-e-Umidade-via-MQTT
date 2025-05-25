import json
import time
import random
import threading
import paho.mqtt.client as mqtt
import sys

ESTACAO = random.choice(["Inverno", "Verão"])
TEMPERATURA_INICIAL = random.uniform(15.0, 30.0)
UMIDADE_INICIAL = random.uniform(30.0, 80.0)

temperatura_atual = TEMPERATURA_INICIAL
umidade_atual = UMIDADE_INICIAL
modo_manual = None
id_cliente = f"cliente_{random.randint(1000, 9999)}"
broker = "localhost"

client = mqtt.Client(id_cliente)
client.will_set(f"status/{id_cliente}", payload="desconectado_inesperado", qos=1, retain=False)

lock = threading.Lock()
executando = True

def user_input():
    global modo_manual, executando
    while True:
        print("\n1 - Forçar Aquecedor\n2 - Forçar Resfriador\n3 - Modo Automático\n4 - Sair")
        comando = input("Digite o número do modo: ").strip()
        mapa = {"1": "forca_aquecedor", "2": "forca_resfriador", "3": None}

        if comando == "4":
            print("🚪 Saindo...")
            client.publish(f"status/{id_cliente}", "desconectado_voluntario", qos=1)
            time.sleep(1)
            executando = False
            client.disconnect()
            sys.exit()
        elif comando in mapa:
            with lock:
                modo_manual = mapa[comando]
            print(f"✅ Modo alterado para: {modo_manual or 'automático'}")
        else:
            print("❌ Comando inválido!")

def on_message(client, userdata, msg):
    global temperatura_atual, modo_manual
    try:
        data = json.loads(msg.payload.decode())
        temperatura_anterior = temperatura_atual
        temperatura_atual = data.get('temperatura', temperatura_atual)
        alerta_umidade = data.get('alerta_umidade', '')

        comando = data.get('comando', 'sem_acao')
        aquecedor_on = comando == "ligar_aquecedor"
        resfriador_on = comando == "ligar_resfriador"

        if data.get("modo") == "auto":
            with lock:
                modo_manual = None
            print("⚠️ Modo automático ativado pelo servidor.")

        if modo_manual == "forca_aquecedor":
            modo_desc = "Manual Aquecedor"
        elif modo_manual == "forca_resfriador":
            modo_desc = "Manual Resfriador"
        else:
            modo_desc = "Automático"

        print(f"🆔 {id_cliente} | ☀️ {ESTACAO} | 🌡️ {temperatura_anterior:.1f}°C→{temperatura_atual:.1f}°C | 💧 {umidade_atual:.1f}% {alerta_umidade} | 🔥 {'ON' if aquecedor_on else 'OFF'} | ❄️ {'ON' if resfriador_on else 'OFF'} | 🛠️ {modo_desc}")

    except Exception as e:
        print(f"⚠️ Erro ao processar resposta: {e}")

def loop_envio():
    global temperatura_atual, umidade_atual
    while executando:
        with lock:
            modo_atual = modo_manual

        temperatura_atual += random.uniform(-0.4, 0.4)
        umidade_atual += random.uniform(-1.0, 1.0)
        umidade_atual = max(20, min(umidade_atual, 90))

        payload = {
            "id_cliente": id_cliente,
            "temperatura": round(temperatura_atual, 2),
            "umidade": round(umidade_atual, 2),
            "estacao": ESTACAO,
            "modo": modo_atual
        }

        client.publish("topico/sensores", json.dumps(payload))
        time.sleep(5)

client.on_message = on_message
client.connect(broker)
client.subscribe(f"topico/comandos/{id_cliente}")
client.loop_start()

threading.Thread(target=user_input, daemon=True).start()
loop_envio()
