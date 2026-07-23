# SmartDrain — Sistema Inteligente de Monitoramento de Bueiros

O **SmartDrain** é uma solução para prevenção de enchentes urbanas através do monitoramento em tempo real do nível de água e obstrução em bueiros inteligentes.

---

## Estrutura do Projeto

O repositório está dividido em duas partes principais:

### Frontend (`/frontend` ou raiz)

- Desenvolvido em **Next.js / React** e **Tailwind CSS**.
- Dashboard interativo para visualização de dados, mapas e relatórios de medição.

### Backend & Simulador (`/backend`)

- Desenvolvido em **Python** (`app.py`).
- **API / Simulador**: Envia e processa dados simulados dos sensores do bueiro inteligente via MQTT / HTTP.

---

## Tecnologias Utilizadas

- **Frontend:** Next.js, React, Tailwind CSS, Recharts
- **Backend:** Python, Flask / FastAPI
- **Comunicação / IoT:** Protocolo MQTT / JSON

---

## Como Executar o Projeto

### 1. Backend & Simulador

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### 2. Frontend

```bash
npm install
npm run dev
```

---

## Equipe do Projeto

- **Membro 1** Antônio Vinícius Costa Alves Ferreira
- **Membro 2** Cauê Ricardo Teixeira Agapito
- **Membro 3** Pedro Leite de Souza Andrade

---

## Créditos de IA

Este projeto foi desenvolvido com o auxílio das ferramentas de inteligência artificial **Gemini** para suporte na programação e documentação.
