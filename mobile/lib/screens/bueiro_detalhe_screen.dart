import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:latlong2/latlong.dart' as latlng;
import '../models/bueiro.dart';
import '../models/usuario.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/location_service.dart';
import '../theme/app_theme.dart';
import '../widgets/medidor_nivel.dart';
import 'login_screen.dart';

/// Raio de proximidade que libera o botão de iniciar a limpeza.
///
/// 15 m, não 3: o erro típico de um GPS de celular em rua fica entre 5 e 15 m, e
/// piora perto de prédio. Com 3 m o funcionário fica em cima do bueiro e o botão
/// não destrava — reprova trabalho legítimo por ruído de sinal. A trava que vale
/// é a do servidor (RAIO_LIMPEZA_METROS), que ninguém contorna mexendo no app.
const double _raioLiberacaoMetros = 15;

enum _EtapaLimpeza { aproximando, prontoParaIniciar, emAndamento, enviandoFinalizacao, concluida }

class BueiroDetalheScreen extends StatefulWidget {
  final Usuario usuario;
  final Bueiro bueiro;

  const BueiroDetalheScreen({super.key, required this.usuario, required this.bueiro});

  @override
  State<BueiroDetalheScreen> createState() => _BueiroDetalheScreenState();
}

class _BueiroDetalheScreenState extends State<BueiroDetalheScreen> {
  StreamSubscription<Position>? _assinaturaPosicao;
  Position? _posicaoAtual;
  double? _distanciaMetros;
  _EtapaLimpeza _etapa = _EtapaLimpeza.aproximando;
  bool _processando = false;
  String? _erro;

  @override
  void initState() {
    super.initState();
    _monitorarPosicao();
  }

  @override
  void dispose() {
    _assinaturaPosicao?.cancel();
    super.dispose();
  }

  void _monitorarPosicao() {
    _assinaturaPosicao = LocationService.streamPosicao().listen((posicao) {
      final distancia = LocationService.distanciaEmMetros(
        latOrigem: posicao.latitude,
        lngOrigem: posicao.longitude,
        latDestino: widget.bueiro.latitude,
        lngDestino: widget.bueiro.longitude,
      );

      if (!mounted) return;
      setState(() {
        _posicaoAtual = posicao;
        _distanciaMetros = distancia;
        if (_etapa == _EtapaLimpeza.aproximando && distancia <= _raioLiberacaoMetros) {
          _etapa = _EtapaLimpeza.prontoParaIniciar;
        } else if (_etapa == _EtapaLimpeza.prontoParaIniciar && distancia > _raioLiberacaoMetros) {
          // Se ele se afastar antes de confirmar o início, volta a exigir aproximação
          _etapa = _EtapaLimpeza.aproximando;
        }
      });
    });
  }

