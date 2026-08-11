# Mobile — app do funcionário de campo

App Flutter (Android) usado por quem vai até o bueiro: lista os que precisam de
limpeza num raio de 5 km, libera a limpeza quando o funcionário chega ao local,
e registra o fim com foto.

Conversa com a API em `backend/`.

## Rodar

```bat
flutter pub get
flutter run -d <device>
```

A URL da API fica em `lib/services/api_service.dart`:

- Emulador Android: `http://10.0.2.2:<porta>` (`10.0.2.2` é o alias do host)
- Celular físico: IP da máquina na rede (`ipconfig` → IPv4)

## Emulador: duas armadilhas que custam horas

**Sempre suba com DNS.** Sem `-dns-server`, o emulador tem internet mas não
resolve nomes: a lista de bueiros funciona (fala com `10.0.2.2`, que é IP) e o
mapa fica em branco, porque os tiles do OpenStreetMap precisam de DNS. Parece bug
do app e não é. Abrir pelo Device Manager do Android Studio **não** passa a flag.

```bat
emulator.exe -avd <nome> -dns-server 8.8.8.8
```

**Mande uma posição.** Os bueiros ficam em Santa Rita do Sapucaí e o emulador
nasce na Califórnia — fora do raio de 5 km a lista vem vazia com tudo certo.
Longitude primeiro, latitude depois:

```bat
adb emu geo fix -45.6968 -22.2571
```

Isso envia **uma** leitura; se a tela pedir posição de novo, mande outra vez. Para
testar o fluxo de limpeza é preciso estar a menos de 3 m do bueiro, então use a
coordenada exata dele.

## Permissões

Se a pasta `android/` for recriada com `flutter create`, o `AndroidManifest.xml`
volta ao template **sem nenhuma permissão** e o app trava carregando —
`Geolocator.checkPermission()` **lança exceção** quando elas faltam, não retorna
"negado". As três precisam estar lá:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
<uses-permission android:name="android.permission.INTERNET"/>
```

O `INTERNET` o Flutter injeta sozinho em debug, mas **não em release** — sem ele o
app compila, roda e não conecta em nada só na build de produção.

## Autenticação

O login guarda o token e o `AuthService` o injeta no `ApiService`, tanto no login
quanto ao restaurar a sessão salva. As rotas de limpeza exigem
`Authorization: Bearer <token>`; 401 vira `SessaoExpirada`, que limpa a sessão e
volta para o login.

## Antes de publicar

- `applicationId` ainda é `com.example.smart_drain_funcionario` — a Play recusa
  `com.example.*`, e o id é permanente após o primeiro envio
- release sai assinada com a chave de **debug** (`signingConfig` aponta para
  `debug` em `android/app/build.gradle.kts`); falta keystore própria
- ícone ainda é o padrão do Flutter

## Interface

Tema claro de propósito: o app é usado na rua, sob sol, onde fundo escuro
desperdiça o brilho da tela. A paleta vem do ambiente de trabalho (concreto,
piche, laranja de sinalização) e os botões usam preto sobre laranja, que é a
única combinação com contraste suficiente.

O nível de obstrução é desenhado como uma coluna que enche de baixo para cima —
o bueiro em corte — porque é o dado que precisa ser lido de relance, em pé.
