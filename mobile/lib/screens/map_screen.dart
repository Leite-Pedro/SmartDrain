import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:latlong2/latlong.dart' as latlng;
import '../models/bueiro.dart';
import '../models/usuario.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import '../widgets/bueiro_card.dart';
import 'bueiro_detalhe_screen.dart';
import 'login_screen.dart';

const double _raioBuscaMetros = 5000; // 5 km

class MapScreen extends StatefulWidget {
  final Usuario usuario;
  const MapScreen({super.key, required this.usuario});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> with WidgetsBindingObserver {
  final MapController _mapController = MapController();

  Position? _posicaoAtual;

  /// Todos os bueiros da região, limpos ou não — são estes que viram pinos no
  /// mapa, para bater com o que a dashboard mostra na mesma hora.
  List<Bueiro> _bueirosNaRegiao = [];

  /// A fila de trabalho: só o que precisa de limpeza. Alimenta a lista e a contagem.
  List<Bueiro> get _bueirosProximos =>
      _bueirosNaRegiao.where((b) => b.precisaLimpeza).toList();
  bool _carregando = true;
  String? _erro;
  Timer? _timerAtualizacao;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _iniciar();
    _retomarAtualizacaoPeriodica();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _timerAtualizacao?.cancel();
    super.dispose();
  }

  // Atualiza a lista a cada 20s para refletir o status em tempo real.
  void _retomarAtualizacaoPeriodica() {
    _timerAtualizacao?.cancel();
    _timerAtualizacao =
        Timer.periodic(const Duration(seconds: 20), (_) => _carregarBueiros());
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Celular no bolso não precisa consultar a API 3x por minuto: em campo isso é
    // bateria e dado móvel do funcionário o turno inteiro.
    if (state == AppLifecycleState.resumed) {
      _retomarAtualizacaoPeriodica();
      _carregarBueiros(); // volta com a lista fresca, sem esperar os 20s
    } else {
      _timerAtualizacao?.cancel();
    }
  }

