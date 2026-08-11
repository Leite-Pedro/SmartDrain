import 'package:geolocator/geolocator.dart';

class LocationService {
  /// Garante que temos permissão de localização e que o GPS está ligado.
  /// Retorna true se está tudo certo para prosseguir.
  static Future<bool> garantirPermissao() async {
    bool servicoAtivo = await Geolocator.isLocationServiceEnabled();
    if (!servicoAtivo) return false;

    LocationPermission permissao = await Geolocator.checkPermission();
    if (permissao == LocationPermission.denied) {
      permissao = await Geolocator.requestPermission();
      if (permissao == LocationPermission.denied) return false;
    }
    if (permissao == LocationPermission.deniedForever) return false;

    return true;
  }

  static Future<Position> obterPosicaoAtual() {
    return Geolocator.getCurrentPosition(
      desiredAccuracy: LocationAccuracy.best,
      // Sem isso o emulador (ou celular sem sinal) trava para sempre esperando um fix.
      timeLimit: const Duration(seconds: 15),
    );
  }

  /// Stream contínuo de posição, usado para monitorar em tempo real
  /// a distância do funcionário até o bueiro (necessário para liberar
  /// o botão "Iniciar limpeza" apenas dentro do raio de 3 metros).
  static Stream<Position> streamPosicao() {
    const configuracao = LocationSettings(
      accuracy: LocationAccuracy.best,
      distanceFilter: 1, // atualiza a cada 1 metro de deslocamento
    );
    return Geolocator.getPositionStream(locationSettings: configuracao);
  }

  /// Distância em metros entre dois pontos geográficos.
  static double distanciaEmMetros({
    required double latOrigem,
    required double lngOrigem,
    required double latDestino,
    required double lngDestino,
  }) {
    return Geolocator.distanceBetween(latOrigem, lngOrigem, latDestino, lngDestino);
  }
}
