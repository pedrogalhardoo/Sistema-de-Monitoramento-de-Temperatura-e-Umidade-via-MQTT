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
[Dispositivos IoT] ⇄ [Mosquitto Broker] ⇄ [Servidor Python] ⇄ [Dashboard Web]

---

## 🚧 Desafios enfrentados

- **Problema:** Dispositivos desconectados continuavam aparecendo no dashboard  
- **Solução:** Implementação do recurso LWT + botão de exclusão manual

---

## 📌 Status

✅ Funcional  
🛠️ Projetado para rodar em ambiente local, mas facilmente adaptável para produção com autenticação e persistência de dados

---

## 📈 Possibilidades de Expansão

- Integração com banco de dados para histórico
- Gráficos de variação de temperatura/umidade
- Autenticação e dashboards multiusuário
- Integração com plataformas como AWS IoT ou Firebase

---

> “Tecnologia de verdade é aquela que melhora a vida das pessoas.”  
> — Esse projeto representa meu compromisso com soluções acessíveis, úteis e escaláveis dentro do universo IoT e IHC.

---

👨‍💻 Desenvolvido por [Pedro Galhardo Germiniani](https://www.linkedin.com/in/pedro-galhardo-20789027b)