  /// Qualquer falha aqui precisa virar mensagem na tela. Se escapar uma exceção,
  /// _carregando fica true para sempre e o usuário só vê o spinner girando.
  Future<void> _iniciar() async {
    try {
      final permissaoOk = await LocationService.garantirPermissao();
      if (!permissaoOk) {
        if (!mounted) return;
        setState(() {
          _erro = 'Ative a localização e conceda a permissão para usar o app.';
          _carregando = false;
        });
        return;
      }
      final posicao = await LocationService.obterPosicaoAtual();
      if (!mounted) return;
      setState(() => _posicaoAtual = posicao);
      await _carregarBueiros();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _erro = 'Não foi possível obter sua localização: $e';
        _carregando = false;
      });
    }
  }

  Future<void> _carregarBueiros() async {
    if (_posicaoAtual == null) return;
    try {
      final todos = await ApiService.obterBueirosTempoReal();

      final proximos = todos.where((b) {
        final distancia = LocationService.distanciaEmMetros(
          latOrigem: _posicaoAtual!.latitude,
          lngOrigem: _posicaoAtual!.longitude,
          latDestino: b.latitude,
          lngDestino: b.longitude,
        );
        return distancia <= _raioBuscaMetros;
      }).toList();

      proximos.sort((a, b) {
        final da = LocationService.distanciaEmMetros(
          latOrigem: _posicaoAtual!.latitude,
          lngOrigem: _posicaoAtual!.longitude,
          latDestino: a.latitude,
          lngDestino: a.longitude,
        );
        final db = LocationService.distanciaEmMetros(
          latOrigem: _posicaoAtual!.latitude,
          lngOrigem: _posicaoAtual!.longitude,
          latDestino: b.latitude,
          lngDestino: b.longitude,
        );
        return da.compareTo(db);
      });

      if (!mounted) return;
      setState(() {
        _bueirosNaRegiao = proximos;
        _carregando = false;
        _erro = null;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _erro = 'Falha ao carregar os bueiros. Puxe para atualizar.';
        _carregando = false;
      });
    }
  }

  double? _distanciaPara(Bueiro b) {
    if (_posicaoAtual == null) return null;
    return LocationService.distanciaEmMetros(
      latOrigem: _posicaoAtual!.latitude,
      lngOrigem: _posicaoAtual!.longitude,
      latDestino: b.latitude,
      lngDestino: b.longitude,
    );
  }

  Future<void> _abrirDetalhe(Bueiro bueiro) async {
    // Durante a limpeza esta tela está coberta — atualizar em segundo plano só gasta.
    _timerAtualizacao?.cancel();
    await Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => BueiroDetalheScreen(usuario: widget.usuario, bueiro: bueiro),
      ),
    );
    if (!mounted) return;
    _retomarAtualizacaoPeriodica();
    _carregarBueiros();
  }

  Future<void> _sair() async {
    await AuthService.encerrarSessao();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }


  @override
  Widget build(BuildContext context) {
    final primeiroNome = widget.usuario.nome.trim().split(' ').first;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 20,
        title: Text(primeiroNome.toUpperCase(), style: AppText.rotulo),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, size: 20),
            tooltip: 'Sair',
            onPressed: _sair,
          ),
          const SizedBox(width: 8),
        ],
        bottom: const PreferredSize(
          preferredSize: Size.fromHeight(4),
          child: _FaixaFina(),
        ),
      ),
      body: _carregando ? _carregandoInicial() : _conteudo(),
    );
  }

  Widget _carregandoInicial() {
    return const Center(
      child: SizedBox(
        height: 26,
        width: 26,
        child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.sinal),
      ),
    );
  }

  Widget _conteudo() {
    if (_erro != null && _posicaoAtual == null) return _mensagemErro();

    return Column(
      children: [
        SizedBox(height: 240, child: _mapa()),
        _cabecalhoLista(),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _carregarBueiros,
            color: AppColors.piche,
            backgroundColor: AppColors.superficie,
            child: _bueirosProximos.isEmpty ? _listaVazia() : _lista(),
          ),
        ),
      ],
    );
  }

  /// A contagem vira o título: é a única coisa que o funcionário quer saber ao
  /// destravar o celular. O número grande ecoa os números dos cards abaixo.
  Widget _cabecalhoLista() {
    final quantidade = _bueirosProximos.length;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 22, 20, 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Text('$quantidade', style: AppText.numeroGrande),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              quantidade == 1
                  ? 'BUEIRO PRECISA\nDE LIMPEZA'
                  : 'BUEIROS PRECISAM\nDE LIMPEZA',
              style: AppText.rotulo.copyWith(height: 1.5, color: AppColors.piche),
            ),
          ),
          const Text('ATÉ 5 KM', style: AppText.rotulo),
        ],
      ),
    );
  }

  Widget _lista() {
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 24),
      itemCount: _bueirosProximos.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final bueiro = _bueirosProximos[index];
        return BueiroCard(
          bueiro: bueiro,
          distanciaMetros: _distanciaPara(bueiro),
          onTap: () => _abrirDetalhe(bueiro),
        );
      },
    );
  }

  Widget _listaVazia() {
    // Precisa rolar para o "puxe para atualizar" continuar funcionando.
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 40, 20, 24),
      children: [
        Container(
          padding: const EdgeInsets.all(20),
          color: AppColors.superficie,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                _erro == null ? 'TUDO LIMPO' : 'SEM DADOS',
                style: AppText.rotulo.copyWith(
                  color: _erro == null ? AppColors.nivelOk : AppColors.nivelCritico,
                ),
              ),
              const SizedBox(height: 10),
              Text(
                _erro ?? 'Nenhum bueiro da sua região precisa de limpeza agora.',
                style: AppText.corpo,
              ),
              const SizedBox(height: 6),
              Text('Puxe para atualizar.', style: AppText.corpo.copyWith(fontSize: 13)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _mensagemErro() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('LOCALIZAÇÃO', style: AppText.rotulo.copyWith(color: AppColors.nivelCritico)),
            const SizedBox(height: 10),
            Text(_erro ?? '', style: AppText.corpo.copyWith(color: AppColors.piche)),
            const SizedBox(height: 24),
            ElevatedButton(onPressed: _iniciar, child: const Text('TENTAR DE NOVO')),
          ],
        ),
      ),
    );
  }

  Widget _mapa() {
    final centro = latlng.LatLng(_posicaoAtual!.latitude, _posicaoAtual!.longitude);
    return FlutterMap(
      mapController: _mapController,
      options: MapOptions(initialCenter: centro, initialZoom: 14),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'io.github.leitepedro.smartdrain',
        ),
        MarkerLayer(
          markers: [
            Marker(
              point: centro,
              width: 22,
              height: 22,
              child: const _MarcadorFuncionario(),
            ),
            ..._bueirosNaRegiao.map(
              (b) => Marker(
                point: latlng.LatLng(b.latitude, b.longitude),
                width: 34,
                height: 34,
                child: GestureDetector(
                  onTap: () => _abrirDetalhe(b),
                  child: _MarcadorBueiro(cor: AppColors.doStatus(b.statusCodigo)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }
}

/// Listra fina de sinalização, ecoando a faixa do login sem repetir seu peso.
class _FaixaFina extends StatelessWidget {
  const _FaixaFina();

  @override
  Widget build(BuildContext context) {
    return Container(height: 4, color: AppColors.sinal);
  }
}

class _MarcadorFuncionario extends StatelessWidget {
  const _MarcadorFuncionario();

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.piche,
        shape: BoxShape.circle,
        border: Border.all(color: AppColors.superficie, width: 3),
      ),
    );
  }
}

/// Quadrado, não alfinete: é uma tampa de bueiro vista de cima.
class _MarcadorBueiro extends StatelessWidget {
  final Color cor;
  const _MarcadorBueiro({required this.cor});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 22,
        height: 22,
        decoration: BoxDecoration(
          color: cor,
          borderRadius: BorderRadius.circular(3),
          border: Border.all(color: AppColors.superficie, width: 2.5),
        ),
      ),
    );
  }
}