  Future<void> _iniciarLimpeza() async {
    if (_posicaoAtual == null) return;
    setState(() {
      _processando = true;
      _erro = null;
    });
    try {
      // Envia data/hora + localização exata do início ao backend.
      // O backend é responsável por pausar os sensores e destravar a fechadura via MQTT.
      await ApiService.iniciarLimpeza(
        bueiroId: widget.bueiro.bueiroId,
        funcionarioId: widget.usuario.id,
        latitude: _posicaoAtual!.latitude,
        longitude: _posicaoAtual!.longitude,
      );
      setState(() => _etapa = _EtapaLimpeza.emAndamento);
    } on SessaoExpirada {
      await _voltarParaLogin();
    } catch (e) {
      setState(() => _erro = e.toString().replaceAll('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _processando = false);
    }
  }

  /// Token vence em 12 h. Sem isso o funcionário fica olhando um erro que nenhum
  /// botão desta tela resolve.
  Future<void> _voltarParaLogin() async {
    await AuthService.encerrarSessao();
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sua sessão expirou. Entre novamente.')),
    );
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LoginScreen()),
      (route) => false,
    );
  }

  Future<void> _finalizarLimpeza() async {
    final picker = ImagePicker();
    // A traseira é a que aponta para o bueiro. É só uma preferência: o app de câmera
    // do aparelho pode ignorar e abrir na que ele quiser.
    final foto = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 80,
      preferredCameraDevice: CameraDevice.rear,
    );
    if (foto == null) return; // usuário cancelou a foto

    setState(() {
      _etapa = _EtapaLimpeza.enviandoFinalizacao;
      _erro = null;
    });

    try {
      // Pega a localização exata no momento da finalização (pode ter mudado levemente)
      final posicaoFinal = await LocationService.obterPosicaoAtual();
      await ApiService.finalizarLimpeza(
        bueiroId: widget.bueiro.bueiroId,
        funcionarioId: widget.usuario.id,
        latitude: posicaoFinal.latitude,
        longitude: posicaoFinal.longitude,
        foto: File(foto.path),
      );
      setState(() => _etapa = _EtapaLimpeza.concluida);
    } on SessaoExpirada {
      await _voltarParaLogin();
    } catch (e) {
      setState(() {
        _erro = e.toString().replaceAll('Exception: ', '');
        _etapa = _EtapaLimpeza.emAndamento;
      });
    }
  }

  Color get _corStatus => AppColors.doStatus(widget.bueiro.statusCodigo);

  String get _nome => widget.bueiro.nomeLegivel;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        titleSpacing: 8,
        title: Text(_nome, style: AppText.rotulo),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(4),
          child: Container(height: 4, color: _corStatus),
        ),
      ),
      body: _etapa == _EtapaLimpeza.concluida ? _telaConcluida() : _telaPrincipal(),
    );
  }

  Widget _telaPrincipal() {
    return Column(
      children: [
        SizedBox(height: 200, child: _mapa()),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _painelNivel(),
                const SizedBox(height: 20),
                _painelAcao(),
                if (_erro != null) ...[
                  const SizedBox(height: 16),
                  _blocoErro(_erro!),
                ],
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _mapa() {
    return FlutterMap(
      options: MapOptions(
        initialCenter: latlng.LatLng(widget.bueiro.latitude, widget.bueiro.longitude),
        initialZoom: 17,
      ),
      children: [
        TileLayer(
          urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
          userAgentPackageName: 'io.github.leitepedro.smartdrain',
        ),
        MarkerLayer(
          markers: [
            Marker(
              point: latlng.LatLng(widget.bueiro.latitude, widget.bueiro.longitude),
              width: 34,
              height: 34,
              child: Center(
                child: Container(
                  width: 22,
                  height: 22,
                  decoration: BoxDecoration(
                    color: _corStatus,
                    borderRadius: BorderRadius.circular(3),
                    border: Border.all(color: AppColors.superficie, width: 2.5),
                  ),
                ),
              ),
            ),
            if (_posicaoAtual != null)
              Marker(
                point: latlng.LatLng(_posicaoAtual!.latitude, _posicaoAtual!.longitude),
                width: 22,
                height: 22,
                child: Container(
                  decoration: BoxDecoration(
                    color: AppColors.piche,
                    shape: BoxShape.circle,
                    border: Border.all(color: AppColors.superficie, width: 3),
                  ),
                ),
              ),
          ],
        ),
      ],
    );
  }

  /// O medidor em tamanho grande: aqui ele é o retrato do bueiro, com a linha de
  /// alerta marcada para se ver o quanto passou do limite.
  Widget _painelNivel() {
    return Container(
      color: AppColors.superficie,
      padding: const EdgeInsets.all(20),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Altura fixa: dentro do scroll a altura é livre, e esticar o medidor
          // ali o faria colapsar (ele não tem altura própria).
          SizedBox(
            height: 180,
            child: MedidorNivel(
              porcentagem: widget.bueiro.capacidadePorcentagem,
              cor: _corStatus,
              largura: 26,
              mostrarLimite: true,
            ),
          ),
          const SizedBox(width: 20),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(widget.bueiro.statusCodigo,
                    style: AppText.rotulo.copyWith(color: _corStatus)),
                const SizedBox(height: 8),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      widget.bueiro.capacidadePorcentagem.toStringAsFixed(0),
                      style: AppText.numeroGrande.copyWith(fontSize: 52, color: _corStatus),
                    ),
                    const SizedBox(width: 4),
                    Text('% OBSTRUÍDO', style: AppText.rotulo.copyWith(color: _corStatus)),
                  ],
                ),
                const SizedBox(height: 14),
                Text(widget.bueiro.statusMensagem, style: AppText.corpo),
                const SizedBox(height: 18),
                _linhaInfo('BATERIA', widget.bueiro.statusBateria),
                const SizedBox(height: 8),
                _linhaInfo('CONEXÃO', widget.bueiro.qualidadeConexao),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _linhaInfo(String rotulo, String valor) {
    return Row(
      children: [
        Text(rotulo, style: AppText.rotulo),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            valor,
            textAlign: TextAlign.right,
            style: AppText.corpo.copyWith(color: AppColors.piche, fontSize: 13),
          ),
        ),
      ],
    );
  }

  Widget _painelAcao() {
    switch (_etapa) {
      case _EtapaLimpeza.aproximando:
        return _BlocoAproximacao(distanciaMetros: _distanciaMetros);

      case _EtapaLimpeza.prontoParaIniciar:
        return ElevatedButton(
          onPressed: _processando ? null : _iniciarLimpeza,
          child: _processando
              ? const _EsperaBotao(texto: 'DESTRAVANDO')
              : const Text('INICIAR LIMPEZA'),
        );

      case _EtapaLimpeza.emAndamento:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: const BoxDecoration(
                color: AppColors.superficie,
                border: Border(left: BorderSide(color: AppColors.sinal, width: 3)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('EM ANDAMENTO',
                      style: AppText.rotulo.copyWith(color: AppColors.piche)),
                  const SizedBox(height: 8),
                  const Text(
                    'Sensores pausados e fechadura destravada. Faça a limpeza e finalize com uma foto.',
                    style: AppText.corpo,
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _finalizarLimpeza,
              child: const Text('TIRAR FOTO E FINALIZAR'),
            ),
          ],
        );

      case _EtapaLimpeza.enviandoFinalizacao:
        return Container(
          padding: const EdgeInsets.symmetric(vertical: 22),
          color: AppColors.superficie,
          child: const Column(
            children: [
              SizedBox(
                height: 22,
                width: 22,
                child: CircularProgressIndicator(strokeWidth: 2.4, color: AppColors.sinal),
              ),
              SizedBox(height: 14),
              Text('ENVIANDO FOTO E REGISTRO', style: AppText.rotulo),
            ],
          ),
        );

      case _EtapaLimpeza.concluida:
        return const SizedBox.shrink();
    }
  }

  Widget _blocoErro(String mensagem) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: const BoxDecoration(
        color: AppColors.superficie,
        border: Border(left: BorderSide(color: AppColors.nivelCritico, width: 3)),
      ),
      child: Text(mensagem, style: AppText.corpo.copyWith(color: AppColors.piche)),
    );
  }

  Widget _telaConcluida() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // O medidor vazio é a recompensa: a coluna que estava cheia esvaziou.
            const Center(
              child: SizedBox(
                height: 120,
                child: MedidorNivel(
                  porcentagem: 0,
                  cor: AppColors.nivelOk,
                  largura: 40,
                ),
              ),
            ),
            const SizedBox(height: 28),
            Text(
              'LIMPEZA REGISTRADA',
              textAlign: TextAlign.center,
              style: AppText.rotulo.copyWith(color: AppColors.nivelOk),
            ),
            const SizedBox(height: 10),
            Text(
              '$_nome atualizado no sistema.',
              textAlign: TextAlign.center,
              style: AppText.corpo,
            ),
            const SizedBox(height: 32),
            ElevatedButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('VOLTAR PARA A LISTA'),
            ),
          ],
        ),
      ),
    );
  }
}

