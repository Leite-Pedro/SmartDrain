# Smart Drain

O **Smart Drain** é um sistema de bueiros inteligentes projetado para monitorar o acúmulo de água e resíduos em tempo real, ajudando a prevenir enchentes urbanas.

---

## Como o Sistema Funciona?

1. **Hardware (ESP32 LilyGo):** 3 sensores de nível instalados no bueiro fazem a medição e enviam os dados via rede móvel 4G.
2. **Backend (Python/Flask):** Recebe os dados através de um broker MQTT (HiveMQ) e os salva em um banco de dados MySQL.
3. **Frontend (Next.js):** Um painel web dinâmico que mostra a situação das ruas em tempo real e emite alertas de criticidade.

---

## Principais Tecnologias

- **Microcontrolador:** ESP32 LilyGo (com conexão 4G)
- **Comunicação:** Protocolo MQTT (HiveMQ)
- **Backend:** Flask (Python) & Banco MySQL
- **Frontend:** Next.js & Tailwind CSS

---

## Equipe do Projeto

- **Membro 1** Antônio Vinícius Costa Alves Ferreira
- **Membro 2** Cauê Ricardo Teixeira Agapito
- **Membro 3** Pedro Leite de Souza Andrade

---

## Créditos de IA

Este projeto foi desenvolvido com o auxílio das ferramentas de inteligência artificial **Gemini** para suporte na programação e documentação.
