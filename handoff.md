# Handoff — pitch de 5 minutos do Smart Drain

Você vai montar um deck de apresentação. Este documento tem a tese, o roteiro
cronometrado, os números medidos e a direção visual.

**Não invente dado nenhum.** Se um número não está aqui, não entra no slide.
Há uma seção no fim com contradições ainda não resolvidas — leia antes de
escrever qualquer coisa sobre hardware.

---

## O que eu quero

Um deck em **HTML, publicado como Artifact**, 16:9, navegável por seta do
teclado. **8 slides, nem um a mais.** São 5 minutos: 300 segundos, e cada slide
tem um tempo alvo definido no roteiro abaixo.

Cada slide precisa funcionar sendo lido em 3 segundos, do fundo da sala,
enquanto eu falo por cima. Se um slide precisa ser lido, ele falhou.

Inclua **notas de quem apresenta**, num painel que abre com a tecla `N`, com o
que falar e o tempo alvo de cada slide.

Público: banca técnica do Inatel — professores de engenharia, muitos de
telecomunicações. Eles perguntam "por que isso e não aquilo" e conhecem as
métricas de rádio de cor. O deck precisa aguentar pergunta de método.

---

## O projeto

O Smart Drain monitora bueiros de Santa Rita do Sapucaí para prevenir enchentes
urbanas. É um sistema completo, do sensor dentro do bueiro até o celular do
funcionário na rua.

**No bueiro:** um ESP32 alimentado por bateria lê três sensores ultrassônicos
apontados para o cesto coletor, filtra as leituras, classifica o nível de
obstrução e publica por MQTT sobre 4G LTE.

**No servidor:** uma API Flask assina o tópico, grava no Postgres e recalcula o
status — TRANQUILO, ALERTA, CRÍTICO ou ENCHENTE.

**Nas pontas:** uma dashboard web para quem planeja o dia da equipe, e um app
Android para quem está na rua. O app mostra a fila do que limpar e registra a
limpeza — só destrava perto do bueiro e exige foto tirada na hora.

**Escala atual:** 15 bueiros monitorados, em **três bairros de Santa Rita —
Inatel, Fernandes e Maristela**.

A parte nova, e o motivo deste pitch, é a **previsão de onde vai alagar
primeiro**: um ranking que cruza a obstrução medida com a altitude do terreno e
a chuva prevista.

---

## A tese do pitch

> **Todo mundo consegue saber qual bueiro está entupido.**
> **Ninguém sabe qual vai alagar primeiro.**

Um sensor de obstrução responde a primeira pergunta — e é o que todo projeto de
bueiro inteligente faz. A segunda depende de para onde a água corre, e água
corre para baixo.

O deck inteiro existe para chegar no slide 6.

---

## Roteiro — 8 slides, 300 segundos

### 1 — O problema (25s)

Chuva forte, bueiro entupido, rua alagada. Uma frase e um número, não um
parágrafo. Se usar imagem, que seja o mapa de Santa Rita com os três bairros
monitorados — nada de foto de enchente de banco de imagens.

### 2 — A tese (25s)

A frase acima ocupando o slide quase inteiro. É o slide mais vazio do deck e o
mais importante. Deixe respirar.

### 3 — O aparelho (45s)

O que fica dentro do bueiro. Um diagrama do dispositivo, não uma lista de
compras:

```
3x A02YYUW (ultrassônico UART)  →  ESP32  →  módulo 4G LTE  →  MQTT
        apontados para o cesto      bateria
```

Composição completa, se couber num canto: ESP32, bateria com case, três sensores
ultrassônicos UART A02YYUW, módulo 4G, multiplexador, cesto coletor e malha de
limpeza.

O ponto a destacar: **três sensores, não um.** Lixo em bueiro não se acumula
plano — uma leitura só mente. O firmware ordena as três, e se a diferença entre
a maior e a menor passa de 15 cm, descarta a leitura discrepante e usa a média
das duas que concordam. Isso é o que separa um sensor de um instrumento.