/// Enquanto o funcionário caminha até o bueiro, a distância é a única coisa que
/// muda na tela — então ela é a tela.
class _BlocoAproximacao extends StatelessWidget {
  final double? distanciaMetros;
  const _BlocoAproximacao({required this.distanciaMetros});

  @override
  Widget build(BuildContext context) {
    if (distanciaMetros == null) {
      return Container(
        width: double.infinity,
        padding: const EdgeInsets.all(20),
        color: AppColors.superficie,
        child: const Text('OBTENDO SUA LOCALIZAÇÃO', style: AppText.rotulo),
      );
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      color: AppColors.superficie,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('APROXIME-SE PARA LIBERAR', style: AppText.rotulo),
          const SizedBox(height: 10),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text(distanciaMetros!.toStringAsFixed(0), style: AppText.numeroGrande),
              const SizedBox(width: 4),
              const Text('M DE DISTÂNCIA', style: AppText.rotulo),
            ],
          ),
          const SizedBox(height: 12),
          const Text('O botão libera a menos de 3 metros.', style: AppText.corpo),
        ],
      ),
    );
  }
}

class _EsperaBotao extends StatelessWidget {
  final String texto;
  const _EsperaBotao({required this.texto});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const SizedBox(
          height: 16,
          width: 16,
          child: CircularProgressIndicator(strokeWidth: 2, color: AppColors.piche),
        ),
        const SizedBox(width: 12),
        Text(texto),
      ],
    );
  }
}
