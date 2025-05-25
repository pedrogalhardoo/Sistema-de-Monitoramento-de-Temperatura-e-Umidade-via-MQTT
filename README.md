# 🌡️ Sistema de Monitoramento de Temperatura e Umidade via MQTT

Este projeto implementa um sistema de monitoramento **em tempo real** de temperatura e umidade utilizando comunicação MQTT. Foi desenvolvido como uma aplicação prática de conceitos de **IoT**, **comunicação assíncrona** e **interfaces web interativas**.

---

## 🧠 Visão Geral

- 📡 **Sensores IoT** enviam dados de temperatura e umidade via MQTT
- 🧩 O **broker Mosquitto** gerencia as mensagens em tempo real
- 🖥️ Uma **Dashboard Web** (HTML + JavaScript) exibe os dados ao vivo e permite **controle remoto**
- ⚙️ O servidor intermediário em **Python** recebe, processa e repassa os dados
- 🧊 Suporte a **controle de aquecedor/resfriador remoto**

---

## 🔗 Tecnologias Utilizadas

- **MQTT** (com broker Mosquitto)
- **WebSockets**
- **HTML, CSS e JavaScript** (Dashboard)
- **Python** (Servidor MQTT Listener/Controller)
- **Arquitetura Publish/Subscribe**

---

## 📋 Funcionalidades do Sistema

- ✅ Exibição ao vivo dos dispositivos online/offline
- 🚨 Alerta de umidade
- 🧮 Contador de dispositivos conectados
- ❌ Remoção manual de dispositivos "fantasmas"
- 🔄 Atualização em tempo real via WebSocket
- 🔒 LWT (Last Will and Testament) para detectar desconexões inesperadas

---

## 🧩 Arquitetura