### 4 — O caminho do dado (40s)

Um diagrama, um só, em SVG inline — nada de caixinha com seta de emoji:

```
ESP32 ─4G─→ MQTT (broker privado, TLS) ─→ API Flask ─→ Postgres
                                              ├──→ dashboard web
                                              └──→ app Android
```

O ponto a destacar: **a conta do risco mora na API, não nos clientes.** O app não
conversa com o site; os dois leem o mesmo endpoint. Se cada um calculasse por
conta própria, poderiam discordar sobre qual bueiro atender primeiro, e a
discussão viraria sobre qual dos dois está certo em vez de sobre o bueiro.

### 5 — As duas telas, e por que cada bairro tem seu critério (35s)

Lado a lado: o app e a dashboard. Uma linha para cada explicando **por que são
diferentes**, não o que cada uma tem.

- App: uma frase e uma fila. O sujeito está em pé, na rua, com uma mão no
  celular, às vezes de luva.
- Dashboard: a lista inteira, histórico, auditoria — e **o limite de alerta de
  cada bairro**.

O gancho, que prepara o slide 6: um número só para a cidade inteira não serve.
Fernandes e Maristela ficam no fundo do vale; Inatel sobe o morro. O limite que
protege um deixa o outro reclamando à toa, então cada bairro tem o seu — e um
**modo tempestade** que, com um clique, baixa todos para 60% e manda os bueiros
medirem de minuto em minuto.

### 6 — O slide que ganha a apresentação (70s)

**Dê a este slide o dobro do espaço visual dos outros.** É aqui que o método
aparece.

A fórmula:

```
risco = 45% obstrução medida + 35% altitude do terreno + 20% chuva prevista
```

E o exemplo que prova que o terreno importa — leitura real de 22/09:

| bueiro | altitude | obstrução | risco |
|---|---|---|---|
| FERNANDES 03 | 819 m | **58,8%** | 68,8 |
| INATEL 01 | 826 m | 74,0% | 69,0 |

**Um bueiro bem menos entupido empatando com outro muito mais sujo**, porque
está 7 metros mais baixo. Ordenar por entupimento mandaria a equipe ao lugar
errado.

Se sobrar fôlego: o fator de terreno é **relativo ao conjunto**, não absoluto. O
mais baixo dos bueiros monitorados leva 100 e o mais alto leva 0, porque a água
escorre para o mais baixo *deles* — 870 m é alto em Santa Rita e baixo na serra.

### 7 — Que é real (40s)

Evidência de bancada e de software, sem exagero. Escolha 4 destes:

- **Modem 4G validado em bancada:** RSSI médio de −67,5 dBm em 18 medições, com
  registro de rede, GPRS e conexão ao broker funcionando.
- A **qualidade de conexão** que aparece no app não é enfeite: vem da métrica de
  rádio do modem, classificada em quatro faixas pelo próprio firmware.
- **Altitude e chuva** vêm do Open-Meteo, sem chave e sem cadastro, por `urllib`
  da biblioteca padrão — nenhuma dependência nova.
- O desnível entre os bueiros é **medido**, não estimado: **55 metros**, de 819 m
  em Fernandes a 874 m em Inatel.
- A **foto da limpeza é validada por EXIF**: se não foi tirada nos últimos 30
  minutos, o servidor recusa.
- O app libera o botão a 15 m do bueiro, e o **servidor confere de novo a 50 m**
  — trava só no cliente qualquer um contorna.
- O broker é **privado, com TLS e autenticação**, com credencial separada por
  dispositivo.

### 8 — Limites e fecho (20s)

Dizer os limites antes de perguntarem **aumenta** a credibilidade diante de
professor. Três, rápido:

- A telemetria da demonstração ao vivo vem de simulador; o hardware foi validado
  em bancada, ainda não em bueiro instalado.
- O **GNSS ainda não obteve fix** nos testes — a posição hoje vem do cadastro do
  bueiro, não do GPS embarcado.
- Os pesos 45/35/20 são a primeira calibragem, e estão numa constante só,
  justamente para serem corrigidos na primeira chuva de verdade.

Fecho: uma frase de volta à tese e os três nomes. Sem "obrigado" ocupando um
slide inteiro.

---

## Números reais — use estes, não invente

**Altitude por bairro**, medida pelo Open-Meteo:

| bairro | bueiros | altitude |
|---|---|---|
| Fernandes | 5 | 819 a 820 m |
| Maristela | 5 | 820 a 822 m |
| Inatel | 5 | 826 a 874 m |

Os dois bairros novos ficam no fundo do vale, quase planos; o Inatel sobe 48 m
dentro do próprio bairro. Desnível total do conjunto: **55 m**.

**Ranking**, leitura de 22/09/2026, com 18,3 mm de chuva prevista em 24 h:

| # | bueiro | altitude | obstrução | risco | nível |
|---|---|---|---|---|---|
| 1 | MARISTELA 02 | 821 m | 84,2% | 78,9 | ALTO |
| 2 | FERNANDES 02 | 819 m | 64,6% | 71,4 | ALTO |
| 3 | FERNANDES 03 | 819 m | 58,8% | 68,8 | MÉDIO |
| 4 | FERNANDES 05 | 820 m | 59,6% | 68,5 | MÉDIO |
| 5 | FERNANDES 01 | 819 m | 44,2% | 62,2 | MÉDIO |

Repare que os cinco primeiros são todos de Fernandes e Maristela, os bairros
baixos — mesmo com obstrução menor que a de bueiros do Inatel. **É a tese
acontecendo sozinha nos dados.**

Estes valores **mudam** conforme chega telemetria nova. São um retrato, e o
slide pode dizer isso.

**Bancada do modem 4G**, 18 medições:

| métrica | mínimo | máximo | média |
|---|---|---|---|
| Força do sinal (RSSI) | −70 dBm | −65 dBm | **−67,5 dBm** |

**Não coloque no slide os valores de RSRQ medidos** — veja a seção de
contradições. O RSSI está sólido e sustenta o slide 7 sozinho.

**Outros valores:**

- limite de alerta padrão: crítico em 80%, alerta 15 pontos abaixo (65%)
- modo tempestade: crítico em 60% para todos os bairros, alerta em 45%,
  medição a cada 1 min
- filtro dos três sensores: descarta a discrepante se a dispersão passa de 15 cm
- altura do cesto de referência: 80 cm
- chuva que satura o fator de risco: 50 mm em 24 h
- desnível mínimo para o terreno contar: 1 m
- raio de busca do app: 5 km · token de sessão: 12 h
- 19 testes automatizados no app, `flutter analyze` limpo

---

## Direção visual

Use a paleta do **app**, não a da dashboard. A do app foi escolhida com motivo;
a da dashboard é o padrão do Tailwind.

```
concreto     #E4E6E3   fundo, cinza de calçada
superfície   #FFFFFF   cartões
piche        #16181A   texto principal
fumaça       #5F6570   texto secundário
borda        #D2D5D1
sinal        #FF4D00   laranja de cone — o acento, com texto PICHE em cima
```

Cores de nível:

```
ok  #2F7A4F      alerta  #B4690E      crítico  #B3261E
```

Princípios que fazem o deck parecer o produto:

- **Tema claro.** O app é feito para sol direto, e o deck herda isso.
- **Canto de 4 px, não 24.** O assunto é tampa de ferro e boca de lobo, não bolha.
- **O laranja marca uma coisa por slide.** Se tudo é laranja, nada é. Sobre
  laranja, texto preto — é linguagem de placa de obra e passa em contraste.
- **Números enormes contra rótulos minúsculos em caixa alta.** Um `80` gigante ao
  lado de um `RISCO` de 11 px. Use `font-feature-settings: "tnum"` nos números.
- **Sem fonte externa exótica.** O caráter vem da escala, não do tipo.

---

## O que não fazer

- Ícone de gotinha de chuva, planeta, lâmpada de ideia, aperto de mão.
- Foto de placa de ESP32 tirada do Google. Se for desenhar o dispositivo,
  desenhe em SVG, esquemático, na paleta acima.
- Bullet com três níveis de indentação. Se precisa de sub-sub-item, o slide está
  errado.
- "Revolucionar", "disruptivo", "solução inovadora".
- Gradiente roxo-azul de startup. A paleta acima não tem gradiente nenhum.
- Slide de agenda. São 5 minutos.
- Inventar valor de mercado, número de usuários, economia em reais ou custo do
  protótipo. Não temos esses dados e a banca vai perguntar de onde saíram.

---

## Contradições a resolver antes de apresentar

Estas vieram do material de hardware e **não dá para o deck decidir sozinho**.

**1. LiDAR ou ultrassônico? Três ou oito?** O diagrama diz "8x Sensor LiDAR", a
lista de composição diz "3 sensores UART A02YYUW", e o firmware trabalha com
três leituras. O A02YYUW é ultrassônico, não LiDAR. **Para o deck, use: três
sensores ultrassônicos A02YYUW** — é a versão coerente com o código e com a
lista de peças.

**2. O RSRQ medido está com sinal invertido — e isto é o mais grave.** A tabela
de classificação usa valores negativos (> −10 dB é excelente), mas as medições
registradas são positivas: 5,00 a 9,50 dB. RSRQ é, por definição, negativo,
tipicamente entre −3 e −20 dB. O próprio log escreve `SNR (RSRQ)`, o que sugere
que o firmware está lendo e rotulando **SNR** como se fosse RSRQ.

Numa banca de telecomunicações do Inatel isso é furado na hora. Duas saídas:
corrigir o rótulo no firmware para SNR e ajustar a tabela de classificação, ou
ler o campo correto do `+CESQ`. Até resolver, **o deck usa só o RSSI**, que está
consistente.

**3. Falta o modelo da placa.** A composição diz "Caso utilize o modelo de placa
citado acima, não será necessário o módulo 4G", mas o modelo não veio no
material. Sem ele não dá para afirmar no slide se o 4G é embarcado ou módulo
separado — o deck fala em "módulo 4G LTE", genérico.

**4. Multiplexador I2C com sensores UART.** O A02YYUW é UART e o multiplexador
listado é I2C — um não multiplexa o outro. Pode ser que o mux sirva a outra
coisa na placa, ou que seja um lapso na lista. Confirme antes que alguém
pergunte.

---

## Ficha técnica

**Dispositivo** — ESP32, bateria com case, 3x sensor ultrassônico UART A02YYUW,
módulo 4G LTE, multiplexador, cesto coletor com malha de limpeza. Firmware em
C++ (Arduino). Blynk avaliado como plataforma low-code de IoT.

**App** — Flutter/Dart, Android. `flutter_map` (OpenStreetMap), `geolocator`,
`image_picker`, `shared_preferences`. APK release assinado.

**API** — Python/Flask, SQLAlchemy, `paho-mqtt`, Pillow (EXIF), `itsdangerous`
(token). Postgres no Supabase.

**Dashboard** — Next.js 16, React, Tailwind, Recharts.

**Mensageria** — MQTT sobre TLS, **cluster privado no HiveMQ Cloud** (porta 8883),
tópico `santa_rita/smart_drain/telemetria`. Autenticação por usuário e senha, com
credencial separada por dispositivo. O endereço e as credenciais saem de variáveis
de ambiente, então trocar de broker não exige mexer em código.

**Dados externos** — Open-Meteo, `/v1/elevation` e `/v1/forecast`.

**Repositório** — github.com/Leite-Pedro/SmartDrain

**Equipe** — Antônio Vinícius Costa Alves Ferreira, Cauê Ricardo Teixeira
Agapito, Pedro Leite de Souza Andrade. Instituto Nacional de Telecomunicações
(Inatel), Santa Rita do Sapucaí — MG.
